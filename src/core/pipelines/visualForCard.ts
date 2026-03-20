import type { SenseEntity } from '../../schemas/schemas/SenseEntity.schema';
import type { VisualData } from '../../types/CardEntity';
import { visualRegistry } from '../registries/VisualRegistry';

/**
 * Extract visual data for a card
 * 
 * Logic:
 * 1. Check VisualRegistry for a dynamic/registered visual (Sole Source of Truth)
 * 2. Fallback to 'loading' state if not found
 * 
 * @param sense - Source SenseEntity
 * @returns Initialized VisualData
 */
export function visualForCard(sense: SenseEntity): VisualData {
    // 1. Registry Lookup (Sole Source of Truth)
    const registryVisual = visualRegistry.getBestMatch(sense.uid);
    if (registryVisual?.payload) {
        return {
            status: 'loaded',
            payload: registryVisual.payload
        };
    }

    // 2. Fallback (No data available)
    return {
        status: 'loading',
        payload: ''
    };
}
