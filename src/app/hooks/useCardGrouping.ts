import { useState, useEffect, useRef } from 'react';
import { animate, motionValue } from "motion/react";
import type { CardEntity } from "@/types/CardEntity";
import type { CardItem } from "@/app/hooks/useCardManager";
import type { CardLocation } from "@core/storage/db";
import type { Language } from '@schemas/schemas/SenseEntity.schema';

// Helper Hook for previous value
function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

// Map UI language names to CardEntity Language codes
const mapLanguageCode = (uiLang: string): Language => {
    const langMap: Record<string, Language> = {
        'ENGLISH': 'en',
        '简体中文': 'zh-CN',
        'FRANÇAIS': 'fr',
        'DEUTSCH': 'de',
        '日本語': 'ja',
        'ESPAÑOL': 'es',
        'ITALIANO': 'it',
        'PORTUGUÊS': 'pt',
    };
    return langMap[uiLang] || 'en'; // Default to 'en'
};

interface UseCardGroupingProps {
    items: CardItem[];
    setItems: React.Dispatch<React.SetStateAction<CardItem[]>>;
    learningLang: string;
}

export const useCardGrouping = ({ items, setItems, learningLang }: UseCardGroupingProps) => {
    // This state holds the "Variants" for each Anchor UID
    // Map<AnchorUID, CardEntity[]>
    const [mergedVariants, setMergedVariants] = useState<Record<string, CardEntity[]>>({});
    const [exitingItems, setExitingItems] = useState<CardItem[]>([]); // Transient items animating out (Merge)
    const [groupFeedback, setGroupFeedback] = useState<{
        merge: string[],
        split: string[],
        timestamp: number
    } | null>(null);

    const prevLang = usePrevious(learningLang);
    const prevItemsLength = usePrevious(items.length);
    const prevMergedVariants = usePrevious(mergedVariants); // Track previous state for split detection

    // Debounce regrouping to avoid thrashing
    useEffect(() => {
        // Condition to trigger regroup:
        // 1. Language Changed
        // 2. New items added (Potential Merge)
        const langChanged = prevLang !== undefined && prevLang !== learningLang;
        const itemsAdded = prevItemsLength !== undefined && items.length > prevItemsLength;

        if (!langChanged && !itemsAdded) return;

        console.log('[Regroup] Triggered. LangChanged:', langChanged, 'ItemsAdded:', itemsAdded);

        // 1. Flatten all cards (Anchors + Variants)
        const allCards: CardEntity[] = [];
        items.forEach(item => {
            allCards.push(item.cardData);
            const variants = mergedVariants[item.cardData.uid] || [];
            allCards.push(...variants);
        });

        // 2. Regroup based on NEW Language
        const groups: Record<string, CardEntity[]> = {};
        const currentLangCode = mapLanguageCode(learningLang);

        allCards.forEach(card => {
            const word = card.displayData[currentLangCode]?.word.toLowerCase();
            if (word) {
                if (!groups[word]) groups[word] = [];
                groups[word].push(card);
            } else {
                // Fallback for missing word? Treat as unique group
                groups[card.uid] = [card];
            }
        });

        // 3. Diff & Animate
        // We need to determine:
        // - Who is now an Anchor?
        // - Who is now a Variant?
        // - Who needs to move?

        const newItems: CardItem[] = [];
        const newMergedVariants: Record<string, CardEntity[]> = {};

        // Track positions and LOCATIONS of existing anchors to preserve state
        const anchorPositions = new Map<string, { x: number, y: number }>();
        const anchorLocations = new Map<string, string>(); // 'canvas' | 'repository'

        // OPTIMIZATION: Create an O(1) lookup Map for current items to quickly find Old Anchors
        const currentItemsMap = new Map<string, CardItem>();
        items.forEach(i => {
            anchorPositions.set(i.cardData.uid, { x: i.mx.get(), y: i.my.get() });
            anchorLocations.set(i.cardData.uid, i.location);
            currentItemsMap.set(i.cardData.uid, i);
        });

        // OPTIMIZATION: Pre-calculate a flat map of Variant UID -> Parent Anchor Item
        // This turns an O(N * M) nested search inside the main loop into an O(1) lookup
        const variantToOldAnchorMap = new Map<string, CardItem>();
        if (prevMergedVariants) {
            for (const [anchorID, variants] of Object.entries(prevMergedVariants)) {
                const anchorItem = currentItemsMap.get(anchorID);
                if (anchorItem) {
                    for (let j = 0; j < variants.length; j++) {
                        variantToOldAnchorMap.set(variants[j]?.uid ?? '', anchorItem);
                    }
                }
            }
        }

        // Process each group
        Object.values(groups).forEach(group => {
            // Sort group: Higher Frequency First -> Anchor
            group.sort((a, b) => {
                const freqDiff = b.senseInfo.frequency - a.senseInfo.frequency;
                if (freqDiff !== 0) return freqDiff;
                return a.uid.localeCompare(b.uid);
            });

            const anchor = group[0];
            if (!anchor) return; // Should not happen given group creation logic

            const variants = group.slice(1);

            // Store Variants
            if (variants.length > 0) {
                newMergedVariants[anchor.uid] = variants;
            }

            // Determine Anchor Position & Location
            let targetX: number = 0; // Default values
            let targetY: number = 0;
            // Persistence Option A: Anchor Dominance
            // If Anchor existed, keep its location. Else default to canvas (or inherit if spawning)
            let targetLocation: CardLocation = 'canvas';

            // Case A: Anchor was already an Anchor
            if (anchorPositions.has(anchor.uid)) {
                const pos = anchorPositions.get(anchor.uid)!;
                targetX = pos.x;
                targetY = pos.y;
                targetLocation = (anchorLocations.get(anchor.uid) as CardLocation) || 'canvas';
            }
            // Case B: Anchor was a Variant (Split or Promotion)
            else {
                // Try to find the position of the OLD Anchor this card belonged to
                // We use our pre-calculated O(1) lookup map instead of nested loops
                const oldAnchorItem = variantToOldAnchorMap.get(anchor.uid);

                if (oldAnchorItem) {
                    // Spawning from Old Anchor -> Inherit Location
                    targetLocation = oldAnchorItem.location;

                    const spawnX = oldAnchorItem.mx.get();
                    const spawnY = oldAnchorItem.my.get();


                    // Native Physics Split:
                    // Spawn slightly offset from center to avoid perfect overlap (divide by zero in physics)
                    // The usePhysics hook will naturally push them apart ("Cell Division" effect)
                    const offset = 10;
                    const randX = (Math.random() - 0.5) * offset;
                    const randY = (Math.random() - 0.5) * offset;

                    const startX = spawnX + randX;
                    const startY = spawnY + randY;

                    // No forced animation - Let physics drive the motion
                    newItems.push({
                        cardData: anchor,
                        width: 250,
                        height: 350,
                        mx: motionValue(startX),
                        my: motionValue(startY),
                        scale: motionValue(1),
                        location: targetLocation,
                        isVisible: targetLocation === 'canvas'
                    });
                    return; // Skip default push
                } else {
                    // Fallback (Shouldn't happen often if logic is consistent)
                    targetX = (Math.random() - 0.5) * 200;
                    targetY = (Math.random() - 0.5) * 200;
                }
            }

            // Create new Item (Default / No Animation Case)
            newItems.push({
                cardData: anchor,
                width: 250,
                height: 350,
                mx: motionValue(targetX),
                my: motionValue(targetY),
                scale: motionValue(1),
                location: targetLocation,
                isVisible: targetLocation === 'canvas'
            });
        });

        // ⚡ Performance Optimization: Pre-calculate variant to anchor mapping
        // Replaces O(N * M) nested loops below with O(1) Map lookups
        const variantToAnchorMap = new Map<string, string>();
        for (const [anchorID, variants] of Object.entries(newMergedVariants)) {
            for (const v of variants) {
                variantToAnchorMap.set(v.uid, anchorID);
            }
        }

        // 3.5 Detect Merging Items (Exiting)
        // Find items that are currently visible (Anchors) but will become Variants in the new state.
        // GUARD: Only animate if we had items before (not on startup)
        const shouldAnimate = prevItemsLength !== undefined && prevItemsLength > 0;
        const exiting: CardItem[] = [];

        if (shouldAnimate) {
            // ⚡ Performance Optimization: Pre-calculate newItems map
            // Replaces O(N) .some() and .find() checks inside the loop with O(1) Map lookups,
            // reducing the overall complexity from O(N^2) to O(N).
            const newItemsMap = new Map<string, CardItem>();
            for (let i = 0; i < newItems.length; i++) {
                const item = newItems[i];
                if (item) newItemsMap.set(item.cardData.rawSense.uid, item);
            }

            items.forEach(oldItem => {
                const uid = oldItem.cardData.rawSense.uid;
                // Is it still an anchor?
                const isStillAnchor = newItemsMap.has(uid);
                if (isStillAnchor) return;

                // Did it merge into someone?
                // Find the Anchor that contains this UID in its variants
                const targetAnchorUID = variantToAnchorMap.get(uid);
                let targetAnchorItem: CardItem | undefined;

                if (targetAnchorUID) {
                    // Find the visible item for this anchor
                    targetAnchorItem = newItemsMap.get(targetAnchorUID);
                }

                if (targetAnchorItem) {
                    // Yes, it merged. Animate it to the target anchor.
                    const startX = oldItem.mx.get();
                    const startY = oldItem.my.get();
                    let targetX = targetAnchorItem.mx.get();
                    let targetY = targetAnchorItem.my.get();

                    // UX: If target is in Repository, animate to Dock (Bottom Center)
                    // BUT only if the source item was on Canvas.
                    // If source was already in Repository, it should just disappear/merge silently.
                    if (targetAnchorItem.location === 'repository') {
                        if (oldItem.location === 'repository') {
                            // Skip animation for Repo -> Repo merge
                            console.log('[Group] Skipping animation for Repo->Repo merge:', uid, '->', targetAnchorUID);
                            return;
                        }
                        console.log('[Group] Animating Canvas->Repo merge:', uid, '->', targetAnchorUID);
                        // Optimize: Target random position within Dock area (Center +/- 250px)
                        // This creates a "pile up" effect instead of a single point
                        const dockSpread = 500;
                        const randomOffsetX = (Math.random() - 0.5) * dockSpread;
                        targetX = (window.innerWidth / 2) + randomOffsetX;
                        targetY = window.innerHeight - 80;
                    } else {
                        console.log('[Group] Animating Standard merge:', uid, '->', targetAnchorUID, targetAnchorItem.location);
                    }

                    // Use existing motion values if possible, or create new ones? 
                    // We reuse the oldItem's motion values to preserve momentum/state if needed,
                    // but simple animate is enough.

                    // Slower Physics (approx 50% slower): Stiffness 90, Damping 20
                    const slowSpring = { type: "spring" as const, stiffness: 90, damping: 20 };

                    animate(oldItem.mx, targetX, slowSpring);
                    animate(oldItem.my, targetY, slowSpring);
                    // Global UI Animation: Shrink to 10% while absorbing
                    // This is independent of Persona
                    animate(oldItem.scale, 0.1, slowSpring);

                    exiting.push(oldItem);
                }
            });
        }

        if (exiting.length > 0) {
            setExitingItems(prev => [...prev, ...exiting]);
            // Cleanup after animation (approx timing)
            setTimeout(() => {
                setExitingItems(prev => prev.filter(p => !exiting.includes(p)));
            }, 600);
        }

        // 3.6 Detect Feedback Events (Merge/Split)
        const mergeUIDs = new Set<string>();
        const splitUIDs = new Set<string>();
        const connections: { from: string, to: string }[] = [];

        // Identify Merged Anchors (Target of exiting items)
        // We reuse the logic: finding which anchor the exiting items went to.
        // Optimization: We could have collected this during the loop above, but separating is cleaner for now.
        exiting.forEach(item => {
            const uid = item.cardData.rawSense.uid;
            const targetAnchorUID = variantToAnchorMap.get(uid);
            if (targetAnchorUID) {
                mergeUIDs.add(targetAnchorUID);
            }
        });

        // Identify Split Items (New Items that were not in valid items list before)
        if (prevLang && prevLang !== learningLang) {
            const prevUIDs = new Set(items.map(i => i.cardData.uid));
            const processedNewItems = new Set<string>();
            const newItemUIDs = new Set(newItems.map(i => i.cardData.uid)); // Pre-calculate for O(1) lookup

            newItems.forEach(ni => {
                // Check if this is a newly appeared item
                if (!prevUIDs.has(ni.cardData.uid)) {
                    const newUID = ni.cardData.uid;
                    splitUIDs.add(newUID);
                    processedNewItems.add(newUID);

                    // Find Source (The Anchor it came from)
                    // We use our pre-calculated O(1) lookup map instead of nested loops
                    const oldAnchorItem = variantToOldAnchorMap.get(newUID);
                    if (oldAnchorItem) {
                        const anchorID = oldAnchorItem.cardData.uid;
                        // Check if anchorID (the Source) is in newItems using O(1) lookup
                        const hasSourceItem = newItemUIDs.has(anchorID);
                        if (hasSourceItem) {
                            splitUIDs.add(anchorID); // Highlight source too
                            connections.push({ from: anchorID, to: newUID });
                        }
                    }
                }
            });
        }

        if (mergeUIDs.size > 0 || splitUIDs.size > 0) {
            setGroupFeedback({
                merge: Array.from(mergeUIDs),
                split: Array.from(splitUIDs),
                timestamp: Date.now()
            });
        }

        // 4. Batch Updates (Optimized)
        // Only update if data actually changed to avoid re-renders

        // Helper for deep comparison of variants
        const variantsChanged = (oldV: Record<string, CardEntity[]>, newV: Record<string, CardEntity[]>) => {
            const oldKeys = Object.keys(oldV);
            const newKeys = Object.keys(newV);
            if (oldKeys.length !== newKeys.length) return true;

            for (const key of newKeys) {
                const ov = oldV[key];
                const nv = newV[key];
                if (!ov || !nv) return true; // Should exist if keys match
                if (ov.length !== nv.length) return true;
                // Check UIDs of variants
                for (let i = 0; i < nv.length; i++) {
                    if (nv[i]?.uid !== ov[i]?.uid) return true;
                }
            }
            return false;
        };

        // Helper for items comparison (UIDs and Positions)
        // Note: motionValues (mx, my) are objects, but we only care about the list structure 
        // and if a new item replaced an old one. Position updates are handled by physics/motion directly.
        // We mainly care if the LIST of items changed.
        const itemsListChanged = items.length !== newItems.length || items.some((item, i) => {
            // Safe access in case newItems length differs (though length check above handles most cases)
            const newItem = newItems[i];
            return !newItem || item.cardData.uid !== newItem.cardData.uid;
        });


        if (itemsListChanged) {
            setItems(newItems);
            // console.log('[Regroup] Items updated', newItems.length);
        }

        if (variantsChanged(mergedVariants, newMergedVariants)) {
            setMergedVariants(newMergedVariants);
            // console.log('[Regroup] Variants updated');
        }

        // 5. Smart Camera: Removed as per optimization plan
        // Camera no longer moves automatically on merge/split.

    }, [learningLang, items.length]); // Dependencies: Language change or Count change

    return {
        mergedVariants,
        exitingItems,
        groupFeedback // Expose feedback events
    };
};
