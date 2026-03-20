/**
 * DeltaPromptBackend.ts
 *
 * WBS 1.4 · 异步增量 Prompt 模板 (Delta Extension)
 *
 * 设计语义（重要）：
 * 增量更新 ≠ 数据修复。
 *
 * 触发场景：
 *   A. 新语种升级：游戏版本加入新语言（如 ko 韩语），现有 sense 完全没有该语言数据。
 *      前端用户请求韩语 → Edge Function Cache Hit 发现缺失 → 调用 buildDeltaPrompt 补全 ko 数据。
 *
 *   B. 新 Persona 升级：游戏版本加入新风格（如 LOGICIAN），sense_flavor_texts 无对应 persona 行。
 *      前端请求 LOGICIAN → Edge Function 查 UNIQUE(sense_id, persona) 不存在 →
 *      调用 buildDeltaPrompt，填入 missing.personas，Blocking 补全该 persona 所有语言的 text + example。
 *
 *   C. 新 Visual 风格升级：游戏版本加入新风格（如 cyberpunk），sense_visuals 中无对应行。
 *      **不走本模块**：Visual 生成走 buildVisualPrompt (WBS 1.3) + Non-blocking 异步路径，
 *      由 Edge Function index.ts 单独调度，写入 sense_visuals(sense_id, id=visual_id, payload, meta)。
 *
 *   D. 新 DataItem 升级：未来版本加入新字段（如 qualia），现有 sense 完全没有该字段。
 *      前端触发后，Edge Function 发现字段缺失 → 调用 buildDeltaPrompt 补全。
 *
 * 对齐已实现功能：
 *   - buildTraitsSection: 复用自 SensePromtBackend.ts，动态生成 POS × 语言 Traits 指令块
 *   - PERSONA_DICTIONARY:  复用 Persona 双层命中注入机制（personaId + personaNarrative）
 *   - injectSenseMeta:    AI 输出纯值（zero meta），后端收到 delta 响应后统一注入 meta
 *
 * 防并发锁：由 Edge Function (index.ts) 维护 [sense_id_delta_lock]，本模块不涉及。
 * 失败策略：失败/超时直接返回 GENERATION_FAILED，拒绝降级。
 */

import { PERSONA_DICTIONARY } from './PersonaDictionary.ts';
import {
    VERB_KEY_FORMS,
    NOUN_KEY_FORMS,
    ADJ_KEY_FORMS,
} from '@schemas/schemas/KeyFormsDictionary.config.ts';

// ── Languages that have grammatical gender ───────────────────────────────────
const GENDERED_LANGS = new Set(['fr', 'de', 'es', 'it', 'pt']);

// ── Languages that use verb conjugation groups ───────────────────────────────
const VERB_GROUP_LANGS = new Set(['fr', 'es', 'it', 'pt']);

// ============================================================================
// Types
// ============================================================================

/**
 * 缺失项描述。所有数组均代表"版本升级后新增的"语言或字段，
 * 不是"本应有但遗漏"的数据。
 *
 * 注意：新 visual_id 风格升级意图排除在此接口之外。
 * Visual 生成走 buildVisualPrompt (VisualPromptsBackend.ts) + Non-blocking 异步路径，
 * 不需要单次打包进 DeltaPrompt。
 */
export interface DeltaMissing {
    /** 完全缺失该语言所有数据的语言列表（meaning + shells + flavorText + wordFamily + traits） */
    langs: string[];
    /** 已有语言数据，但缺失特定 persona 的 FlavorText */
    personas: string[];
    /** 已有 shells，但缺失 wordFamily 的语言（通常随新语言一起触发，单独触发较少） */
    wordFamilyLangs: string[];
    /** 已有 shells，但因版本升级 Traits 规则扩展而缺失 traits 的语言 */
    traitLangs: string[];
    // 未来可扩展：dataItems?: string[];  ← 用于 qualia 等新 dataItem 场景
}

export interface DeltaPromptParams {
    /** 概念名称（英文），用于 AI 理解语义上下文 */
    concept: string;
    /** 英文定义，用于 AI 理解语义上下文 */
    definition: string;
    /**
     * 现有 shells 的 text.value，格式：{ lang: shellTextValue }
     * 用于 WordFamily ROOT RULE 锚定：root 必须是同语言内 shells[lang].text 的直接词形基。
     * 新语言可不在此 map 中（因为新语言 shell 本身也是 delta 生成的）。
     */
    existingShells: Record<string, string>;
    /**
     * 已有的 POS（从 shells 推断）。
     * 用于 Traits 指令分支选择（noun/verb/adj 三路）。
     * 若无法确定或多 POS 混合，传 undefined → Traits 指令展示全部三个分支。
     */
    pos?: string;
    /** 缺失项列表 */
    missing: DeltaMissing;
    /** Persona 大类 ID，影响 FlavorText 风格 */
    personaId: string;
    /** Persona 子叙事变体，命中时覆盖默认指令 */
    personaNarrative?: string;
}

export interface DeltaPromptResult {
    systemPrompt: string;
    userPrompt: string;
    /** 透传给 Edge Function (index.ts) 用于解析响应并 UPSERT DB */
    missing: DeltaMissing;
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Builds the Traits section for DELTA context.
 * Replicates the logic of buildTraitsSection() in SensePromtBackend.ts,
 * scoped to only the languages that need delta generation.
 *
 * If pos is undefined, all three POS branches are shown (AI picks applicable ones).
 * If pos is known, only the relevant branch is shown to reduce prompt size.
 */
function buildDeltaTraitsSection(langs: string[], pos?: string): string {
    if (langs.length === 0) return '';

    const showNoun = !pos || pos === 'n.';
    const showVerb = !pos || pos === 'v.' || pos === 'v.t.' || pos === 'v.i.';
    const showAdj = !pos || pos === 'adj.';

    const parts: string[] = [];

    // ── NOUN ──────────────────────────────────────────────────────────────────
    if (showNoun) {
        const nounBlocks = langs.map(lang => {
            const lines: string[] = [];
            lines.push(`  - plural_form (only if irregular plural): string`);
            if (GENDERED_LANGS.has(lang)) {
                lines.push(`  - gender (REQUIRED): "masculine" | "feminine" | "neuter"`);
            }
            if (lang === 'de') {
                lines.push(
                    `  - case_pattern — MUST be exactly one of:\n` +
                    `      "strong masculine" (e.g. der Mann) | "strong feminine" (e.g. die Frau) |\n` +
                    `      "strong neuter" (e.g. das Kind) | "weak" (e.g. der Mensch) | "mixed" (e.g. das Herz)`
                );
                const forms = NOUN_KEY_FORMS['de'] ?? [];
                if (forms.length > 0) {
                    lines.push(
                        `  - key_forms (only if irregular declension): string[] positions:\n` +
                        forms.map((f, i) => `      [${i}] ${f}`).join('\n') +
                        `\n    Example: "Herz" (mixed) → ["Herz", "Herz", "Herzen", "Herzens", "Herzen"]`
                    );
                }
            }
            return `**${lang}**:\n${lines.join('\n')}`;
        }).join('\n\n');

        parts.push(`=== IF shell pos = "n." (noun) ===\n${nounBlocks}`);
    }

    // ── VERB ──────────────────────────────────────────────────────────────────
    if (showVerb) {
        const verbBlocks = langs.map(lang => {
            const lines: string[] = [];
            if (VERB_GROUP_LANGS.has(lang)) {
                lines.push(`  - verb_group (REQUIRED for ALL verbs): e.g. "1st group (-er)", "3rd group (irregular)"`);
            }
            const verbForms = VERB_KEY_FORMS[lang];
            if (verbForms && verbForms.length > 0) {
                const example = lang === 'fr' ? `\n    Example: "être" → ["été", "suis", "est", "sont"]`
                    : lang === 'en' ? `\n    Example: "go" → ["went", "gone"]`
                        : lang === 'de' ? `\n    Example: "gehen" → ["ging", "gegangen", "sein"]`
                            : lang === 'ja' ? `\n    Example: "する" → ["して", "した", "しない"]`
                                : lang === 'es' ? `\n    Example: "ir" → ["ido", "voy", "fui"]`
                                    : lang === 'it' ? `\n    Example: "andare" → ["andato", "vado", "vanno"]`
                                        : lang === 'pt' ? `\n    Example: "ir" → ["ido", "vou", "fui"]`
                                            : '';
                lines.push(
                    `  - key_forms (only if irregular): string[] positions:\n` +
                    verbForms.map((f, i) => `      [${i}] ${f}`).join('\n') +
                    example
                );
            }
            if (lines.length === 0) return null;
            return `**${lang}**:\n${lines.join('\n')}`;
        }).filter(Boolean).join('\n\n');

        if (verbBlocks) parts.push(`=== IF shell pos = "v." / "v.t." / "v.i." (verb) ===\n${verbBlocks}`);
    }

    // ── ADJECTIVE ─────────────────────────────────────────────────────────────
    if (showAdj) {
        const adjBlocks = langs.map(lang => {
            const adjForms = ADJ_KEY_FORMS[lang];
            if (!adjForms || adjForms.length === 0) return null;
            const adjExample = lang === 'en' ? `\n    Example: "good" → ["better", "best"]`
                : lang === 'fr' ? `\n    Example: "bon" → ["meilleur", "le meilleur", "bel", "belle", "beaux", "belles"]`
                    : lang === 'de' ? `\n    Example: "gut" → ["besser", "am besten"]`
                        : '';
            return (
                `**${lang}**:\n` +
                `  - key_forms (only if irregular comparison): string[] positions:\n` +
                adjForms.map((f, i) => `      [${i}] ${f}`).join('\n') +
                adjExample
            );
        }).filter(Boolean).join('\n\n');

        if (adjBlocks) parts.push(`=== IF shell pos = "adj." (adjective) ===\n${adjBlocks}`);
    }

    if (parts.length === 0) return '';

    return `#### **Traits Rules**
Fill "traits" based on the shell's **pos** AND language.
Omit a language from the traits map if none of the rules apply.
CRITICAL: If NO language has any applicable trait, OMIT the "traits" key entirely. Never output "traits": {}.

${parts.join('\n\n')}

Decision test: "Can a learner derive this form from verb_group / case_pattern?" If YES → omit key_forms.`;
}

/**
 * Builds the JSON schema skeleton string for only the requested delta fields.
 * Sections are included only when the corresponding missing arrays are non-empty.
 */
function buildDeltaSchema(missing: DeltaMissing, personaId: string): string {
    const sections: string[] = [];

    if (missing.langs.length > 0) {
        sections.push(`  "meaning": {
    ${missing.langs.map(l => `"${l}": "<definition ≤40 words/chars>"`).join(',\n    ')}
  }`);

        sections.push(`  "shells": {
    ${missing.langs.map(l =>
            `"${l}": { "text": "...", "pronunciation": "...", "pos": "n.|v.|adj.|...", "level": "A1-C2", "wordFrequency": 0 }`
        ).join(',\n    ')}
  }`);

        sections.push(`  "flavorText": [
    {
      "persona": "${personaId}",
      "text": { ${missing.langs.map(l => `"${l}": "..."`).join(', ')} },
      "example": { ${missing.langs.map(l => `"${l}": "..."`).join(', ')} }
    }
  ]`);

        const wfLangs = [...new Set([...missing.langs, ...missing.wordFamilyLangs])];
        sections.push(`  "wordFamily": {
    ${wfLangs.map(l =>
            `"${l}": { "root": "...", "derivations": [{ "word": "...", "pos": "..." }] }`
        ).join(',\n    ')}
  }`);

    } else {
        if (missing.personas.length > 0) {
            sections.push(`  "flavorText": [
    ${missing.personas.map(p => `{
      "persona": "${p}",
      "text": { "<lang>": "..." },
      "example": { "<lang>": "..." }
    }`).join(',\n    ')}
  ]`);
        }

        if (missing.wordFamilyLangs.length > 0) {
            sections.push(`  "wordFamily": {
    ${missing.wordFamilyLangs.map(l =>
                `"${l}": { "root": "...", "derivations": [{ "word": "...", "pos": "..." }] }`
            ).join(',\n    ')}
  }`);
        }
    }

    if (missing.traitLangs.length > 0 || missing.langs.length > 0) {
        sections.push(`  "traits": {
    "<lang_code (only if applicable)>": [
      { "traitId": "gender|verb_group|case_pattern|plural_form|key_forms", "value": "string or string[]" }
    ]
  }`);
    }

    return `{\n${sections.join(',\n')}\n}`;
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Builds the Delta Prompt for incremental version-upgrade data generation.
 *
 * Call this when a Cache Hit reveals that the existing SenseEntity is missing
 * data introduced in a newer game version (new language like 'ko', or a new
 * data field like 'qualia'). The AI returns only the missing fields as pure
 * values; meta injection is handled by the backend after parsing.
 *
 * @throws {Error} If all missing arrays are empty (nothing to generate).
 */
export function buildDeltaPrompt(params: DeltaPromptParams): DeltaPromptResult {
    const { concept, definition, existingShells, pos, missing, personaId, personaNarrative } = params;

    // Guard: nothing to generate
    const totalMissing =
        missing.langs.length +
        missing.personas.length +
        missing.wordFamilyLangs.length +
        missing.traitLangs.length;

    if (totalMissing === 0) {
        throw new Error('[DeltaPromptBackend] buildDeltaPrompt called with all-empty missing arrays. Nothing to generate.');
    }

    // 1. Resolve Persona
    const persona = PERSONA_DICTIONARY[personaId] ?? PERSONA_DICTIONARY['default']!;
    let activeInstructions = persona.default;
    if (personaNarrative && persona.narratives?.[personaNarrative]) {
        activeInstructions = persona.narratives[personaNarrative]!;
    }
    const textInstruction = `${activeInstructions.textInstruction}\n- **LENGTH LIMIT**: MUST be strictly under 25 words/characters.`;
    const exampleInstruction = `${activeInstructions.exampleInstruction}\n- **LENGTH LIMIT**: Should ideally be under 25 words/characters.`;

    // 2. Build sections
    const deltaSchema = buildDeltaSchema(missing, personaId);

    const traitLangsForSection = [
        ...new Set([...missing.traitLangs, ...missing.langs]),
    ];
    const traitsSection = buildDeltaTraitsSection(traitLangsForSection, pos);

    // 3. Existing shells context block (for ROOT RULE)
    const shellsContext = Object.keys(existingShells).length > 0
        ? Object.entries(existingShells)
            .map(([lang, text]) => `  - ${lang}: "${text}"`)
            .join('\n')
        : '  (none — all languages are new)';

    // 4. Assemble systemPrompt
    const systemPrompt = `You are a Senior Lexicographer performing a VERSION-UPGRADE DELTA fill.

A SenseEntity already exists. A new game version introduced new languages or data fields.
Your ONLY task is to generate the MISSING fields listed below for this existing Sense.
Do NOT re-output any already-existing data. Output PURE VALUES only — zero "meta" fields.

[SENSE CONTEXT]
Concept:    "${concept}"
Definition: "${definition}"

[EXISTING WORD FORMS — for ROOT RULE anchoring]
${shellsContext}

[DELTA SCHEMA — output ONLY this structure]
${deltaSchema}

[FILLING RULES]

A. Meaning
   - Native-language dictionary definition. ≤40 words/characters.
   - Write in the target language's native mindset. No literal English translation.

B. Shells
   - Exactly ONE shell per language (the most canonical word/phrase for the concept).
   - pronunciation: IPA for en/de/fr/es/it/pt, Pinyin for zh-CN, rōmaji/kana for ja. Use "none" if N/A.
   - pos: MUST be one of: n. | v. | v.t. | v.i. | adj. | adv. | prep. | conj. | pron. | int.
   - INDEPENDENT SCORING: level (A1-C2) and wordFrequency (1-100) evaluate ONLY the word itself as a
     standalone dictionary headword. Ignore the current concept's semantic complexity entirely.

C. FlavorText
   - persona: "${personaId}"
   - text: ${textInstruction}
   - example: ${exampleInstruction}
   - NATIVE AUTHENTICITY: Write directly in each language's native mindset. No English-derived phrasing.

D. WordFamily (ROOT RULE — STRICT)
   - root: Reduce shells[lang].text to its irreducible etymological base WITHIN THE SAME LANGUAGE.
     Use the "Existing Word Forms" above as the starting point for established languages.
     For new languages (not in existing forms), derive root from the new shell you just generated.
     Cross-etymology is forbidden. Borrowings/learned terms with no productive root: root = itself.
   - derivations: 3–6 closely related + 1–3 distantly related morphological relatives.
     Each: { "word": string, "pos": one of the exact POS strings above }
     Include only real morphological derivations — no inflectional forms (walked/walks).

${traitsSection ? `E. Traits\n${traitsSection}` : ''}

CRITICAL REMINDERS:
- Do NOT output any "meta" fields anywhere. Meta is injected by the backend.
- If traits has no applicable entries for any language, OMIT the "traits" key entirely.
- Output RAW JSON ONLY — no markdown, no explanations.`;

    // 5. Assemble userPrompt
    const missingDetails: string[] = [];
    if (missing.langs.length > 0)
        missingDetails.push(`New languages (full data — meaning + shells + flavorText + wordFamily + traits): [${missing.langs.join(', ')}]`);
    if (missing.personas.length > 0)
        missingDetails.push(`New personas (flavorText only, all existing languages): [${missing.personas.join(', ')}]`);
    if (missing.wordFamilyLangs.length > 0)
        missingDetails.push(`WordFamily-only languages (shells already exist): [${missing.wordFamilyLangs.join(', ')}]`);
    if (missing.traitLangs.length > 0)
        missingDetails.push(`Traits-only languages (version-upgrade rule expansion): [${missing.traitLangs.join(', ')}]`);

    const userPrompt = `[DELTA TASK]
Generate the missing version-upgrade data for sense "${concept}":

${missingDetails.join('\n')}

Output RAW JSON ONLY, matching the Delta Schema above exactly.`;

    return { systemPrompt, userPrompt, missing };
}
