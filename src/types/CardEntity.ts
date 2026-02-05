/**
 * Card Entity Protocol - Type Definitions
 * 
 * This file defines the CardEntity type, which represents a renderable card
 * on the canvas. It is derived from SenseEntity data through the sense-to-card
 * transformation pipeline.
 * 
 * Philosophy:
 * - Flat display data for 8 languages (fast rendering)
 * - Complete SenseEntity preservation in rawSense (future extensibility)
 * - Semantic metadata in senseInfo (quick access)
 * - Async visual loading with Persona-specific states
 */

import type { SenseEntity, Language, OntologyType, Fingerprint, WordLevel, POS } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';

// ============================================================================
// LANGUAGE-SPECIFIC DISPLAY DATA
// ============================================================================

/**
 * Flavor Text Display Structure
 * 
 * Contains persona-driven narrative content extracted from SenseEntity.
 * Includes both descriptive text and usage examples.
 */
export interface FlavorTextDisplay {
    /**
     * Persona identifier (e.g., 'default', 'jester', 'prophet')
     * Determines the narrative style of the content
     */
    persona: string;

    /**
     * Narrative description text
     * Extracted from flavorText[*].text[lang].value
     */
    text: string;

    /**
     * Usage example sentence
     * Extracted from flavorText[*].example[lang].value
     * 
     * Note: Currently not displayed on cards (reserved for future UI enhancement)
     */
    example: string;
}

/**
 * Language-Specific Display Data
 * 
 * Pre-extracted and flattened data for a single language.
 * Optimized for fast card rendering without deep object traversal.
 * 
 * All data is extracted during the sense-to-card transformation,
 * eliminating runtime processing overhead.
 */
export interface LanguageDisplayData {
    /**
     * Word text in target language
     * Extracted from shells[lang][0].text.value
     */
    word: string;

    /**
     * Phonetic pronunciation guide
     * Extracted from shells[lang][0].pronunciation?.value
     * Optional: May be undefined if pronunciation not available
     */
    pronunciation?: string;

    /**
     * Part of Speech (grammatical category)
     * Extracted from shells[lang][0].pos.value
     * Examples: 'n.', 'v.', 'adj.'
     */
    pos: POS;

    /**
     * Difficulty level (CEFR-based)
     * Extracted from shells[lang][0].level.value
     * Examples: 'A1', 'B2', 'C1'
     */
    level: WordLevel;

    /**
     * Dictionary definition
     * Extracted from meaning[lang].value
     * Max length: 40 characters/tokens
     */
    definition: string;

    /**
     * Narrative flavor text with example
     * Extracted from first matching flavorText entry
     * Uses 'default' persona if available, fallback to first entry
     */
    flavorText: FlavorTextDisplay;
}

// ============================================================================
// CARD ENTITY (Main Interface)
// ============================================================================

/**
 * Visual Loading State
 * 
 * Tracks async visual asset loading status.
 * Supports Persona-specific loading animations.
 */
export type VisualStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Visual Data Structure
 * 
 * Manages visual asset state and payload.
 * Designed for async loading with graceful fallbacks.
 */
export interface VisualData {
    /**
     * Loading status
     * - 'idle': Not started loading
     * - 'loading': Currently fetching (shows Persona.visuals.LoadingIcon)
     * - 'loaded': Successfully loaded (payload contains SVG)
     * - 'error': Failed to load (fallback to default icon)
     */
    status: VisualStatus;

    /**
     * Visual payload
     * - Empty string when status === 'loading' (Persona renders LoadingIcon)
     * - SVG string when status === 'loaded'
     * - Empty string when status === 'error' (Persona renders ErrorIcon)
     * 
     * Note: Actual loading icon is rendered by Persona.visuals.LoadingIcon component,
     * not stored in this payload field.
     */
    payload: string;
}

/**
 * Semantic Metadata
 * 
 * Fast-access semantic information extracted from SenseEntity core properties.
 * Used for filtering, sorting, and semantic operations.
 */
export interface SenseInfo {
    /**
     * Ontological category
     * Extracted from sense.ontology.value
     * Examples: 'OBJECT', 'PROCESS', 'PROPERTY'
     */
    ontology: OntologyType;

    /**
     * Concept frequency (1-100)
     * Extracted from sense.frequency.value
     * Higher values indicate more common concepts
     */
    frequency: number;

    /**
     * Semantic fingerprint (concept DNA)
     * Extracted from sense.fingerprint
     * Used for fuzzy matching and semantic search
     */
    fingerprint: Fingerprint;

    /**
     * Available persona identifiers
     * Extracted from sense.flavorText[*].persona
     * Empty array if no flavor text available, defaults to ['default']
     */
    personas: string[];

    /**
     * Durability (game mechanic)
     * Fixed at 100 for all newly created cards
     * Represents card condition/usability
     */
    durability: number;
}

/**
 * Canvas Position
 * 
 * 2D coordinates for card placement on infinite canvas.
 * Origin (0,0) is at canvas center.
 */
export interface CardPosition {
    /** X coordinate in canvas space */
    x: number;

    /** Y coordinate in canvas space */
    y: number;
}

/**
 * Card Entity
 * 
 * Complete data structure representing a renderable card on the canvas.
 * Derived from SenseEntity through the sense-to-card transformation pipeline.
 * 
 * Design Principles:
 * - Display data: Pre-extracted for all 8 languages (O(1) language switching)
 * - Raw sense: Complete SenseEntity preserved (future extensibility)
 * - Semantic info: Fast-access metadata (filtering, sorting)
 * - Visual data: Async loading with Persona-specific states
 * - Position: Canvas placement (persistent across sessions)
 * 
 * Storage:
 * - MVP: localStorage (max 500 cards ≈ 5.25 MB)
 * - Future: IndexedDB (10,000+ cards ≈ 105+ MB)
 */
export interface CardEntity {
    /**
     * Unique identifier
     * Inherited from SenseEntity.uid
     * Used as React key and storage key
     */
    uid: string;

    /**
     * Display data for all supported languages
     * 
     * Pre-extracted at card creation time for maximum rendering performance.
     * Language keys: 'en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'
     * 
     * Access pattern: displayData[currentLanguage]
     * No runtime processing needed - all data pre-flattened
     */
    displayData: Record<Language, LanguageDisplayData>;

    /**
     * Visual asset data
     * 
     * Async loading lifecycle:
     * 1. Initial: status='loading', payload='' (Persona shows LoadingIcon)
     * 2. Success: status='loaded', payload='<svg>...</svg>'
     * 3. Failure: status='error', payload='' (Persona shows ErrorIcon)
     * 
     * Loading behavior:
     * - Starts immediately after card creation
     * - Non-blocking (card renders with loading state)
     * - Injected via uid-based targeting when loaded
     */
    visual: VisualData;

    /**
     * Complete original SenseEntity
     * 
     * Preservation strategy:
     * - All original data intact (including qualia, metadata, etc.)
     * - Enables future feature development without data migration
     * - Supports debugging and data verification
     * - Allows advanced users to access full semantic information
     * 
     * Note: This field can be large (~3-10KB per card)
     * Consider compression if storage becomes an issue
     */
    rawSense: SenseEntity;

    /**
     * Semantic metadata
     * 
     * Quick-access semantic information for:
     * - Filtering cards by ontology, frequency
     * - Semantic search using fingerprints
     * - Persona switching (check available personas)
     * - Game mechanics (durability tracking)
     * 
     * Extracted once at card creation to avoid repeated traversal of rawSense
     */
    senseInfo: SenseInfo;

    /**
     * Canvas position
     * 
     * Persistent 2D coordinates for card placement.
     * Updated during drag operations and persisted to storage.
     * 
     * Note: Position is in canvas coordinate space, not screen space.
     * Canvas can be panned/zoomed independently of card positions.
     */
    position: CardPosition;
}

// ============================================================================
// LANGUAGE CONSTANTS
// ============================================================================

/**
 * Supported Languages
 * 
 * Core 8 languages with full display data extraction support.
 * Order matches priority for fallback logic.
 */
export const SUPPORTED_LANGUAGES: Language[] = [
    'en',      // English
    'zh-CN',   // Simplified Chinese
    'fr',      // French
    'de',      // German
    'ja',      // Japanese
    'es',      // Spanish
    'it',      // Italian
    'pt',      // Portuguese
] as const;

/**
 * Default language for fallbacks
 */
export const DEFAULT_LANGUAGE: Language = 'en';
