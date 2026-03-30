/**
 * CardInventoryRepository — 卡牌库存 CRUD
 *
 * 玩家当前持有的卡牌（画布/仓库中的卡）。
 * 注意：SenseCollection（senses 表）永久保留历史发现，
 * 本表只记录「当前持有」的卡牌及其耐久度。
 */

import { db } from './db';
import type { CardInventoryRecord } from './db';
import type { Language } from '@/types/index';

class CardInventoryRepository {
    /**
     * 检查某 uid 的卡牌当前是否在 cardInventory（即是否被持有）
     */
    async exists(uid: string): Promise<boolean> {
        const count = await db.cardInventory.where('uid').equals(uid).count();
        return count > 0;
    }

    /**
     * 获取某 uid 的卡牌记录，不存在则返回 undefined（不抛错）
     */
    async get(uid: string): Promise<CardInventoryRecord | undefined> {
        return db.cardInventory.get(uid);
    }

    /**
     * 获取所有卡牌记录
     */
    async getAll(): Promise<CardInventoryRecord[]> {
        return db.cardInventory.toArray();
    }

    /**
     * 插入或更新一条卡牌记录
     */
    async upsert(record: CardInventoryRecord): Promise<void> {
        await db.cardInventory.put(record);
    }

    /**
     * 更新某张卡的耐久度
     * @param uid 卡牌 uid
     * @param newDurability 新的耐久度值（调用方保证范围 0-100）
     */
    async updateDurability(uid: string, newDurability: number): Promise<void> {
        await db.cardInventory.update(uid, { durability: newDurability });
    }

    /**
     * 删除某张卡的库存记录（耐久归零或玩家主动移除时调用）
     */
    async delete(uid: string): Promise<void> {
        await db.cardInventory.delete(uid);
    }

    /**
     * 统计某语言下当前持有的卡牌数量
     */
    async countByLanguage(language: Language): Promise<number> {
        return db.cardInventory.where('language').equals(language).count();
    }
}

export const cardInventoryRepository = new CardInventoryRepository();
