/**
 * ReviewModule - Sanctuary Ritual (Spaced Repetition Mini-Games)
 * 
 * Manages review sessions, scheduling logic, mini-game sequences,
 * and mastery tracking for vocabulary retention
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import { generateId } from '@utils/helpers';
import type { UUID, CEFRLevel } from '../../types/index';

export type MiniGameType =
    | 'REVERSE_SYNTHESIS'  // Given result, find inputs
    | 'SEMANTIC_MATCH'  // Match word to meaning
    | 'MORPHOLOGY_SPLIT'  // Break down word structure
    | 'ANALOGY_COMPLETE'  // A:B = X:?
    | 'CONTEXT_SELECT';  // Choose correct word for context

export interface ReviewSession {
    id: UUID;
    senseIds: UUID[];  // Senses to review
    miniGames: MiniGame[];
    startedAt: number;
    completedAt?: number;
    totalScore: number;
    maxScore: number;
}

export interface MiniGame {
    id: UUID;
    type: MiniGameType;
    senseId: UUID;
    question: any;  // Game-specific question data
    correctAnswer: any;
    playerAnswer?: any;
    timeLimit: number;  // milliseconds
    timeSpent?: number;
    correct?: boolean;
    score: number;
}

export interface MasteryData {
    senseId: UUID;
    level: number;  // 0-100
    lastReviewed: number;
    nextReview: number;  // Timestamp when next review is due
    reviewCount: number;
    correctCount: number;
    averageResponseTime: number;
}

class ReviewModule {
    private static instance: ReviewModule;
    private masteryData: Map<UUID, MasteryData>;
    private activeSessions: Map<UUID, ReviewSession>;

    private constructor() {
        this.masteryData = new Map();
        this.activeSessions = new Map();
        logger.info('ReviewModule initialized', undefined, 'ReviewModule');
    }

    static getInstance(): ReviewModule {
        if (!ReviewModule.instance) {
            ReviewModule.instance = new ReviewModule();
        }
        return ReviewModule.instance;
    }

    /**
     * Get senses due for review using spaced repetition
     */
    getSensesDueForReview(allSenseIds: UUID[], count: number = 10): UUID[] {
        const now = Date.now();
        const due: Array<{ senseId: UUID; priority: number }> = [];

        for (const senseId of allSenseIds) {
            const mastery = this.masteryData.get(senseId);

            if (!mastery) {
                // New sense, high priority
                due.push({ senseId, priority: 1000 });
            } else if (mastery.nextReview <= now) {
                // Overdue, priority based on how overdue
                const overdueDays = (now - mastery.nextReview) / (1000 * 60 * 60 * 24);
                due.push({ senseId, priority: 100 + overdueDays });
            }
        }

        // Sort by priority (highest first) and take top N
        return due
            .sort((a, b) => b.priority - a.priority)
            .slice(0, count)
            .map(item => item.senseId);
    }

    /**
     * Create a review session
     */
    async createSession(senseIds: UUID[]): Promise<ReviewSession> {
        const miniGames: MiniGame[] = [];

        // Create 2-3 mini-games per sense
        for (const senseId of senseIds) {
            const gameTypes = this.selectMiniGameTypes(senseId, 2);

            for (const type of gameTypes) {
                miniGames.push({
                    id: generateId(),
                    type,
                    senseId,
                    question: this.generateQuestion(type, senseId),
                    correctAnswer: null,  // Will be set by game logic
                    timeLimit: this.getTimeLimit(type),
                    score: 0,
                });
            }
        }

        // Shuffle mini-games for variety
        this.shuffleArray(miniGames);

        const session: ReviewSession = {
            id: generateId(),
            senseIds,
            miniGames,
            startedAt: Date.now(),
            totalScore: 0,
            maxScore: miniGames.length * 100,
        };

        this.activeSessions.set(session.id, session);

        await messageBus.send('REVIEW_SESSION_STARTED', session, 'ReviewModule');
        logger.info(`Review session created with ${miniGames.length} mini-games`, { id: session.id }, 'ReviewModule');

        return session;
    }

    /**
     * Select mini-game types based on sense mastery
     */
    private selectMiniGameTypes(senseId: UUID, count: number): MiniGameType[] {
        const mastery = this.masteryData.get(senseId);
        const allTypes: MiniGameType[] = [
            'REVERSE_SYNTHESIS',
            'SEMANTIC_MATCH',
            'MORPHOLOGY_SPLIT',
            'ANALOGY_COMPLETE',
            'CONTEXT_SELECT',
        ];

        // For new senses, focus on basic recognition
        if (!mastery || mastery.level < 30) {
            return ['SEMANTIC_MATCH', 'CONTEXT_SELECT'].slice(0, count);
        }

        // For mastered senses, use more challenging games
        if (mastery.level > 70) {
            return ['REVERSE_SYNTHESIS', 'ANALOGY_COMPLETE'].slice(0, count);
        }

        // Mix of games for intermediate mastery
        return this.shuffleArray([...allTypes]).slice(0, count);
    }

    /**
     * Generate question data for a mini-game
     */
    private generateQuestion(type: MiniGameType, senseId: UUID): any {
        // Placeholder - actual implementation would generate game-specific questions
        return {
            type,
            senseId,
            // Game-specific data would go here
        };
    }

    /**
     * Get time limit for a mini-game type
     */
    private getTimeLimit(type: MiniGameType): number {
        const limits: Record<MiniGameType, number> = {
            'REVERSE_SYNTHESIS': 10000,  // 10 seconds
            'SEMANTIC_MATCH': 5000,      // 5 seconds
            'MORPHOLOGY_SPLIT': 8000,    // 8 seconds
            'ANALOGY_COMPLETE': 12000,   // 12 seconds
            'CONTEXT_SELECT': 7000,      // 7 seconds
        };

        return limits[type];
    }

    /**
     * Submit answer for a mini-game
     */
    async submitAnswer(sessionId: UUID, gameId: UUID, answer: any, timeSpent: number): Promise<MiniGame | undefined> {
        const session = this.activeSessions.get(sessionId);
        if (!session) return undefined;

        const game = session.miniGames.find(g => g.id === gameId);
        if (!game) return undefined;

        game.playerAnswer = answer;
        game.timeSpent = timeSpent;

        // Check correctness (placeholder logic)
        game.correct = this.checkAnswer(game, answer);

        // Calculate score based on correctness and speed
        if (game.correct) {
            const speedBonus = Math.max(0, 1 - (timeSpent / game.timeLimit));
            game.score = Math.floor(100 * (0.7 + 0.3 * speedBonus));
        } else {
            game.score = 0;
        }

        session.totalScore += game.score;

        await messageBus.send('MINI_GAME_COMPLETED', game, 'ReviewModule');
        logger.debug(`Mini-game answered: ${game.type}`, {
            correct: game.correct,
            score: game.score
        }, 'ReviewModule');

        return game;
    }

    /**
     * Check if answer is correct
     */
    private checkAnswer(game: MiniGame, answer: any): boolean {
        // Placeholder - actual implementation would check game-specific logic
        return true;
    }

    /**
     * Complete a review session
     */
    async completeSession(sessionId: UUID): Promise<ReviewSession | undefined> {
        const session = this.activeSessions.get(sessionId);
        if (!session) return undefined;

        session.completedAt = Date.now();

        // Update mastery for all reviewed senses
        for (const senseId of session.senseIds) {
            const gamesForSense = session.miniGames.filter(g => g.senseId === senseId);
            const correctCount = gamesForSense.filter(g => g.correct).length;
            const totalCount = gamesForSense.length;
            const avgTime = gamesForSense.reduce((sum, g) => sum + (g.timeSpent || 0), 0) / totalCount;

            await this.updateMastery(senseId, correctCount, totalCount, avgTime);
        }

        await messageBus.send('REVIEW_SESSION_COMPLETED', session, 'ReviewModule');
        logger.info(`Review session completed`, {
            id: session.id,
            score: `${session.totalScore}/${session.maxScore}`,
        }, 'ReviewModule');

        return session;
    }

    /**
     * Update mastery data for a sense
     */
    private async updateMastery(senseId: UUID, correctCount: number, totalCount: number, avgTime: number): Promise<void> {
        let mastery = this.masteryData.get(senseId);
        const now = Date.now();

        if (!mastery) {
            mastery = {
                senseId,
                level: 0,
                lastReviewed: now,
                nextReview: now,
                reviewCount: 0,
                correctCount: 0,
                averageResponseTime: 0,
            };
            this.masteryData.set(senseId, mastery);
        }

        // Update stats
        mastery.reviewCount += totalCount;
        mastery.correctCount += correctCount;
        mastery.lastReviewed = now;

        // Update average response time
        mastery.averageResponseTime =
            (mastery.averageResponseTime * (mastery.reviewCount - totalCount) + avgTime * totalCount) / mastery.reviewCount;

        // Calculate new mastery level
        const successRate = mastery.correctCount / mastery.reviewCount;
        const targetLevel = Math.floor(successRate * 100);

        // Gradually move toward target level
        mastery.level = Math.floor(mastery.level * 0.7 + targetLevel * 0.3);

        // Calculate next review time using spaced repetition
        const interval = this.calculateReviewInterval(mastery.level, mastery.reviewCount);
        mastery.nextReview = now + interval;

        await messageBus.send('MASTERY_UPDATED', mastery, 'ReviewModule');
        logger.debug(`Mastery updated for sense`, {
            senseId,
            level: mastery.level,
            nextReview: new Date(mastery.nextReview).toISOString(),
        }, 'ReviewModule');
    }

    /**
     * Calculate review interval using spaced repetition algorithm
     */
    private calculateReviewInterval(masteryLevel: number, reviewCount: number): number {
        // Base intervals in milliseconds
        const baseIntervals = [
            1000 * 60 * 5,        // 5 minutes (first review)
            1000 * 60 * 30,       // 30 minutes
            1000 * 60 * 60 * 4,   // 4 hours
            1000 * 60 * 60 * 24,  // 1 day
            1000 * 60 * 60 * 24 * 3,   // 3 days
            1000 * 60 * 60 * 24 * 7,   // 1 week
            1000 * 60 * 60 * 24 * 14,  // 2 weeks
            1000 * 60 * 60 * 24 * 30,  // 1 month
        ];

        const index = Math.min(reviewCount, baseIntervals.length - 1);
        let interval = baseIntervals[index];

        // Adjust based on mastery level
        const masteryMultiplier = 1 + (masteryLevel / 100);
        interval *= masteryMultiplier;

        return interval;
    }

    /**
     * Get mastery data for a sense
     */
    getMastery(senseId: UUID): MasteryData | undefined {
        return this.masteryData.get(senseId);
    }

    /**
     * Get all mastery data
     */
    getAllMastery(): MasteryData[] {
        return Array.from(this.masteryData.values());
    }

    /**
     * Load mastery data
     */
    loadMasteryData(data: MasteryData[]): void {
        for (const mastery of data) {
            this.masteryData.set(mastery.senseId, mastery);
        }
        logger.info(`Loaded ${data.length} mastery records`, undefined, 'ReviewModule');
    }

    /**
     * Utility: Shuffle array in place
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Export singleton instance
export const reviewModule = ReviewModule.getInstance();
export default reviewModule;
