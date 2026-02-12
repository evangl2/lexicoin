/**
 * SenseRepository — IndexedDB CRUD for SenseEntity
 *
 * Single source of truth for all SenseEntity data.
 * Listens to MessageBus SENSE_CREATED / SENSE_UPDATED events for
 * real-time persistence of AI-generated data.
 */

import { db } from './db';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import type { SenseEntity } from '@schemas/schemas/SenseEntity.schema';

class SenseRepository {
    private initialized = false;

    /**
     * Seed initial senses into IndexedDB.
     * No-op when the table already contains data.
     */
    async seed(senses: SenseEntity[]): Promise<void> {
        const existingCount = await db.senses.count();
        if (existingCount > 0) {
            logger.debug(
                `Senses table already has ${existingCount} records, skipping seed`,
                undefined,
                'SenseRepository'
            );
            return;
        }

        const records = senses.map((s) => ({ uid: s.uid, data: s }));
        await db.senses.bulkPut(records);
        logger.debug(
            `Seeded ${records.length} senses into IndexedDB`,
            undefined,
            'SenseRepository'
        );
    }

    /** Load every SenseEntity from IndexedDB */
    async getAll(): Promise<SenseEntity[]> {
        const records = await db.senses.toArray();
        return records.map((r) => r.data);
    }

    /** Find a single SenseEntity by uid */
    async getByUid(uid: string): Promise<SenseEntity | undefined> {
        const record = await db.senses.get(uid);
        return record?.data;
    }

    /** Insert or update a single SenseEntity */
    async upsert(sense: SenseEntity): Promise<void> {
        await db.senses.put({ uid: sense.uid, data: sense });
    }

    /** Remove a single SenseEntity by uid */
    async remove(uid: string): Promise<void> {
        await db.senses.delete(uid);
    }

    /** Current count of stored senses */
    async count(): Promise<number> {
        return db.senses.count();
    }

    /**
     * Subscribe to MessageBus events so that AI-generated senses
     * are automatically persisted. Call once during app init.
     */
    initSubscriptions(): void {
        if (this.initialized) return;
        this.initialized = true;

        messageBus.subscribe('SENSE_CREATED', async (msg) => {
            const sense = msg.payload as SenseEntity;
            if (!sense?.uid) return;
            await this.upsert(sense);
            logger.debug(
                `Persisted new sense ${sense.uid} from SENSE_CREATED`,
                undefined,
                'SenseRepository'
            );
        });

        messageBus.subscribe('SENSE_UPDATED', async (msg) => {
            const sense = msg.payload as SenseEntity;
            if (!sense?.uid) return;
            await this.upsert(sense);
            logger.debug(
                `Updated sense ${sense.uid} from SENSE_UPDATED`,
                undefined,
                'SenseRepository'
            );
        });

        messageBus.subscribe('SENSE_DELETED', async (msg) => {
            const payload = msg.payload as { id: string };
            if (!payload?.id) return;
            await this.remove(payload.id);
            logger.debug(
                `Deleted sense ${payload.id} from SENSE_DELETED`,
                undefined,
                'SenseRepository'
            );
        });

        logger.debug(
            'MessageBus subscriptions initialized',
            undefined,
            'SenseRepository'
        );
    }
}

export const senseRepository = new SenseRepository();
export default senseRepository;
