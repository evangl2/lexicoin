import { useState, useEffect, useMemo } from 'react';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

interface UseCardVariantsProps {
    cardData: CardEntity;
    variants: CardEntity[];
}

export const useCardVariants = ({ cardData, variants }: UseCardVariantsProps) => {
    // ========== State: Active Sense Identity ==========
    // Default to the main card's UID (Anchor)
    const [activeUid, setActiveUid] = useState<string>(cardData.uid);

    // Sync activeUid if cardData changes (e.g. if anchor changes externally)
    useEffect(() => {
        setActiveUid(cardData.uid);
    }, [cardData.uid]);

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
