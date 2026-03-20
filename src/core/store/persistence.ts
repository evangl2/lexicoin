import { PersistStorage, StorageValue } from 'zustand/middleware';
import { db } from '@core/storage/db';
import { logger } from '@utils/logger';

/**
 * Custom persistence adapter for Zustand using Dexie (IndexedDB).
 * Stores the entire state tree (based on 'partialize' filter) into
 * the 'gameData' table with key 'app-state'.
 */
export const indexedDBStorage: PersistStorage<any> = {
    getItem: async (name): Promise<StorageValue<any> | null> => {
        try {
            const record = await db.gameData.get('app-state');
            if (record && record.state) {
                logger.info('Hydrated state from IndexedDB', undefined, 'Persistence');
                return record.state;
            }
            return null;
        } catch (error) {
            logger.error('Failed to load state from IndexedDB', error, 'Persistence');
            return null;
        }
    },

    setItem: async (name, value): Promise<void> => {
        try {
            await db.gameData.put({
                key: 'app-state',
                state: value,
                version: value.version?.toString() || '0',
                lastSyncAt: Date.now(),
            } as any); // Type assertion needed because we are adding dynamic 'state' field not in base interface, or we need to update GameDataRecord
        } catch (error) {
            logger.error('Failed to save state to IndexedDB', error, 'Persistence');
        }
    },

    removeItem: async (name): Promise<void> => {
        try {
            await db.gameData.delete('app-state');
        } catch (error) {
            logger.error('Failed to remove state from IndexedDB', error, 'Persistence');
        }
    },
};
