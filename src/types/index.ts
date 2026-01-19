/**
 * Global Type Definitions for Lexicoin
 * 
 * This file contains all core type definitions used across the application.
 * Following the modular architecture design.
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

export type UUID = string;
export type Timestamp = number;

// CEFR Language Levels
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Supported Languages
export type Language = 'en' | 'zh' | 'ja' | 'de' | 'fr' | 'es' | 'ko';

// AI Model IDs
export type ModelId = 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

// ============================================================================
// LOCALIZATION
// ============================================================================

export interface LocalizedText {
    en: string;
    zh: string;
    ja?: string;
    de?: string;
    fr?: string;
    es?: string;
    ko?: string;
}

// ============================================================================
// SENSE MODULE TYPES (Core Innovation)
// ============================================================================

/**
 * Sense - The atomic unit of meaning
 * This is the core innovation: we work with meanings, not just words
 */
export interface Sense {
    id: UUID;
    word: LocalizedText;           // The word in different languages
    meaning: LocalizedText;         // Explanation of the meaning
    partOfSpeech: string;           // n., v., adj., adv., etc.
    level: CEFRLevel;               // Difficulty level

    // Visual representation (SVG or emoji)
    visual: string;
    visualStatic?: string;          // Optimized for idle state
    visualActive?: string;          // Animated for hover/active state

    // Metadata
    flavorText: LocalizedText;      // Lore/story text
    tags: string[];                 // Semantic tags for matching

    // Game mechanics
    durability: number;             // Current durability
    maxDurability: number;          // Max durability

    // Timestamps
    createdAt: Timestamp;
    lastUsedAt?: Timestamp;
}

// ============================================================================
// CONSTRUCTION MODULE TYPES
// ============================================================================

/**
 * Four-layer construction system based on Construction Grammar
 */
export type ConstructionLevel = 'LEXEME' | 'PHRASE' | 'SENTENCE' | 'NARRATIVE';

export interface Construction {
    id: UUID;
    level: ConstructionLevel;
    senses: UUID[];                 // References to Sense IDs
    pattern: string;                // Grammatical pattern
    meaning: LocalizedText;
    examples: LocalizedText[];
}

// ============================================================================
// SYNTHESIS & EVOLUTION
// ============================================================================

export type SynthesisOutcome = 'SUCCESS' | 'FAILURE';
export type FailureCode = 'INCOMPATIBLE' | 'NO_SYNERGY' | 'OFFENSIVE' | 'INVALID';

export interface SynthesisRequest {
    inputs: UUID[];                 // Input Sense IDs
    context?: string;               // Optional context hint
}

export interface SynthesisResult {
    outcome: SynthesisOutcome;
    failureCode?: FailureCode;
    failureMessage?: LocalizedText;

    // On success
    newSense?: Sense;

    // Metadata
    cached: boolean;                // Was this from cache?
    tokensUsed?: number;            // AI tokens consumed
}

export interface EvolutionRequest {
    senseId: UUID;
    targetLevel?: CEFRLevel;
}

export interface EvolutionResult {
    outcome: 'SUCCESS' | 'FAILURE';
    evolvedSense?: Sense;
    failureMessage?: LocalizedText;
}

// ============================================================================
// PLAYER STATE
// ============================================================================

export type GamePhase = 'GENESIS' | 'GOLDEN' | 'ENDLESS';

export interface PlayerState {
    id: UUID;

    // Vitals
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;

    // Progression
    level: number;
    xp: number;
    xpToNextLevel: number;
    phase: GamePhase;

    // Settings
    settings: {
        interfaceLang: Language;
        learningLang: Language;
        modelId: ModelId;
        soundEnabled: boolean;
        musicEnabled: boolean;
    };

    // Statistics
    stats: {
        totalSyntheses: number;
        successfulSyntheses: number;
        totalEvolutions: number;
        sensesCollected: number;
        tokensSpent: number;
    };

    // Timestamps
    createdAt: Timestamp;
    lastLoginAt: Timestamp;
}

// ============================================================================
// UI STATE
// ============================================================================

export type ViewMode = 'WORLD' | 'SANCTUARY' | 'LIBRARY';

export interface CanvasView {
    x: number;                      // Pan offset X
    y: number;                      // Pan offset Y
    scale: number;                  // Zoom level (0.5 - 2.0)
}

export type DragSource = 'DRAWER' | 'CANVAS' | 'RITUAL_SLOT';
export type DragItemType = 'SENSE' | 'RITUAL_CIRCLE' | 'GRIMOIRE';

export interface DragState {
    isDragging: boolean;
    item: any;                      // The dragged item
    itemType: DragItemType;
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
    offset: { x: number; y: number };
    source: DragSource;
    sourceId?: string;
}

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
    id: UUID;
    type: NotificationType;
    message: LocalizedText;
    duration?: number;              // Auto-dismiss after ms (0 = manual)
    createdAt: Timestamp;
}

// ============================================================================
// ASSET MANAGEMENT
// ============================================================================

export type AssetType = 'IMAGE' | 'AUDIO' | 'FONT' | 'DATA';
export type LoadingState = 'IDLE' | 'LOADING' | 'LOADED' | 'ERROR';

export interface AssetDescriptor {
    id: string;
    type: AssetType;
    language?: Language;            // For language-specific assets
    url: string;
    state: LoadingState;
    error?: string;
}

// ============================================================================
// KNOWLEDGE REGISTRY
// ============================================================================

/**
 * Cached synthesis result for semantic caching
 */
export interface CachedSynthesis {
    id: UUID;
    inputIds: UUID[];               // Sorted input Sense IDs
    inputHash: string;              // Hash for quick lookup
    result: SynthesisResult;
    usageCount: number;
    createdAt: Timestamp;
    lastUsedAt: Timestamp;
}

// ============================================================================
// MODULE SYSTEM
// ============================================================================

export type ModuleStatus = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'ERROR';

export interface ModuleState {
    id: string;
    name: string;
    status: ModuleStatus;
    error?: string;
    initializedAt?: Timestamp;
}
