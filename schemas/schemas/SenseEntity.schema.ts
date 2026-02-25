/**
 * Project: Semantic Module [08] - SenseEntity Schema Definition
 * 
 * Purpose:
 * This file defines the foundational schema for SenseEntity, the core object
 * in the global semantic registry representing language-independent concepts.
 * 
 * Key Design Principles:
 * 1. Language-Agnostic: Each SenseEntity represents a concept independent of any specific language.
 * 2. Granular Sedimentation: Every modifiable sub-item has individual metadata for quality tracking.
 * 3. Capacity Constraints: Qualia slots and WordShell arrays are limited to 20 items per language.
 * 4. High Fidelity: Visual entries store complete, indivisible payloads preserving logic and state.
 * 5. Identity Anchors: 'uid' and 'fingerprint' remain raw values without metadata wrapping.
 * 6. Cross-Linguistic Universality: Language-specific grammatical traits use a flexible
 *    key-value container (LinguisticTrait) instead of fixed fields, enabling support for
 *    any language without schema migration.
 * 
 * Metadata Strategy:
 * - Default: 'stability' only for most modifiable items (including LinguisticTraits).
 * - Enhanced: 'stability' + 'firstDiscoverer' for high-value items (Qualia text, Visual, Ontology).
 * - Nuances: Single metadata controls the entire set of nuance tags (not per-tag).
 * 
 * Integration:
 * - Interfaces with Sedimentation Module [14] for data quality management.
 * - Supports 8 core languages with extensible dynamic injection.
 */

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

/**
 * Supported languages in the system.
 * Default: 8 core languages (English, Chinese, French, German, Japanese, Spanish, Italian, Portuguese).
 * Extended: Union type allows dynamic language injection.
 */
export type Language = 'en' | 'zh-CN' | 'fr' | 'de' | 'ja' | 'es' | 'it' | 'pt' | string;

/**
 * Part-of-Speech enumeration.
 * Defines grammatical categories for word classification.
 * 
 * Verb transitivity:
 * - 'v.'   = ambitransitive (can be both transitive and intransitive, e.g., "eat")
 * - 'v.t.' = transitive only (requires direct object, e.g., "make", ja: 他動詞)
 * - 'v.i.' = intransitive only (no direct object, e.g., "arrive", ja: 自動詞)
 */
export type POS = 'n.' | 'v.' | 'v.t.' | 'v.i.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.';

/**
 * Word difficulty level based on CEFR (Common European Framework of Reference).
 * Range: A1 (beginner) to C2 (proficient).
 */
export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Ontological categories for concept classification.
 * Defines the fundamental nature of what the concept represents.
 */
export type OntologyType = 'OBJECT' | 'PROCESS' | 'PROPERTY' | 'STATE' | 'LOCATION' | 'ABSTRACT';

/**
 * Standardized trait identifiers for language-specific grammatical metadata.
 * 
 * Uses the same extensibility pattern as Language:
 * known values for IDE autocompletion + string fallback for future expansion.
 * 
 * Standard vocabulary:
 * - 'gender'       : Grammatical gender (masculine/feminine/neuter)
 * - 'plural_form'  : Irregular plural form (only when non-derivable from rules)
 * - 'verb_group'   : Verb conjugation class label (e.g., "1st group (-er)", "五段動詞")
 * - 'case_pattern' : Noun declension class label (e.g., "strong masculine", "2nd declension")
 * - 'key_forms'    : Irregular inflected forms array (positions defined by language-level static dictionary)
 */
export type TraitId = 'gender' | 'plural_form' | 'verb_group' | 'case_pattern' | 'key_forms' | string;

// ============================================================================
// METADATA SYSTEM
// ============================================================================

/**
 * Metadata for tracking data quality and provenance.
 * 
 * Each modifiable data item carries metadata to enable:
 * - Community-driven quality assessment (stability scoring)
 * - Attribution tracking (first discoverer)
 * - Sedimentation-based data evolution
 * 
 * This interfaces directly with the Sedimentation Module [14].
 */
export interface EntryMetadata {
    /**
     * Stability score: Community-driven quality metric.
     * - Incremented (+1) when users upvote/confirm accuracy.
     * - Decremented (-1) when users downvote/report issues.
     * - Used by sedimentation logic to determine data retention.
     * - Items with higher stability are protected from replacement.
     */
    stability: number;

    /**
     * First Discoverer: Attribution identifier.
     * Records the ID/name of the user who first generated or discovered this data item.
     * 
     * Tracked for high-value items:
     * - Qualia terms (logical relationships)
     * - Visual payloads (SVG animations)
     * - FlavorText entries (narrative descriptions)
     * - Meaning definitions (dictionary entries)
     * 
     * Not tracked for:
     * - Low-level metadata (POS, levels, frequencies)
     * - Automatically derived values
     */
    firstDiscoverer?: string;

    /**
     * First Discovered Timestamp: When this data item was first created.
     * Unix timestamp (milliseconds since epoch).
     * Tracks the creation time of the data entry.
     */
    firstDiscoveredAt?: number;
}

/**
 * Generic wrapper for values requiring sedimentation control.
 * 
 * Wraps raw data with associated metadata, enabling:
 * - Individual quality tracking per data item
 * - Granular replacement decisions in sedimentation
 * - Provenance tracking for user-generated content
 * 
 * @template T - The type of the wrapped value
 */
export interface PropertyEntry<T> {
    /** The actual data value */
    value: T;

    /** Quality and attribution metadata */
    meta: EntryMetadata;
}

// ============================================================================
// SEMANTIC FINGERPRINT
// ============================================================================

/**
 * Semantic Fingerprint: The immutable "DNA" of a concept.
 * 
 * Purpose:
 * - Enables fuzzy matching and semantic search in the database.
 * - Defines the core essence of a concept through 6 carefully selected anchor words.
 * - Provides a language-independent semantic signature.
 * 
 * Structure:
 * - EXACTLY 6 English words (no more, no less).
 * - Organized into 3 tiers by relevance weight:
 *   - Tier 1: Core essence (most defining characteristics)
 *   - Tier 2: Strong associations (highly relevant features)
 *   - Tier 3: Related concepts (contextual connections)
 * 
 * Immutability:
 * - Once set, fingerprints should rarely change.
 * - No metadata wrapper (fingerprint is identity, not modifiable data).
 * - Changes require administrative approval or major semantic revision.
 */
export interface Fingerprint {
    /**
     * Array of exactly 6 anchor words.
     * Each word is assigned a tier indicating its relevance weight.
     */
    items: {
        /** The anchor word in English */
        word: string;

        /** 
         * Relevance tier:
         * - 1: Core (most essential to the concept)
         * - 2: Strong (highly relevant attributes)
         * - 3: Related (contextual associations)
         */
        tier: 1 | 2 | 3;
    }[];
}

// ============================================================================
// QUALIA STRUCTURE (Logical Relationships)
// ============================================================================

/**
 * Qualia Item: A single logical relationship term within a Qualia role.
 * 
 * Based on Pustejovsky's Qualia Theory, representing one aspect of how
 * a concept relates to other concepts in a specific logical dimension.
 * 
 * Features:
 * - Text can be a single word OR a descriptive phrase.
 * - Each item anchored by its own semantic fingerprint.
 * - Individual metadata for sedimentation control.
 * - Maximum 20 items per language per Qualia role.
 */
export interface QualiaItem {
    /**
     * The relationship descriptor (word or phrase).
     * Wrapped in PropertyEntry for stability and discoverer tracking.
     */
    text: PropertyEntry<string>;

    /**
     * Semantic fingerprint anchoring this relationship.
     * Immutable anchor ensuring logical chain integrity.
     */
    fingerprint: Fingerprint;

    /**
     * Metadata for this specific Qualia relationship.
     * Tracks stability and first discoverer.
     */
    meta: EntryMetadata;
}

/**
 * Qualia Structure: Logical relationship engine.
 * 
 * Based on Pustejovsky's Qualia Theory, defines four fundamental dimensions
 * of how concepts relate to the world:
 * 
 * - Formal: What it IS (classification, taxonomy, category)
 *   Example for "book": object, artifact, publication
 * 
 * - Constitutive: What it's MADE OF (components, materials, parts)
 *   Example for "book": pages, cover, text, binding
 * 
 * - Telic: What it's FOR (purpose, function, goal)
 *   Example for "book": reading, learning, entertainment
 * 
 * - Agentive: How it CAME TO BE (origin, creation, causation)
 *   Example for "book": written, published, printed
 * 
 * Structure:
 * - Each role maps languages to arrays of QualiaItems.
 * - Supports 8 core languages + dynamic injection.
 * - Maximum 20 items per language per role.
 * - Each item can be a word or phrase.
 */
export interface QualiaStructure {
    /** Formal Role: Classification and categorical nature */
    formal: Record<Language, QualiaItem[]>;

    /** Constitutive Role: Components and material composition */
    constitutive: Record<Language, QualiaItem[]>;

    /** Telic Role: Purpose and functional goals */
    telic: Record<Language, QualiaItem[]>;

    /** Agentive Role: Origin and creation process */
    agentive: Record<Language, QualiaItem[]>;
}

// ============================================================================
// VISUAL LIBRARY
// ============================================================================

/**
 * Visual Entry: High-fidelity visual representation payload.
 * 
 * Purpose:
 * - Store different visual states/styles for a concept (e.g., default, magic, highlighted).
 * - Maintain complete React/Framer-Motion or SVG+CSS logic as indivisible units.
 * - Enable persona-driven or context-specific visual variations.
 * 
 * Storage Strategy:
 * - Generated and stored independently from main SenseEntity.
 * - Referenced back to parent via 'uid' for relational integrity.
 * - Complete payload preservation ensures no loss of animation/state logic.
 * 
 * Note:
 * Visual entries are stored as complete, indivisible payloads to preserve
 * all animation logic, state transitions, and styling information.
 */
export interface VisualEntry {
    /**
     * Parent SenseEntity UID.
     * Creates relational link back to the concept this visual represents.
     */
    uid: string;

    /**
     * Visual variant identifier.
     * Examples: 'default', 'magic', 'highlighted', 'persona_jester', etc.
     * Default value should be 'default'.
     */
    id: string;

    /**
     * Complete visual logic payload.
     * Contains full React/Framer-Motion component code or SVG+CSS markup.
     * Stored as string for maximum flexibility and preservation.
     */
    payload: string;

    /**
     * Metadata for quality tracking.
     * Includes stability score and first discoverer attribution.
     */
    meta: EntryMetadata;
}

// ============================================================================
// FLAVOR TEXT (Narrative Library)
// ============================================================================

/**
 * Flavor Text Entry: Persona-driven narrative descriptions.
 * 
 * Purpose:
 * - Provide engaging, personality-specific descriptions of concepts.
 * - Offer usage examples in different narrative styles.
 * - Support learning through storytelling and character-driven content.
 * 
 * Metadata Strategy:
 * - text: Map of Language to localized text entry with metadata.
 * - example: Map of Language to localized example entry with metadata.
 */
export interface FlavorTextEntry {
    /** The identifier for the AI Persona. */
    persona: string;

    /** Individual language text sub-items, each with its own stability/discoverer. */
    text: Record<Language, PropertyEntry<string>>;

    /** Individual language example sub-items, each with its own stability/discoverer. */
    example: Record<Language, PropertyEntry<string>>;
}

// ============================================================================
// LINGUISTIC TRAITS (Cross-linguistic Grammar)
// ============================================================================

/**
 * Linguistic Trait: A single language-specific grammatical fact.
 * 
 * Universal container for ALL language-specific grammatical metadata.
 * Uses key-value pairs where keys come from the TraitId vocabulary.
 * Only traits relevant to a given language are populated — no empty fields.
 * 
 * Examples:
 * - German noun:  [{ traitId: "gender", value: "neuter" }, { traitId: "plural_form", value: "Wässer" }]
 * - French verb:  [{ traitId: "verb_group", value: "1st group (-er)" }]
 * - Irregular:    [{ traitId: "verb_group", value: "3rd group (irregular)" },
 *                  { traitId: "key_forms", value: ["été", "suis", "est", "sont"] }]
 * - English noun: [{ traitId: "plural_form", value: "children" }]
 * - Chinese/Japanese: [] (no applicable word-level grammar traits)
 * 
 * Design Philosophy:
 * - Traits are OBJECTIVE grammatical facts (a word's gender doesn't change by context).
 * - Distinct from Nuance Matrix tags which are SUBJECTIVE usage dimensions.
 * - key_forms arrays have positional semantics defined by language-level static
 *   dictionaries (not stored per-word), enabling compact irregular form storage.
 * 
 * Metadata: Stability only (no discoverer tracking for grammatical facts).
 */
export interface LinguisticTrait {
    /** Standardized trait identifier from the TraitId vocabulary. */
    traitId: TraitId;

    /** 
     * The trait value.
     * - string for single-valued traits (gender, verb_group, case_pattern, plural_form)
     * - string[] for multi-valued traits (key_forms: irregular inflected forms)
     */
    value: string | string[];

    /** Quality metadata (stability only). */
    meta: EntryMetadata;
}

// ============================================================================
// WORD FAMILY (Morphological Links)
// ============================================================================

/**
 * Word Family Derivation: A single derived word in a morphological family.
 * 
 * Records a word derived from the same root, along with its part of speech.
 * Used for learning aids ("you know 'create'? then recognize 'creation', 'creative'")
 * A single entry in a word family's derivation list.
 * 
 * Each derivation represents a morphologically related word sharing the same
 * etymological root. The relationship is POSITION-INSENSITIVE: "actor" is a
 * valid derivation of "act", and "act" is a valid derivation of "actor".
 * 
 * CRITERIA for inclusion (ALL must be met):
 * 1. Semantic Relatedness — the derived word shares core meaning with the root
 * 2. Affixation — the word is formed via prefix/suffix/compounding from the root
 * 3. Morphological Hierarchy — the word belongs to the same derivational family
 * 
 * EXCLUSION: Inflected forms (walked, walks, walking) are NOT derivations.
 * Inflection is handled by the traits/key_forms system.
 */
export interface WordFamilyDerivation {
    /** The derived word in the target language */
    word: string;

    /** Part of speech of the derived word */
    pos: POS;
}

/**
 * Morphological word family for a specific language.
 * 
 * Captures the etymological root and all derivationally related words for
 * the word found in shells[lang].text.value.
 * 
 * MANDATORY on every SenseEntity (set to null per language if no derivations exist).
 * 
 * Example for shell word "firefighter" (en):
 *   root: "fire"               ← irreducible etymological root
 *   derivations: [
 *     { word: "fiery", pos: "adj." },        ← close (3-6 recommended)
 *     { word: "firefighter", pos: "n." },
 *     { word: "firework", pos: "n." },
 *     { word: "campfire", pos: "n." },        ← distant (1-3 recommended)
 *   ]
 * 
 * ROOT RULE: The root is the shell's text.value reduced to its irreducible
 * etymological base. E.g., "firefighter" → root "fire", "création" → root "créer".
 * 
 * DERIVATION COUNT: No hard cap. Aim for 3-6 closely related + 1-3 distantly related.
 */
export interface WordFamily {
    /** 
     * The irreducible etymological root of the shell word.
     * Derived by reducing shells[lang].text.value to its base morpheme.
     * E.g., en: "firefighter" → "fire", fr: "enflammer" → "flamme", de: "Feuerwehr" → "Feuer"
     */
    root: string;

    /** 
     * Morphologically derived words sharing the same root.
     * Position-insensitive: both "act → actor" and "actor → act" are valid.
     * Inflections (walked, walks) are excluded — use traits/key_forms instead.
     */
    derivations: WordFamilyDerivation[];

    /** Quality metadata */
    meta: EntryMetadata;
}

// ============================================================================
// WORD SHELL (Language Mappings)
// ============================================================================

/**
 * Word Shell: Language-specific word mapping.
 * 
 * Purpose:
 * - Connect abstract SenseEntity to concrete words in natural languages.
 * - Capture linguistic metadata (POS, difficulty, frequency).
 * - Maximum 20 shells per language per SenseEntity.
 * 
 * Design Philosophy:
 * - Text is the primary mutable content (with discoverer tracking).
 * - Metadata fields track quality only (no discoverer for derivative data).
 */
export interface WordShell {
    /**
     * The word or phrase in the target language.
     * Primary mutable content with stability and discoverer tracking.
     */
    text: PropertyEntry<string>;

    /**
     * Phonetic pronunciation guide.
     * Optional. Uses standard notation (IPA, Pinyin, Romaji, etc.).
     * Stability-only metadata (no discoverer tracking).
     */
    pronunciation?: PropertyEntry<string>;

    /**
     * Part of Speech.
     * Grammatical category combining the word and sense.
     * Stability-only metadata.
     */
    pos: PropertyEntry<POS>;

    /**
     * Difficulty level.
     * CEFR-based classification (A1-C2) for language learners.
     * Stability-only metadata.
     */
    level: PropertyEntry<WordLevel>;

    /**
     * Word frequency in the target language.
     * Range: 1 (extremely rare) to 100 (extremely common).
     * Represents how often this specific word appears in general usage.
     * Stability-only metadata.
     */
    wordFrequency: PropertyEntry<number>;



    /**
     * Global metadata for this word shell entry.
     * Tracks overall stability.
     */
    meta: EntryMetadata;
}

// ============================================================================
// SENSE ENTITY (Master Schema)
// ============================================================================

/**
 * SenseEntity: The core concept representation.
 * 
 * Philosophy:
 * - Represents a language-independent "meaning" or "concept".
 * - Acts as the semantic "soul" in the global registry.
 * - Connects to multiple languages through WordShells.
 * - Builds logical relationships through Qualia structure.
 * - Supports multimodal representation (visual, narrative, definitional).
 * 
 * Architecture:
 * - Mandatory identity anchors (uid, fingerprint) with no metadata.
 * - Core properties (ontology, frequency) with stability-only metadata.
 * - Optional rich data (qualia, visual, flavorText, meaning, shells).
 * - Each component designed for individual sedimentation control.
 * 
 * Capacity Constraints:
 * - Qualia: Max 20 items per language per role
 * - WordShells: Max 20 per language
 * - Visual: No hard cap (each is a unique variant)
 * - FlavorText: No hard cap (one per persona)
 * - Meaning: One per language
 * 
 * Evolution:
 * - Data items can be added up to capacity limits.
 * - Replacement after capacity requires sedimentation approval.
 * - Low-stability items replaced by high-stability alternatives.
 * - System ensures continuous quality improvement.
 */
export interface SenseEntity {
    // ==========================================================================
    // MANDATORY CORE IDENTITY (No metadata wrapping)
    // ==========================================================================

    /**
     * Unique Identifier: Permanent UUID.
     * - Global unique identifier for this concept.
     * - Never changes once created.
     * - Master anchor for all relationships.
     * - No metadata (identity, not modifiable data).
     */
    uid: string;

    /**
     * Semantic Fingerprint: The concept's DNA.
     * - Exactly 6 English anchor words in 3 tiers.
     * - Used for fuzzy matching and semantic search.
     * - Defines core essence of the concept.
     * - Immutable (no metadata wrapping).
     */
    fingerprint: Fingerprint;

    // ==========================================================================
    // MODIFIABLE CORE (Stability-only metadata)
    // ==========================================================================

    /**
     * Ontological category.
     * Defines the fundamental nature of what this concept represents.
     * 
     * Categories:
     * - OBJECT: Physical or abstract things (book, freedom)
     * - PROCESS: Actions or events (running, explosion)
     * - PROPERTY: Attributes or qualities (red, heavy)
     * - STATE: Conditions or situations (asleep, broken)
     * - LOCATION: Places or spatial concepts (home, above)
     * - ABSTRACT: Pure abstractions (justice, mathematics)
     * 
     * Metadata: Stability and firstDiscoverer (Attribution anchor).
     */
    ontology: PropertyEntry<OntologyType>;

    /**
     * Concept frequency: How common this concept is.
     * Range: 1 (extremely rare concept) to 100 (universal concept).
     * 
     * Note: This is CONCEPT frequency, not word frequency.
     * Examples:
     * - "existence" (concept): 100 (universal)
     * - "schadenfreude" (concept): 30 (less common)
     * 
     * Metadata: Stability only.
     */
    frequency: PropertyEntry<number>;

    // ==========================================================================
    // OPTIONAL RICH DATA
    // ==========================================================================

    /**
     * Qualia Structure: Logical relationship engine.
     * 
     * Four-dimensional logical framework:
     * - formal: What it is (classification)
     * - constitutive: What it's made of (components)
     * - telic: What it's for (purpose)
     * - agentive: How it came to be (origin)
     * 
     * Each dimension:
     * - Supports 8 core languages + dynamic injection
     * - Maximum 20 items per language
     * - Items can be words or phrases
     * - Each item tracks stability and firstDiscoverer
     * 
     * Optional: May be undefined if not yet populated.
     */
    qualia?: QualiaStructure;



    /**
     * Flavor Text Library: Narrative descriptions.
     * 
     * Persona-driven storytelling:
     * - Multiple AI personas (jester, prophet, scholar, etc.)
     * - Language-specific translations
     * - Usage examples per language
     * 
     * Each entry:
     * - Global meta for persona
     * - Individual meta for each language's text and example
     * - Stability and firstDiscoverer tracking
     * 
     * Optional: May be undefined if no flavor text generated.
     */
    flavorText?: FlavorTextEntry[];

    /**
     * Meaning Library: Dictionary definitions.
     * 
     * Concise definitions by language:
     * - Maximum 40 characters/tokens per language
     * - One definition per language
     * - Individual stability per language
     * 
     * Purpose:
     * - Quick reference definitions
     * - Simple explanations for beginners
     * - Complement to rich FlavorText descriptions
     * 
     * Optional: May be undefined if no definitions created.
     */
    meaning?: Record<Language, PropertyEntry<string>>;

    /**
     * Word Shells: Language-specific word mappings.
     * 
     * Connect abstract concept to concrete words:
     * - [Architecture Shift]: While mathematically structured as an array for legacy 
     *   compatibility and rare edge cases, we enforce a "Logical Singleton" rule.
     * - AI should generate EXACTLY ONE shell per language.
     * - Frontend/Backend logic strictly consumes index [0] as the absolute core word.
     * - Nuances/Synonyms are delegated to the future `nuances_matrix` system.
     * 
     * Each shell:
     * - Text with stability and firstDiscoverer
     * - Metadata fields with stability only
     * 
     * Optional: May be undefined if no language mappings exist.
     */
    shells?: Record<Language, WordShell[]>;

    /**
     * Linguistic Traits: Language-specific grammatical metadata.
     * 
     * Universal container for grammar facts that vary by language:
     * - gender, plural_form, verb_group, case_pattern, key_forms
     * 
     * Parallel to shells (same structural level). With the singleton
     * constraint on shells, there is a 1:1 mapping between a language's
     * traits and its shell.
     * 
     * Only languages with applicable traits are populated.
     * Chinese and Japanese may have empty arrays or be omitted.
     * 
     * Optional: May be undefined if no traits generated.
     */
    traits?: Record<Language, LinguisticTrait[]>;

    /**
     * Word Family: Morphological derivation links.
     * 
     * MANDATORY field. Maps each language to its root word and derived forms.
     * Set to null for languages where no morphological derivations exist.
     * 
     * root: shells[lang].text.value reduced to its irreducible etymological base.
     * derivations: Position-insensitive, criteria: SR + Affixation + Morphological Hierarchy.
     * Aim for 3-6 closely related + 1-3 distantly related. Inflections excluded.
     * See WordFamily interface for full specification.
     */
    wordFamily: Record<Language, WordFamily | null>;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export: The complete SenseEntity interface.
 * Primary schema for semantic storage and validation.
 */
export default SenseEntity;
