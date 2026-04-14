/**
 * XPRegistry — 经验发放注册表
 *
 * 负责计算、记录、分发 XP，并更新 Store 中的 languageProgress。
 */

import { useGameStore } from '@/core/store';
import { messageBus } from '@/core/protocol/MessageBus';
import { 
    CEFR_XP_COEFFICIENT, 
    XP_SENSE_BASE, 
    LEVEL_XP_THRESHOLDS,
    MAX_LANGUAGE_LEVEL 
} from '@/config/balance';
import type { Language, CEFRLevel, LanguageProgress } from '@/types/index';
import { playerLevelSystem } from './PlayerLevelSystem';

// XP 来源 ID，便于统计分析
export type XPSourceId = 
    | 'SENSE_COLLECTED'     // 首次发现新词（主要来源）
    | 'SENSE_DUPLICATED'    // 获得重复词（极低 XP）
    | 'EVOLUTION_SUCCESS'   // 进化成功
    | 'CONSTRUCTION_CREATED' // 构建短语/句子
    | 'STREAK_BONUS'        // 每日连签奖励
    | 'GRIMOIRE_COMPLETED'  // 完成魔典仪式
    | 'DEBUG';              // 调试发放

class XPRegistry {
    /**
     * 为指定语言发放 XP
     * @param language 目标语言
     * @param sourceId 来源
     * @param context 触发背景（如 CEFR 等级）
     */
    public async awardXP(
        language: Language, 
        sourceId: XPSourceId, 
        context?: { cefrLevel?: CEFRLevel, grade?: string }
    ): Promise<void> {
        // 1. 获取玩家当前进度
        const store = useGameStore.getState();
        const currentProgress = store.player.languageProgress[language] || this.initProgress(language);

        // 2. 检查等级上限
        if (currentProgress.level >= MAX_LANGUAGE_LEVEL) return;

        // 3. 计算 XP 数量
        const amount = this.calculateAmount(sourceId, context?.cefrLevel, context?.grade);
        if (amount <= 0) return;

        // 4. 更新 Store
        const newXp = currentProgress.xp + amount;
        const updatedProgress: LanguageProgress = {
            ...currentProgress,
            xp: newXp
        };

        store.updatePlayer({
            languageProgress: {
                ...store.player.languageProgress,
                [language]: updatedProgress
            }
        });

        // 5. 发布事件
        await messageBus.send('XP_EARNED', {
            language,
            source: sourceId,
            amount,
            totalXp: newXp
        }, 'XPRegistry');

        // 6. 移交等级系统检查是否可升级
        playerLevelSystem.checkLevelUp(language);
    }

    /**
     * 计算单次获得的 XP 量
     */
    private calculateAmount(sourceId: XPSourceId, cefrLevel?: CEFRLevel): number {
        const coef = cefrLevel ? CEFR_XP_COEFFICIENT[cefrLevel] : 1.0;
        
        switch (sourceId) {
            case 'SENSE_COLLECTED':
                return Math.floor(XP_SENSE_BASE * coef);
            case 'SENSE_DUPLICATED':
                return Math.floor(XP_SENSE_BASE * 0.1); // 重复词只给 10%
            case 'EVOLUTION_SUCCESS':
                return Math.floor(XP_SENSE_BASE * coef * 2); // 进化奖励翻倍
            case 'CONSTRUCTION_CREATED':
                return 50; // 暂定固定值
            case 'GRIMOIRE_COMPLETED':
                // 根据 Grade 等级阶梯发放
                const gradeMap: Record<string, number> = {
                    'S++': 500, 'S+': 400, 'S': 300, 'A': 200, 'B': 100, 'C': 50, 'D': 25, 'F': 0
                };
                return gradeMap[cefrLevel || 'F'] || 50; // 复用 cefrLevel 字段传 Grade 字符串
            case 'DEBUG':
                return 100;
            default:
                return 10;
        }
    }

    /**
     * 初始化该语言的进度条（如果不存在）
     */
    private initProgress(language: Language): LanguageProgress {
        return {
            level: 1,
            xp: 0,
            xpToNextLevel: LEVEL_XP_THRESHOLDS[0] || 100,
            sensesCollected: 0,
            startedAt: Date.now()
        };
    }
}

export const xpRegistry = new XPRegistry();
