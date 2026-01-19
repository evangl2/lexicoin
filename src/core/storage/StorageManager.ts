/**
 * StorageManager - Sync & Persistence Module
 * 
 * Manages local data persistence with localStorage/IndexedDB
 * Provides interface for future cloud sync integration
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
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
    private readonly STORAGE_KEY = 'lexicoin_data';
    private readonly TEMP_KEY = 'lexicoin_data_temp';
    private readonly BACKUP_KEY = 'lexicoin_data_backup';
    private readonly VERSION = '0.2.0';
    private autoSaveEnabled: boolean = true;
    private migrations: Map<string, MigrationFunction> = new Map();

    private constructor() {
        this.initializeMigrations();
        this.setupAutoSave();
        logger.info('StorageManager initialized', undefined, 'StorageManager');
    }

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /**
     * Initialize migration functions
     */
    private initializeMigrations(): void {
        // Migration from 0.1.0 to 0.2.0
        this.migrations.set('0.1.0', (data: any): StorageData => {
            logger.info('Migrating data from 0.1.0 to 0.2.0', undefined, 'StorageManager');
            // Add any necessary data transformations here
            return {
                ...data,
                version: '0.2.0',
            };
        });
    }

    /**
     * Setup auto-save triggers via MessageBus
     */
    private setupAutoSave(): void {
        if (!this.autoSaveEnabled) return;

        // Auto-save on sense changes
        messageBus.subscribe('SENSE_CREATED', async () => {
            logger.debug('Auto-saving after SENSE_CREATED', undefined, 'StorageManager');
            // Actual save will be triggered by the module
        });

        messageBus.subscribe('SENSE_UPDATED', async () => {
            logger.debug('Auto-saving after SENSE_UPDATED', undefined, 'StorageManager');
        });

        messageBus.subscribe('PLAYER_STATE_CHANGED', async () => {
            logger.debug('Auto-saving after PLAYER_STATE_CHANGED', undefined, 'StorageManager');
        });
    }

    /**
     * Migrate data to current version
     */
    private migrateData(data: any): StorageData {
        let currentData = data;
        const dataVersion = data.version || '0.1.0';

        if (dataVersion === this.VERSION) {
            return currentData;
        }

        logger.info(`Migrating data from ${dataVersion} to ${this.VERSION}`, undefined, 'StorageManager');

        // Apply migrations in sequence
        const versions = ['0.1.0', '0.2.0'];
        const startIndex = versions.indexOf(dataVersion);

        if (startIndex === -1) {
            logger.warn(`Unknown version ${dataVersion}, using as-is`, undefined, 'StorageManager');
            return { ...currentData, version: this.VERSION };
        }

        for (let i = startIndex; i < versions.length - 1; i++) {
            const migrationFn = this.migrations.get(versions[i]);
            if (migrationFn) {
                currentData = migrationFn(currentData);
            }
        }

        return currentData;
    }

    /**
     * Save data to localStorage with atomic write
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

            // Atomic write: write to temp, then rename
            const serialized = JSON.stringify(merged);

            // Backup current data
            const current = localStorage.getItem(this.STORAGE_KEY);
            if (current) {
                localStorage.setItem(this.BACKUP_KEY, current);
            }

            // Write to temp location
            localStorage.setItem(this.TEMP_KEY, serialized);

            // Move temp to main (atomic operation in localStorage)
            localStorage.setItem(this.STORAGE_KEY, serialized);
            localStorage.removeItem(this.TEMP_KEY);

            logger.debug('Data saved to localStorage (atomic)', merged, 'StorageManager');
        } catch (error) {
            logger.error('Failed to save data', error, 'StorageManager');

            // Attempt to restore from backup
            try {
                const backup = localStorage.getItem(this.BACKUP_KEY);
                if (backup) {
                    localStorage.setItem(this.STORAGE_KEY, backup);
                    logger.info('Restored from backup after save failure', undefined, 'StorageManager');
                }
            } catch (restoreError) {
                logger.error('Failed to restore from backup', restoreError, 'StorageManager');
            }

            throw error;
        }
    }

    /**
     * Load data from localStorage with migration
     */
    async load(): Promise<StorageData> {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) {
                logger.debug('No saved data found', undefined, 'StorageManager');
                return { version: this.VERSION };
            }

            const data = JSON.parse(raw);

            // Apply migrations if needed
            const migratedData = this.migrateData(data);

            // Save migrated data if version changed
            if (migratedData.version !== (data.version || '0.1.0')) {
                await this.save(migratedData);
            }

            logger.debug('Data loaded from localStorage', migratedData, 'StorageManager');
            return migratedData;
        } catch (error) {
            logger.error('Failed to load data', error, 'StorageManager');

            // Try to restore from backup
            try {
                const backup = localStorage.getItem(this.BACKUP_KEY);
                if (backup) {
                    logger.warn('Loading from backup after load failure', undefined, 'StorageManager');
                    return JSON.parse(backup);
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
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.TEMP_KEY);
            localStorage.removeItem(this.BACKUP_KEY);
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
