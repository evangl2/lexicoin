/**
 * AIModule - AI Interaction Layer
 * 
 * Manages AI requests with prompt engineering and response validation
 * Integrates with AIProxy and KnowledgeRegistry
 */

import { logger } from '@utils/logger';
import { aiProxy } from '@core/security/AIProxy';
import { knowledgeRegistry } from '@modules/registry/KnowledgeRegistry';
import { senseModule } from '@modules/sense/SenseModule';
import type {
    SynthesisRequest,
    SynthesisResult,
    EvolutionRequest,
    EvolutionResult,
    ModelId,
    UUID
} from '@types/index';

class AIModule {
    private static instance: AIModule;
    private defaultModel: ModelId = 'gemini-2.0-flash';

    private constructor() {
        logger.info('AIModule initialized', undefined, 'AIModule');
    }

    static getInstance(): AIModule {
        if (!AIModule.instance) {
            AIModule.instance = new AIModule();
        }
        return AIModule.instance;
    }

    /**
     * Request word synthesis
     */
    async requestSynthesis(request: SynthesisRequest): Promise<SynthesisResult> {
        logger.info('Synthesis requested', { inputCount: request.inputs.length }, 'AIModule');

        // Check cache first
        const cached = knowledgeRegistry.lookup(request.inputs);
        if (cached) {
            logger.info('Using cached synthesis result', undefined, 'AIModule');
            knowledgeRegistry.recordTokensSaved(100); // Estimate
            return {
                ...cached.result,
                cached: true,
            };
        }

        // Get input senses
        const senses = request.inputs
            .map(id => senseModule.getSense(id))
            .filter(s => s !== undefined);

        if (senses.length !== request.inputs.length) {
            logger.error('Some input senses not found', undefined, 'AIModule');
            return {
                outcome: 'FAILURE',
                failureCode: 'INVALID',
                cached: false,
            };
        }

        // Build prompt
        const prompt = this.buildSynthesisPrompt(senses, request.context);

        try {
            // Make AI request
            const response = await aiProxy.request({
                prompt,
                model: this.defaultModel,
                temperature: 0.8,
            });

            // TODO: Parse and validate AI response
            // For now, return mock result
            const result: SynthesisResult = {
                outcome: 'SUCCESS',
                cached: false,
                tokensUsed: response.tokensUsed,
                newSense: undefined, // TODO: Parse from AI response
            };

            // Cache the result
            knowledgeRegistry.store(request.inputs, result);

            return result;
        } catch (error) {
            logger.error('Synthesis failed', error, 'AIModule');
            return {
                outcome: 'FAILURE',
                failureCode: 'INVALID',
                cached: false,
            };
        }
    }

    /**
     * Request word evolution
     */
    async requestEvolution(request: EvolutionRequest): Promise<EvolutionResult> {
        logger.info('Evolution requested', { senseId: request.senseId }, 'AIModule');

        const sense = senseModule.getSense(request.senseId);
        if (!sense) {
            return {
                outcome: 'FAILURE',
                failureMessage: { en: 'Sense not found', zh: '词义未找到' },
            };
        }

        // Build prompt
        const prompt = this.buildEvolutionPrompt(sense, request.targetLevel);

        try {
            // Make AI request
            const response = await aiProxy.request({
                prompt,
                model: this.defaultModel,
                temperature: 0.7,
            });

            // TODO: Parse and validate AI response
            const result: EvolutionResult = {
                outcome: 'SUCCESS',
                evolvedSense: undefined, // TODO: Parse from AI response
            };

            return result;
        } catch (error) {
            logger.error('Evolution failed', error, 'AIModule');
            return {
                outcome: 'FAILURE',
                failureMessage: { en: 'Evolution failed', zh: '进化失败' },
            };
        }
    }

    /**
     * Build synthesis prompt
     */
    private buildSynthesisPrompt(senses: any[], context?: string): string {
        // TODO: Implement sophisticated prompt engineering
        const words = senses.map(s => s.word.en).join(' + ');
        return `Synthesize a new word from: ${words}${context ? `. Context: ${context}` : ''}`;
    }

    /**
     * Build evolution prompt
     */
    private buildEvolutionPrompt(sense: any, targetLevel?: string): string {
        // TODO: Implement sophisticated prompt engineering
        return `Evolve the word "${sense.word.en}" to ${targetLevel ?? 'next level'}`;
    }

    /**
     * Set default model
     */
    setDefaultModel(model: ModelId): void {
        this.defaultModel = model;
        logger.info(`Default model set to ${model}`, undefined, 'AIModule');
    }
}

// Export singleton instance
export const aiModule = AIModule.getInstance();
export default aiModule;
