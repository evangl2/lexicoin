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
    /** 退还体力（召唤失败时使用） */
    regenerateStamina: (amount: number) => void;
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

    regenerateStamina: (amount) => {
        set((state) => ({
            player: {
                ...state.player,
                stamina: Math.min(state.player.maxStamina, state.player.stamina + amount),
                staminaLastUpdatedAt: Date.now(),
            }
        }));
    },

    claimGrimoireReward: (grimoireId) => {
        const state = get();
        // Check both active and library (though it usually comes from active)
        const grimoire = state.activeGrimoires.find(g => g.id === grimoireId) || 
                         state.libraryGrimoires.find(g => g.id === grimoireId);
        
        if (!grimoire || grimoire.rewardClaimed || !grimoire.finalGrade) return;
        
        const finalGrade = grimoire.finalGrade;
        const rewards = GRIMOIRE_REWARDS[finalGrade];
        
        // 1. Award XP to current learning language
        const learningLang = state.player.settings.learningLang;
        state.updateLanguageProgress(learningLang, {
            xp: (state.player.languageProgress[learningLang]?.xp || 0) + rewards.xp
        });

        // 2. Award Resonance XP to Persona
        state.updateResonance(grimoire.personaId, rewards.resonance);

        // 3. Update Mastery Counters & Archival
        set((state) => {
            const m = { ...state.player.grimoireMastery };
            const inc = rewards.increments;
            
            // Increment counters based on grade tier (GDD §7.6 downward propagation)
            // S-tier: all counters use inc (7 / 3 / 1); lower tiers always +1
            if (finalGrade === 'S++' || finalGrade === 'S+' || finalGrade === 'S') {
                m.sScore += inc;
                m.aCount += inc; m.bCount += inc; m.cCount += inc; m.dCount += inc;
            } else if (finalGrade === 'A') {
                m.aCount += 1; m.bCount += 1; m.cCount += 1; m.dCount += 1;
            } else if (finalGrade === 'B') {
                m.bCount += 1; m.cCount += 1; m.dCount += 1;
            } else if (finalGrade === 'C') {
                m.cCount += 1; m.dCount += 1;
            } else if (finalGrade === 'D') {
                m.dCount += 1;
            }

            // Move to library if it's still in active
            const inActive = state.activeGrimoires.find(g => g.id === grimoireId);
            let nextActive = state.activeGrimoires;
            let nextLibrary = state.libraryGrimoires;

            const updatedG = { ...grimoire, rewardClaimed: true, status: 'ARCHIVED' as const };

            if (inActive) {
                nextActive = state.activeGrimoires.filter(g => g.id !== grimoireId);
                nextLibrary = [...state.libraryGrimoires, updatedG];
            } else {
                const libIdx = state.libraryGrimoires.findIndex(g => g.id === grimoireId);
                if (libIdx !== -1) {
                    nextLibrary = [...state.libraryGrimoires];
                    nextLibrary[libIdx] = updatedG;
                }
            }

            return {
                player: {
                    ...state.player,
                    grimoireMastery: m
                },
                activeGrimoires: nextActive,
                libraryGrimoires: nextLibrary
            };
        });
    },
});
