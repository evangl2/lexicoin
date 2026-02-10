import { useState, useCallback, useEffect } from "react";
import { useMotionValue, MotionValue, motionValue } from "motion/react";
import type { CardEntity } from "@/types/CardEntity";
import { sensesToCards } from "@/pipelines/senseToCard";
import { INITIAL_SENSES } from "@schemas/data/initialSenses";
import { StoredCard } from "@/app/components/ui/DeckRepository";

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

    // Initialize Cards
    useEffect(() => {
        // GENERATE CARDS HERE TO ENSURE VISUAL REGISTRY IS READY
        const generatedCards = sensesToCards(INITIAL_SENSES);

        // Load stored positions
        const savedData = localStorage.getItem("canvas-items");
        const parsedPositions = savedData ? JSON.parse(savedData) : [];
        const positionMap = new Map<string, { x: number, y: number }>();

        if (Array.isArray(parsedPositions)) {
            parsedPositions.forEach((pos: any) => {
                if (pos.uid && pos.x !== undefined && pos.y !== undefined) {
                    positionMap.set(pos.uid, { x: pos.x, y: pos.y });
                }
            });
        }

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
    }, []);

    // Save Logic
    const saveItems = useCallback(() => {
        if (!isLoaded) return;
        const dataToSave = items.map((item) => ({
            uid: item.cardData.rawSense.uid,
            x: item.mx.get(),
            y: item.my.get(),
        }));
        localStorage.setItem("canvas-items", JSON.stringify(dataToSave));
    }, [items, isLoaded]);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.cardData.rawSense.uid !== id));
    }, []);

    // Auto-save when items change count (debounced by react render)
    useEffect(() => {
        if (isLoaded) saveItems();
    }, [items.length, isLoaded, saveItems]);

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
