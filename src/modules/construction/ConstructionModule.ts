/**
 * ConstructionModule - Construction Grammar System
 * 
 * Manages the four-layer construction hierarchy (L1-L4):
 * L1: LEXEME (single words)
 * L2: PHRASE (word combinations)
 * L3: SENTENCE (complete thoughts)
 * L4: NARRATIVE (complex stories)
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { generateId } from '@utils/helpers';
import type { UUID, LocalizedText, CEFRLevel } from '../../types/index';

export type ConstructionLevel = 'LEXEME' | 'PHRASE' | 'SENTENCE' | 'NARRATIVE';

export interface Construction {
    id: UUID;
    level: ConstructionLevel;
    senseIds: UUID[];  // References to Sense IDs that fill the slots
    pattern: string;  // Pattern template, e.g., "[X] of [Y]", "[Agent] [Action] [Patient]"
    meaning: LocalizedText;
    examples: LocalizedText[];
    tags: string[];
    createdAt: number;
    lastUsedAt?: number;
}

export interface ConstructionSlot {
    name: string;
    required: boolean;
    senseId?: UUID;
    constraints?: {
        partOfSpeech?: string[];
        tags?: string[];
        level?: CEFRLevel[];
    };
}

class ConstructionModule {
    private static instance: ConstructionModule;
    private constructions: Map<UUID, Construction>;

    private constructor() {
        this.constructions = new Map();
        logger.info('ConstructionModule initialized', undefined, 'ConstructionModule');
    }

    static getInstance(): ConstructionModule {
        if (!ConstructionModule.instance) {
            ConstructionModule.instance = new ConstructionModule();
        }
        return ConstructionModule.instance;
    }

    /**
     * Create a new construction
     */
    async createConstruction(params: {
        level: ConstructionLevel;
        senseIds: UUID[];
        pattern: string;
        meaning: LocalizedText;
        examples?: LocalizedText[];
        tags?: string[];
    }): Promise<Construction> {
        const construction: Construction = {
            id: generateId(),
            level: params.level,
            senseIds: params.senseIds,
            pattern: params.pattern,
            meaning: params.meaning,
            examples: params.examples || [],
            tags: params.tags || [],
            createdAt: Date.now(),
        };

        this.constructions.set(construction.id, construction);
        logger.info(`Construction created: ${construction.pattern}`, { id: construction.id }, 'ConstructionModule');

        // Notify via MessageBus
        await messageBus.send('CONSTRUCTION_CREATED', construction, 'ConstructionModule');

        return construction;
    }

    /**
     * Get a construction by ID
     */
    getConstruction(id: UUID): Construction | undefined {
        return this.constructions.get(id);
    }

    /**
     * Get all constructions
     */
    getAllConstructions(): Construction[] {
        return Array.from(this.constructions.values());
    }

    /**
     * Get constructions by level
     */
    getConstructionsByLevel(level: ConstructionLevel): Construction[] {
        return Array.from(this.constructions.values()).filter(
            c => c.level === level
        );
    }

    /**
     * Get constructions that use a specific sense
     */
    getConstructionsUsingSense(senseId: UUID): Construction[] {
        return Array.from(this.constructions.values()).filter(
            c => c.senseIds.includes(senseId)
        );
    }

    /**
     * Validate if senses can fill a construction pattern
     */
    validateConstruction(pattern: string, senseIds: UUID[]): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Extract slot count from pattern (count of [X] placeholders)
        const slotMatches = pattern.match(/\[([^\]]+)\]/g);
        const slotCount = slotMatches ? slotMatches.length : 0;

        if (senseIds.length !== slotCount) {
            errors.push(`Pattern requires ${slotCount} senses, but ${senseIds.length} provided`);
        }

        // Additional validation can be added here
        // e.g., check if senses exist, check constraints, etc.

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Update a construction
     */
    async updateConstruction(id: UUID, updates: Partial<Construction>): Promise<Construction | undefined> {
        const construction = this.constructions.get(id);
        if (!construction) {
            logger.warn(`Construction not found: ${id}`, undefined, 'ConstructionModule');
            return undefined;
        }

        const updated = { ...construction, ...updates };
        this.constructions.set(id, updated);

        logger.debug(`Construction updated: ${id}`, updates, 'ConstructionModule');
        await messageBus.send('CONSTRUCTION_UPDATED', updated, 'ConstructionModule');

        return updated;
    }

    /**
     * Delete a construction
     */
    async deleteConstruction(id: UUID): Promise<boolean> {
        const deleted = this.constructions.delete(id);

        if (deleted) {
            logger.info(`Construction deleted: ${id}`, undefined, 'ConstructionModule');
            await messageBus.send('CONSTRUCTION_DELETED', { id }, 'ConstructionModule');
        }

        return deleted;
    }

    /**
     * Load constructions from storage
     */
    loadConstructions(constructions: Construction[]): void {
        for (const construction of constructions) {
            this.constructions.set(construction.id, construction);
        }
        logger.info(`Loaded ${constructions.length} constructions`, undefined, 'ConstructionModule');
    }

    /**
     * Clear all constructions
     */
    clear(): void {
        this.constructions.clear();
        logger.info('All constructions cleared', undefined, 'ConstructionModule');
    }
}

// Export singleton instance
export const constructionModule = ConstructionModule.getInstance();
export default constructionModule;
