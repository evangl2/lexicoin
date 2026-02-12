import { StateCreator } from 'zustand';

export interface CardState {
    // Map of Card UID -> Active Variant UID
    // Used to persist which "definition" (variant) is currently selected for a merged card
    activeVariants: Record<string, string>;

    setActiveVariant: (cardUid: string, variantUid: string) => void;
    removeCardState: (cardUid: string) => void;
}

export const createCardStateSlice: StateCreator<CardState> = (set) => ({
    activeVariants: {},

    setActiveVariant: (cardUid, variantUid) => set((state) => ({
        activeVariants: {
            ...state.activeVariants,
            [cardUid]: variantUid
        }
    })),

    removeCardState: (cardUid) => set((state) => {
        const { [cardUid]: _, ...rest } = state.activeVariants;
        return { activeVariants: rest };
    }),
});
