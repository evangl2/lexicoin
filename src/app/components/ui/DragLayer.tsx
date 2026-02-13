import React from 'react';
import { useDragLayer } from 'react-dnd';
import { DragPreviewCard } from "@/app/components/ui/DragPreviewCard";
import { PropVisual } from "@/app/components/ui/PropVisual";
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';

interface DragLayerProps {
    scaleState: number;
    systemLang: string;
    learningLang: string;
    getLoc: (key: string, lang: string) => string;
}

export const DragLayer: React.FC<DragLayerProps> = ({ scaleState, systemLang, learningLang, getLoc }) => {
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

    // Target Size in Preview
    const targetWidth = isItem ? sourceWidth : (250 * scaleState);
    const targetHeight = isItem ? sourceHeight : (350 * scaleState);

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
                        width={250}
                        height={350}
                        scale={scaleState}
                        systemLanguage={systemLang}
                        learningLanguage={learningLang}
                        difficultyLevel={item.difficulty?.toString() || "A1"}
                        partOfSpeech={item.pos || "n."}
                        durability={item.durability || 100}
                        layoutMode={scaleState < 0.6 ? 'compact' : 'default'}
                        persona={CardPersona}
                    />
                )}
            </div>
        </div>
    );
};
