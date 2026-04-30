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

let _staminaIntervalId: ReturnType<typeof setInterval> | null = null
let _messageUnsubscribers: (() => void)[] = []

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
        const store = useGameStore.getState();
        store.setModulesReady(true);

        // --- Daily Echo Reset ---
        const today = new Date().toISOString().split('T')[0];
        if (store.player.lastEchoReset !== today) {
            store.resetEchoCharges();
            logger.info(`Refilled Echo charges for new day: ${today}`, undefined, 'ModuleInit');
        }

        // --- Stamina Recovery (offline compensation) ---
        store.recoverStamina();
        // Continue recovering every 5 minutes while the app is running
        if (_staminaIntervalId !== null) clearInterval(_staminaIntervalId)
        _staminaIntervalId = setInterval(() => useGameStore.getState().recoverStamina(), 5 * 60 * 1000);

        // --- Active Grimoire Expiry Check ---
        const now = Date.now();
        const expiredIds = store.activeGrimoires
            .filter(g => g.expiresAt < now)
            .map(g => g.id);
            
        if (expiredIds.length > 0) {
            logger.info(`Cleaning up ${expiredIds.length} expired grimoires`, undefined, 'ModuleInit');
            expiredIds.forEach(id => store.updateGrimoireStatus(id, 'EXPIRED'));
            // Note: Use a dedicated cleanup action if needed, but for now we just mark them.
        }

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
    _messageUnsubscribers.forEach(unsub => unsub())
    _messageUnsubscribers = []

    const store = useGameStore.getState();

    // Persona Module subscriptions
    _messageUnsubscribers.push(
        messageBus.subscribe('PERSONA_ACTIVATED', (message) => {
            store.setActivePersona(message.payload.personaId);
        })
    );

    _messageUnsubscribers.push(
        messageBus.subscribe('RESONANCE_UPDATED', (message) => {
            const { personaId, change } = message.payload;
            store.updateResonance(personaId, change);
        })
    );

    // Construction Module subscriptions
    _messageUnsubscribers.push(
        messageBus.subscribe('CONSTRUCTION_CREATED', (message) => {
            store.addConstruction(message.payload);
        })
    );

    // Item Module subscriptions
    _messageUnsubscribers.push(
        messageBus.subscribe('ITEM_ADDED', (message) => {
            store.addInventoryItem(message.payload);
        })
    );

    _messageUnsubscribers.push(
        messageBus.subscribe('ITEM_REMOVED', (message) => {
            store.removeInventoryItem(message.payload.instanceId);
        })
    );

    // Review Module subscriptions
    _messageUnsubscribers.push(
        messageBus.subscribe('REVIEW_SESSION_STARTED', (message) => {
            store.setActiveReviewSession(message.payload.id);
        })
    );

    _messageUnsubscribers.push(
        messageBus.subscribe('REVIEW_SESSION_COMPLETED', () => {
            store.setActiveReviewSession(undefined);

            const learningLang = useGameStore.getState().player.settings.learningLang;
            xpRegistry.awardXP(learningLang, 'SENSE_COLLECTED').catch(err => {
                logger.error('Failed to award XP for review session', err, 'ModuleInit');
            });
        })
    );

    // Library Module subscriptions
    _messageUnsubscribers.push(
        messageBus.subscribe('ACHIEVEMENT_UNLOCKED', (message) => {
            store.addNotification(
                {
                    en: `Achievement unlocked: ${message.payload.achievementId}`,
                    zh: `解锁成就：${message.payload.achievementId}`
                },
                'SUCCESS',
                5000
            );
        })
    );

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

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (_staminaIntervalId !== null) {
            clearInterval(_staminaIntervalId)
            _staminaIntervalId = null
        }
        _messageUnsubscribers.forEach(unsub => unsub())
        _messageUnsubscribers = []
    })
}
