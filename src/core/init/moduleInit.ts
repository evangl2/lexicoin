/**
 * Module Initialization & Integration
 * 
 * Initializes all modules and wires them together with MessageBus and Store
 */

import { messageBus } from '@core/protocol/MessageBus';
import { storageManager } from '@core/storage/StorageManager';
import { platformAdapter } from '@core/platform/PlatformAdapter';
import { constructionModule } from '@modules/construction/ConstructionModule';
import { levelModule } from '@modules/level/LevelModule';
import { personaModule } from '@modules/persona/PersonaModule';
import { itemModule } from '@modules/item/ItemModule';
import { reviewModule } from '@modules/review/ReviewModule';
import { libraryModule } from '@modules/library/LibraryModule';
import { sedimentationModule } from '@modules/sedimentation/SedimentationModule';
import { useGameStore } from '@store/index';
import { logger } from '@utils/logger';

/**
 * Initialize all modules and set up MessageBus subscriptions
 */
export async function initializeModules(): Promise<void> {
    logger.info('Initializing all modules...', undefined, 'ModuleInit');

    try {
        // Load persisted data
        const savedData = await storageManager.load();

        // Initialize persona resonance from saved data
        if (savedData.player) {
            const store = useGameStore.getState();
            store.updatePlayer(savedData.player);
        }

        // Set up MessageBus subscriptions for store synchronization
        setupMessageBusSubscriptions();

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
            `Achievement unlocked: ${message.payload.achievementId}`,
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
    logger.info('Saving all module state...', undefined, 'ModuleInit');

    try {
        const store = useGameStore.getState();

        // Gather all state to save
        await storageManager.save({
            player: store.player,
            senses: store.senses,
        });

        logger.info('All module state saved successfully', undefined, 'ModuleInit');
    } catch (error) {
        logger.error('Failed to save module state', error, 'ModuleInit');
        throw error;
    }
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
            `Level Up! You are now level ${levelInfo.level}`,
            'SUCCESS',
            5000
        );

        // Check for new unlocks
        const newUnlocks = levelModule.getUnlockedFeatures(levelInfo.level);
        for (const unlock of newUnlocks) {
            if (unlock.requiredLevel === levelInfo.level) {
                store.addNotification(
                    `Unlocked: ${unlock.name}`,
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
