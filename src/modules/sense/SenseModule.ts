/**
 * SenseModule - Core Innovation
 * 
 * Manages the atomic units of meaning (Senses)
 * This is the foundation of the linguistic engine
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { generateId } from '@utils/helpers';
import type { Sense, UUID, LocalizedText, CEFRLevel } from '@types/index';

class SenseModule {
    private static instance: SenseModule;
    private senses: Map<UUID, Sense>;

    private constructor() {
        this.senses = new Map();
        logger.info('SenseModule initialized', undefined, 'SenseModule');
    }

    static getInstance(): SenseModule {
        if (!SenseModule.instance) {
            SenseModule.instance = new SenseModule();
        }
        return SenseModule.instance;
    }

    /**
     * Create a new sense
     */
    async createSense(params: {
        word: LocalizedText;
        meaning: LocalizedText;
        partOfSpeech: string;
        level: CEFRLevel;
        visual: string;
        flavorText?: LocalizedText;
        tags?: string[];
    }): Promise<Sense> {
        const sense: Sense = {
            id: generateId(),
            word: params.word,
            meaning: params.meaning,
            partOfSpeech: params.partOfSpeech,
            level: params.level,
            visual: params.visual,
            flavorText: params.flavorText ?? { en: '', zh: '' },
            tags: params.tags ?? [],
            durability: 100,
            maxDurability: 100,
            createdAt: Date.now(),
        };

        this.senses.set(sense.id, sense);
        logger.info(`Sense created: ${sense.word.en}`, { id: sense.id }, 'SenseModule');

        // Notify via MessageBus
        await messageBus.send('SENSE_CREATED', sense, 'SenseModule');

        return sense;
    }

    /**
     * Get a sense by ID
     */
    getSense(id: UUID): Sense | undefined {
        return this.senses.get(id);
    }

    /**
     * Get all senses
     */
    getAllSenses(): Sense[] {
        return Array.from(this.senses.values());
    }

    /**
     * Update a sense
     */
    async updateSense(id: UUID, updates: Partial<Sense>): Promise<Sense | undefined> {
        const sense = this.senses.get(id);
        if (!sense) {
            logger.warn(`Sense not found: ${id}`, undefined, 'SenseModule');
            return undefined;
        }

        const updated = { ...sense, ...updates };
        this.senses.set(id, updated);

        logger.debug(`Sense updated: ${id}`, updates, 'SenseModule');

        // Notify via MessageBus
        await messageBus.send('SENSE_UPDATED', updated, 'SenseModule');

        return updated;
    }

    /**
     * Delete a sense
     */
    async deleteSense(id: UUID): Promise<boolean> {
        const deleted = this.senses.delete(id);

        if (deleted) {
            logger.info(`Sense deleted: ${id}`, undefined, 'SenseModule');
            await messageBus.send('SENSE_DELETED', { id }, 'SenseModule');
        }

        return deleted;
    }

    /**
     * Search senses by tags
     */
    searchByTags(tags: string[]): Sense[] {
        return Array.from(this.senses.values()).filter(sense =>
            tags.some(tag => sense.tags.includes(tag))
        );
    }

    /**
     * Search senses by level
     */
    searchByLevel(level: CEFRLevel): Sense[] {
        return Array.from(this.senses.values()).filter(sense =>
            sense.level === level
        );
    }

    /**
     * Load senses from storage
     */
    loadSenses(senses: Sense[]): void {
        for (const sense of senses) {
            this.senses.set(sense.id, sense);
        }
        logger.info(`Loaded ${senses.length} senses`, undefined, 'SenseModule');
    }

    /**
     * Clear all senses
     */
    clear(): void {
        this.senses.clear();
        logger.info('All senses cleared', undefined, 'SenseModule');
    }
}

// Export singleton instance
export const senseModule = SenseModule.getInstance();
export default senseModule;
