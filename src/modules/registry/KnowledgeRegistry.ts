/**
 * KnowledgeRegistry - Global Knowledge & Synthesis Cache
 * 
 * Semantic caching system to save AI tokens
 * Records all synthesis results for reuse
 */

import { logger } from '@utils/logger';
import { hashIds } from '@utils/helpers';
import type { CachedSynthesis, UUID, SynthesisResult } from '@types/index';

class KnowledgeRegistry {
    private static instance: KnowledgeRegistry;
    private cache: Map<string, CachedSynthesis>;
    private totalTokensSaved: number = 0;

    private constructor() {
        this.cache = new Map();
        logger.info('KnowledgeRegistry initialized', undefined, 'KnowledgeRegistry');
    }

    static getInstance(): KnowledgeRegistry {
        if (!KnowledgeRegistry.instance) {
            KnowledgeRegistry.instance = new KnowledgeRegistry();
        }
        return KnowledgeRegistry.instance;
    }

    /**
     * Check if a synthesis is cached
     */
    lookup(inputIds: UUID[]): CachedSynthesis | undefined {
        const hash = hashIds(inputIds);
        const cached = this.cache.get(hash);

        if (cached) {
            // Update usage stats
            cached.usageCount++;
            cached.lastUsedAt = Date.now();

            logger.debug('Cache hit', { hash, usageCount: cached.usageCount }, 'KnowledgeRegistry');
        }

        return cached;
    }

    /**
     * Store a synthesis result
     */
    store(inputIds: UUID[], result: SynthesisResult): void {
        const hash = hashIds(inputIds);
        const now = Date.now();

        const cached: CachedSynthesis = {
            id: hash,
            inputIds: [...inputIds].sort(),
            inputHash: hash,
            result,
            usageCount: 1,
            createdAt: now,
            lastUsedAt: now,
        };

        this.cache.set(hash, cached);
        logger.info('Synthesis cached', { hash, inputIds }, 'KnowledgeRegistry');
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        totalEntries: number;
        totalTokensSaved: number;
        mostUsed: CachedSynthesis[];
    } {
        const entries = Array.from(this.cache.values());
        const mostUsed = entries
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10);

        return {
            totalEntries: entries.length,
            totalTokensSaved: this.totalTokensSaved,
            mostUsed,
        };
    }

    /**
     * Record tokens saved
     */
    recordTokensSaved(tokens: number): void {
        this.totalTokensSaved += tokens;
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
        this.totalTokensSaved = 0;
        logger.info('Cache cleared', undefined, 'KnowledgeRegistry');
    }

    /**
     * Export cache for persistence
     */
    export(): CachedSynthesis[] {
        return Array.from(this.cache.values());
    }

    /**
     * Import cache from storage
     */
    import(entries: CachedSynthesis[]): void {
        for (const entry of entries) {
            this.cache.set(entry.inputHash, entry);
        }
        logger.info(`Imported ${entries.length} cache entries`, undefined, 'KnowledgeRegistry');
    }
}

// Export singleton instance
export const knowledgeRegistry = KnowledgeRegistry.getInstance();
export default knowledgeRegistry;
