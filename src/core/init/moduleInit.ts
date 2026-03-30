/**
 * Module Initialization & Integration
 * 
 * Initializes all modules and wires them together with MessageBus and Store
 */

import { messageBus } from '@core/protocol/MessageBus';
import { senseRepository } from '@core/storage/SenseRepository';
import { platformAdapter } from '@core/platform/PlatformAdapter';
import { useGameStore } from '@store/index';
import { logger } from '@utils/logger';
import { INITIAL_SENSES } from '@schemas/data/initialSenses';
import { initializeVisuals } from './initializeVisuals';
import { realtimeService } from '@core/infra/RealtimeService';
import { xpRegistry } from '@core/services/XPRegistry';

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
        // LevelModule is initialized separately in App.tsx via levelModule.initialize().

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

    messageBus.subscribe('REVIEW_SESSION_COMPLETED', () => {
        store.setActiveReviewSession(undefined);

        // Award XP for completed review session via the new XPRegistry.
        // LevelModule handles the level-up state updates & notifications internally.
        const learningLang = useGameStore.getState().player.settings.learningLang;
        xpRegistry.awardXP(learningLang, 'SENSE_COLLECTED').catch(err => {
            logger.error('Failed to award XP for review session', err, 'ModuleInit');
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
    // Zustand persist handles auto-saving. No manual logic needed.
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
