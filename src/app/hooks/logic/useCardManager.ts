import { useState, useCallback, useEffect, useRef } from "react";
import { MotionValue, motionValue } from "motion/react";
import type { CardEntity } from "@/types/CardEntity";
import { sensesToCards } from "@/pipelines/senseToCard";
import { senseRepository } from "@core/storage/SenseRepository";
import { StoredCard } from "@/app/components/ui/DeckRepository";
import { db } from "@core/storage/db";
import { logger } from "@utils/logger";

// Runtime types with MotionValues
export interface CardItem {
    cardData: CardEntity; // Actual card data
    mx: MotionValue<number>;
    my: MotionValue<number>;
    width: number;
    height: number;
}

export const useCardManager = () => {
    const [items, setItems] = useState<CardItem[]>([]);
    const [storedItems] = useState<StoredCard[]>([]);
    const [propItems, setPropItems] = useState<StoredCard[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Initialize Cards
    useEffect(() => {
        let cancelled = false;

        const loadCards = async () => {
            // Load SenseEntity data from IndexedDB (seeded by moduleInit)
            const senses = await senseRepository.getAll();
            const generatedCards = sensesToCards(senses);

            // Load stored positions from IndexedDB
            let positionMap = new Map<string, { x: number, y: number }>();
            try {
                const positions = await db.canvasPositions.toArray();
                positions.forEach(pos => {
                    if (pos.uid && pos.x !== undefined && pos.y !== undefined) {
                        positionMap.set(pos.uid, { x: pos.x, y: pos.y });
                    }
                });
            } catch (err) {
                logger.error('Failed to load canvas positions, using defaults', err, 'useCardManager');
            }

            // Guard against StrictMode double-mount
            if (cancelled) return;

            const initialCards = generatedCards.map((cardData) => {
                let posX = cardData.position.x;
                let posY = cardData.position.y;

                // Override with saved position if available
                if (positionMap.has(cardData.uid)) {
                    const saved = positionMap.get(cardData.uid)!;
                    posX = saved.x;
                    posY = saved.y;
                }

                return {
                    cardData: {
                        ...cardData,
                        position: { x: posX, y: posY }
                    },
                    width: 250,
                    height: 350,
                    mx: motionValue(posX),
                    my: motionValue(posY),
                };
            });

            setItems(initialCards);
            setIsLoaded(true);
        };

        loadCards();

        return () => { cancelled = true; };
    }, []);

    // Save Logic — debounced and error-handled
    const saveItems = useCallback(() => {
        if (!isLoaded) return;

        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const records = items.map((item) => ({
                uid: item.cardData.rawSense.uid,
                x: item.mx.get(),
                y: item.my.get(),
            }));

            db.transaction('rw', db.canvasPositions, async () => {
                await db.canvasPositions.clear();
                await db.canvasPositions.bulkPut(records);
            }).catch(err => {
                logger.error('Failed to save canvas positions', err, 'useCardManager');
            });
        }, 300); // 300ms debounce
    }, [items, isLoaded]);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.cardData.rawSense.uid !== id));
    }, []);

    // Auto-save when items change count (debounced by react render)
    useEffect(() => {
        if (isLoaded) saveItems();
    }, [items.length, isLoaded, saveItems]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => clearTimeout(saveTimerRef.current);
    }, []);

    return {
        items,
        setItems,
        storedItems,
        propItems,
        setPropItems,
        deleteItem,
        saveItems,
        isLoaded
    };
};
