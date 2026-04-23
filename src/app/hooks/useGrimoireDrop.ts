import { useDrop } from 'react-dnd';
import { useGameStore } from '@/core/store';
import { UUID, GrimoireSlot } from '@/types/index';

interface UseGrimoireDropOptions {
    grimoireId: UUID;
    slots: GrimoireSlot[];
    isOpenable: boolean;   // status !== 'SUMMONING' && !isLibraryView
    isEvaluating: boolean; // status === 'EVALUATING'
}

interface UseGrimoireDropResult {
    dropRef: (node: any) => void;
    isOver: boolean;
    canDrop: boolean;
}

/**
 * useGrimoireDrop
 * 
 * Handles Grimoire-level drag-and-drop logic.
 * When a card is dropped on the book itself (not a specific slot),
 * it finds the first available empty slot and fills it.
 */
export function useGrimoireDrop(options: UseGrimoireDropOptions): UseGrimoireDropResult {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'CARD',
        canDrop: () => options.isOpenable && !options.isEvaluating,
        drop: (item: { uid: UUID; instanceId?: UUID }) => {
            const state = useGameStore.getState();
            
            // Find the first empty slot (senseId === null)
            const emptySlot = options.slots.find(slot => !slot.senseId && !slot.locked);
            
            if (emptySlot) {
                state.fillGrimoireSlot(
                    options.grimoireId, 
                    emptySlot.id, 
                    item.uid, 
                    item.instanceId
                );
                return { dropped: true, slotId: emptySlot.id };
            }
            
            return undefined;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [options.grimoireId, options.slots, options.isOpenable, options.isEvaluating]);

    return {
        dropRef: drop,
        isOver,
        canDrop,
    };
}
