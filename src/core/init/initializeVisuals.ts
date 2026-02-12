import { visualRepository } from '../storage/VisualRepository';
import { ALL_INITIAL_VISUALS } from '@schemas/data/InitialItem';
import { logger } from '@utils/logger';

/**
 * Initialize Visuals
 * 
 * Seeds initial visual payloads into IndexedDB (no-op if already seeded),
 * loads them into the in-memory VisualRegistry, and subscribes to
 * MessageBus events for real-time AI-generated visual persistence.
 */
export async function initializeVisuals(): Promise<void> {
    // 1. Seed initial visuals into IndexedDB (idempotent)
    await visualRepository.seed(ALL_INITIAL_VISUALS);

    // 2. Load all visuals from IndexedDB into in-memory VisualRegistry
    await visualRepository.loadAllIntoRegistry();

    // 3. Wire up real-time persistence for AI-generated visuals
    visualRepository.initSubscriptions();

    logger.debug('Visual pipeline initialized (IndexedDB → VisualRegistry)', undefined, 'InitializeVisuals');
}
