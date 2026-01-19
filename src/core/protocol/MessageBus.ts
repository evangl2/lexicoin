/**
 * MessageBus - Protocol Broker Module
 * 
 * Central communication hub for all modules in the application.
 * Implements publish-subscribe pattern for decoupled module communication.
 */

import type { BaseMessage, MessageHandler, ProtocolMessage } from '@types/protocol';
import { generateId } from '@utils/helpers';

type MessageType = ProtocolMessage['type'];

class MessageBus {
    private static instance: MessageBus;
    private subscribers: Map<string, Set<MessageHandler>>;
    private messageLog: BaseMessage[];
    private maxLogSize: number = 100;
    private debugMode: boolean = true;

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
        return () => this.unsubscribe(messageType, handler);
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
    async publish<T extends BaseMessage>(message: T): Promise<void> {
        // Add to log
        this.addToLog(message);

        // Debug output
        if (this.debugMode) {
            console.log(`[MessageBus] Publishing ${message.type}`, {
                source: message.source,
                payload: message.payload,
            });
        }

        // Get handlers for this message type
        const handlers = this.subscribers.get(message.type);
        if (!handlers || handlers.size === 0) {
            if (this.debugMode) {
                console.warn(`[MessageBus] No subscribers for ${message.type}`);
            }
            return;
        }

        // Execute all handlers
        const promises: Promise<void>[] = [];
        for (const handler of handlers) {
            try {
                const result = handler(message);
                if (result instanceof Promise) {
                    promises.push(result);
                }
            } catch (error) {
                console.error(`[MessageBus] Handler error for ${message.type}:`, error);
            }
        }

        // Wait for all async handlers
        if (promises.length > 0) {
            await Promise.all(promises);
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
}

// Export singleton instance
export const messageBus = MessageBus.getInstance();
export default messageBus;
