/**
 * StorageManager - Sync & Persistence Module
 *
 * Manages local data persistence with IndexedDB via Dexie.js.
 * Provides interface for future cloud sync integration.
 *
 * Upgraded from localStorage to IndexedDB for capacity and performance.
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { db } from './db';
import type { PlayerState, Sense } from '../../types/index';

interface StorageData {
    player?: PlayerState;
    senses?: Sense[];
    lastSyncAt?: number;
    version: string;
}

type MigrationFunction = (data: any) => StorageData;

class StorageManager {
    private static instance: StorageManager;
    private readonly VERSION = '0.2.0';
    private autoSaveEnabled: boolean = true;
    private initialized: boolean = false;
    private migrations: Map<string, MigrationFunction> = new Map();

    private constructor() {
        // Only synchronous setup here — no I/O until initialize() is called
        this.initializeMigrations();
    }

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /**
     * Async initialization — must be called before any data operations.
     * Opens IndexedDB, runs one-time localStorage migration, then enables auto-save.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await db.open();
            await this.migrateFromLocalStorage();
            this.setupAutoSave();
            this.initialized = true;
            logger.info('StorageManager initialized with IndexedDB', undefined, 'StorageManager');
        } catch (error) {
            logger.error('StorageManager initialization failed', error, 'StorageManager');
            throw error;
        }
    }

    /**
     * Initialize data migration functions (version chain)
     */
    private initializeMigrations(): void {
        // Migration from 0.1.0 to 0.2.0
        this.migrations.set('0.1.0', (data: any): StorageData => {
            logger.info('Migrating data from 0.1.0 to 0.2.0', undefined, 'StorageManager');
            return {
                ...data,
                version: '0.2.0',
            };
        });
    }

    /**
     * One-time migration from localStorage → IndexedDB.
     * Uses an in-transaction flag (_migration_done) to ensure idempotency.
     * Clears localStorage immediately after successful migration.
     */
    private async migrateFromLocalStorage(): Promise<void> {
        const migrationFlag = await db.gameData.get('_migration_done');
        if (migrationFlag) return; // Already migrated

        try {
            // Read from localStorage (may be empty for new users)
            const rawGame = localStorage.getItem('lexicoin_data');
            const rawCanvas = localStorage.getItem('canvas-items');

            // Nothing to migrate
            if (!rawGame && !rawCanvas) {
                // Still set the flag so we don't check every time
                await db.gameData.put({ key: '_migration_done', version: '1.0' });
                return;
            }

            // Write to IndexedDB in a single atomic transaction
            await db.transaction('rw', [db.gameData, db.canvasPositions], async () => {
                if (rawGame) {
                    const parsed = JSON.parse(rawGame);
                    await db.gameData.put({ key: 'main', ...parsed });
                    logger.info('Migrated game data from localStorage', undefined, 'StorageManager');
                }

                if (rawCanvas) {
                    const positions = JSON.parse(rawCanvas);
                    if (Array.isArray(positions) && positions.length > 0) {
                        await db.canvasPositions.bulkPut(positions);
                        logger.info(`Migrated ${positions.length} canvas positions from localStorage`, undefined, 'StorageManager');
                    }
                }

                // Mark migration complete (inside the same transaction)
                await db.gameData.put({ key: '_migration_done', version: '1.0' });
            });

            // Transaction succeeded — now safe to clear localStorage
            ['lexicoin_data', 'lexicoin_data_temp', 'lexicoin_data_backup', 'canvas-items']
                .forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });

            logger.info('localStorage → IndexedDB migration completed and localStorage cleared', undefined, 'StorageManager');
        } catch (error) {
            // Migration failed — localStorage is preserved for next retry
            logger.error('Migration from localStorage failed, will retry on next launch', error, 'StorageManager');
        }
    }

    /**
     * Setup auto-save triggers via MessageBus
     */
    private setupAutoSave(): void {
        if (!this.autoSaveEnabled) return;

        messageBus.subscribe('SENSE_CREATED', async () => {
            logger.debug('Auto-saving after SENSE_CREATED', undefined, 'StorageManager');
        });

        messageBus.subscribe('SENSE_UPDATED', async () => {
            logger.debug('Auto-saving after SENSE_UPDATED', undefined, 'StorageManager');
        });

        messageBus.subscribe('PLAYER_STATE_CHANGED', async () => {
            logger.debug('Auto-saving after PLAYER_STATE_CHANGED', undefined, 'StorageManager');
        });
    }

    /**
     * Migrate data to current version (version chain)
     */
    private migrateData(data: any): StorageData {
        let currentData = data;
        const dataVersion = data.version || '0.1.0';

        if (dataVersion === this.VERSION) {
            return currentData;
        }

        logger.info(`Migrating data from ${dataVersion} to ${this.VERSION}`, undefined, 'StorageManager');

        const versions = ['0.1.0', '0.2.0'];
        const startIndex = versions.indexOf(dataVersion);

        if (startIndex === -1) {
            logger.warn(`Unknown version ${dataVersion}, using as-is`, undefined, 'StorageManager');
            return { ...currentData, version: this.VERSION };
        }

        for (let i = startIndex; i < versions.length - 1; i++) {
            const migrationFn = this.migrations.get(versions[i]!);
            if (migrationFn) {
                currentData = migrationFn(currentData);
            }
        }

        return currentData;
    }

    /**
     * Save data to IndexedDB with atomic backup + write in a single transaction
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

            await db.transaction('rw', db.gameData, async () => {
                // Backup current data first
                const current = await db.gameData.get('main');
                if (current) {
                    await db.gameData.put({ ...current, key: 'backup' });
                }
                // Write new data
                await db.gameData.put({ key: 'main', ...merged });
            });

            logger.debug('Data saved to IndexedDB (atomic)', merged, 'StorageManager');
        } catch (error) {
            logger.error('Failed to save data', error, 'StorageManager');

            // Attempt to restore from backup
            try {
                const backup = await db.gameData.get('backup');
                if (backup) {
                    await db.gameData.put({ ...backup, key: 'main' });
                    logger.info('Restored from backup after save failure', undefined, 'StorageManager');
                }
            } catch (restoreError) {
                logger.error('Failed to restore from backup', restoreError, 'StorageManager');
            }

            throw error;
        }
    }

    /**
     * Load data from IndexedDB with migration
     */
    async load(): Promise<StorageData> {
        try {
            const record = await db.gameData.get('main');
            if (!record) {
                logger.debug('No saved data found', undefined, 'StorageManager');
                return { version: this.VERSION };
            }

            // Extract StorageData fields (exclude the 'key' field)
            const { key: _key, ...data } = record;

            // Apply migrations if needed
            const migratedData = this.migrateData(data);

            // Save migrated data if version changed
            if (migratedData.version !== (data.version || '0.1.0')) {
                await this.save(migratedData);
            }

            logger.debug('Data loaded from IndexedDB', migratedData, 'StorageManager');
            return migratedData;
        } catch (error) {
            logger.error('Failed to load data', error, 'StorageManager');

            // Try to restore from backup
            try {
                const backup = await db.gameData.get('backup');
                if (backup) {
                    logger.warn('Loading from backup after load failure', undefined, 'StorageManager');
                    const { key: _key, ...data } = backup;
                    return data as StorageData;
                }
            } catch (backupError) {
                logger.error('Failed to load from backup', backupError, 'StorageManager');
            }

            return { version: this.VERSION };
        }
    }

    /**
     * Clear all local data including backups
     */
    async clear(): Promise<void> {
        try {
            await db.gameData.clear();
            await db.canvasPositions.clear();
            logger.info('Local data cleared', undefined, 'StorageManager');
        } catch (error) {
            logger.error('Failed to clear data', error, 'StorageManager');
            throw error;
        }
    }

    /**
     * Enable or disable auto-save
     */
    setAutoSave(enabled: boolean): void {
        this.autoSaveEnabled = enabled;
        logger.info(`Auto-save ${enabled ? 'enabled' : 'disabled'}`, undefined, 'StorageManager');
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
    }

    /**
     * TODO: Cloud sync interface (to be implemented with Supabase)
     */
    async syncFromCloud(): Promise<void> {
        logger.warn('Cloud sync not yet implemented', undefined, 'StorageManager');
    }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
export type { StorageData };
export default storageManager;
