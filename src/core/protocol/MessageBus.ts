/**
 * MessageBus - Protocol Broker Module
 * 
 * Central communication hub for all modules in the application.
 * Implements publish-subscribe pattern for decoupled module communication.
 */

import type { BaseMessage, MessageHandler, MessageInterceptor, TelemetryData, MessagePriority } from '../../types/protocol';
import { generateId } from '@utils/helpers';



interface QueuedMessage {
    message: BaseMessage;
    priority: MessagePriority;
    timestamp: number;
}

class MessageBus {
    private static instance: MessageBus;
    private subscribers: Map<string, Set<MessageHandler>>;
    private messageLog: BaseMessage[];
    private maxLogSize: number = 100;
    private debugMode: boolean = true;
    private interceptors: MessageInterceptor[] = [];
    private telemetry: Map<string, TelemetryData> = new Map();
    private messageQueue: QueuedMessage[] = [];
    private isProcessingQueue: boolean = false;

    private constructor() {
        this.subscribers = new Map();
        this.messageLog = [];
    }

    /**
     * Get singleton instance
     */
    static getInstance(): MessageBus {
        if (!MessageBus.instance) {
            MessageBus.instance = new MessageBus();
        }
        return MessageBus.instance;
    }

    /**
     * Subscribe to a message type
     */
    subscribe<T extends BaseMessage = BaseMessage>(
        messageType: string,
        handler: MessageHandler<T>
    ): () => void {
        if (!this.subscribers.has(messageType)) {
            this.subscribers.set(messageType, new Set());
        }

        const handlers = this.subscribers.get(messageType)!;
        handlers.add(handler as MessageHandler);

        if (this.debugMode) {
            console.log(`[MessageBus] Subscribed to ${messageType}. Total subscribers: ${handlers.size}`);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(messageType, handler as MessageHandler);
    }

    /**
     * Unsubscribe from a message type
     */
    unsubscribe(messageType: string, handler: MessageHandler): void {
        const handlers = this.subscribers.get(messageType);
        if (handlers) {
            handlers.delete(handler);
            if (this.debugMode) {
                console.log(`[MessageBus] Unsubscribed from ${messageType}. Remaining: ${handlers.size}`);
            }
        }
    }

    /**
     * Publish a message to all subscribers
     */
    async publish<T extends BaseMessage>(message: T, priority: MessagePriority = 'NORMAL'): Promise<void> {
        if (priority === 'CRITICAL' || priority === 'HIGH') {
            // High priority messages bypass queue
            await this.publishInternal(message);
        } else {
            // Normal and low priority messages go through queue
            this.enqueueMessage(message, priority);
        }
    }

    /**
     * Create and publish a message
     */
    async send<T = any>(
        type: string,
        payload: T,
        source: string = 'UNKNOWN'
    ): Promise<void> {
        const message: BaseMessage<T> = {
            type,
            payload,
            timestamp: Date.now(),
            source,
            id: generateId(),
        };

        await this.publish(message);
    }

    /**
     * Get message log (for debugging)
     */
    getMessageLog(): BaseMessage[] {
        return [...this.messageLog];
    }

    /**
     * Clear message log
     */
    clearLog(): void {
        this.messageLog = [];
    }

    /**
     * Get all active subscriptions (for debugging)
     */
    getSubscriptions(): Map<string, number> {
        const result = new Map<string, number>();
        for (const [type, handlers] of this.subscribers.entries()) {
            result.set(type, handlers.size);
        }
        return result;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Add message to log
     */
    private addToLog(message: BaseMessage): void {
        this.messageLog.push(message);

        // Trim log if too large
        if (this.messageLog.length > this.maxLogSize) {
            this.messageLog = this.messageLog.slice(-this.maxLogSize);
        }
    }

    /**
     * Register a message interceptor
     */
    registerInterceptor(interceptor: MessageInterceptor): () => void {
        this.interceptors.push(interceptor);

        if (this.debugMode) {
            console.log(`[MessageBus] Registered interceptor: ${interceptor.name}`);
        }

        // Return unregister function
        return () => this.unregisterInterceptor(interceptor.id);
    }

    /**
     * Unregister a message interceptor
     */
    unregisterInterceptor(interceptorId: string): void {
        const index = this.interceptors.findIndex(i => i.id === interceptorId);
        if (index !== -1) {
            const interceptor = this.interceptors[index];
            this.interceptors.splice(index, 1);

            if (this.debugMode) {
                console.log(`[MessageBus] Unregistered interceptor: ${interceptor.name}`);
            }
        }
    }

    /**
     * Apply interceptors to a message
     * Returns null if message should be blocked
     */
    private applyInterceptors(message: BaseMessage): BaseMessage | null {
        let currentMessage = message;

        for (const interceptor of this.interceptors) {
            // Check filter
            if (interceptor.filter && !interceptor.filter(currentMessage)) {
                if (this.debugMode) {
                    console.log(`[MessageBus] Message blocked by interceptor: ${interceptor.name}`);
                }
                return null;
            }

            // Apply transform
            if (interceptor.transform) {
                currentMessage = interceptor.transform(currentMessage);
            }
        }

        return currentMessage;
    }

    /**
     * Update telemetry for a message type
     */
    private updateTelemetry(messageType: string, processingTime: number, hadError: boolean = false): void {
        const existing = this.telemetry.get(messageType);

        if (existing) {
            const newCount = existing.count + 1;
            this.telemetry.set(messageType, {
                messageType,
                count: newCount,
                lastTimestamp: Date.now(),
                averageProcessingTime: (existing.averageProcessingTime * existing.count + processingTime) / newCount,
                errorCount: existing.errorCount + (hadError ? 1 : 0),
            });
        } else {
            this.telemetry.set(messageType, {
                messageType,
                count: 1,
                lastTimestamp: Date.now(),
                averageProcessingTime: processingTime,
                errorCount: hadError ? 1 : 0,
            });
        }
    }

    /**
     * Get telemetry data for all message types
     */
    getTelemetry(): TelemetryData[] {
        return Array.from(this.telemetry.values());
    }

    /**
     * Clear telemetry data
     */
    clearTelemetry(): void {
        this.telemetry.clear();
        if (this.debugMode) {
            console.log('[MessageBus] Telemetry cleared');
        }
    }

    /**
     * Enqueue a message with priority
     */
    private enqueueMessage(message: BaseMessage, priority: MessagePriority = 'NORMAL'): void {
        this.messageQueue.push({
            message,
            priority,
            timestamp: Date.now(),
        });

        // Sort by priority (CRITICAL > HIGH > NORMAL > LOW)
        const priorityOrder: Record<MessagePriority, number> = {
            'CRITICAL': 4,
            'HIGH': 3,
            'NORMAL': 2,
            'LOW': 1,
        };

        this.messageQueue.sort((a, b) => {
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return a.timestamp - b.timestamp; // FIFO for same priority
        });

        this.processQueue();
    }

    /**
     * Process queued messages
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const queued = this.messageQueue.shift()!;
            await this.publishInternal(queued.message);
        }

        this.isProcessingQueue = false;
    }

    /**
     * Internal publish method (separated for queue processing)
     */
    private async publishInternal<T extends BaseMessage>(message: T): Promise<void> {
        const startTime = performance.now();
        let hadError = false;

        try {
            // Apply interceptors
            const processedMessage = this.applyInterceptors(message);
            if (!processedMessage) {
                return; // Message was blocked
            }

            // Add to log
            this.addToLog(processedMessage as BaseMessage);

            // Debug output
            if (this.debugMode) {
                console.log(`[MessageBus] Publishing ${processedMessage.type}`, {
                    source: processedMessage.source,
                    payload: processedMessage.payload,
                });
            }

            // Get handlers for this message type
            const handlers = this.subscribers.get(processedMessage.type);
            if (!handlers || handlers.size === 0) {
                if (this.debugMode) {
                    console.warn(`[MessageBus] No subscribers for ${processedMessage.type}`);
                }
                return;
            }

            // Execute all handlers
            const promises: Promise<void>[] = [];
            for (const handler of handlers) {
                try {
                    const result = handler(processedMessage as any);
                    if (result instanceof Promise) {
                        promises.push(result);
                    }
                } catch (error) {
                    hadError = true;
                    console.error(`[MessageBus] Handler error for ${processedMessage.type}:`, error);
                }
            }

            // Wait for all async handlers
            if (promises.length > 0) {
                await Promise.all(promises);
            }
        } finally {
            const processingTime = performance.now() - startTime;
            this.updateTelemetry(message.type, processingTime, hadError);
        }
    }
}

// Export singleton instance
export const messageBus = MessageBus.getInstance();
export default messageBus;
