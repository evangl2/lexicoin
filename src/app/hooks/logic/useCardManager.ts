import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useMotionValue, motionValue, MotionValue } from "motion/react";
import type { CardEntity } from "@/types/CardEntity";
import { sensesToCards, senseToCard } from "@/pipelines/senseToCard";
import { senseRepository } from "@core/storage/SenseRepository";
import { messageBus } from "@core/protocol/MessageBus";
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
    // Helper to check if visible on canvas
    isVisible: boolean;
}

// Helper to extract raw values from MotionValues
const getMotionValue = (mv: MotionValue<number>) => mv.get();

export const useCardManager = () => {
    const [items, setItems] = useState<CardItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // ==== Derived Lists ====
    // Canvas items: explicit 'canvas' location
    const canvasItems = useMemo(
        () => items.filter(i => i.location === 'canvas'),
        [items]
    );

    // Repository items: explicit 'repository' location
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
                    isVisible: location === 'canvas'
                };
            });

            setItems(initialCards);
            setIsLoaded(true);
        };

        loadCards();

        return () => { cancelled = true; };
    }, []);

    // ==== Save Logic — debounced and error-handled ====
    // Now accepts mergedVariants to persist "Sense Position" for hidden cards
    const saveItems = useCallback((mergedVariants: Record<string, CardEntity[]> = {}) => {
        if (!isLoaded) return;

        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const records: any[] = [];

            // 1. Save Active Items (Anchors)
            items.forEach((item) => {
                const x = item.mx.get();
                const y = item.my.get();
                const location = item.location;

                // Save Anchor
                records.push({
                    uid: item.cardData.rawSense.uid,
                    x,
                    y,
                    location,
                });

                // 2. Save Merged Variants (if any)
                // "Sense Position" Strategy: Variants share the EXACT same position as their Anchor
                const variants = mergedVariants[item.cardData.uid];
                if (variants && variants.length > 0) {
                    variants.forEach(variant => {
                        records.push({
                            uid: variant.uid,
                            x, // Inherit Anchor X
                            y, // Inherit Anchor Y
                            location, // Inherit Anchor Location
                        });
                    });
                }
            });

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
                    location: 'canvas',
                    isVisible: true
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

    // ==== Set Card Location (Generic) ====
    const setCardLocation = useCallback((uid: string, location: CardLocation, position?: { x: number, y: number }) => {
        setItems(prev => prev.map(item => {
            if (item.cardData.rawSense.uid === uid) {
                // If position is provided, update it (e.g. for ejection)
                // IMPORTANT: Create NEW MotionValues to reset velocity history (fixing "warp" effect)
                let newMx = item.mx;
                let newMy = item.my;

                if (position) {
                    newMx = motionValue(position.x);
                    newMy = motionValue(position.y);
                }

                return {
                    ...item,
                    mx: newMx,
                    my: newMy,
                    location,
                    isVisible: location === 'canvas'
                };
            }
            return item;
        }));

        // DB Update
        const updatePayload: any = { location };
        if (position) {
            updatePayload.x = position.x;
            updatePayload.y = position.y;
        }

        db.canvasPositions.update(uid, updatePayload).catch(err => {
            logger.error(`Failed to set card location to ${location}`, err, 'useCardManager');
        });
    }, []);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.cardData.rawSense.uid !== id));
    }, []);



    // ==== MessageBus Subscriptions ====
    useEffect(() => {
        if (!isLoaded) return;

        const handleNewSense = (msg: any) => {
            const sense = msg.payload as any;
            if (!sense?.uid) return;

            // Check if already exists to avoid duplicates
            if (items.some(i => i.cardData.rawSense.uid === sense.uid)) return;

            // Transform new sense to CardEntity
            // Default position near center or context-specific
            const cardData = senseToCard(sense, items.length);
            
            const newItem: CardItem = {
                cardData,
                mx: motionValue(0),
                my: motionValue(0),
                scale: motionValue(1),
                width: 250,
                height: 350,
                location: 'canvas',
                isVisible: true
            };

            setItems(prev => [...prev, newItem]);
            logger.info(`Added new card ${sense.uid} to canvas from SENSE_CREATED`, undefined, 'useCardManager');
        };

        const sub = messageBus.subscribe('SENSE_CREATED', handleNewSense);
        
        return () => {
            messageBus.unsubscribe('SENSE_CREATED', sub);
        };
    }, [isLoaded, items]);

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
        setCardLocation, // New API
        deleteItem,
        saveItems,
        isLoaded
    };
};
