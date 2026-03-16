import { PERSONA_DICTIONARY } from './PersonaDictionary.ts';
import {
  VERB_KEY_FORMS,
  NOUN_KEY_FORMS,
  ADJ_KEY_FORMS,
} from '@schemas/schemas/KeyFormsDictionary.config.ts';

export interface SensePromptParams {
  concept: string;
  definition: string;
  target_languages: string[];
  personaId: string;
  personaNarrative?: string;
}

// Languages that have grammatical gender (applies to nouns)
const GENDERED_LANGS = new Set(['fr', 'de', 'es', 'it', 'pt']);

// Languages that use verb conjugation groups (applies to verbs)
const VERB_GROUP_LANGS = new Set(['fr', 'es', 'it', 'pt']);

/**
 * Builds the Linguistic Traits section (Section F) dynamically.
 * Structure: three POS branches (noun / verb / adjective), each listing
 * per-language rules for only the languages in target_languages.
 */
function buildTraitsSection(target_languages: string[]): string {
  // ── NOUN block ────────────────────────────────────────────────────────────
  const nounBlocks = target_languages
    .map(lang => {
      const lines: string[] = [];
      // plural_form applies to ALL languages (e.g. en: children, de: Kinder)
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
    })
    .filter(Boolean)
    .join('\n\n');

  // ── VERB block ────────────────────────────────────────────────────────────
  const verbBlocks = target_languages
    .map(lang => {
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
    })
    .filter(Boolean)
    .join('\n\n');

  // ── ADJECTIVE block ───────────────────────────────────────────────────────
  const adjBlocks = target_languages
    .map(lang => {
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
    })
    .filter(Boolean)
    .join('\n\n');

  return `#### **F. Linguistic Traits**
Fill "traits" based on the shell's **pos** AND **language**.
Omit a language from the traits map entirely if none of the rules below apply to it.

=== IF shell pos = "n." (noun) ===
${nounBlocks || '(No gendered languages in target_languages — skip traits for all nouns)'}

  For any language NOT listed above: if no traits apply, omit that language from the map.

=== IF shell pos = "v." / "v.t." / "v.i." (verb) ===
${verbBlocks || '(No verb-group or key-forms languages in target_languages)'}

=== IF shell pos = "adj." (adjective) ===
${adjBlocks || '(No adjective key-forms languages in target_languages)'}

CRITICAL: key_forms only for genuinely IRREGULAR forms that standard rules cannot derive.
Regular words need no key_forms.
Decision test: "Can a learner derive this form from the base word + verb_group/case_pattern?" If YES → omit key_forms.`;
}

export function buildSensePrompt(params: SensePromptParams): { systemPrompt: string; userPrompt: string } {
  const { concept, definition, target_languages, personaId, personaNarrative } = params;

  // 1. Resolve Persona
  const persona = PERSONA_DICTIONARY[personaId] || PERSONA_DICTIONARY['default']!;
  let activeInstructions = persona.default;
  if (personaNarrative && persona.narratives && persona.narratives[personaNarrative]) {
    activeInstructions = persona.narratives[personaNarrative]!;
  }

  const textInstruction = `${activeInstructions.textInstruction}\n- **LENGTH LIMIT**: MUST be strictly under 25 words/characters.`;
  const exampleInstruction = `${activeInstructions.exampleInstruction}\n- **LENGTH LIMIT**: Should ideally be under 25 words/characters.`;

  // 2. Build Section F dynamically
  const sectionF = buildTraitsSection(target_languages);

  const systemPrompt = `You are a Senior Semantic Architect and Multi-language Lexicographer. 
Your mission is to transform a conceptual "Sense" into a high-fidelity **SenseEntity** JSON object.

### **1. THE MASTER SCHEMA FRAMEWORK**
You must strictly output the JSON according to this structure:

{
  "fingerprint": {
    "items": [
      { "word": "lemma_form", "tier": 1 | 2 | 3 }
    ]
  },
  "frequency": 0,
  "ontology": "OBJECT | PROCESS | PROPERTY | STATE | LOCATION | ABSTRACT",
  "meaning": {
    "lang_code": "Detailed dictionary definition (max 40 words/chars)"
  },
  "flavorText": [
    {
      "persona": "${personaId}",
      "text": { "lang_code": "..." },
      "example": { "lang_code": "..." }
    }
  ],
  "shells": {
    "lang_code": [
      {
        "text": "word_or_phrase",
        "pronunciation": "...",
        "pos": "n. | v. | v.t. | v.i. | adj. | adv. | prep. | conj. | pron. | int.",
        "level": "A1-C2",
        "wordFrequency": 0
      }
    ]
  },
  "wordFamily": {
    "lang_code": {
      "root": "irreducible_root_morpheme",
      "derivations": [
        { "word": "derived_word", "pos": "n. | v. | adj. | ..." }
      ]
    }
  },
  "traits": {
    "lang_code (only if applicable)": [
      { "traitId": "gender | verb_group | case_pattern | plural_form | key_forms", "value": "string or string[]" }
    ]
  }
}

> **SCHEMA CONSTRAINT**: Every \`lang_code\` in meaning / shells / wordFamily MUST be populated for: [${target_languages.join(', ')}]. Do not miss any language.
> For traits: only include a language key if it has at least one applicable trait. Omit languages with no traits.
> If NO language has any applicable trait, OMIT the "traits" key entirely from the JSON. Never output "traits": {}.
> **DO NOT output any \`meta\` fields.** Meta data is injected automatically by the backend after your response is received.

### **2. COMPREHENSIVE FILLING INSTRUCTIONS**

#### **A. Semantic DNA (Fingerprint)**
- **Protocol**: Analyze the input sense to identify the unique semantic core.
- **Word Selection**: Provide **EXACTLY 6** English terms that best define this core sense.
- **Language**: Always use English words for the fingerprint regardless of the input language.
- **Tier Logic**: 
    - **Tier 1**: Essential words. If missing, the sense changes fundamentally.
    - **Tier 2**: Very close synonyms or descriptors with slight nuance differences.
    - **Tier 3**: Broadly related terms mapping the general semantic field.
- **Normalization**: 
    - **Strict Lemmatization**: Always use the most basic lemma form (e.g., "spring", NOT "springs"). 
    - **Forms**: Prefer **NOUN** forms for objects/entities and **ADJECTIVE** forms for properties. No past tense, no plurals, no progressive forms.
- **Sorting**: Sort by Tier (Tier 1 first, then 2, then 3).

#### **B. Ontology & Frequency**
- **Ontology Selection**:
    - \`OBJECT\`: Physical, tangible entities (e.g., "mountain").
    - \`PROCESS\`: Actions, events, or changes over time (e.g., "oxidation").
    - \`PROPERTY\`: Characteristics or qualities (e.g., "fragile").
    - \`STATE\`: Ongoing conditions or modes of existence (e.g., "serenity").
    - \`LOCATION\`: Physical or conceptual spaces/positions (e.g., "abyss").
    - \`ABSTRACT\`: Pure concepts, systems, or ideals (e.g., "entropy").
- **Frequency**: 1-100 score. 100 = universal daily concept; 1 = extremely rare/specialized sense.

#### **C. Meaning & FlavorText**
- **meaning**: meaning must be **dictionary-level detailed explanations, no more than 40 words/characters**.
- **flavorText - text**: ${textInstruction}
- **flavorText - example**: ${exampleInstruction}
- **NATIVE AUTHENTICITY (CRITICAL)**: Write \`meaning\`, \`text\`, and \`example\` directly in the target language's native mindset. **Literal translations from English are strictly prohibited.** You must use culturally accurate idioms, natural phrasing, and authentic sentence structures. The output must be indistinguishable from a native speaker's original writing.

#### **D. Shells**
- **Shells Exclusion**: In the "shells" object, provide **EXACTLY ONE** (the most core and accurate) Shell element per language. Do not output multiple variations.
- **text**: the word or phrase that corresponds to the sense.
- **pronunciation**: Phonetic notation based on the specific language. (eg.IPA for english, Pinyin with tone marks for simplified chinese) If no phonetic notation exists for that language, use \`none\`.
- **pos (Part of Speech)**: MUST be one of the following exact strings: \`'n.' | 'v.' | 'v.t.' | 'v.i.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.'\`.
- **Level**: Map the \`text\`'s difficulty in its language to the equivalent English **CEFR (A1-C2)** level.
- **wordFrequency**: 1-100 score. 100 = the word or phrase in \`text\` is a universal daily concept; 1 = extremely rare.
- **INDEPENDENT SCORING (CRITICAL)**: \`level\` and \`wordFrequency\` MUST ONLY evaluate the word/phrase in \`shells.text.value\` as a standalone dictionary headword. Absolutely ignore the current concept's specific meaning when scoring these two fields. (e.g., Even if the meaning is a complex theological metaphor, if the \`text.value\` is simply "water", the level is A1 and frequency is 100). Conversely, \`pos\` must match the specific meaning.

#### **E. Word Family**
Fill "wordFamily" for EVERY language in [${target_languages.join(', ')}].
- **"root"**: Reduce shells[lang].text.value to its irreducible etymological base.
  (e.g. "firefighter" → "fire", "création" → "créer", "Feuerwehr" → "Feuer")
  **ROOT RULE**: The root must be the DIRECT etymological base of shells[lang].text.value within the SAME language. Do NOT cross into another word's etymology. If the word is a borrowing or learned term with no productive morphological root in that language (e.g. "entropy", "エントロピー"), use the word itself as root.
- **"derivations"**: 3–6 closely related + 1–3 distantly related morphological relatives.
  Each: { "word": string, "pos": one of the exact POS strings above }
  Every language has real morphological derivations — always provide actual words.

${sectionF}`;

  const userPrompt = `[TASK DATA]
Concept: "${concept}"
Definition (Base): "${definition}"

[EXECUTION]
Construct the SenseEntity JSON. Ensure all ${target_languages.length} languages are filled in meaning, shells, and wordFamily with high precision.
Fill traits per pos+language rules above; omit languages with no applicable traits.
Output RAW JSON ONLY.`;

  return { systemPrompt, userPrompt };
}
