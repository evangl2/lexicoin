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
        const results: LibraryEntry[] = [];
        const query = filters.query?.toLowerCase();

        // Single pass filtering to avoid multiple intermediate arrays
        for (const entry of this.catalog.values()) {
            if (query && !entry.name.toLowerCase().includes(query)) continue;
            if (filters.type && entry.type !== filters.type) continue;
            if (filters.tags && filters.tags.length > 0 && !filters.tags.some(tag => entry.tags.includes(tag))) continue;
            if (filters.level && entry.level !== filters.level) continue;
            if (filters.discovered !== undefined && entry.discovered !== filters.discovered) continue;
            if (filters.minStability !== undefined && entry.stability < filters.minStability) continue;

            results.push(entry);
        }

        return results;
    }

    /**
     * Get popular entries (by usage count)
     */
    getPopularEntries(count: number = 10): LibraryEntry[] {
        const results: LibraryEntry[] = [];
        for (const entry of this.catalog.values()) {
            if (entry.discovered) {
                results.push(entry);
            }
        }
        return results.sort((a, b) => b.usageCount - a.usageCount).slice(0, count);
    }

    /**
     * Get recent discoveries
     */
    getRecentDiscoveries(count: number = 10): LibraryEntry[] {
        const results: LibraryEntry[] = [];
        for (const entry of this.catalog.values()) {
            if (entry.discovered) {
                results.push(entry);
            }
        }
        return results.sort((a, b) => b.createdAt - a.createdAt).slice(0, count);
    }

    /**
     * Get entries by tag
     */
    getEntriesByTag(tag: string): LibraryEntry[] {
        const results: LibraryEntry[] = [];
        for (const entry of this.catalog.values()) {
            if (entry.tags.includes(tag)) {
                results.push(entry);
            }
        }
        return results;
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
        // ⚡ Performance Optimization: Single-pass iteration to avoid .map().filter()
        // intermediate array allocations.
        const results: LibraryEntry[] = [];
        for (const id of this.showcase.favoriteIds) {
            const entry = this.catalog.get(id);
            if (entry !== undefined) {
                results.push(entry);
            }
        }
        return results;
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
        // ⚡ Performance Optimization: Single-pass iteration to avoid .map().filter()
        // intermediate array allocations.
        const results: LibraryEntry[] = [];
        for (const id of this.showcase.firstDiscoveries) {
            const entry = this.catalog.get(id);
            if (entry !== undefined) {
                results.push(entry);
            }
        }
        return results;
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
        let discoveredCount = 0;
        for (const entry of this.catalog.values()) {
            if (entry.discovered) {
                discoveredCount++;
            }
        }

        return {
            totalEntries: this.catalog.size,
            discoveredCount,
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
