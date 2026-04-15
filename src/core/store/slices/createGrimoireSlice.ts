/**
 * GrimoireSlice — Grimoire System State Management
 * 
 * Handles active grimoires on canvas, summoning status, and library storage.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';
import type { 
    GrimoireEntity, 
    GrimoireStatus, 
    UUID, 
    Grade, 
    GrimoireType, 
    PersonaType, 
    CEFRLevel 
} from '@/types/index';

export interface GrimoireState {
    activeGrimoires: GrimoireEntity[];
    libraryGrimoires: GrimoireEntity[];
    summonerStatus: 'IDLE' | 'GENERATING' | 'READY';
    activeGrimoireId: UUID | null; // Currently opened in the evaluation overlay
}

export interface GrimoireActions {
    /** Spawn a new Grimoire on the canvas */
    spawnGrimoire: (grimoire: GrimoireEntity) => void;
    /** Update a specific Grimoire's data or state */
    updateGrimoire: (id: UUID, updates: Partial<GrimoireEntity>) => void;
    /** Update only the status of a Grimoire (convenience wrapper) */
    updateGrimoireStatus: (id: UUID, status: GrimoireStatus) => void;
    /** Remove a Grimoire from the canvas (e.g. on expiration) */
    expireGrimoire: (id: UUID) => void;
    /** Resolve a Grimoire, calculating the final grade */
    resolveGrimoire: (id: UUID) => void;
    /** Move a RESOLVED Grimoire to the library */
    archiveGrimoire: (id: UUID) => void;
    /** Set the summoning device status */
    setSummonerStatus: (status: GrimoireState['summonerStatus']) => void;
    /** Open/Close the detailed evaluation overlay */
    setActiveGrimoireId: (id: UUID | null) => void;
    /** Place a Sense card into a specific slot of a grimoire */
    updateSlotSense: (grimoireId: UUID, slotId: UUID, senseId: UUID | null) => void;
}

export const createGrimoireSlice: StateCreator<
    GameStore,
    [['zustand/persist', unknown]],
    [],
    GrimoireState & GrimoireActions
> = (set, get) => ({
    // Initial State
    activeGrimoires: [],
    libraryGrimoires: [],
    summonerStatus: 'IDLE',
    activeGrimoireId: null,

    // Actions
    spawnGrimoire: (grimoire) => set((state) => ({
        activeGrimoires: [...state.activeGrimoires, grimoire]
    })),

    updateGrimoire: (id, updates) => set((state) => ({
        activeGrimoires: state.activeGrimoires.map((g) =>
            g.id === id ? { ...g, ...updates } : g
        )
    })),

    updateGrimoireStatus: (id, status) => set((state) => ({
        activeGrimoires: state.activeGrimoires.map((g) =>
            g.id === id ? { ...g, status } : g
        )
    })),

    expireGrimoire: (id) => set((state) => ({
        // First mark as EXPIRED (for animation), then remove
        activeGrimoires: state.activeGrimoires
            .map((g) => g.id === id ? { ...g, status: 'EXPIRED' as GrimoireStatus } : g)
            .filter((g) => g.id !== id)
    })),

    resolveGrimoire: (id) => {
        const grimoire = get().activeGrimoires.find(g => g.id === id);
        if (!grimoire) return;

        // Note: Final grade calculation logic will be refined in Phase 4/5 integration
        // with the evaluation service. For now, we provide the skeletal action.
        set((state) => ({
            activeGrimoires: state.activeGrimoires.map((g) => 
                g.id === id ? { ...g, status: 'RESOLVED' as GrimoireStatus } : g
            )
        }));
    },

    archiveGrimoire: (id) => set((state) => {
        const grimoire = state.activeGrimoires.find(g => g.id === id);
        if (!grimoire || grimoire.status !== 'RESOLVED') return state;

        // Max 99 books in library
        if (state.libraryGrimoires.length >= 99) {
            // TODO: Add notification via get().addNotification
            return state;
        }

        return {
            activeGrimoires: state.activeGrimoires.filter(g => g.id !== id),
            libraryGrimoires: [...state.libraryGrimoires, { ...grimoire, status: 'ARCHIVED' as GrimoireStatus }]
        };
    }),

    setSummonerStatus: (status) => set({ summonerStatus: status }),
    setActiveGrimoireId: (id) => set({ activeGrimoireId: id }),
    updateSlotSense: (grimoireId, slotId, senseId) => set((state) => ({
        activeGrimoires: state.activeGrimoires.map((g) => 
            g.id === grimoireId ? {
                ...g,
                slots: g.slots.map((s) => s.id === slotId ? { ...s, senseId } : s)
            } : g
        )
    })),
});
