import React from 'react';
import { useDragLayer } from 'react-dnd';
import { DragPreviewCard } from "@/app/components/ui/DragPreviewCard";
import { PropVisual } from "@/app/components/ui/PropVisual";
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';

interface DragLayerProps {
    systemLang: string;
    learningLang: string;
    getLoc: (key: string, lang: string) => string;
}

export const DragLayer: React.FC<DragLayerProps> = ({ systemLang, learningLang, getLoc }) => {
    const {
        isDragging,
        item,
        clientOffset,
        initialClientOffset,
        initialSourceClientOffset
    } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        clientOffset: monitor.getClientOffset(),
        initialClientOffset: monitor.getInitialClientOffset(),
        initialSourceClientOffset: monitor.getInitialSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    if (!isDragging || !clientOffset || !item || !initialClientOffset || !initialSourceClientOffset) {
        return null;
    }

    const isItem = (item as any).type === 'ITEM';
    const sourceWidth = (item as any).sourceWidth || (isItem ? 100 : 125);
    const sourceHeight = (item as any).sourceHeight || (isItem ? 100 : 175);

    // OPTION 3: Forced Compact (Robust)
    // CRITICAL FIX: Forced Compact Mode for Dragging
    // Previously, we attempted to switch between 'compact' and 'default' (CardVisual) based on zoom.
    // However, the full CardVisual component became unstable/invisible at high zoom levels (>100%)
    // or when the scale calculation was extreme, causing the drag preview to disappear.
    //
    // DECISION:
    // We now strictly enforce 'compact' mode and a fixed scale of 0.5.
    // 1. Consistency: Matches the visual style of the Dock/Repository (which also uses CompactCardVisual).
    // 2. Robustness: CompactCardVisual is lighter and doesn't rely on complex physics/glare motion values that fail during drag.
    // 3. Stability: Works perfectly at ANY canvas zoom level (50% to 300%+).
    const FIXED_SCALE_LEGACY = 0.5; // Matches Repository item size (125x175)

    // Check for new robust mode
    const itemCardMode = (item as any).cardMode;
    const visualPayload = (item as any).visualPayload;

    // If cardMode is present, we trust sourceWidth/Height and use 1:1 scale
    const scale = itemCardMode ? 1.0 : FIXED_SCALE_LEGACY;

    // Target Size in Preview
    const targetWidth = isItem
        ? sourceWidth
        : (itemCardMode ? sourceWidth : (250 * FIXED_SCALE_LEGACY));

    const targetHeight = isItem
        ? sourceHeight
        : (itemCardMode ? sourceHeight : (350 * FIXED_SCALE_LEGACY));

    // Anchor Point
    const grabOffsetX = (initialClientOffset.x - initialSourceClientOffset.x);
    const grabOffsetY = (initialClientOffset.y - initialSourceClientOffset.y);
    const ratioX = grabOffsetX / sourceWidth;
    const ratioY = grabOffsetY / sourceHeight;

    const newLeft = clientOffset.x - (targetWidth * ratioX);
    const newTop = clientOffset.y - (targetHeight * ratioY);

    return (
        <div className="fixed inset-0 pointer-events-none z-[10000]">
            <div
                className="absolute top-0 left-0 will-change-transform"
                style={{
                    transform: `translate(${newLeft}px, ${newTop}px)`,
                }}
            >
                {isItem ? (
                    <PropVisual title={getLoc(item.title, systemLang)} size={targetWidth} />
                ) : (
                    <DragPreviewCard
                        title={item.title}
                        image={item.image}
                        width={itemCardMode ? targetWidth : 250} // If mode is set, use exact target width
                        height={itemCardMode ? targetHeight : 350} // If mode is set, use exact target height
                        scale={scale}
                        systemLanguage={systemLang}
                        learningLanguage={learningLang}
                        difficultyLevel={item.difficulty?.toString() || "A1"}
                        partOfSpeech={item.pos || "n."}
                        durability={item.durability || 100}
                        layoutMode={'compact'} // FORCE COMPACT MODE
                        cardMode={itemCardMode} // Pass specific mode (repo/icon/word)
                        visualPayload={visualPayload}
                        persona={CardPersona}
                    />
                )}
            </div>
        </div>
    );
};
