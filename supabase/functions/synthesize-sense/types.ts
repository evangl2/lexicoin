/**
 * Edge Function Type Definitions for synthesize-sense
 * Aligned with TDD v3, injectSenseMeta.ts, and actual Supabase DB schema.
 */

// ── Synthesis Request / Response ─────────────────────────────────────────────

export type ArchetypeId = 1 | 2 | 3 | 4 | 5 | 6;

export interface SynthesisRequest {
    input_1_id: string;
    input_2_id: string;
    systemlang: string;
    learninglang: string;
    max_level?: string;
    target_languages?: string[];
    personaId?: string;
    personaNarrative?: string;
    visual_id?: string;
    modelId?: string;
}

export type SynthesisErrorCode =
    | 'NO_SYNERGY'
    | 'OFFENSIVE'
    | 'TOO_COMPLEX'
    | 'INPUT_NOT_FOUND'
    | 'GENERATION_FAILED'
    | 'LLM_ERROR';

export interface SynthesisFailureResponse {
    success: false;
    error: {
        code: SynthesisErrorCode;
        message: string;
    };
}

// ── AI Prompt Outputs ─────────────────────────────────────────────────────────

export interface GeminiSynthesisOutput {
    outcome: 'success' | 'failure';
    result_concept: string | null;
    result_definition_en: string | null;
    archetype_used: string;
    failure_code?: string | null;
}

// ── Raw AI Output (meta-free, straight from AI) ───────────────────────────────

export interface RawShell {
    text: string | { value: string };
    pronunciation: string | { value: string };
    pos: string | { value: string };
    level: string | { value: string };
    wordFrequency: number | { value: number };
}

export interface RawWordFamilyDerivation {
    word: string;
    pos: string;
}

export interface RawWordFamilyEntry {
    root: string;
    derivations: RawWordFamilyDerivation[];
}

export interface RawTrait {
    traitId: string;
    value: string | string[];
}

export interface RawFlavorTextEntry {
    persona: string;
    text: Record<string, string | { value: string }>;
    example: Record<string, string | { value: string }>;
}

/**
 * RawSenseAIOutput: pure values from AI (no meta fields).
 * Must be passed through injectSenseMeta() before writing to DB.
 */
export interface RawSenseAIOutput {
    fingerprint: { items: { word: string; tier: 1 | 2 | 3 }[] };
    frequency: number | { value: number };
    ontology: string | { value: string };
    meaning: Record<string, string | { value: string }>;
    flavorText: RawFlavorTextEntry[];
    shells: Record<string, RawShell[]>;
    wordFamily: Record<string, RawWordFamilyEntry>;
    traits?: Record<string, RawTrait[]>;
    constraints?: { maxLevel: string };
}

// ── Meta-Injected Types (after injectSenseMeta) ───────────────────────────────

export interface EntryMetadata {
    stability: number;
}

export interface InjectedValue<T> {
    value: T;
    meta: EntryMetadata;
}

export interface InjectedShell {
    text: InjectedValue<string>;
    pronunciation: InjectedValue<string>;
    pos: InjectedValue<string>;
    level: InjectedValue<string>;
    wordFrequency: InjectedValue<number>;
    meta: EntryMetadata;
}

export interface InjectedWordFamilyEntry {
    root: string;
    derivations: { word: string; pos: string }[];
    meta: EntryMetadata;
}

export interface InjectedTrait {
    traitId: string;
    value: string | string[];
    meta: EntryMetadata;
}

export interface InjectedFlavorTextEntry {
    persona: string;
    text: Record<string, InjectedValue<string>>;
    example: Record<string, InjectedValue<string>>;
}

/**
 * SenseAIPayload: output of injectSenseMeta(). All nodes have meta injected.
 */
export interface SenseAIPayload {
    fingerprint: { items: { word: string; tier: 1 | 2 | 3 }[] };
    frequency: InjectedValue<number>;
    ontology: InjectedValue<string>;
    meaning: Record<string, InjectedValue<string>>;
    flavorText: InjectedFlavorTextEntry[];
    shells: Record<string, InjectedShell[]>;
    wordFamily: Record<string, InjectedWordFamilyEntry>;
    traits?: Record<string, InjectedTrait[]>;
    constraints?: { maxLevel: string };
}

// ── Visual Payload ────────────────────────────────────────────────────────────

export interface VisualPayload {
    uid: string;        // sense_id
    id: string;         // visual variant id, e.g. "default"
    payload: string;    // TSX component string
    meta: {
        stability: number;
        firstDiscoverer: string;
        firstDiscoveredAt: number;
    };
}

// ── Success Response ──────────────────────────────────────────────────────────

export interface SynthesisSuccessResponse {
    success: true;
    data: {
        sense: SenseAIPayload & { uid: string };
        visual: VisualPayload | null;
        cached: boolean;
        isNewDiscovery: boolean;
        archetypeUsed: string;
    };
}

// ── DeltaMissing (used by buildDeltaPrompt) ───────────────────────────────────

export interface DeltaMissing {
    langs: string[];            // entirely missing language data
    personas: string[];         // existing langs, missing specific persona FlavorText
    wordFamilyLangs: string[];  // existing shells, missing wordFamily
    traitLangs: string[];       // existing shells, missing/incomplete traits
}
