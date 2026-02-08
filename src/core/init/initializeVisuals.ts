import { visualRegistry } from '../registries/VisualRegistry';
import { VISUAL_FIRE_ALCHEMICAL } from '../../../schemas/data/InitialItem/SENSE_ALCHEMICAL_FIRE_002';
import { VISUAL_FIRE_PHYSICAL } from '../../../schemas/data/InitialItem/SENSE_PHYSICAL_FIRE_001';

/**
 * Initialize Visuals
 * 
 * Registers static visual payloads into the VisualRegistry at application startup.
 * Future async/dynamic visual loading logic can also be triggered here.
 */
export function initializeVisuals() {
    // 1. Register static visuals
    visualRegistry.register(VISUAL_FIRE_ALCHEMICAL);
    visualRegistry.register(VISUAL_FIRE_PHYSICAL);

    console.log('[InitializeVisuals] Visual registry populated with initial static data.');
}
