import React from 'react';
import { useDragLayer } from 'react-dnd';
import { DragPreviewCard } from "@/app/components/ui/card/DragPreviewCard";
import { PropVisual } from "@/app/components/ui/visual/PropVisual";
import { DeviceVisual } from "@/app/components/ui/visual/DeviceVisual"; // Added
import { useCardPersona } from '@/app/context/PersonaContext';

interface DragLayerProps {
    systemLang: string;
    learningLang: string;
    getLoc: (key: string, lang: string) => string;
}

export const DragLayer: React.FC<DragLayerProps> = ({ systemLang, learningLang, getLoc }) => {
    const cardPersona = useCardPersona();
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
    const isDevice = (item as any).type === 'DEVICE';

    const sourceWidth = (item as any).sourceWidth || (isItem || isDevice ? 100 : 125);
    const sourceHeight = (item as any).sourceHeight || (isItem || isDevice ? 100 : 175);

    // OPTION 3: Forced Compact (Robust)
    // CRITICAL FIX: Forced Compact Mode for Dragging
    const FIXED_SCALE_LEGACY = 0.5; // Matches Repository item size (125x175)

    // Check for new robust mode
    const itemCardMode = (item as any).cardMode;
    const visualPayload = (item as any).visualPayload;

    // If cardMode is present, we trust sourceWidth/Height and use 1:1 scale
    // Devices also use 1:1 scale of their sourceWidth
    const scale = (itemCardMode || isDevice) ? 1.0 : FIXED_SCALE_LEGACY;

    // Target Size in Preview
    const targetWidth = (isItem || isDevice)
        ? sourceWidth
        : (itemCardMode ? sourceWidth : (250 * FIXED_SCALE_LEGACY));

    const targetHeight = (isItem || isDevice)
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
                className="absolute top-0 left-0"
                style={{
                    transform: `translate(${newLeft}px, ${newTop}px)`,
                }}
            >
                {isItem ? (
                    <PropVisual title={getLoc(item.title, systemLang)} size={targetWidth} />
                ) : isDevice ? (
                    <DeviceVisual type={(item as any).uid.includes('type') ? (item as any).uid : 'synthesis-circle'} size={targetWidth} />
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
                        persona={cardPersona}
                    />
                )}
            </div>
        </div>
    );
};
