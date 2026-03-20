/**
 * Module Initialization & Integration
 * 
 * Initializes all modules and wires them together with MessageBus and Store
 */

import { messageBus } from '@core/protocol/MessageBus';
// StorageManager removed - replaced by Zustand persist
import { senseRepository } from '@core/storage/SenseRepository';
import { platformAdapter } from '@core/platform/PlatformAdapter';
import { levelModule } from '@modules/level/LevelModule';
import { useGameStore } from '@store/index';
import { logger } from '@utils/logger';
import { libraryModule } from '@modules/library/LibraryModule';
import { INITIAL_SENSES } from '@schemas/data/initialSenses';
import { initializeVisuals } from './initializeVisuals';
import { realtimeService } from '@core/infra/RealtimeService';

/**
 * Initialize all modules and set up MessageBus subscriptions
 */
export async function initializeModules(): Promise<void> {
    logger.info('Initializing all modules...', undefined, 'ModuleInit');

    try {
        // Initialize Supabase Realtime
        realtimeService.init();

        // Seed initial senses into IndexedDB (no-op if already seeded)
        await senseRepository.seed(INITIAL_SENSES);

        // Wire up real-time persistence for AI-generated senses
        senseRepository.initSubscriptions();

        // Note: Player state is automatically hydrated by Zustand persist middleware.
        // We don't need to manually load and set it here anymore.

        // Set up MessageBus subscriptions for store synchronization
        setupMessageBusSubscriptions();

        // Initialize Visual Registry (async: seed + load from IndexedDB)
        await initializeVisuals();

        // Mark modules as ready
        useGameStore.getState().setModulesReady(true);

        logger.info('All modules initialized successfully', undefined, 'ModuleInit');
    } catch (error) {
        logger.error('Failed to initialize modules', error, 'ModuleInit');
        throw error;
    }
}

/**
 * Set up MessageBus subscriptions to sync module state with Zustand store
 */
function setupMessageBusSubscriptions(): void {
    const store = useGameStore.getState();

    // Persona Module subscriptions
    messageBus.subscribe('PERSONA_ACTIVATED', (message) => {
        store.setActivePersona(message.payload.personaId);
    });

    messageBus.subscribe('RESONANCE_UPDATED', (message) => {
        const { personaId, change } = message.payload;
        store.updateResonance(personaId, change);
    });

    // Construction Module subscriptions
    messageBus.subscribe('CONSTRUCTION_CREATED', (message) => {
        store.addConstruction(message.payload);
    });

    // Item Module subscriptions
    messageBus.subscribe('ITEM_ADDED', (message) => {
        store.addInventoryItem(message.payload);
    });

    messageBus.subscribe('ITEM_REMOVED', (message) => {
        store.removeInventoryItem(message.payload.instanceId);
    });

    // Review Module subscriptions
    messageBus.subscribe('REVIEW_SESSION_STARTED', (message) => {
        store.setActiveReviewSession(message.payload.id);
    });

    messageBus.subscribe('REVIEW_SESSION_COMPLETED', (message) => {
        store.setActiveReviewSession(undefined);

        // Award XP for completed review
        const session = message.payload;
        const xpGained = Math.floor(session.totalScore / 10);
        const currentPlayer = useGameStore.getState().player;
        store.updatePlayer({
            xp: currentPlayer.xp + xpGained,
        });
    });

    // Library Module subscriptions
    messageBus.subscribe('ACHIEVEMENT_UNLOCKED', (message) => {
        store.addNotification(
            {
                en: `Achievement unlocked: ${message.payload.achievementId}`,
                zh: `解锁成就：${message.payload.achievementId}`
            },
            'SUCCESS',
            5000
        );
    });

    logger.info('MessageBus subscriptions configured', undefined, 'ModuleInit');
}

/**
 * Save all module state to storage
 */
export async function saveAllModuleState(): Promise<void> {
    logger.info('Saving all module state... (Auto-handled by persistence)', undefined, 'ModuleInit');
    // Zustand persist handles auto-saving. Logic here is no longer needed.
}

/**
 * Get platform information
 */
export function getPlatformInfo() {
    return {
        platform: platformAdapter.getPlatform(),
        viewport: platformAdapter.getViewport(),
        inputCapabilities: platformAdapter.getInputCapabilities(),
        hasTouch: platformAdapter.hasTouch(),
        hasMouse: platformAdapter.hasMouse(),
        prefersReducedMotion: platformAdapter.prefersReducedMotion(),
        prefersDarkMode: platformAdapter.prefersDarkMode(),
    };
}

/**
 * Calculate and award XP for an action
 */
export async function awardXP(params: {
    actionType: 'SYNTHESIS' | 'CONSTRUCTION' | 'REVIEW' | 'TASK';
    complexity: number;
    success: boolean;
    timeSpent?: number;
}): Promise<number> {
    const xp = levelModule.calculateXPReward(params);
    const store = useGameStore.getState();
    const currentPlayer = store.player;

    // Update player XP
    const newXP = currentPlayer.xp + xp;
    store.updatePlayer({ xp: newXP });

    // Check for level up
    const levelInfo = levelModule.calculateLevel(newXP);
    if (levelInfo.level > currentPlayer.level) {
        store.updatePlayer({
            level: levelInfo.level,
            xpToNextLevel: levelInfo.xpToNext,
        });

        store.addNotification(
            {
                en: `Level Up! You are now level ${levelInfo.level}`,
                zh: `等级提升！你现在是第 ${levelInfo.level} 级`
            },
            'SUCCESS',
            5000
        );

        // Check for new unlocks
        const newUnlocks = levelModule.getUnlockedFeatures(levelInfo.level);
        for (const unlock of newUnlocks) {
            if (unlock.requiredLevel === levelInfo.level) {
                store.addNotification(
                    {
                        en: `Unlocked: ${unlock.name}`,
                        zh: `已解锁：${unlock.name}`
                    },
                    'INFO',
                    4000
                );
            }
        }
    }

    return xp;
}

/**
 * Update difficulty metrics based on player performance
 */
export function updateDifficultyMetrics(success: boolean): void {
    levelModule.updateDifficultyMetrics(success);
}

/**
 * Get recommended content difficulty
 */
export function getRecommendedDifficulty() {
    const store = useGameStore.getState();
    const playerLevel = store.player.level;
    const config = levelModule.getLevelConfig(playerLevel);

    if (!config) return 'A1';

    const metrics = levelModule.getDifficultyMetrics(config.cefrLevel);
    return metrics.recommendedCEFR;
}
