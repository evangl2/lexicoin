/**
 * Edge Function Type Definitions for Synthesize-Sense
 */

export type ArchetypeId = 1 | 2 | 3 | 4 | 5 | 6;

export interface SynthesisRequest {
    input_1_id: string;
    input_2_id: string;
    lang: string;
    max_level?: string;
    target_languages?: string[];
    personaId?: string;
    personaNarrative?: string;
    visual_id?: string;
}

export type SynthesisErrorCode =
    | 'NO_SYNERGY'
    | 'OFFENSIVE'
    | 'TOO_COMPLEX'
    | 'INPUT_NOT_FOUND'
    | 'GENERATION_FAILED'
    | 'LLM_ERROR';

export interface SynthesisFailureResponse {
    error: SynthesisErrorCode;
    message?: string;
}

// ============================================================================
// AI Prompt Outputs
// ============================================================================

export interface GeminiSynthesisOutput {
    outcome: 'success' | 'failure';
    result_concept: string;
    result_definition_en: string;
    archetype_used: number;
    synthesis_reason: string | Record<string, string>;
    failure_code?: string;
}

// ============================================================================
// Payload Types
// ============================================================================

export interface RawShell {
    text: string;
    pronunciation: string;
    pos: string;
    level: string;
    wordFrequency: number;
}

export interface RawWordFamilyDerivation {
    word: string;
    pos: string;
}

export interface RawWordFamily {
    root: string;
    derivations: RawWordFamilyDerivation[];
}

export interface RawTrait {
    traitId: string;
    value: string | string[];
}

/**
 * RawSenseAIOutput (AI 纯值输出，无 meta 字段)
 */
export interface RawSenseAIOutput {
    fingerprint: string;
    frequency: number;
    ontology: string;
    meaning: Record<string, string>;
    flavorText: Array<{
        persona: string;
        text: Record<string, string>;
        example: Record<string, string>;
    }>;
    shells: Record<string, RawShell[]>;
    wordFamily: Record<string, RawWordFamily>;
    traits?: Record<string, RawTrait[]>;
}

// ============================================================================
// Meta-Injected Types
// ============================================================================

export interface EntryMetadata {
    stability: number;
}

export interface MetaInjected<T> {
    value: T;
    meta: EntryMetadata;
}

export interface MetaShell {
    text: MetaInjected<string>;
    pronunciation: MetaInjected<string>;
    pos: MetaInjected<string>;
    level: MetaInjected<string>;
    wordFrequency: MetaInjected<number>;
    meta: EntryMetadata; // Shell-level meta
}

export interface MetaWordFamilyDerivation {
    word: string;
    pos: string;
}

export interface MetaWordFamily {
    root: string;
    derivations: MetaWordFamilyDerivation[];
    meta: EntryMetadata;
}

export interface MetaTrait {
    traitId: string;
    value: string | string[];
    meta: EntryMetadata;
}

/**
 * SenseAIPayload (后端注入 meta 后)
 */
export interface SenseAIPayload {
    fingerprint: MetaInjected<string>;
    frequency: MetaInjected<number>;
    ontology: MetaInjected<string>;
    meaning: Record<string, MetaInjected<string>>;
    flavorText: Array<{
        persona: string;
        text: Record<string, MetaInjected<string>>;
        example: Record<string, MetaInjected<string>>;
        meta: EntryMetadata;
    }>;
    shells: Record<string, MetaShell[]>;
    wordFamily: Record<string, MetaWordFamily>;
    traits?: Record<string, MetaTrait[]>;
}

export interface SynthesisSuccessResponse {
    synthesisReason: string | Record<string, string>;
    sense: SenseAIPayload & { uid: string };
    visual: any; // visual details or null if pending
    cached: boolean;
}
