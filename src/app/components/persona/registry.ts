/**
 * PERSONA REGISTRY
 * 
 * Registers and manages all available Persona skins.
 * 
 * Steps to add a new skin:
 * 1. Create a new folder in persona/ directory, e.g., `cyberpunk/`
 * 2. Create index.ts exporting PartialPersonaBundle
 * 3. Import and register in this file
 * 
 * @example
 * // In cyberpunk/index.ts:
 * export const CyberpunkPersona: PartialPersonaBundle = {
 *   card: {
 *     identity: { name: 'cyberpunk', displayName: 'Cyberpunk', ... },
 *     palette: { colors: { primary: '#00ff00', ... } },
 *     slots: { Corners: null }, // Disable corner decorations
 *   },
 *   // canvas and interface can be omitted, will fallback to default
 * };
 * 
 * // Register in this file:
 * import { CyberpunkPersona } from './cyberpunk';
 * PERSONA_REGISTRY['cyberpunk'] = CyberpunkPersona;
 */

import type { PersonaBundle, PartialPersonaBundle } from '@/app/types/persona.types';
import { DefaultPersona } from './default';
import { CyberpunkPersona } from './cyberpunk';

// ==================== REGISTRY ====================

/**
 * Persona Registry
 * 
 * Key: Skin Name
 * Value: Complete PersonaBundle or PartialPersonaBundle
 */
const PERSONA_REGISTRY: Record<string, PersonaBundle | PartialPersonaBundle> = {
    'default': DefaultPersona,
    'cyberpunk': CyberpunkPersona,

    // Add more skins later:
    // 'minimalist': MinimalistPersona,
    // 'steampunk': SteampunkPersona,
};

// ==================== PUBLIC API ====================

/**
 * Default Skin Name
 */
export const DEFAULT_PERSONA_NAME = 'default';

/**
 * Get specified skin
 */
export function getPersona(name: string): PersonaBundle | PartialPersonaBundle {
    const persona = PERSONA_REGISTRY[name];
    if (!persona) {
        console.warn(`Persona "${name}" not found, falling back to default`);
        return PERSONA_REGISTRY[DEFAULT_PERSONA_NAME]!;
    }
    return persona;
}

/**
 * Get all available skin names
 */
export function getAvailablePersonas(): string[] {
    return Object.keys(PERSONA_REGISTRY);
}

/**
 * Check if skin exists
 */
export function hasPersona(name: string): boolean {
    return name in PERSONA_REGISTRY;
}

/**
 * Register new skin (Runtime dynamic add)
 */
export function registerPersona(name: string, persona: PartialPersonaBundle): void {
    if (PERSONA_REGISTRY[name]) {
        console.warn(`Persona "${name}" already exists, overwriting...`);
    }
    PERSONA_REGISTRY[name] = persona;
}

/**
 * Get skin display info list
 */
export function getPersonaList(): Array<{ name: string; displayName: string; theme: string }> {
    return Object.entries(PERSONA_REGISTRY).map(([name, persona]) => ({
        name,
        displayName: persona.card?.identity?.displayName || name,
        theme: persona.card?.identity?.theme || '',
    }));
}
