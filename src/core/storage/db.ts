/**
 * Dexie.js Database Definition — Lexicoin
 *
 * Singleton IndexedDB database with typed tables.
 * Replaces the previous localStorage-based persistence.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { PlayerState, Sense } from '@/types/index';
import type { SenseEntity, VisualEntry } from '@schemas/schemas/SenseEntity.schema';

// ---- Table Row Types ----

/** Primary game state record (key = 'main' | 'backup' | '_migration_done') */
export interface GameDataRecord {
    key: string;            // 'main' | 'backup' | 'app-state'
    data?: any;             // Legacy data structure
    state?: any;            // New Zustand state structure
    version: number | string;
    timestamp?: number;
    lastSyncAt?: number;
}

/** Per-card canvas position & location */
export type CardLocation = 'canvas' | 'repository';

export interface CanvasPositionRecord {
    uid: string;
    x: number;
    y: number;
    location: CardLocation;
}

/** SenseEntity persisted in IndexedDB — single source of truth for card data */
export interface SenseRecord {
    uid: string;
    data: SenseEntity;
}

/** VisualEntry persisted in IndexedDB — single source of truth for visual payloads */
export interface VisualRecord {
    uid: string;        // SenseEntity UID
    variantId: string;  // 'default', 'magic', etc.
    data: VisualEntry;
}

// ---- Database Singleton ----

const db = new Dexie('lexicoin_db') as Dexie & {
    gameData: EntityTable<GameDataRecord, 'key'>;
    canvasPositions: EntityTable<CanvasPositionRecord, 'uid'>;
    senses: EntityTable<SenseRecord, 'uid'>;
    visuals: EntityTable<VisualRecord, 'uid'>;
};

db.version(1).stores({
    gameData: 'key',
    canvasPositions: 'uid',
});

db.version(2).stores({
    gameData: 'key',
    canvasPositions: 'uid',
    senses: 'uid',
});

db.version(3).stores({
    gameData: 'key',
    canvasPositions: 'uid',
    senses: 'uid',
    visuals: '[uid+variantId], uid',
});

db.version(4).stores({
    gameData: 'key',
    canvasPositions: 'uid, location',
    senses: 'uid',
    visuals: '[uid+variantId], uid',
});

export { db };
