/**
 * Backend API Type Definitions
 * 
 * Defines all request/response types for backend communication
 */

import type { UUID, Sense, LocalizedText, CEFRLevel, ConstructionLevel } from './index';

// ============================================================================
// API BASE TYPES
// ============================================================================

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// ============================================================================
// SYNTHESIS API (AI-powered word combination)
// ============================================================================

export interface SynthesisRequest {
    inputSenseIds: UUID[];
    context?: string;
    targetLevel?: CEFRLevel;
    userId: UUID;
}

export interface SynthesisResponse {
    success: boolean;
    result?: {
        sense: Sense;
        explanation: LocalizedText;
        confidence: number;
    };
    failureReason?: 'INCOMPATIBLE' | 'NO_SYNERGY' | 'OFFENSIVE' | 'INVALID';
    failureMessage?: LocalizedText;
}

// ============================================================================
// EVOLUTION API (AI-powered word transformation)
// ============================================================================

export interface EvolutionRequest {
    senseId: UUID;
    evolutionType: 'UPGRADE' | 'TRANSFORM' | 'SPECIALIZE';
    context?: string;
    userId: UUID;
}

export interface EvolutionResponse {
    success: boolean;
    result?: {
        newSense: Sense;
        changes: LocalizedText;
        evolutionPath: string[];
    };
    error?: string;
}

// ============================================================================
// TASK EVALUATION API (AI judges task completion)
// ============================================================================

export interface TaskEvaluationRequest {
    taskId: UUID;
    userId: UUID;
    submission: {
        type: 'TEXT' | 'CONSTRUCTION' | 'SYNTHESIS';
        content: any;
    };
}

export interface TaskEvaluationResponse {
    passed: boolean;
    score: number; // 0-100
    feedback: LocalizedText;
    suggestions?: LocalizedText[];
}

// ============================================================================
// CONTENT GENERATION API (AI generates learning content)
// ============================================================================

export interface ContentGenerationRequest {
    type: 'EXAMPLE' | 'EXERCISE' | 'STORY';
    senseIds?: UUID[];
    level: CEFRLevel;
    theme?: string;
    userId: UUID;
}

export interface ContentGenerationResponse {
    content: {
        title: LocalizedText;
        body: LocalizedText;
        difficulty: CEFRLevel;
        tags: string[];
    };
    relatedSenses: UUID[];
}

// ============================================================================
// USER SYNC API (Sync user data with backend)
// ============================================================================

export interface UserSyncRequest {
    userId: UUID;
    lastSyncTimestamp: number;
    localChanges: {
        senses?: Sense[];
        constructions?: any[];
        progress?: any;
    };
}

export interface UserSyncResponse {
    serverChanges: {
        senses?: Sense[];
        constructions?: any[];
        progress?: any;
    };
    conflicts?: Array<{
        type: string;
        localData: any;
        serverData: any;
    }>;
    newSyncTimestamp: number;
}

// ============================================================================
// DISCOVERY API (Check if content is first discovery)
// ============================================================================

export interface DiscoveryCheckRequest {
    type: 'SENSE' | 'CONSTRUCTION';
    contentId: UUID;
    userId: UUID;
}

export interface DiscoveryCheckResponse {
    isFirstDiscovery: boolean;
    discoveredBy?: string;
    discoveredAt?: number;
    totalDiscoverers: number;
}

// ============================================================================
// LEADERBOARD API
// ============================================================================

export interface LeaderboardRequest {
    type: 'XP' | 'DISCOVERIES' | 'RESONANCE';
    timeRange?: 'DAY' | 'WEEK' | 'MONTH' | 'ALL_TIME';
    limit?: number;
}

export interface LeaderboardEntry {
    userId: UUID;
    username: string;
    avatar?: string;
    score: number;
    rank: number;
}

export type LeaderboardResponse = PaginatedResponse<LeaderboardEntry>;

// ============================================================================
// FEEDBACK SUBMISSION API
// ============================================================================

export interface FeedbackSubmissionRequest {
    targetId: UUID;
    targetType: 'SENSE' | 'CONSTRUCTION' | 'TASK_RESULT';
    feedbackType: 'UPVOTE' | 'DOWNVOTE' | 'REPORT';
    userId: UUID;
    reason?: string;
    category?: 'LOGIC_ERROR' | 'FORMAT_ERROR' | 'OFFENSIVE' | 'OTHER';
}

export interface FeedbackSubmissionResponse {
    accepted: boolean;
    newStability?: number;
    message?: string;
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export interface AnalyticsEventRequest {
    userId: UUID;
    eventType: string;
    eventData: any;
    timestamp: number;
}

export interface AnalyticsEventResponse {
    recorded: boolean;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchRequest<T> {
    operations: T[];
}

export interface BatchResponse<T> {
    results: Array<{
        success: boolean;
        data?: T;
        error?: string;
    }>;
}
