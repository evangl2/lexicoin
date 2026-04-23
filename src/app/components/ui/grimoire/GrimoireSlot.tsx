import React from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useGameStore } from '@/core/store';
import { GrimoireSlot as GrimoireSlotType, UUID, Sense, Language } from '@/types/index';
import { GrimoireSlotVisual } from './GrimoireSlotVisual';

interface GrimoireSlotProps {
    slot: GrimoireSlotType;
    index: number;
    grimoireId: UUID;
    isEvaluating: boolean;
    showGrade?: boolean;
    displayLang: 'learning' | 'system';
    personaId: string;
}

/**
 * GrimoireSlot (Container)
 * 
 * Handles interaction logic for a single Grimoire slot.
 * Manages react-dnd state and store updates.
 */
export const GrimoireSlot: React.FC<GrimoireSlotProps> = ({
    slot,
    index,
    grimoireId,
    isEvaluating,
    showGrade = false,
    displayLang,
    personaId
}) => {
    const senses = useGameStore(s => s.senses);
    const filledSense = senses.find(s => s.id === slot.senseId);
    const unfillSlot = useGameStore(s => s.unfillGrimoireSlot);
    const player = useGameStore(s => s.player);

    // Resolve actual language keys
    const learningLangCode = player.settings.learningLang || 'en';
    const systemLangCode = player.settings.interfaceLang || 'zh';
    const activeLangCode = displayLang === 'learning' ? learningLangCode : systemLangCode;
    const secondaryLangCode = displayLang === 'learning' ? systemLangCode : learningLangCode;

    // 1. Drop Logic (Putting card IN)
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'CARD',
        canDrop: () => !slot.locked && !isEvaluating && !slot.senseId,
        drop: (item: { uid: UUID; instanceId?: UUID }) => {
            const state = useGameStore.getState();
            state.fillGrimoireSlot(grimoireId, slot.id, item.uid, item.instanceId);
            return { dropped: true, slotId: slot.id };
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [slot.id, slot.locked, slot.senseId, grimoireId, isEvaluating]);

    // 2. Drag Logic (Taking card OUT)
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'CARD',
        item: () => ({
            type: 'CARD',
            uid: slot.senseId,
            source: 'GRIMOIRE',
            grimoireId,
            slotId: slot.id
        }),
        canDrag: () => !!slot.senseId && !isEvaluating && !slot.locked,
        end: (item, monitor) => {
            if (monitor.didDrop()) {
                // If dropped successfully, remove from grimoire
                // Note: The drop target (e.g. inventory) is responsible for adding it back there
                // BUT our unfillGrimoireSlot already adds it back to inventory for safety.
                unfillSlot(grimoireId, slot.id);
            }
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [slot.senseId, grimoireId, isEvaluating, slot.locked]);

    return (
        <GrimoireSlotVisual
            slot={slot}
            sense={filledSense || null}
            label={(index + 1).toString()}
            dropRef={drop}
            dragRef={drag}
            isActive={isOver && canDrop}
            isDragging={isDragging}
            isEvaluating={isEvaluating}
            showGrade={showGrade}
            displayLang={displayLang}
            activeLangCode={activeLangCode}
            secondaryLangCode={secondaryLangCode}
            personaId={personaId}
            onRemove={() => unfillSlot(grimoireId, slot.id)}
        />
    );
};
