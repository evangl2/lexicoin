import { PersonaType } from '@/types/index';
import { GrimoirePersonaBundle } from './Grimoire.persona.base';
import { DefaultGrimoirePersona } from './Grimoire.persona.default';
import { ChildGrimoirePersona } from './Grimoire.persona.child';
import { GardenerGrimoirePersona } from './Grimoire.persona.gardener';

/**
 * Get the persona bundle for a given persona ID.
 * Falls back to DefaultGrimoirePersona if not found.
 */
export const getGrimoirePersona = (id: PersonaType): GrimoirePersonaBundle => {
    switch (id) {
        case 'CHILD':
            return ChildGrimoirePersona;
        case 'GARDENER':
            return GardenerGrimoirePersona;
        case 'ALCHEMIST':
        default:
            return DefaultGrimoirePersona;
    }
};
