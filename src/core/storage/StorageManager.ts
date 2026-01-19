/**
 * StorageManager - Sync & Persistence Module
 * 
 * Manages local data persistence with localStorage/IndexedDB
 * Provides interface for future cloud sync integration
 */

import { logger } from '@utils/logger';
import type { PlayerState, Sense } from '@types/index';

interface StorageData {
    player?: PlayerState;
    senses?: Sense[];
    lastSyncAt?: number;
    version?: string;
}

class StorageManager {
    private static instance: StorageManager;
    private readonly STORAGE_KEY = 'lexicoin_data';
    private readonly VERSION = '0.1.0';

    private constructor() {
        logger.info('StorageManager initialized', undefined, 'StorageManager');
    }

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /**
     * Save data to localStorage
     */
    async save(data: Partial<StorageData>): Promise<void> {
        try {
            const existing = await this.load();
            const merged: StorageData = {
                ...existing,
                ...data,
                lastSyncAt: Date.now(),
                version: this.VERSION,
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            logger.debug('Data saved to localStorage', merged, 'StorageManager');
        } catch (error) {
            logger.error('Failed to save data', error, 'StorageManager');
            throw error;
        }
    }

    /**
     * Load data from localStorage
     */
    async load(): Promise<StorageData> {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) {
                logger.debug('No saved data found', undefined, 'StorageManager');
                return {};
            }

            const data = JSON.parse(raw) as StorageData;
            logger.debug('Data loaded from localStorage', data, 'StorageManager');
            return data;
        } catch (error) {
            logger.error('Failed to load data', error, 'StorageManager');
            return {};
        }
    }

    /**
     * Clear all local data
     */
    async clear(): Promise<void> {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            logger.info('Local data cleared', undefined, 'StorageManager');
        } catch (error) {
            logger.error('Failed to clear data', error, 'StorageManager');
            throw error;
        }
    }

    /**
     * Save player state
     */
    async savePlayer(player: PlayerState): Promise<void> {
        await this.save({ player });
    }

    /**
     * Load player state
     */
    async loadPlayer(): Promise<PlayerState | undefined> {
        const data = await this.load();
        return data.player;
    }

    /**
     * Save senses collection
     */
    async saveSenses(senses: Sense[]): Promise<void> {
        await this.save({ senses });
    }

    /**
     * Load senses collection
     */
    async loadSenses(): Promise<Sense[]> {
        const data = await this.load();
        return data.senses ?? [];
    }

    /**
     * TODO: Cloud sync interface (to be implemented with Supabase)
     */
    async syncToCloud(): Promise<void> {
        logger.warn('Cloud sync not yet implemented', undefined, 'StorageManager');
        // TODO: Implement Supabase sync
    }

    /**
     * TODO: Cloud sync interface (to be implemented with Supabase)
     */
    async syncFromCloud(): Promise<void> {
        logger.warn('Cloud sync not yet implemented', undefined, 'StorageManager');
        // TODO: Implement Supabase sync
    }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
export default storageManager;
