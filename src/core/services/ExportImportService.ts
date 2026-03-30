import { db } from '@core/storage/db';
import { useGameStore } from '@store/index';
import { logger } from '@utils/logger';

export interface BackupPayload {
    schemaVersion: 1;
    timestamp: number;
    playerState: any; // The state exported from Zustand
    tables: {
        gameData?: any[];
        canvasPositions?: any[];
        senses?: any[];
        visuals?: any[];
        devices?: any[];
        cardInventory?: any[];
        synthesisLog?: any[];
    };
}

class ExportImportService {
    /**
     * Export all user data from Dexie and Zustand into a JSON backup file.
     */
    public async exportToFile(): Promise<void> {
        try {
            logger.info('Starting data export...', undefined, 'ExportImportService');

            const payload: BackupPayload = {
                schemaVersion: 1,
                timestamp: Date.now(),
                playerState: useGameStore.getState().player,
                tables: {}
            };

            // Read all table records
            const tablesToExport = [
                'gameData',
                'canvasPositions',
                'senses',
                'visuals',
                'devices',
                'cardInventory',
                'synthesisLog'
            ];

            await db.transaction('r', db.tables, async () => {
                for (const tableName of tablesToExport) {
                    const table = db.table(tableName);
                    if (table) {
                        (payload.tables as any)[tableName] = await table.toArray();
                    }
                }
            });

            // Convert to JSON and trigger download
            const jsonString = JSON.stringify(payload, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `lexicoin-backup-${dateStr}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            logger.info(`Export completed. Filename: ${filename}`, undefined, 'ExportImportService');
        } catch (error) {
            logger.error('Failed to export data', error, 'ExportImportService');
            alert('Failed to export data. See console for details.');
        }
    }

    /**
     * Import user data from a backup JSON file, overwriting all local states.
     * @param file The JSON File selected by the user.
     */
    public async importFromFile(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const result = e.target?.result as string;
                    if (!result) throw new Error('File is empty.');

                    const payload: BackupPayload = JSON.parse(result);

                    // Validate schema
                    if (payload.schemaVersion !== 1) {
                        throw new Error(`Unsupported schema version: ${payload.schemaVersion}`);
                    }
                    if (!payload.tables || !payload.playerState) {
                        throw new Error('Invalid backup format: missing tables or player state.');
                    }

                    logger.info('Starting data import...', undefined, 'ExportImportService');

                    // 1. Clear & Overwrite DB
                    const tableNames = Object.keys(payload.tables);
                    const dbTables = db.tables.filter(t => tableNames.includes(t.name));
                    
                    await db.transaction('rw', dbTables, async () => {
                        for (const table of dbTables) {
                            await table.clear();
                            const records = (payload.tables as any)[table.name];
                            if (records && records.length > 0) {
                                await table.bulkAdd(records);
                            }
                        }
                    });

                    // 2. Hydrate Zustand Store
                    useGameStore.getState().updatePlayer(payload.playerState);

                    logger.info('Import completed successfully.', undefined, 'ExportImportService');
                    resolve();

                } catch (error: any) {
                    logger.error('Failed to import data', error, 'ExportImportService');
                    alert(`Failed to import data: ${error.message}`);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read the file.'));
            };

            reader.readAsText(file);
        });
    }
}

export const exportImportService = new ExportImportService();
