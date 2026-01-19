/**
 * LibraryModule - Knowledge Showcase & Search
 * 
 * Manages universal catalog, search/filtering, entry details,
 * and personal showcase for discovered content
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import type { UUID, CEFRLevel } from '../../types/index';

export interface LibraryEntry {
    id: UUID;
    type: 'SENSE' | 'CONSTRUCTION';
    name: string;
    discovered: boolean;
    firstDiscoverer?: string;  // Player ID or name
    stability: number;  // 0-1
    usageCount: number;
    tags: string[];
    level?: CEFRLevel;
    createdAt: number;
}

export interface SearchFilters {
    query?: string;
    type?: 'SENSE' | 'CONSTRUCTION';
    tags?: string[];
    level?: CEFRLevel;
    discovered?: boolean;
    minStability?: number;
}

export interface PersonalShowcase {
    favoriteIds: UUID[];
    achievements: string[];
    firstDiscoveries: UUID[];
}

class LibraryModule {
    private static instance: LibraryModule;
    private catalog: Map<UUID, LibraryEntry>;
    private showcase: PersonalShowcase;

    private constructor() {
        this.catalog = new Map();
        this.showcase = {
            favoriteIds: [],
            achievements: [],
            firstDiscoveries: [],
        };
        logger.info('LibraryModule initialized', undefined, 'LibraryModule');
    }

    static getInstance(): LibraryModule {
        if (!LibraryModule.instance) {
            LibraryModule.instance = new LibraryModule();
        }
        return LibraryModule.instance;
    }

    /**
     * Add entry to catalog
     */
    async addEntry(entry: LibraryEntry): Promise<void> {
        this.catalog.set(entry.id, entry);

        await messageBus.send('LIBRARY_ENTRY_ADDED', entry, 'LibraryModule');
        logger.debug(`Library entry added: ${entry.name}`, { id: entry.id }, 'LibraryModule');
    }

    /**
     * Get entry by ID
     */
    getEntry(id: UUID): LibraryEntry | undefined {
        return this.catalog.get(id);
    }

    /**
     * Search catalog with filters
     */
    search(filters: SearchFilters): LibraryEntry[] {
        let results = Array.from(this.catalog.values());

        // Apply filters
        if (filters.query) {
            const query = filters.query.toLowerCase();
            results = results.filter(entry =>
                entry.name.toLowerCase().includes(query)
            );
        }

        if (filters.type) {
            results = results.filter(entry => entry.type === filters.type);
        }

        if (filters.tags && filters.tags.length > 0) {
            results = results.filter(entry =>
                filters.tags!.some(tag => entry.tags.includes(tag))
            );
        }

        if (filters.level) {
            results = results.filter(entry => entry.level === filters.level);
        }

        if (filters.discovered !== undefined) {
            results = results.filter(entry => entry.discovered === filters.discovered);
        }

        if (filters.minStability !== undefined) {
            results = results.filter(entry => entry.stability >= filters.minStability!);
        }

        return results;
    }

    /**
     * Get popular entries (by usage count)
     */
    getPopularEntries(count: number = 10): LibraryEntry[] {
        return Array.from(this.catalog.values())
            .filter(entry => entry.discovered)
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, count);
    }

    /**
     * Get recent discoveries
     */
    getRecentDiscoveries(count: number = 10): LibraryEntry[] {
        return Array.from(this.catalog.values())
            .filter(entry => entry.discovered)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, count);
    }

    /**
     * Get entries by tag
     */
    getEntriesByTag(tag: string): LibraryEntry[] {
        return Array.from(this.catalog.values()).filter(entry =>
            entry.tags.includes(tag)
        );
    }

    /**
     * Get all unique tags
     */
    getAllTags(): string[] {
        const tagSet = new Set<string>();
        for (const entry of this.catalog.values()) {
            for (const tag of entry.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }

    /**
     * Mark entry as discovered
     */
    async markDiscovered(id: UUID, firstDiscoverer?: string): Promise<boolean> {
        const entry = this.catalog.get(id);
        if (!entry) return false;

        entry.discovered = true;
        if (firstDiscoverer && !entry.firstDiscoverer) {
            entry.firstDiscoverer = firstDiscoverer;
        }

        await messageBus.send('LIBRARY_ENTRY_DISCOVERED', entry, 'LibraryModule');
        logger.info(`Entry discovered: ${entry.name}`, { id, firstDiscoverer }, 'LibraryModule');

        return true;
    }

    /**
     * Update entry stability
     */
    async updateStability(id: UUID, stability: number): Promise<boolean> {
        const entry = this.catalog.get(id);
        if (!entry) return false;

        entry.stability = Math.max(0, Math.min(1, stability));

        await messageBus.send('LIBRARY_STABILITY_UPDATED', { id, stability: entry.stability }, 'LibraryModule');
        logger.debug(`Stability updated for ${entry.name}: ${entry.stability}`, undefined, 'LibraryModule');

        return true;
    }

    /**
     * Increment usage count
     */
    incrementUsage(id: UUID): void {
        const entry = this.catalog.get(id);
        if (entry) {
            entry.usageCount++;
        }
    }

    /**
     * Add to favorites
     */
    async addToFavorites(id: UUID): Promise<boolean> {
        if (this.showcase.favoriteIds.includes(id)) {
            return false;
        }

        this.showcase.favoriteIds.push(id);

        await messageBus.send('FAVORITE_ADDED', { id }, 'LibraryModule');
        logger.debug(`Added to favorites: ${id}`, undefined, 'LibraryModule');

        return true;
    }

    /**
     * Remove from favorites
     */
    async removeFromFavorites(id: UUID): Promise<boolean> {
        const index = this.showcase.favoriteIds.indexOf(id);
        if (index === -1) {
            return false;
        }

        this.showcase.favoriteIds.splice(index, 1);

        await messageBus.send('FAVORITE_REMOVED', { id }, 'LibraryModule');
        logger.debug(`Removed from favorites: ${id}`, undefined, 'LibraryModule');

        return true;
    }

    /**
     * Get favorites
     */
    getFavorites(): LibraryEntry[] {
        return this.showcase.favoriteIds
            .map(id => this.catalog.get(id))
            .filter((entry): entry is LibraryEntry => entry !== undefined);
    }

    /**
     * Add first discovery
     */
    addFirstDiscovery(id: UUID): void {
        if (!this.showcase.firstDiscoveries.includes(id)) {
            this.showcase.firstDiscoveries.push(id);
        }
    }

    /**
     * Get first discoveries
     */
    getFirstDiscoveries(): LibraryEntry[] {
        return this.showcase.firstDiscoveries
            .map(id => this.catalog.get(id))
            .filter((entry): entry is LibraryEntry => entry !== undefined);
    }

    /**
     * Add achievement
     */
    async addAchievement(achievementId: string): Promise<void> {
        if (!this.showcase.achievements.includes(achievementId)) {
            this.showcase.achievements.push(achievementId);

            await messageBus.send('ACHIEVEMENT_UNLOCKED', { achievementId }, 'LibraryModule');
            logger.info(`Achievement unlocked: ${achievementId}`, undefined, 'LibraryModule');
        }
    }

    /**
     * Get achievements
     */
    getAchievements(): string[] {
        return [...this.showcase.achievements];
    }

    /**
     * Get showcase
     */
    getShowcase(): PersonalShowcase {
        return {
            favoriteIds: [...this.showcase.favoriteIds],
            achievements: [...this.showcase.achievements],
            firstDiscoveries: [...this.showcase.firstDiscoveries],
        };
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        totalEntries: number;
        discoveredCount: number;
        favoriteCount: number;
        firstDiscoveryCount: number;
        achievementCount: number;
    } {
        return {
            totalEntries: this.catalog.size,
            discoveredCount: Array.from(this.catalog.values()).filter(e => e.discovered).length,
            favoriteCount: this.showcase.favoriteIds.length,
            firstDiscoveryCount: this.showcase.firstDiscoveries.length,
            achievementCount: this.showcase.achievements.length,
        };
    }

    /**
     * Load catalog
     */
    loadCatalog(entries: LibraryEntry[]): void {
        for (const entry of entries) {
            this.catalog.set(entry.id, entry);
        }
        logger.info(`Loaded ${entries.length} library entries`, undefined, 'LibraryModule');
    }

    /**
     * Load showcase
     */
    loadShowcase(showcase: PersonalShowcase): void {
        this.showcase = showcase;
        logger.info('Showcase loaded', showcase, 'LibraryModule');
    }

    /**
     * Clear catalog
     */
    clear(): void {
        this.catalog.clear();
        this.showcase = {
            favoriteIds: [],
            achievements: [],
            firstDiscoveries: [],
        };
        logger.info('Library cleared', undefined, 'LibraryModule');
    }
}

// Export singleton instance
export const libraryModule = LibraryModule.getInstance();
export default libraryModule;
