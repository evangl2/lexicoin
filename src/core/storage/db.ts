/**
 * Dexie.js Database Definition — Lexicoin
 *
 * Singleton IndexedDB database with typed tables.
 * Replaces the previous localStorage-based persistence.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { PlayerState, Sense } from '@/types/index';

// ---- Table Row Types ----

/** Primary game state record (key = 'main' | 'backup' | '_migration_done') */
export interface GameDataRecord {
    key: string;
    player?: PlayerState;
    senses?: Sense[];
    lastSyncAt?: number;
    version: string;
}

/** Per-card canvas position */
export interface CanvasPositionRecord {
    uid: string;
    x: number;
    y: number;
}

// ---- Database Singleton ----

const db = new Dexie('lexicoin_db') as Dexie & {
    gameData: EntityTable<GameDataRecord, 'key'>;
    canvasPositions: EntityTable<CanvasPositionRecord, 'uid'>;
};

db.version(1).stores({
    gameData: 'key',
    canvasPositions: 'uid',
});

export { db };
