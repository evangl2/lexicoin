/**
 * ProgressionSlice — 等级与进度 Slice
 * 
 * 处理 XP、等级更新以及连签逻辑。
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';
import type { Language, LanguageProgress, StreakData } from '@/types/index';

export interface ProgressionState {
    /** 更新指定语言的进度 */
    updateLanguageProgress: (lang: Language, updates: Partial<LanguageProgress>) => void;
    /** 更新连签数据 */
    updateStreak: (updates: Partial<StreakData>) => void;
}

export const createProgressionSlice: StateCreator<
    GameStore,
    [['zustand/persist', unknown]],
    [],
    ProgressionState
> = (set, get) => ({
    updateLanguageProgress: (lang, updates) => set((state) => {
        const current = state.player.languageProgress[lang] || {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            sensesCollected: 0,
            startedAt: Date.now()
        };

        return {
            player: {
                ...state.player,
                languageProgress: {
                    ...state.player.languageProgress,
                    [lang]: { ...current, ...updates }
                }
            }
        };
    }),

    updateStreak: (updates) => set((state) => ({
        player: {
            ...state.player,
            streak: { ...state.player.streak, ...updates }
        }
    })),
});
