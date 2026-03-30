/**
 * LevelDistributionSampler — 难度分布采样器
 * 
 * 根据玩家当前的语言等级，采样出一个符合概率分布的 CEFRLevel。
 */

import { LEVEL_CEFR_DISTRIBUTION, CEFR_LEVELS } from '@/config/balance';
import type { CEFRLevel, CEFRDistribution } from '@/config/balance';

class LevelDistributionSampler {
    /**
     * 根据语言等级采样一个 CEFR 难度
     * @param languageLevel 玩家在该语言下的等级 (1-100)
     */
    public sample(languageLevel: number): CEFRLevel {
        // 1. 获取最接近的配置。如果 level=7，则找 <=7 的最大 key（即 5）
        const distribution = this.getDistributionForLevel(languageLevel);

        // 2. 加权随机采样 (Roulette Wheel Selection)
        return this.weightedRandom(distribution);
    }

    /**
     * 查找适合当前等级的分布配置
     */
    private getDistributionForLevel(level: number): CEFRDistribution {
        const sortedKeys = Object.keys(LEVEL_CEFR_DISTRIBUTION)
            .map(Number)
            .sort((a, b) => b - a); // 降序 [100, 90, ..., 1]

        const key = sortedKeys.find(k => k <= level) || 1;
        return LEVEL_CEFR_DISTRIBUTION[key] || { A1: 1.0 };
    }

    /**
     * 执行加权随机
     */
    private weightedRandom(dist: CEFRDistribution): CEFRLevel {
        const entries = Object.entries(dist) as [CEFRLevel, number][];
        
        // 计算总权重
        const totalWeight = entries.reduce((sum, [_, weight]) => sum + weight, 0);
        
        // 生成随机数 [0, totalWeight)
        let random = Math.random() * totalWeight;

        // 轮盘赌选择
        for (const [level, weight] of entries) {
            random -= weight;
            if (random <= 0) {
                return level;
            }
        }

        // 回退机制（防溢出）
        return entries[0]?.[0] || 'A1';
    }
}

export const levelDistributionSampler = new LevelDistributionSampler();
