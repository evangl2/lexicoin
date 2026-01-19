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
