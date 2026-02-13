import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useMotionValue, motionValue, MotionValue } from "motion/react";
import type { CardEntity } from "@/types/CardEntity";
import { sensesToCards } from "@/pipelines/senseToCard";
import { senseRepository } from "@core/storage/SenseRepository";
import type { CardLocation } from "@core/storage/db";
import { db } from "@core/storage/db";
import { logger } from "@utils/logger";

// Runtime types with MotionValues
export interface CardItem {
    cardData: CardEntity; // Actual card data
    mx: MotionValue<number>;
    my: MotionValue<number>;
    scale: MotionValue<number>; // Added for global UI animations (e.g. merge absorb)
    width: number;
    height: number;
    location: CardLocation;
}

export const useCardManager = () => {
    const [items, setItems] = useState<CardItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // ==== Derived Lists ====
    const canvasItems = useMemo(
        () => items.filter(i => i.location === 'canvas'),
        [items]
    );
    const repositoryItems = useMemo(
        () => items.filter(i => i.location === 'repository'),
        [items]
    );

    // ==== Initialize Cards ====
    useEffect(() => {
        let cancelled = false;

        const loadCards = async () => {
            // Load SenseEntity data from IndexedDB (seeded by moduleInit)
            const senses = await senseRepository.getAll();
            const generatedCards = sensesToCards(senses);

            // Load stored positions + locations from IndexedDB
            let positionMap = new Map<string, { x: number, y: number, location: CardLocation }>();
            try {
                const positions = await db.canvasPositions.toArray();
                positions.forEach(pos => {
                    if (pos.uid && pos.x !== undefined && pos.y !== undefined) {
                        positionMap.set(pos.uid, {
                            x: pos.x,
                            y: pos.y,
                            location: pos.location || 'canvas', // Default for migrated data
                        });
                    }
                });
            } catch (err) {
                logger.error('Failed to load canvas positions', err, 'useCardManager');
            }

            // Guard against StrictMode double-mount
            if (cancelled) return;

            const initialCards = generatedCards.map((cardData) => {
                let posX = cardData.position.x;
                let posY = cardData.position.y;
                let location: CardLocation = 'canvas';

                // Override with saved position/location if available
                if (positionMap.has(cardData.uid)) {
                    const saved = positionMap.get(cardData.uid)!;
                    posX = saved.x;
                    posY = saved.y;
                    location = saved.location;
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
                    scale: motionValue(1),
                    location,
                };
            });

            setItems(initialCards);
            setIsLoaded(true);
        };

        loadCards();

        return () => { cancelled = true; };
    }, []);

    // ==== Save Logic — debounced and error-handled ====
    const saveItems = useCallback(() => {
        if (!isLoaded) return;

        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const records = items.map((item) => ({
                uid: item.cardData.rawSense.uid,
                x: item.mx.get(),
                y: item.my.get(),
                location: item.location,
            }));

            db.transaction('rw', db.canvasPositions, async () => {
                await db.canvasPositions.bulkPut(records);
            }).catch(err => {
                logger.error('Failed to save canvas positions', err, 'useCardManager');
            });
        }, 300); // 300ms debounce
    }, [items, isLoaded]);

    // ==== Store Card (Canvas → Repository) ====
    const storeCard = useCallback((uid: string) => {
        setItems(prev => prev.map(item =>
            item.cardData.rawSense.uid === uid
                ? { ...item, location: 'repository' as CardLocation }
                : item
        ));

        // Persist immediately
        db.canvasPositions.update(uid, { location: 'repository' }).catch(err => {
            logger.error('Failed to store card to repository', err, 'useCardManager');
        });
    }, []);

    // ==== Retrieve Card (Repository → Canvas) ====
    const retrieveCard = useCallback((uid: string, x: number, y: number) => {
        setItems(prev => prev.map(item => {
            if (item.cardData.rawSense.uid === uid) {
                // IMPORTANT: Create NEW MotionValues to reset velocity history.
                // Reusing the old ones causes a massive position jump (old_pos -> new_pos)
                // which triggers extreme velocity-based deformation (glare/tilt).
                const newMx = motionValue(x);
                const newMy = motionValue(y);

                const newItem: CardItem = {
                    ...item,
                    mx: newMx,
                    my: newMy,
                    scale: motionValue(1),
                    location: 'canvas'
                };

                // Sync to DB immediately
                db.canvasPositions.put({ uid, x, y, location: 'canvas' }).catch(err => {
                    logger.error('Failed to retrieve card from repository', err, 'useCardManager');
                });

                return newItem;
            }
            return item;
        }));
    }, []);

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
        canvasItems,
        repositoryItems,
        storeCard,
        retrieveCard,
        deleteItem,
        saveItems,
        isLoaded
    };
};
