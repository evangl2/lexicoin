/**
 * injectSenseMeta.ts
 *
 * Post-processing utility that injects `meta: { stability: 100.0 }` into
 * every appropriate node of a raw AI-generated SenseEntity JSON.
 *
 * The AI is NOT asked to produce meta anymore — it only returns pure values.
 * This function runs immediately after JSON.parse() on the AI response,
 * before the payload is written to the database.
 *
 * Injection map (structure-aware, NOT a generic recursive walker):
 *
 *  frequency          { value }         → { value, meta }
 *  ontology           { value }         → { value, meta }
 *  meaning[lang]      { value }         → { value, meta }
 *  flavorText[].text[lang]   { value }  → { value, meta }
 *  flavorText[].example[lang]{ value }  → { value, meta }
 *  shells[lang][i]    { text, ... }     → each sub-field wrapped, + shell-level meta
 *  wordFamily[lang]   { root, ... }     → lang-node gets meta
 *  traits[lang][i]    { traitId,value } → each entry gets meta
 */

const META = { stability: 100.0 } as const;

/** Wraps a raw scalar or { value } node into { value, meta } */
function wv<T>(node: T | { value: T }): { value: T; meta: typeof META } {
    if (node !== null && typeof node === 'object' && 'value' in (node as object)) {
        return { value: (node as { value: T }).value, meta: META };
    }
    return { value: node as T, meta: META };
}

// ── Raw AI output shapes (meta-free) ────────────────────────────────────────

export interface RawShell {
    text: string | { value: string };
    pronunciation: string | { value: string };
    pos: string | { value: string };
    level: string | { value: string };
    wordFrequency: number | { value: number };
}

export interface RawTrait {
    traitId: string;
    value: string | string[];
}

export interface RawWordFamilyEntry {
    root: string;
    derivations: { word: string; pos: string }[];
}

export interface RawFlavorTextEntry {
    persona: string;
    text: Record<string, string | { value: string }>;
    example: Record<string, string | { value: string }>;
}

export interface RawSenseAIOutput {
    fingerprint: { items: { word: string; tier: 1 | 2 | 3 }[] };
    frequency: number | { value: number };
    ontology: string | { value: string };
    meaning: Record<string, string | { value: string }>;
    flavorText: RawFlavorTextEntry[];
    shells: Record<string, RawShell[]>;
    wordFamily: Record<string, RawWordFamilyEntry>;
    traits?: Record<string, RawTrait[]>;
}

// ── Injected output shape (with meta) ───────────────────────────────────────

export interface InjectedValue<T> { value: T; meta: typeof META }

export interface InjectedShell {
    text: InjectedValue<string>;
    pronunciation: InjectedValue<string>;
    pos: InjectedValue<string>;
    level: InjectedValue<string>;
    wordFrequency: InjectedValue<number>;
    meta: typeof META;
}

export interface InjectedTrait {
    traitId: string;
    value: string | string[];
    meta: typeof META;
}

export interface InjectedWordFamilyEntry {
    root: string;
    derivations: { word: string; pos: string }[];
    meta: typeof META;
}

export interface InjectedFlavorTextEntry {
    persona: string;
    text: Record<string, InjectedValue<string>>;
    example: Record<string, InjectedValue<string>>;
}

export interface SenseAIPayload {
    fingerprint: { items: { word: string; tier: 1 | 2 | 3 }[] };
    frequency: InjectedValue<number>;
    ontology: InjectedValue<string>;
    meaning: Record<string, InjectedValue<string>>;
    flavorText: InjectedFlavorTextEntry[];
    shells: Record<string, InjectedShell[]>;
    wordFamily: Record<string, InjectedWordFamilyEntry>;
    traits?: Record<string, InjectedTrait[]>;
}

// ── Main injection function ──────────────────────────────────────────────────

/**
 * Takes the raw (meta-free) JSON returned by the AI model and injects
 * `meta: { stability: 100.0 }` into every appropriate node.
 *
 * The returned object is ready to be merged with uid / visual / timestamps
 * and written to the database.
 */
export function injectSenseMeta(raw: RawSenseAIOutput): SenseAIPayload {
    // ── frequency & ontology ──────────────────────────────────────────────
    const frequency = wv<number>(raw.frequency as number);
    const ontology = wv<string>(raw.ontology as string);

    // ── meaning ───────────────────────────────────────────────────────────
    const meaning: Record<string, InjectedValue<string>> = {};
    for (const lang of Object.keys(raw.meaning ?? {})) {
        meaning[lang] = wv<string>(raw.meaning[lang] as string);
    }

    // ── flavorText ────────────────────────────────────────────────────────
    const flavorText: InjectedFlavorTextEntry[] = (raw.flavorText ?? []).map(entry => {
        const text: Record<string, InjectedValue<string>> = {};
        const example: Record<string, InjectedValue<string>> = {};
        for (const lang of Object.keys(entry.text ?? {})) {
            text[lang] = wv<string>(entry.text[lang] as string);
        }
        for (const lang of Object.keys(entry.example ?? {})) {
            example[lang] = wv<string>(entry.example[lang] as string);
        }
        return { persona: entry.persona, text, example };
    });

    // ── shells ────────────────────────────────────────────────────────────
    const shells: Record<string, InjectedShell[]> = {};
    for (const lang of Object.keys(raw.shells ?? {})) {
        const shellRaw = raw.shells[lang];
        if (!shellRaw) continue;
        const shellArr = Array.isArray(shellRaw) ? shellRaw : [shellRaw];
        shells[lang] = shellArr.map((sh): InjectedShell => ({
            text: wv<string>(sh.text as string),
            pronunciation: wv<string>(sh.pronunciation as string),
            pos: wv<string>(sh.pos as string),
            level: wv<string>(sh.level as string),
            wordFrequency: wv<number>(sh.wordFrequency as number),
            meta: META,
        }));
    }

    // ── wordFamily ────────────────────────────────────────────────────────
    const wordFamily: Record<string, InjectedWordFamilyEntry> = {};
    for (const lang of Object.keys(raw.wordFamily ?? {})) {
        const wf = raw.wordFamily[lang];
        if (!wf) continue;
        wordFamily[lang] = {
            root: wf.root,
            derivations: wf.derivations,
            meta: META,
        };
    }

    // ── traits ────────────────────────────────────────────────────────────
    let traits: Record<string, InjectedTrait[]> | undefined;
    if (raw.traits && Object.keys(raw.traits).length > 0) {
        traits = {};
        for (const lang of Object.keys(raw.traits)) {
            const entries = raw.traits[lang];
            if (!entries) continue;
            traits[lang] = entries.map((t): InjectedTrait => ({
                traitId: t.traitId,
                value: t.value,
                meta: META,
            }));
        }
    }
    // If raw.traits is absent or {}, leave traits undefined (never output {})

    return {
        fingerprint: raw.fingerprint, // no meta on fingerprint items
        frequency,
        ontology,
        meaning,
        flavorText,
        shells,
        wordFamily,
        ...(traits ? { traits } : {}),
    };
}
