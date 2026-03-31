/**
 * Dexie.js Database Definition — Lexicoin
 *
 * Singleton IndexedDB database with typed tables.
 * Replaces the previous localStorage-based persistence.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { PlayerState, Sense, Language } from '@/types/index';
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
export type CardLocation = 'canvas' | 'repository' | 'device';

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

export interface DeviceRecord {
    uid: string;
    type: 'synthesis-circle';
    x: number;
    y: number;
    location: CardLocation; // Reuse CardLocation ('canvas' | 'repository')
    state: {
        slot1_uid: string | null;
        slot2_uid: string | null;
        isProcessing: boolean;
    };
}

/** 玩家当前持有的卡牌库存（画布或仓库中存在的卡） */
export interface CardInventoryRecord {
    uid: string;            // PK，对应 SenseEntity.uid
    durability: number;     // 0–100（归零时删除记录）
    acquiredAt: number;     // 首次获得时间戳（Unix ms）
    language: Language;     // 来自哪个 learningLang 的合成
}

/** 合成成功后的历史日志（只增不减） */
export interface SynthesisLogRecord {
    id: string;                 // UUID，PK
    input1Uid: string;
    input2Uid: string;
    resultUid: string;
    language: Language;         // 合成时的 learningLang
    cefrLevel: string;          // 本次合成的 max_level（CEFRLevel）
    isNewDiscovery: boolean;    // 合成前本地 SenseCollection 是否无此词
    timestamp: number;          // Unix ms
}

// ---- Database Singleton ----

const db = new Dexie('lexicoin_db') as Dexie & {
    gameData: EntityTable<GameDataRecord, 'key'>;
    canvasPositions: EntityTable<CanvasPositionRecord, 'uid'>;
    senses: EntityTable<SenseRecord, 'uid'>;
    visuals: EntityTable<VisualRecord, 'uid'>;
    devices: EntityTable<DeviceRecord, 'uid'>;
    cardInventory: EntityTable<CardInventoryRecord, 'uid'>;
    synthesisLog: EntityTable<SynthesisLogRecord, 'id'>;
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

db.version(5).stores({
    gameData: 'key',
    canvasPositions: 'uid, location',
    senses: 'uid',
    visuals: '[uid+variantId], uid',
    devices: 'uid, location',
});

db.version(6).stores({
    gameData:        'key',
    canvasPositions: 'uid, location',
    senses:          'uid',
    visuals:         '[uid+variantId], uid',
    devices:         'uid, location',
    cardInventory:   'uid, language',
    synthesisLog:    'id, resultUid, language, timestamp',
});

// v7: 清空 visuals 表中可能存在的无效记录（复合主键 [uid+variantId] 保持不变）
// Dexie v4 不支持通过 version 升级更改已有表的 primary key，故保留原 schema。
// 升级时清空旧记录，由 initializeVisuals() 的 seed() 自动重填。
db.version(7).stores({
    gameData:        'key',
    canvasPositions: 'uid, location',
    senses:          'uid',
    visuals:         '[uid+variantId], uid',
    devices:         'uid, location',
    cardInventory:   'uid, language',
    synthesisLog:    'id, resultUid, language, timestamp',
}).upgrade(async trans => {
    await trans.table('visuals').clear();
});

export { db };
