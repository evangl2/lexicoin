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
 * 
 * Metadata Strategy:
 * - Default: 'stability' only for most modifiable items.
 * - Enhanced: 'stability' + 'firstDiscoverer' for high-value items (Qualia text, Visual, FlavorText, Meaning).
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
 */
export type POS = 'n.' | 'v.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.';

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
 * Persona Examples:
 * - 'jester': Playful, humorous explanations
 * - 'prophet': Profound, philosophical descriptions
 * - 'scholar': Academic, precise definitions
 * - 'merchant': Practical, usage-focused examples
 * 
 * Metadata Strategy:
 * - Global meta: Tracks the persona entry's overall stability.
 * - Per-language text meta: Individual stability/discoverer for each translation.
 * - Per-language example meta: Individual stability/discoverer for each example.
 */
export interface FlavorTextEntry {
    /**
     * AI Persona identifier.
     * Determines the narrative style and tone of descriptions.
     */
    persona: string;

    /**
     * Narrative descriptions by language.
     * Each language translation has individual metadata for quality control.
     */
    text: Record<Language, PropertyEntry<string>>;

    /**
     * Usage examples by language.
     * Each language example has individual metadata for quality control.
     */
    example: Record<Language, PropertyEntry<string>>;

    /**
     * Global metadata for this persona entry.
     * Tracks overall stability (no firstDiscoverer at this level).
     */
    meta: EntryMetadata;
}

// ============================================================================
// WORD SHELL (Language Mappings)
// ============================================================================

/**
 * Nuance Tags: Categorical metadata for linguistic subtlety.
 * 
 * Captures fine-grained distinctions in word usage that go beyond
 * simple translation equivalence.
 */
export interface NuanceTags {
    /**
     * Register: Social/stylistic level of language use.
     * Examples: formal speech, casual chat, technical jargon, slang
     * Can contain multiple registers (e.g., ['neutral', 'formal'])
     */
    register?: ('slang' | 'casual' | 'neutral' | 'formal' | 'literary' | 'honorfic' |
        'business' | 'intimate' | 'vulgar' | 'jargon' | 'argot')[];

    /**
     * Intensity: Strength or degree of the concept.
     * Examples: whisper vs. shout, like vs. love, dislike vs. hate
     */
    intensity?: 'very_weak' | 'weak' | 'normal' | 'strong' | 'very_strong';

    /**
     * Sentiment: Emotional coloring or connotation.
     * Examples: positive (beautiful), negative (ugly), neutral (object)
     */
    sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

    /**
     * Domain: Field-specific usage or specialization.
     * Examples: medical terminology, legal jargon, gaming slang
     * Can contain multiple domains (e.g., ['technical', 'scientific'])
     */
    domain?: ('financial' | 'technical' | 'marketing' | 'scientific' | 'military' |
        'business' | 'religion' | 'academic' | 'gaming' | 'medical' | 'legal' | 'common')[];

    /**
     * Chrono: Temporal usage status.
     * Examples: archaic (thou), modern (internet), neologism (selfie)
     * Can contain multiple temporal markers (e.g., ['modern', 'neologism'])
     */
    chrono?: ('archaic' | 'modern' | 'neologism')[];
}

/**
 * Word Shell: Language-specific word mapping.
 * 
 * Purpose:
 * - Connect abstract SenseEntity to concrete words in natural languages.
 * - Capture linguistic metadata (POS, difficulty, frequency).
 * - Track semantic equivalence and subtle distinctions.
 * - Maximum 20 shells per language per SenseEntity.
 * 
 * Design Philosophy:
 * - Text is the primary mutable content (with discoverer tracking).
 * - Metadata fields track quality only (no discoverer for derivative data).
 * - Nuances wrapped in single PropertyEntry (all tags share one stability score).
 * - Absolute synonyms flag helps filter for perfect equivalence.
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
     * Absolute Synonym flag.
     * - true: This word is 100% interchangeable with the SenseEntity in all contexts.
     * - false: Subtle distinctions exist (captured in nuances).
     * 
     * Note: Words without any nuance tags are implicitly absolute synonyms.
     * Stability-only metadata.
     */
    absoluteSynonyms: PropertyEntry<boolean>;

    /**
     * Nuance tags: Categorical linguistic metadata.
     * 
     * All tags wrapped in a SINGLE PropertyEntry, meaning:
     * - All nuance tags share ONE combined stability score.
     * - Users vote on the entire nuance set, not individual tags.
     * - Sedimentation replaces the entire nuance object as a unit.
     * 
     * Stability-only metadata (no discoverer tracking).
     */
    nuances: PropertyEntry<NuanceTags>;

    /**
     * Global metadata for this word shell entry.
     * Tracks overall stability (no firstDiscoverer at this level).
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
     * Metadata: Stability only (no discoverer).
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
     * Metadata: Stability only (no discoverer).
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
     * Visual Library: SVG/animation payloads.
     * 
     * Stores different visual representations:
     * - Default visual state
     * - Persona-specific variants
     * - Context-specific styles
     * 
     * Each entry:
     * - Complete indivisible payload (preserves all logic)
     * - Links back to parent SenseEntity via uid
     * - Tracks stability and firstDiscoverer
     * 
     * Generated and stored independently.
     * Optional: May be undefined if no visuals generated.
     */
    visual?: VisualEntry[];

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
     * - Individual stability and firstDiscoverer per language
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
     * - Maximum 20 shells per language
     * - Includes linguistic metadata (POS, level, frequency)
     * - Captures nuances (register, sentiment, domain, etc.)
     * - Flags absolute synonyms
     * 
     * Each shell:
     * - Text with stability and firstDiscoverer
     * - Metadata fields with stability only
     * - Nuances wrapped in single PropertyEntry
     * 
     * Optional: May be undefined if no language mappings exist.
     */
    shells?: Record<Language, WordShell[]>;
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Default export: The complete SenseEntity interface.
 * Primary schema for semantic storage and validation.
 */
export default SenseEntity;
