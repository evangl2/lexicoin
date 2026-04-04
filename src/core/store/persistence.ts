import { PersistStorage, StorageValue } from 'zustand/middleware';
import { db } from '@core/storage/db';
import { logger } from '@utils/logger';

// Debounce writes to avoid thrashing IndexedDB on rapid state changes (e.g. pan/zoom at 60fps).
// The latest value is always written — no writes are dropped, only batched.
const WRITE_DEBOUNCE_MS = 500;
let pendingWrite: StorageValue<any> | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function flushWrite(): Promise<void> {
    const value = pendingWrite;
    pendingWrite = null;
    writeTimer = null;
    if (!value) return;
    try {
        await db.gameData.put({
            key: 'app-state',
            state: value,
            version: value.version?.toString() || '0',
            lastSyncAt: Date.now(),
        } as any);
    } catch (error) {
        logger.error('Failed to save state to IndexedDB', error, 'Persistence');
    }
}

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

    setItem: async (_name, value): Promise<void> => {
        pendingWrite = value;
        if (writeTimer) clearTimeout(writeTimer);
        writeTimer = setTimeout(flushWrite, WRITE_DEBOUNCE_MS);
    },

    removeItem: async (name): Promise<void> => {
        // Cancel any pending write before removing
        if (writeTimer) {
            clearTimeout(writeTimer);
            writeTimer = null;
            pendingWrite = null;
        }
        try {
            await db.gameData.delete('app-state');
        } catch (error) {
            logger.error('Failed to remove state from IndexedDB', error, 'Persistence');
        }
    },
};
