/**
 * GrimoireSlice — Grimoire System State Management
 * 
 * Handles active grimoires on canvas, summoning status, and library storage.
 */

import type { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';
import { messageBus } from '../../protocol/MessageBus';
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
    /** Semantic action: Fill a slot and optionally remove from inventory */
    fillGrimoireSlot: (grimoireId: UUID, slotId: UUID, senseId: UUID, inventoryInstanceId?: UUID) => void;
    /** Semantic action: Remove a card from a slot (e.g. by dragging it out) */
    unfillGrimoireSlot: (grimoireId: UUID, slotId: UUID) => void;
    /** DEV: Clear all grimoires from canvas (and return cards to repository) */
    clearAllGrimoires: () => void;
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

    expireGrimoire: (id) => set((state) => {
        const idx = state.activeGrimoires.findIndex((g) => g.id === id);
        if (idx === -1) return state;
        const next = [...state.activeGrimoires];
        next.splice(idx, 1);
        return { activeGrimoires: next };
    }),

    resolveGrimoire: (id) => set((state) => ({
        activeGrimoires: state.activeGrimoires.map((g) => 
            g.id === id ? { ...g, status: 'RESOLVED' as GrimoireStatus } : g
        )
    })),

    archiveGrimoire: (id) => set((state) => {
        const grimoire = state.activeGrimoires.find(g => g.id === id);
        if (!grimoire || grimoire.status !== 'RESOLVED') return state;

        if (state.libraryGrimoires.length >= 99) {
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
        activeGrimoires: state.activeGrimoires.map((g) => {
            if (g.id !== grimoireId) return g;
            
            const nextSlots = g.slots.map((s) => 
                s.id === slotId ? { ...s, senseId } : s
            );
            
            return { ...g, slots: nextSlots };
        })
    })),

    fillGrimoireSlot: (grimoireId, slotId, senseId, inventoryInstanceId) => {
        const state = get();
        state.updateSlotSense(grimoireId, slotId, senseId);
        if (inventoryInstanceId) {
            state.removeInventoryItem(inventoryInstanceId);
        }
    },

    unfillGrimoireSlot: (grimoireId, slotId) => {
        const state = get();
        const grimoire = state.activeGrimoires.find(g => g.id === grimoireId);
        if (!grimoire) return;
        
        const slot = grimoire.slots.find(s => s.id === slotId);
        if (!slot || !slot.senseId) return;

        const senseId = slot.senseId;
        state.updateSlotSense(grimoireId, slotId, null);
        
        // Return to Repository (prevents loss)
        messageBus.send('CARD_LOCATION_CHANGED', {
            uid: senseId,
            location: 'repository'
        }, 'GrimoireModule');
    },

    clearAllGrimoires: () => {
        const state = get();
        const activeGrimoires = state.activeGrimoires;
        const filledSenseIds: UUID[] = [];
        
        activeGrimoires.forEach(g => {
            g.slots.forEach(s => {
                if (s.senseId) filledSenseIds.push(s.senseId);
            });
        });

        if (filledSenseIds.length > 0) {
            filledSenseIds.forEach(uid => {
                messageBus.send('CARD_LOCATION_CHANGED', {
                    uid,
                    location: 'repository'
                }, 'DevConsole');
            });
        }

        set({ activeGrimoires: [], activeGrimoireId: null });
    },
});
