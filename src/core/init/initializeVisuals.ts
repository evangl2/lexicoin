import { visualRegistry } from '../registries/VisualRegistry';
import { VISUAL_FIRE_ALCHEMICAL } from '../../../schemas/data/InitialItem/SENSE_ALCHEMICAL_FIRE_002';
import { VISUAL_FIRE_PHYSICAL } from '../../../schemas/data/InitialItem/SENSE_PHYSICAL_FIRE_001';
import { VISUAL_WATER_ALCHEMICAL } from '../../../schemas/data/InitialItem/SENSE_ALCHEMICAL_WATER_003';
import { VISUAL_WATER_PHYSICAL } from '../../../schemas/data/InitialItem/SENSE_PHYSICAL_WATER_003';
import { VISUAL_AIR_ALCHEMICAL } from '../../../schemas/data/InitialItem/SENSE_ALCHEMICAL_AIR_006';
import { VISUAL_AIR_PHYSICAL } from '../../../schemas/data/InitialItem/SENSE_PHYSICAL_AIR_005';
import { VISUAL_EARTH_ALCHEMICAL } from '../../../schemas/data/InitialItem/SENSE_ALCHEMICAL_EARTH_008';
import { VISUAL_EARTH_PHYSICAL } from '../../../schemas/data/InitialItem/SENSE_PHYSICAL_EARTH_007';

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
    visualRegistry.register(VISUAL_WATER_ALCHEMICAL);
    visualRegistry.register(VISUAL_WATER_PHYSICAL);
    visualRegistry.register(VISUAL_AIR_ALCHEMICAL);
    visualRegistry.register(VISUAL_AIR_PHYSICAL);
    visualRegistry.register(VISUAL_EARTH_ALCHEMICAL);
    visualRegistry.register(VISUAL_EARTH_PHYSICAL);

    console.log('[InitializeVisuals] Visual registry populated with initial static data.');
}
