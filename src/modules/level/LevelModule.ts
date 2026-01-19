/**
 * LevelModule - Level & Progression System
 * 
 * Manages player progression, EXP calculation, CEFR-based difficulty,
 * content unlocking, and dynamic difficulty adjustment
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import type { CEFRLevel } from '../../types/index';

export interface LevelConfig {
    level: number;
    xpRequired: number;
    cefrLevel: CEFRLevel;
    unlockedFeatures: string[];
}

export interface UnlockableFeature {
    id: string;
    name: string;
    description: string;
    requiredLevel: number;
    type: 'CONSTRUCTION_TIER' | 'PERSONA' | 'ITEM' | 'GAME_MODE';
}

export interface DifficultyMetrics {
    recentSuccessRate: number;  // 0-1
    averageCompletionTime: number;  // milliseconds
    consecutiveFailures: number;
    recommendedCEFR: CEFRLevel;
}

class LevelModule {
    private static instance: LevelModule;
    private levelConfigs: LevelConfig[];
    private unlockableFeatures: Map<string, UnlockableFeature>;
    private difficultyHistory: number[] = [];  // Recent success rates
    private readonly HISTORY_SIZE = 10;

    private constructor() {
        this.levelConfigs = this.initializeLevelConfigs();
        this.unlockableFeatures = this.initializeUnlockables();
        logger.info('LevelModule initialized', undefined, 'LevelModule');
    }

    static getInstance(): LevelModule {
        if (!LevelModule.instance) {
            LevelModule.instance = new LevelModule();
        }
        return LevelModule.instance;
    }

    /**
     * Initialize level configurations
     */
    private initializeLevelConfigs(): LevelConfig[] {
        const configs: LevelConfig[] = [];

        // Define level progression with exponential XP curve
        const cefrLevels: CEFRLevel[] = ['A1', 'A1', 'A2', 'A2', 'B1', 'B1', 'B2', 'B2', 'C1', 'C1', 'C2'];

        for (let i = 1; i <= 50; i++) {
            const xpRequired = Math.floor(100 * Math.pow(1.15, i - 1));
            const cefrIndex = Math.min(Math.floor((i - 1) / 5), cefrLevels.length - 1);

            configs.push({
                level: i,
                xpRequired,
                cefrLevel: cefrLevels[cefrIndex],
                unlockedFeatures: this.getFeaturesForLevel(i),
            });
        }

        return configs;
    }

    /**
     * Get features unlocked at a specific level
     */
    private getFeaturesForLevel(level: number): string[] {
        const features: string[] = [];

        if (level === 1) features.push('LEXEME_CONSTRUCTION');
        if (level === 5) features.push('PHRASE_CONSTRUCTION');
        if (level === 10) features.push('SENTENCE_CONSTRUCTION');
        if (level === 15) features.push('NARRATIVE_CONSTRUCTION');
        if (level === 3) features.push('PERSONA_LOGICIAN');
        if (level === 7) features.push('PERSONA_POET');
        if (level === 12) features.push('PERSONA_ALCHEMIST');
        if (level === 5) features.push('SANCTUARY_MODE');
        if (level === 8) features.push('LIBRARY_MODE');

        return features;
    }

    /**
     * Initialize unlockable features
     */
    private initializeUnlockables(): Map<string, UnlockableFeature> {
        const features: UnlockableFeature[] = [
            {
                id: 'LEXEME_CONSTRUCTION',
                name: 'Lexeme Construction',
                description: 'Combine single words',
                requiredLevel: 1,
                type: 'CONSTRUCTION_TIER',
            },
            {
                id: 'PHRASE_CONSTRUCTION',
                name: 'Phrase Construction',
                description: 'Build word phrases',
                requiredLevel: 5,
                type: 'CONSTRUCTION_TIER',
            },
            {
                id: 'SENTENCE_CONSTRUCTION',
                name: 'Sentence Construction',
                description: 'Create complete sentences',
                requiredLevel: 10,
                type: 'CONSTRUCTION_TIER',
            },
            {
                id: 'NARRATIVE_CONSTRUCTION',
                name: 'Narrative Construction',
                description: 'Craft complex narratives',
                requiredLevel: 15,
                type: 'CONSTRUCTION_TIER',
            },
            {
                id: 'PERSONA_LOGICIAN',
                name: 'Logician Persona',
                description: 'Unlock the Logician path',
                requiredLevel: 3,
                type: 'PERSONA',
            },
            {
                id: 'PERSONA_POET',
                name: 'Poet Persona',
                description: 'Unlock the Poet path',
                requiredLevel: 7,
                type: 'PERSONA',
            },
            {
                id: 'SANCTUARY_MODE',
                name: 'Sanctuary Ritual',
                description: 'Access review mini-games',
                requiredLevel: 5,
                type: 'GAME_MODE',
            },
        ];

        const map = new Map<string, UnlockableFeature>();
        for (const feature of features) {
            map.set(feature.id, feature);
        }

        return map;
    }

    /**
     * Calculate XP reward for an action
     */
    calculateXPReward(params: {
        actionType: 'SYNTHESIS' | 'CONSTRUCTION' | 'REVIEW' | 'TASK';
        complexity: number;  // 1-10
        success: boolean;
        timeSpent?: number;  // milliseconds
    }): number {
        const { actionType, complexity, success, timeSpent } = params;

        // Base XP by action type
        const baseXP: Record<typeof actionType, number> = {
            'SYNTHESIS': 10,
            'CONSTRUCTION': 15,
            'REVIEW': 5,
            'TASK': 20,
        };

        let xp = baseXP[actionType];

        // Complexity multiplier (1-10 → 1.0-2.0x)
        xp *= (1 + (complexity - 1) / 10);

        // Success bonus
        if (success) {
            xp *= 1.5;
        } else {
            xp *= 0.3;  // Still get some XP for trying
        }

        // Time bonus (faster = more XP, but capped)
        if (timeSpent) {
            const expectedTime = 30000;  // 30 seconds baseline
            if (timeSpent < expectedTime) {
                const speedBonus = 1 + (expectedTime - timeSpent) / expectedTime * 0.2;
                xp *= Math.min(speedBonus, 1.3);
            }
        }

        return Math.floor(xp);
    }

    /**
     * Get level config for a specific level
     */
    getLevelConfig(level: number): LevelConfig | undefined {
        return this.levelConfigs.find(c => c.level === level);
    }

    /**
     * Calculate level from total XP
     */
    calculateLevel(totalXP: number): { level: number; xpToNext: number; progress: number } {
        let currentLevel = 1;
        let xpAccumulated = 0;

        for (const config of this.levelConfigs) {
            if (xpAccumulated + config.xpRequired > totalXP) {
                const xpIntoLevel = totalXP - xpAccumulated;
                const progress = xpIntoLevel / config.xpRequired;

                return {
                    level: currentLevel,
                    xpToNext: config.xpRequired - xpIntoLevel,
                    progress,
                };
            }

            xpAccumulated += config.xpRequired;
            currentLevel++;
        }

        // Max level reached
        return {
            level: this.levelConfigs.length,
            xpToNext: 0,
            progress: 1,
        };
    }

    /**
     * Check if a feature is unlocked at a given level
     */
    isFeatureUnlocked(featureId: string, playerLevel: number): boolean {
        const feature = this.unlockableFeatures.get(featureId);
        if (!feature) return false;
        return playerLevel >= feature.requiredLevel;
    }

    /**
     * Get all unlocked features for a level
     */
    getUnlockedFeatures(playerLevel: number): UnlockableFeature[] {
        return Array.from(this.unlockableFeatures.values()).filter(
            f => f.requiredLevel <= playerLevel
        );
    }

    /**
     * Get next unlockable features
     */
    getNextUnlocks(playerLevel: number, count: number = 3): UnlockableFeature[] {
        return Array.from(this.unlockableFeatures.values())
            .filter(f => f.requiredLevel > playerLevel)
            .sort((a, b) => a.requiredLevel - b.requiredLevel)
            .slice(0, count);
    }

    /**
     * Update difficulty metrics based on player performance
     */
    updateDifficultyMetrics(success: boolean): void {
        this.difficultyHistory.push(success ? 1 : 0);

        // Keep only recent history
        if (this.difficultyHistory.length > this.HISTORY_SIZE) {
            this.difficultyHistory.shift();
        }

        logger.debug('Difficulty metrics updated', {
            history: this.difficultyHistory,
            successRate: this.getSuccessRate(),
        }, 'LevelModule');
    }

    /**
     * Get current success rate
     */
    private getSuccessRate(): number {
        if (this.difficultyHistory.length === 0) return 0.5;

        const successes = this.difficultyHistory.reduce((sum, val) => sum + val, 0);
        return successes / this.difficultyHistory.length;
    }

    /**
     * Get recommended CEFR level based on performance
     */
    getRecommendedCEFR(currentCEFR: CEFRLevel): CEFRLevel {
        const successRate = this.getSuccessRate();
        const cefrLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const currentIndex = cefrLevels.indexOf(currentCEFR);

        // If success rate is high, recommend next level
        if (successRate > 0.8 && currentIndex < cefrLevels.length - 1) {
            return cefrLevels[currentIndex + 1];
        }

        // If success rate is low, recommend previous level
        if (successRate < 0.4 && currentIndex > 0) {
            return cefrLevels[currentIndex - 1];
        }

        return currentCEFR;
    }

    /**
     * Get difficulty metrics
     */
    getDifficultyMetrics(currentCEFR: CEFRLevel): DifficultyMetrics {
        return {
            recentSuccessRate: this.getSuccessRate(),
            averageCompletionTime: 0,  // TODO: Track this
            consecutiveFailures: this.getConsecutiveFailures(),
            recommendedCEFR: this.getRecommendedCEFR(currentCEFR),
        };
    }

    /**
     * Get consecutive failures count
     */
    private getConsecutiveFailures(): number {
        let count = 0;
        for (let i = this.difficultyHistory.length - 1; i >= 0; i--) {
            if (this.difficultyHistory[i] === 0) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }
}

// Export singleton instance
export const levelModule = LevelModule.getInstance();
export default levelModule;
