/**
 * ProgressionSlice — 等级与进度 Slice
 * 
 * 处理 XP、等级更新以及连签逻辑。
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';
import type { Language, LanguageProgress, StreakData, UUID, Grade } from '@/types/index';
import { GRIMOIRE_REWARDS } from '@/config/grimoireConfig';

export interface ProgressionState {
    /** 更新指定语言的进度 */
    updateLanguageProgress: (lang: Language, updates: Partial<LanguageProgress>) => void;
    /** 更新连签数据 */
    updateStreak: (updates: Partial<StreakData>) => void;
    /** 消耗体力 */
    consumeStamina: (amount: number) => boolean;
    /** 领取魔典奖励 */
    claimGrimoireReward: (grimoireId: UUID) => void;
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

    consumeStamina: (amount) => {
        const { stamina } = get().player;
        if (stamina < amount) return false;
        
        set((state) => ({
            player: {
                ...state.player,
                stamina: state.player.stamina - amount
            }
        }));
        return true;
    },

    claimGrimoireReward: (grimoireId) => {
        const state = get();
        const grimoire = state.libraryGrimoires.find(g => g.id === grimoireId);
        
        if (!grimoire || grimoire.rewardClaimed) return;
        
        const finalGrade = grimoire.finalGrade || 'D';
        const rewards = GRIMOIRE_REWARDS[finalGrade];
        
        // 1. Award XP to current learning language
        const learningLang = state.player.settings.learningLang;
        state.updateLanguageProgress(learningLang, {
            xp: (state.player.languageProgress[learningLang]?.xp || 0) + rewards.xp
        });

        // 2. Award Resonance XP to Persona
        state.updateResonance(grimoire.personaId, rewards.resonance);

        // 3. Update Mastery Counters (Downward Propagation)
        set((state) => {
            const m = { ...state.player.grimoireMastery };
            const inc = rewards.increments;
            
            // Downward propagation based on grade rank
            if (finalGrade === 'S++' || finalGrade === 'S+' || finalGrade === 'S') {
                m.sScore += inc;
                m.aCount += inc; m.bCount += inc; m.cCount += inc; m.dCount += inc;
            } else if (finalGrade === 'A') {
                m.aCount += inc; m.bCount += inc; m.cCount += inc; m.dCount += inc;
            } else if (finalGrade === 'B') {
                m.bCount += inc; m.cCount += inc; m.dCount += inc;
            } else if (finalGrade === 'C') {
                m.cCount += inc; m.dCount += inc;
            } else if (finalGrade === 'D') {
                m.dCount += inc;
            }

            return {
                player: {
                    ...state.player,
                    grimoireMastery: m
                },
                libraryGrimoires: state.libraryGrimoires.map(g => 
                    g.id === grimoireId ? { ...g, rewardClaimed: true } : g
                )
            };
        });
    },
});
