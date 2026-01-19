/**
 * AIProxy - Security & Economic Gateway
 * 
 * Manages all AI API calls with rate limiting and error handling
 * Protects API keys and controls costs
 */

import { logger } from '@utils/logger';
import type { ModelId } from '@types/index';

interface AIRequest {
    prompt: string;
    model: ModelId;
    temperature?: number;
    maxTokens?: number;
}

interface AIResponse {
    text: string;
    tokensUsed: number;
    cached: boolean;
}

interface RateLimitConfig {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
}

class AIProxy {
    private static instance: AIProxy;
    private apiKey: string | null = null;
    private requestTimestamps: number[] = [];
    private rateLimitConfig: RateLimitConfig = {
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 100,
    };

    private constructor() {
        logger.info('AIProxy initialized', undefined, 'AIProxy');
        this.loadApiKey();
    }

    static getInstance(): AIProxy {
        if (!AIProxy.instance) {
            AIProxy.instance = new AIProxy();
        }
        return AIProxy.instance;
    }

    /**
     * Load API key from environment
     */
    private loadApiKey(): void {
        // In a real app, this would come from env variables or secure storage
        this.apiKey = import.meta.env.VITE_GEMINI_API_KEY || null;

        if (!this.apiKey) {
            logger.warn('No API key found. AI features will be disabled.', undefined, 'AIProxy');
        }
    }

    /**
     * Set API key manually
     */
    setApiKey(key: string): void {
        this.apiKey = key;
        logger.info('API key set', undefined, 'AIProxy');
    }

    /**
     * Check rate limits
     */
    private checkRateLimit(): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;

        // Clean old timestamps
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneHourAgo);

        // Check limits
        const recentMinute = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
        const recentHour = this.requestTimestamps.length;

        if (recentMinute >= this.rateLimitConfig.maxRequestsPerMinute) {
            logger.warn('Rate limit exceeded: too many requests per minute', undefined, 'AIProxy');
            return false;
        }

        if (recentHour >= this.rateLimitConfig.maxRequestsPerHour) {
            logger.warn('Rate limit exceeded: too many requests per hour', undefined, 'AIProxy');
            return false;
        }

        return true;
    }

    /**
     * Make an AI request
     */
    async request(request: AIRequest): Promise<AIResponse> {
        // Check API key
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        // Check rate limit
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Record request timestamp
        this.requestTimestamps.push(Date.now());

        logger.debug('AI request', { model: request.model, promptLength: request.prompt.length }, 'AIProxy');

        try {
            // TODO: Implement actual Gemini API call
            // For now, return mock response
            const response: AIResponse = {
                text: 'Mock AI response',
                tokensUsed: 100,
                cached: false,
            };

            logger.info('AI response received', { tokensUsed: response.tokensUsed }, 'AIProxy');
            return response;
        } catch (error) {
            logger.error('AI request failed', error, 'AIProxy');
            throw error;
        }
    }

    /**
     * Update rate limit configuration
     */
    setRateLimit(config: Partial<RateLimitConfig>): void {
        this.rateLimitConfig = {
            ...this.rateLimitConfig,
            ...config,
        };
        logger.info('Rate limit updated', this.rateLimitConfig, 'AIProxy');
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): {
        requestsLastMinute: number;
        requestsLastHour: number;
        config: RateLimitConfig;
    } {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;

        return {
            requestsLastMinute: this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length,
            requestsLastHour: this.requestTimestamps.filter(ts => ts > oneHourAgo).length,
            config: this.rateLimitConfig,
        };
    }
}

// Export singleton instance
export const aiProxy = AIProxy.getInstance();
export default aiProxy;
