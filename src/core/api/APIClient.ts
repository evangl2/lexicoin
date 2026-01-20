/**
 * API Client - Backend Communication Layer
 * 
 * Handles all HTTP requests to the backend server
 * Provides typed methods for each API endpoint
 */

import { logger } from '@utils/logger';
import type {
    APIResponse,
    SynthesisRequest,
    SynthesisResponse,
    EvolutionRequest,
    EvolutionResponse,
    TaskEvaluationRequest,
    TaskEvaluationResponse,
    ContentGenerationRequest,
    ContentGenerationResponse,
    UserSyncRequest,
    UserSyncResponse,
    DiscoveryCheckRequest,
    DiscoveryCheckResponse,
    LeaderboardRequest,
    LeaderboardResponse,
    FeedbackSubmissionRequest,
    FeedbackSubmissionResponse,
    AnalyticsEventRequest,
    AnalyticsEventResponse,
} from '../types/api';

class APIClient {
    private static instance: APIClient;
    private baseURL: string;
    private apiKey?: string;

    private constructor() {
        // 从环境变量读取配置
        this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
        this.apiKey = import.meta.env.VITE_API_KEY;

        logger.info('API Client initialized', { baseURL: this.baseURL }, 'APIClient');
    }

    static getInstance(): APIClient {
        if (!APIClient.instance) {
            APIClient.instance = new APIClient();
        }
        return APIClient.instance;
    }

    /**
     * 设置 API 基础 URL（用于动态配置）
     */
    setBaseURL(url: string): void {
        this.baseURL = url;
        logger.info('API base URL updated', { baseURL: url }, 'APIClient');
    }

    /**
     * 设置 API Key
     */
    setAPIKey(key: string): void {
        this.apiKey = key;
    }

    /**
     * 通用请求方法
     */
    private async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: any
    ): Promise<APIResponse<T>> {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            const options: RequestInit = {
                method,
                headers,
            };

            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }

            logger.debug(`API Request: ${method} ${endpoint}`, { body }, 'APIClient');

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                logger.error(`API Error: ${response.status}`, data, 'APIClient');
                return {
                    success: false,
                    error: {
                        code: `HTTP_${response.status}`,
                        message: data.message || 'Request failed',
                        details: data,
                    },
                    timestamp: Date.now(),
                };
            }

            logger.debug(`API Response: ${method} ${endpoint}`, { data }, 'APIClient');

            return {
                success: true,
                data,
                timestamp: Date.now(),
            };
        } catch (error) {
            logger.error('API Request failed', error, 'APIClient');
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    details: error,
                },
                timestamp: Date.now(),
            };
        }
    }

    // ========================================================================
    // SYNTHESIS API
    // ========================================================================

    async synthesize(request: SynthesisRequest): Promise<APIResponse<SynthesisResponse>> {
        return this.request<SynthesisResponse>('/synthesis', 'POST', request);
    }

    // ========================================================================
    // EVOLUTION API
    // ========================================================================

    async evolve(request: EvolutionRequest): Promise<APIResponse<EvolutionResponse>> {
        return this.request<EvolutionResponse>('/evolution', 'POST', request);
    }

    // ========================================================================
    // TASK EVALUATION API
    // ========================================================================

    async evaluateTask(request: TaskEvaluationRequest): Promise<APIResponse<TaskEvaluationResponse>> {
        return this.request<TaskEvaluationResponse>('/tasks/evaluate', 'POST', request);
    }

    // ========================================================================
    // CONTENT GENERATION API
    // ========================================================================

    async generateContent(request: ContentGenerationRequest): Promise<APIResponse<ContentGenerationResponse>> {
        return this.request<ContentGenerationResponse>('/content/generate', 'POST', request);
    }

    // ========================================================================
    // USER SYNC API
    // ========================================================================

    async syncUser(request: UserSyncRequest): Promise<APIResponse<UserSyncResponse>> {
        return this.request<UserSyncResponse>('/user/sync', 'POST', request);
    }

    // ========================================================================
    // DISCOVERY API
    // ========================================================================

    async checkDiscovery(request: DiscoveryCheckRequest): Promise<APIResponse<DiscoveryCheckResponse>> {
        return this.request<DiscoveryCheckResponse>('/discovery/check', 'POST', request);
    }

    async registerDiscovery(request: DiscoveryCheckRequest): Promise<APIResponse<DiscoveryCheckResponse>> {
        return this.request<DiscoveryCheckResponse>('/discovery/register', 'POST', request);
    }

    // ========================================================================
    // LEADERBOARD API
    // ========================================================================

    async getLeaderboard(request: LeaderboardRequest): Promise<APIResponse<LeaderboardResponse>> {
        const params = new URLSearchParams();
        if (request.type) params.append('type', request.type);
        if (request.timeRange) params.append('timeRange', request.timeRange);
        if (request.limit) params.append('limit', request.limit.toString());

        return this.request<LeaderboardResponse>(`/leaderboard?${params.toString()}`);
    }

    // ========================================================================
    // FEEDBACK API
    // ========================================================================

    async submitFeedback(request: FeedbackSubmissionRequest): Promise<APIResponse<FeedbackSubmissionResponse>> {
        return this.request<FeedbackSubmissionResponse>('/feedback', 'POST', request);
    }

    // ========================================================================
    // ANALYTICS API
    // ========================================================================

    async trackEvent(request: AnalyticsEventRequest): Promise<APIResponse<AnalyticsEventResponse>> {
        return this.request<AnalyticsEventResponse>('/analytics/event', 'POST', request);
    }

    // ========================================================================
    // HEALTH CHECK
    // ========================================================================

    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.request('/health');
            return response.success;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
export const apiClient = APIClient.getInstance();
export default apiClient;
