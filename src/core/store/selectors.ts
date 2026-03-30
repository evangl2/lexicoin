/**
 * Store Selectors — 衍生状态计算
 * 
 * 为 UI 组件提供格式化后的进度数据。
 */

import type { GameStore } from './interfaces';
import type { Language, LanguageProgress } from '@/types/index';
import { LEVEL_XP_THRESHOLDS } from '@/config/balance';

/**
 * 获取指定语言的当前等级进度 (0.0 - 1.0)
 */
export const selectLevelProgress = (state: GameStore, lang: Language): number => {
    const progress = state.player?.languageProgress?.[lang];
    if (!progress) return 0;

    // 当前等级所需的总额（作为分母）
    const threshold = progress.xpToNextLevel || LEVEL_XP_THRESHOLDS[progress.level - 1] || 100;
    
    return Math.min(1.0, progress.xp / threshold);
};

/**
 * 获取指定语言的完整进度信息（摘要）
 */
export interface LevelInfo {
    level: number;
    xp: number;
    xpToNext: number;
    progress: number; // 0-1
}

export const selectLanguageLevelInfo = (state: GameStore, lang: Language): LevelInfo => {
    const progress = state.player?.languageProgress?.[lang] || {
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        sensesCollected: 0
    };

    const threshold = progress.xpToNextLevel || LEVEL_XP_THRESHOLDS[progress.level - 1] || 100;

    return {
        level: progress.level,
        xp: progress.xp,
        xpToNext: threshold,
        progress: Math.min(1.0, progress.xp / threshold)
    };
};
