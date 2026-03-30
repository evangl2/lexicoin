/**
 * PlayerLevelSystem — 等级阶梯逻辑
 *
 * 负责对比 XP 和阈值、判断升级、处理溢出 XP 以及多级连升。
 */

import { useGameStore } from '@/core/store';
import { messageBus } from '@/core/protocol/MessageBus';
import { LEVEL_XP_THRESHOLDS, MAX_LANGUAGE_LEVEL } from '@/config/balance';
import type { Language, LanguageProgress } from '@/types/index';

class PlayerLevelSystem {
    /**
     * 检查某语言当前是否满足升级条件
     * 采用递归或循环处理，支持“高额 XP 连续升级”
     */
    public checkLevelUp(language: Language): void {
        const store = useGameStore.getState();
        const player = store.player;
        const progress = player.languageProgress[language];

        if (!progress) return;

        // 1. 递归检查是否达到升级阈值
        const { leveledUp, finalProgress, previousLevel } = this.processLeveledUp(progress);

        // 2. 如果升级了，更新 Store
        if (leveledUp) {
            store.updatePlayer({
                languageProgress: {
                    ...player.languageProgress,
                    [language]: finalProgress
                }
            });

            // 3. 发布事件（UI 动画、音效订阅此消息）
            messageBus.send('LEVEL_UP', {
                language,
                newLevel: finalProgress.level,
                previousLevel: previousLevel
            }, 'PlayerLevelSystem');

            console.log(`[LevelSystem] ${language} 升级了！${previousLevel} -> ${finalProgress.level}`);
        }
    }

    /**
     * 内部递归逻辑：处理 XP 溢出并持续升级
     */
    private processLeveledUp(currentProgress: LanguageProgress): { 
        leveledUp: boolean, 
        finalProgress: LanguageProgress,
        previousLevel: number
    } {
        let level = currentProgress.level;
        let xp = currentProgress.xp;
        const startLevel = level;

        // 持续升级直至 XP 不足以到下一级，或者达到等级上限
        while (level < MAX_LANGUAGE_LEVEL) {
            // 获取升级所需 XP（index = level - 1）
            const threshold = LEVEL_XP_THRESHOLDS[level - 1] || 999999;

            if (xp >= threshold) {
                // 扣除掉本次升级消耗的 XP
                xp -= threshold;
                level += 1;
            } else {
                break;
            }
        }

        const leveledUp = level > startLevel;
        
        // 获取新等级的 XP 门槛（用于进度条展示）
        const nextThreshold = LEVEL_XP_THRESHOLDS[level - 1] || 0;

        return {
            leveledUp,
            previousLevel: startLevel,
            finalProgress: {
                ...currentProgress,
                level,
                xp: Math.max(0, xp), // 剩余 XP
                xpToNextLevel: nextThreshold
            }
        };
    }
}

export const playerLevelSystem = new PlayerLevelSystem();
