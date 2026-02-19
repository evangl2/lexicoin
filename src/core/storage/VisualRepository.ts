/**
 * VisualRepository — IndexedDB CRUD for VisualEntry
 *
 * Persistent layer for visual payloads. Syncs writes to the in-memory
 * VisualRegistry so that `visualForCard()` lookups stay fast.
 * Listens to MessageBus ASSET_LOADED events for real-time persistence
 * of AI-generated visuals.
 */

import { db } from './db';
import { visualRegistry } from '@core/registries/VisualRegistry';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import type { VisualEntry } from '@schemas/schemas/SenseEntity.schema';

class VisualRepository {
    private initialized = false;

    /**
     * Reset the repository to its initial state.
     * Clears all data and re-seeds with initial visuals.
     */
    async reset(initialVisuals: VisualEntry[]): Promise<void> {
        await db.visuals.clear();
        visualRegistry.clear(); // Clear in-memory registry too
        logger.warn('Cleared all visuals from IndexedDB and Registry', undefined, 'VisualRepository');
        await this.seed(initialVisuals);
        // Reload registry after seed
        await this.loadAllIntoRegistry();
    }

    /**
     * Seed initial visuals into IndexedDB.
     * No-op when the table already contains data.
     */
    async seed(entries: VisualEntry[]): Promise<void> {
        const existingCount = await db.visuals.count();
        if (existingCount > 0) {
            logger.debug(
                `Visuals table already has ${existingCount} records, skipping seed`,
                undefined,
                'VisualRepository'
            );
            return;
        }

        const records = entries.map((e) => ({
            uid: e.uid,
            variantId: e.id,
            data: e,
        }));
        await db.visuals.bulkPut(records);
        logger.debug(
            `Seeded ${records.length} visuals into IndexedDB`,
            undefined,
            'VisualRepository'
        );
    }

    /**
     * Load all visuals from IndexedDB and register them into the
     * in-memory VisualRegistry for fast synchronous lookups.
     */
    async loadAllIntoRegistry(): Promise<void> {
        const records = await db.visuals.toArray();
        for (const r of records) {
            visualRegistry.register(r.data);
        }
        logger.debug(
            `Loaded ${records.length} visuals from IndexedDB into VisualRegistry`,
            undefined,
            'VisualRepository'
        );
    }

    /** Get all visual variants for a given SenseEntity UID */
    async getByUid(uid: string): Promise<VisualEntry[]> {
        const records = await db.visuals.where('uid').equals(uid).toArray();
        return records.map((r) => r.data);
    }

    /** Insert or update a single VisualEntry (persists + syncs to registry) */
    async upsert(entry: VisualEntry): Promise<void> {
        await db.visuals.put({
            uid: entry.uid,
            variantId: entry.id,
            data: entry,
        });
        visualRegistry.register(entry);
    }

    /** Remove a specific visual variant */
    async remove(uid: string, variantId: string): Promise<void> {
        await db.visuals.delete([uid, variantId] as unknown as string);
    }

    /** Current count of stored visuals */
    async count(): Promise<number> {
        return db.visuals.count();
    }

    /**
     * Subscribe to MessageBus events so that AI-generated visuals
     * are automatically persisted. Call once during app init.
     */
    initSubscriptions(): void {
        if (this.initialized) return;
        this.initialized = true;

        messageBus.subscribe('ASSET_LOADED', async (msg) => {
            const entry = msg.payload as VisualEntry;
            if (!entry?.uid || !entry?.id || !entry?.payload) return;
            await this.upsert(entry);
            logger.debug(
                `Persisted visual ${entry.uid}/${entry.id} from ASSET_LOADED`,
                undefined,
                'VisualRepository'
            );
        });

        logger.debug(
            'MessageBus subscriptions initialized',
            undefined,
            'VisualRepository'
        );
    }
}

export const visualRepository = new VisualRepository();
export default visualRepository;
