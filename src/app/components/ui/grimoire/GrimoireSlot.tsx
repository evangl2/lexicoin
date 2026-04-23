import React from 'react';
import { useDrop } from 'react-dnd';
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
    const learningLang = useGameStore(s => s.player.settings.learningLang) as Language;

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'CARD',
        canDrop: () => !slot.locked && !isEvaluating,
        drop: (item: { uid: UUID; instanceId?: UUID }) => {
            const state = useGameStore.getState();
            // Using the grimoireId prop passed from GrimoireRightPage
            state.fillGrimoireSlot(grimoireId, slot.id, item.uid, item.instanceId);
            return { dropped: true, slotId: slot.id };
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [slot.id, slot.locked, grimoireId, isEvaluating]);

    return (
        <GrimoireSlotVisual
            slot={slot}
            label={(index + 1).toString()}
            dropRef={drop}
            isActive={isOver && canDrop}
            isEvaluating={isEvaluating}
            showGrade={showGrade}
            displayLang={displayLang}
            personaId={personaId}
        />
    );
};
