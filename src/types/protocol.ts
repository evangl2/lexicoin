/**
 * Protocol Message Types
 * 
 * Defines all message types used in the MessageBus for inter-module communication
 */

import type {
    UUID,
    Timestamp,
    SynthesisRequest,
    SynthesisResult,
    EvolutionRequest,
    EvolutionResult,
    Sense,
    Notification,
    AssetDescriptor,
    Language
} from './index';

// ============================================================================
// BASE MESSAGE STRUCTURE
// ============================================================================

export interface BaseMessage<T = any> {
    type: string;
    payload: T;
    timestamp: Timestamp;
    source: string;                 // Module ID that sent the message
    id: UUID;                       // Unique message ID
}

// ============================================================================
// SYNTHESIS MESSAGES
// ============================================================================

export interface SynthesisRequestMessage extends BaseMessage<SynthesisRequest> {
    type: 'SYNTHESIS_REQUEST';
}

export interface SynthesisResponseMessage extends BaseMessage<SynthesisResult> {
    type: 'SYNTHESIS_RESPONSE';
    requestId: UUID;                // Reference to original request
}

// ============================================================================
// EVOLUTION MESSAGES
// ============================================================================

export interface EvolutionRequestMessage extends BaseMessage<EvolutionRequest> {
    type: 'EVOLUTION_REQUEST';
}

export interface EvolutionResponseMessage extends BaseMessage<EvolutionResult> {
    type: 'EVOLUTION_RESPONSE';
    requestId: UUID;
}

// ============================================================================
// SENSE MANAGEMENT MESSAGES
// ============================================================================

export interface SenseCreatedMessage extends BaseMessage<Sense> {
    type: 'SENSE_CREATED';
}

export interface SenseUpdatedMessage extends BaseMessage<Sense> {
    type: 'SENSE_UPDATED';
}

export interface SenseDeletedMessage extends BaseMessage<{ id: UUID }> {
    type: 'SENSE_DELETED';
}

// ============================================================================
// ASSET MESSAGES
// ============================================================================

export interface AssetLoadRequestMessage extends BaseMessage<{
    assetId: string;
    language?: Language;
}> {
    type: 'ASSET_LOAD_REQUEST';
}

export interface AssetLoadedMessage extends BaseMessage<AssetDescriptor> {
    type: 'ASSET_LOADED';
}

export interface AssetErrorMessage extends BaseMessage<{
    assetId: string;
    error: string;
}> {
    type: 'ASSET_ERROR';
}

// ============================================================================
// NOTIFICATION MESSAGES
// ============================================================================

export interface NotificationMessage extends BaseMessage<Notification> {
    type: 'NOTIFICATION';
}

// ============================================================================
// PLAYER STATE MESSAGES
// ============================================================================

export interface PlayerStateChangedMessage extends BaseMessage<{
    field: string;
    oldValue: any;
    newValue: any;
}> {
    type: 'PLAYER_STATE_CHANGED';
}

// ============================================================================
// MODULE LIFECYCLE MESSAGES
// ============================================================================

export interface ModuleInitializedMessage extends BaseMessage<{
    moduleId: string;
    moduleName: string;
}> {
    type: 'MODULE_INITIALIZED';
}

export interface ModuleErrorMessage extends BaseMessage<{
    moduleId: string;
    error: string;
}> {
    type: 'MODULE_ERROR';
}

// ============================================================================
// MESSAGE UNION TYPE
// ============================================================================

export type ProtocolMessage =
    | SynthesisRequestMessage
    | SynthesisResponseMessage
    | EvolutionRequestMessage
    | EvolutionResponseMessage
    | SenseCreatedMessage
    | SenseUpdatedMessage
    | SenseDeletedMessage
    | AssetLoadRequestMessage
    | AssetLoadedMessage
    | AssetErrorMessage
    | NotificationMessage
    | PlayerStateChangedMessage
    | ModuleInitializedMessage
    | ModuleErrorMessage;

// ============================================================================
// CONSTRUCTION MODULE MESSAGES
// ============================================================================

export interface ConstructionCreatedMessage extends BaseMessage<any> {
    type: 'CONSTRUCTION_CREATED';
}

export interface ConstructionUpdatedMessage extends BaseMessage<any> {
    type: 'CONSTRUCTION_UPDATED';
}

export interface ConstructionDeletedMessage extends BaseMessage<{ id: UUID }> {
    type: 'CONSTRUCTION_DELETED';
}

// ============================================================================
// PERSONA MODULE MESSAGES
// ============================================================================

export interface PersonaActivatedMessage extends BaseMessage<{ personaId: string }> {
    type: 'PERSONA_ACTIVATED';
}

export interface ResonanceUpdatedMessage extends BaseMessage<{ personaId: string; resonance: number; change: number }> {
    type: 'RESONANCE_UPDATED';
}

export interface TaskCreatedMessage extends BaseMessage<any> {
    type: 'TASK_CREATED';
}

export interface TaskCompletedMessage extends BaseMessage<any> {
    type: 'TASK_COMPLETED';
}

export interface TaskProgressUpdatedMessage extends BaseMessage<any> {
    type: 'TASK_PROGRESS_UPDATED';
}

// ============================================================================
// ITEM MODULE MESSAGES
// ============================================================================

export interface ItemAddedMessage extends BaseMessage<any> {
    type: 'ITEM_ADDED';
}

export interface ItemRemovedMessage extends BaseMessage<{ instanceId: UUID; itemId: string }> {
    type: 'ITEM_REMOVED';
}

export interface ItemUsedMessage extends BaseMessage<{ itemId: string; targetId?: UUID; effects: any }> {
    type: 'ITEM_USED';
}

export interface ItemQuantityChangedMessage extends BaseMessage<any> {
    type: 'ITEM_QUANTITY_CHANGED';
}

// ============================================================================
// REVIEW MODULE MESSAGES
// ============================================================================

export interface ReviewSessionStartedMessage extends BaseMessage<any> {
    type: 'REVIEW_SESSION_STARTED';
}

export interface ReviewSessionCompletedMessage extends BaseMessage<any> {
    type: 'REVIEW_SESSION_COMPLETED';
}

export interface MiniGameCompletedMessage extends BaseMessage<any> {
    type: 'MINI_GAME_COMPLETED';
}

export interface MasteryUpdatedMessage extends BaseMessage<any> {
    type: 'MASTERY_UPDATED';
}

// ============================================================================
// LIBRARY MODULE MESSAGES
// ============================================================================

export interface LibraryEntryAddedMessage extends BaseMessage<any> {
    type: 'LIBRARY_ENTRY_ADDED';
}

export interface LibraryEntryDiscoveredMessage extends BaseMessage<any> {
    type: 'LIBRARY_ENTRY_DISCOVERED';
}

export interface LibraryStabilityUpdatedMessage extends BaseMessage<{ id: UUID; stability: number }> {
    type: 'LIBRARY_STABILITY_UPDATED';
}

export interface FavoriteAddedMessage extends BaseMessage<{ id: UUID }> {
    type: 'FAVORITE_ADDED';
}

export interface FavoriteRemovedMessage extends BaseMessage<{ id: UUID }> {
    type: 'FAVORITE_REMOVED';
}

export interface AchievementUnlockedMessage extends BaseMessage<{ achievementId: string }> {
    type: 'ACHIEVEMENT_UNLOCKED';
}

// ============================================================================
// SEDIMENTATION MODULE MESSAGES
// ============================================================================

export interface FeedbackSubmittedMessage extends BaseMessage<any> {
    type: 'FEEDBACK_SUBMITTED';
}

export interface MetaDataUpdatedMessage extends BaseMessage<any> {
    type: 'META_DATA_UPDATED';
}

export interface ErrorReportedMessage extends BaseMessage<any> {
    type: 'ERROR_REPORTED';
}

export interface FirstDiscovererSetMessage extends BaseMessage<{ targetId: UUID; discoverer: string }> {
    type: 'FIRST_DISCOVERER_SET';
}

export interface ReportStatusUpdatedMessage extends BaseMessage<any> {
    type: 'REPORT_STATUS_UPDATED';
}

// ============================================================================
// EXTENDED MESSAGE UNION TYPE
// ============================================================================

export type ExtendedProtocolMessage =
    | ProtocolMessage
    | ConstructionCreatedMessage
    | ConstructionUpdatedMessage
    | ConstructionDeletedMessage
    | PersonaActivatedMessage
    | ResonanceUpdatedMessage
    | TaskCreatedMessage
    | TaskCompletedMessage
    | TaskProgressUpdatedMessage
    | ItemAddedMessage
    | ItemRemovedMessage
    | ItemUsedMessage
    | ItemQuantityChangedMessage
    | ReviewSessionStartedMessage
    | ReviewSessionCompletedMessage
    | MiniGameCompletedMessage
    | MasteryUpdatedMessage
    | LibraryEntryAddedMessage
    | LibraryEntryDiscoveredMessage
    | LibraryStabilityUpdatedMessage
    | FavoriteAddedMessage
    | FavoriteRemovedMessage
    | AchievementUnlockedMessage
    | FeedbackSubmittedMessage
    | MetaDataUpdatedMessage
    | ErrorReportedMessage
    | FirstDiscovererSetMessage
    | ReportStatusUpdatedMessage;

// ============================================================================
// MESSAGE HANDLER TYPE
// ============================================================================

export type MessageHandler<T extends BaseMessage = BaseMessage> = (message: T) => void | Promise<void>;

// ============================================================================
// MESSAGE INTERCEPTION & FILTERING
// ============================================================================

export type MessagePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface MessageInterceptor {
    id: string;
    name: string;
    filter?: (message: BaseMessage) => boolean;  // Return false to block message
    transform?: (message: BaseMessage) => BaseMessage;  // Transform message before delivery
    priority?: MessagePriority;
}

export interface TelemetryData {
    messageType: string;
    count: number;
    lastTimestamp: Timestamp;
    averageProcessingTime: number;
    errorCount: number;
}
