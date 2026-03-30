/**
 * DurabilitySystem — 耐久度与生命周期中心
 * 
 * 涉及卡牌的合成消耗、重复恢复、归零删除等逻辑。
 */

import { cardInventoryRepository } from '@/core/storage/CardInventoryRepository';
import { messageBus } from '@/core/protocol/MessageBus';
import { 
    DURABILITY_INITIAL, 
    DURABILITY_SYNTHESIS_COST, 
    DURABILITY_DUPLICATE_RESTORE 
} from '@/config/balance';
import type { CardInventoryRecord } from '@/core/storage/db';

class DurabilitySystem {
    /**
     * 合成扣除：对传入的所有输入端卡牌扣除耐久
     * @param inputUids 感知/卡牌的唯一标识 (uid)
     */
    public async consumeOnSynthesis(inputUids: string[]): Promise<void> {
        for (const uid of inputUids) {
            const record = await cardInventoryRepository.get(uid);
            if (!record) continue;

            const nextDurability = Math.max(0, record.durability - DURABILITY_SYNTHESIS_COST);
            
            if (nextDurability <= 0) {
                // 耐久归零，从库存中删除（卡片消失）
                await cardInventoryRepository.delete(uid);
                await messageBus.send('CARD_DEPLETED', { uid }, 'DurabilitySystem');
            } else {
                // 更新数据库
                await cardInventoryRepository.updateDurability(uid, nextDurability);
                await messageBus.send('CARD_DURABILITY_CHANGED', { 
                    uid, 
                    delta: -DURABILITY_SYNTHESIS_COST, 
                    newDurability: nextDurability 
                }, 'DurabilitySystem');
            }
        }
    }

    /**
     * 重复获得：玩家合成出了一个已持有的 Sense，恢复其耐久
     * @param uid 目标卡牌 uid
     */
    public async restoreOnDuplicate(uid: string): Promise<void> {
        const record = await cardInventoryRepository.get(uid);
        if (!record) return;

        // 加算但不超过初始值
        const nextDurability = Math.min(DURABILITY_INITIAL, record.durability + DURABILITY_DUPLICATE_RESTORE);

        await cardInventoryRepository.updateDurability(uid, nextDurability);
        await messageBus.send('CARD_DURABILITY_CHANGED', { 
            uid, 
            delta: DURABILITY_DUPLICATE_RESTORE, 
            newDurability: nextDurability 
        }, 'DurabilitySystem');
    }

    /**
     * 首次获得：初始化一条完整的记录
     */
    public async registerNewCard(uid: string, language: string): Promise<void> {
        const record: CardInventoryRecord = {
            uid,
            durability: DURABILITY_INITIAL,
            acquiredAt: Date.now(),
            language: language as any
        };
        await cardInventoryRepository.upsert(record);
    }
}

export const durabilitySystem = new DurabilitySystem();
