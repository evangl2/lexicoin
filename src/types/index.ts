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

import type { CEFRLevel, CEFRDistribution } from '../config/balance';
export type { CEFRLevel, CEFRDistribution };
export { CEFR_LEVELS } from '../config/balance';

// Supported Languages
export type Language = 'en' | 'zh' | 'ja' | 'de' | 'fr' | 'es' | 'ko';

// AI Model IDs
export type ModelId = 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

// Persona Types (GDD §4.6: CHILD / GARDENER / ALCHEMIST)
export type PersonaType = 'CHILD' | 'GARDENER' | 'ALCHEMIST';

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

    // Lore/story text
    flavorText: LocalizedText;      // Lore/story text
    tags: string[];                 // Semantic tags for matching

    // Word shells (language specific words)
    shells?: any;                   // Dynamic shells based on language

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

// ============================================================================
// LANGUAGE PROGRESS & STREAK (XP System)
// ============================================================================

export interface LanguageProgress {
    /** 该语言的玩家等级（1–100） */
    level: number;
    /** 当前等级已积累的 XP */
    xp: number;
    /** 升到下一级所需的总 XP */
    xpToNextLevel: number;
    /** 该语言下已发现的不重复 Sense 数量（统计用） */
    sensesCollected: number;
    /** 首次在该语言下合成的时间戳 */
    startedAt: Timestamp;
}

export interface StreakData {
    current: number;        // 当前连续天数
    best: number;           // 历史最高
    lastPlayDate: string;   // 'YYYY-MM-DD'
}

// ============================================================================
// LEVEL & UNLOCK ABLES (Shared Types)
// ============================================================================

export interface LevelConfig {
    level: number;
    xpRequired: number;
    cefrLevel: CEFRLevel;
    unlockedFeatures: string[];
}

export interface UnlockableFeature {
    id: string;
    name: string;
    description: string;
    requiredLevel: number;
    type: 'CONSTRUCTION_TIER' | 'PERSONA' | 'ITEM' | 'GAME_MODE';
}

export interface DifficultyMetrics {
    recentSuccessRate: number;  // 0-1
    averageCompletionTime: number;  // milliseconds
    consecutiveFailures: number;
    recommendedCEFR: CEFRLevel;
}

export interface PlayerState {
    id: UUID;

    // Vitals (Stamina System)
    stamina: number;
    maxStamina: number;
    staminaLastUpdatedAt: Timestamp; // For offline recovery calculation

    // Progression
    phase: GamePhase;

    // Per-language progress (XP & Level system)
    languageProgress: Partial<Record<Language, LanguageProgress>>;

    // Daily streak
    streak: StreakData;

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

    // Grimoire Mechanics
    grimoireMastery: GrimoireMastery;
    echoCharges: number;             // Daily charges for Echo extraction
    lastEchoReset: string;           // 'YYYY-MM-DD' for daily reset

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
// GRIMOIRE MODULE TYPES
// ============================================================================

/**
 * Bilingual text for cross-language content
 */
export interface BilingualText {
    learning: string; // Target language
    system: string;   // Native/System language
}

/**
 * Grading system for evaluation (including F as penalty)
 */
export type Grade = 'S++' | 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Lifecycle states of a Grimoire entity
 */
export type GrimoireStatus = 
    | 'SUMMONING'      // Initial state while calling Edge Function
    | 'ACTIVE'          // On canvas, interactive
    | 'EVALUATING'      // Waiting for judgment result
    | 'NEEDS_REVISION'  // Contains F grade, requires revision
    | 'RESOLVED'        // All slots graded >= D
    | 'ARCHIVED'        // Moved to Library
    | 'EXPIRED';        // Time out

/**
 * Grimoire semantic templates
 */
export type GrimoireType =
    | 'taxonomy' | 'anatomy' | 'locus' | 'time'
    | 'spectrum' | 'qualia' | 'ritual' | 'metaphor';

/**
 * Individual slot for Sense cards within a Grimoire
 */
export interface GrimoireSlot {
    id: UUID;
    senseId: UUID | null;            // Placed Sense ID
    grade: Grade | null;             // Result of judgment
    locked: boolean;                 // Non-F results lock the slot
    commentary: BilingualText | null; // Feedback from Persona
}

/**
 * Main Grimoire Entity (The Book)
 */
export interface GrimoireEntity {
    id: UUID;
    x: number;
    y: number;
    
    personaId: PersonaType;
    grimoireType: GrimoireType;
    targetLevel: CEFRLevel;
    seedWord: string;
    
    theme: {
        title: BilingualText;
        description: BilingualText;
    };
    explicitInstruction: BilingualText;
    
    // Hidden anchors for AI validation & Echo extraction
    validationTags: string[];
    designRationale: string;
    
    slots: GrimoireSlot[];           // Usually 3-6 slots
    
    createdAt: Timestamp;
    expiresAt: Timestamp;            // Current life duration (e.g., 1h)
    
    status: GrimoireStatus;
    fCount: number;                  // Cumulative F grades (affects final score)
    finalGrade: Grade | null;
    rewardClaimed: boolean;
}

/**
 * Player's mastery metrics for Grimoire achievements
 */
export interface GrimoireMastery {
    aCount: number;
    bCount: number;
    cCount: number;
    dCount: number;
    sScore: number;                  // Cumulative S-grade points
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

// ============================================================================
// RE-EXPORTS FROM MODULE-SPECIFIC TYPES
// ============================================================================

// Persona Module
export type { Persona, PersonaTask, NarrativeState } from '../modules/persona/PersonaModule';

// Item Module
export type { ItemType, ItemRarity, Item, InventoryItem, ItemUsageResult } from '../modules/item/ItemModule';

// Review Module
export type { MiniGameType, ReviewSession, MiniGame, MasteryData } from '../modules/review/ReviewModule';

// Library Module
export type { LibraryEntry, SearchFilters, PersonalShowcase } from '../modules/library/LibraryModule';

// Sedimentation Module
export type { FeedbackType, Feedback, MetaData, ErrorReport } from '../modules/sedimentation/SedimentationModule';

// Level Module (Types now defined above in index.ts)

// Platform Adapter
export type { Platform, ViewportInfo, InputCapabilities } from '../core/platform/PlatformAdapter';


