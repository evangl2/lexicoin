import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '@store/index';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

interface UseCardVariantsProps {
    cardData: CardEntity;
    variants: CardEntity[];
}

export const useCardVariants = ({ cardData, variants }: UseCardVariantsProps) => {
    // ========== State: Active Sense Identity (Persisted in Store) ==========
    // optimization: select only the specific variant to prevent re-renders when other cards update
    const activeUid = useGameStore(s => s.activeVariants[cardData.uid]) ?? cardData.uid;
    const setActiveVariant = useGameStore(s => s.setActiveVariant);

    const setActiveUid = (variantUid: string) => {
        setActiveVariant(cardData.uid, variantUid);
    };

    // ========== Computed: Sorted Variants & Current Data ==========
    // Combine anchor + variants and sort by frequency (High -> Low)
    // If frequencies are equal, use UID as tiebreaker for stability
    const sortedVariants = useMemo(() => {
        const allCards = [cardData, ...variants];
        return allCards.sort((a, b) => {
            const freqDiff = b.senseInfo.frequency - a.senseInfo.frequency;
            if (freqDiff !== 0) return freqDiff;
            return a.uid.localeCompare(b.uid);
        });
    }, [cardData, variants]);

    // Derive the currently active card data to render
    const currentCardData = useMemo(() => {
        return sortedVariants.find(v => v.uid === activeUid) || cardData;
    }, [sortedVariants, activeUid, cardData]);

    return {
        activeUid,
        setActiveUid,
        sortedVariants,
        currentCardData
    };
};
