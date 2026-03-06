import React, { useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { useDrop } from 'react-dnd';
import { useDrag } from '@use-gesture/react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { DeviceState } from '@/types/DeviceEntity';
import { CompactCardVisual } from './CompactCardVisual';
import { DefaultCardPersona } from '../persona/default/Card.persona.default';
import { DEFAULT_LANGUAGE } from '@/types/CardEntity';

interface SynthesisCircleProps {
    uid: string;
    x: MotionValue<number>;
    y: MotionValue<number>;
    state: DeviceState;
    updateState: (uid: string, newState: Partial<DeviceState>) => void;
    inputCards: any[]; // Cards currently in the slots
    canvasScale: MotionValue<number>; // Needed for drag calculations
    onDragEnd: (uid: string) => void;
    onCardEnter?: (cardUid: string) => void;
    onCardEject?: (cardUid: string) => void;
    mergedVariants?: Record<string, any[]>; // Added prop
    onDropIntoRepository?: (uid: string) => void;
}

export const SynthesisCircle: React.FC<SynthesisCircleProps> = ({
    uid, x, y, state, updateState, inputCards, canvasScale, onDragEnd,
    onCardEnter, onCardEject, mergedVariants = {}, onDropIntoRepository
}) => {
    // Drop Targets (Slots)
    const [{ isOver1 }, drop1] = useDrop(() => ({
        accept: 'CARD',
        drop: (item: { uid: string }) => {
            if (state.slot1_uid) return;
            if (item.uid === state.slot2_uid) return;
            // Atomic Update
            updateState(uid, { slot1_uid: item.uid });
            onCardEnter?.(item.uid);
        },
        collect: monitor => ({ isOver1: monitor.isOver() })
    }), [state.slot1_uid, state.slot2_uid, uid, updateState, onCardEnter]);

    const [{ isOver2 }, drop2] = useDrop(() => ({
        accept: 'CARD',
        drop: (item: { uid: string }) => {
            if (state.slot2_uid) return;
            if (item.uid === state.slot1_uid) return;
            updateState(uid, { slot2_uid: item.uid });
            onCardEnter?.(item.uid);
        },
        collect: monitor => ({ isOver2: monitor.isOver() })
    }), [state.slot1_uid, state.slot2_uid, uid, updateState, onCardEnter]);

    // Drag Logic (Optimized)
    // We rely on use-gesture for all dragging (Canvas and Repo interaction via collision check)
    // Removed conflicting react-dnd useDrag source.
    // Drag Logic
    // We match Card.tsx implementation exactly for consistency
    const circleRef = React.useRef<HTMLDivElement | null>(null);

    const dragConfig = React.useMemo(() => ({
        target: circleRef,
        pointer: { keys: false },
        eventOptions: { passive: false }
    }), [circleRef]);

    useDrag(({ active, delta: [dx, dy], xy: [px, py], last }) => {
        if (active) {
            const scale = canvasScale.get() || 1;
            x.set(x.get() + dx / scale);
            y.set(y.get() + dy / scale);
        }
        if (last) {
            onDragEnd(uid);

            // Manual Drop Detection for Repository
            const elements = document.elementsFromPoint(px, py);
            const repoElement = elements.find(el => el.id === 'deck-repository-drop-zone');
            if (repoElement && onDropIntoRepository) {
                onDropIntoRepository(uid);
            }
        }
    }, dragConfig);

    // Merge refs for potential future use (dnd drop is handled by Slots)
    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
        circleRef.current = node;
    }, []);

    // ⚡ Bolt: Performance Optimization
    // Problem: inputCards.find() runs O(N) on every render, which is triggered frequently
    // by react-dnd useDrop state changes (isOver1, isOver2) during any drag operation on the canvas.
    // Solution: Memoize the slot lookups.
    // Impact: Eliminates redundant O(N) lookups against the full card catalog during drag events.
    const card1 = React.useMemo(() => inputCards.find(c => c.cardData.rawSense.uid === state.slot1_uid), [inputCards, state.slot1_uid]);
    const card2 = React.useMemo(() => inputCards.find(c => c.cardData.rawSense.uid === state.slot2_uid), [inputCards, state.slot2_uid]);
    const canSynthesize = !!card1 && !!card2 && !state.isProcessing;

    const handleSynthesize = () => {
        if (!canSynthesize) return;
        console.log('Synthesizing:', card1?.cardData.uid, '+', card2?.cardData.uid);
        updateState(uid, { isProcessing: true });

        // Mock async
        setTimeout(() => {
            updateState(uid, { isProcessing: false });
            console.log('Synthesis Complete (Mock)');
        }, 2000);
    };

    const handleEject = (slot: 1 | 2) => {
        if (state.isProcessing) return;

        let targetUid: string | null = null;
        if (slot === 1) {
            targetUid = state.slot1_uid;
            updateState(uid, { slot1_uid: null });
        } else {
            targetUid = state.slot2_uid;
            updateState(uid, { slot2_uid: null });
        }

        if (targetUid) {
            onCardEject?.(targetUid);
        }
    };

    return (
        <motion.div
            ref={setRefs} // Use stable callback ref
            style={{
                x,
                y,
                zIndex: 0,
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -225, // -width / 2 (450/2)
                marginTop: -225,  // -height / 2 (450/2) 
                touchAction: 'none' // Direct style instead of class
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="canvas-card absolute rounded-full pointer-events-auto"
        >
            {/* Visual Base */}
            <div className="w-[450px] h-[450px] rounded-full border border-white/10 relative flex items-center justify-center backdrop-blur-sm"
                style={{
                    background: 'radial-gradient(circle, rgba(20,20,30,0.8) 0%, rgba(10,10,15,0.9) 100%)',
                    boxShadow: '0 0 50px rgba(0,0,0,0.5)'
                }}
            >
                {/* Decorative Rings */}
                <div className="absolute inset-4 rounded-full border border-dashed border-white/5 animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-12 rounded-full border border-white/5" />

                {/* Slots Container */}
                <div className="flex items-center gap-8 relative z-10">
                    <Slot
                        ref={drop1}
                        isOver={isOver1}
                        card={card1}
                        variants={card1 ? (mergedVariants[card1.cardData.uid] || []) : []}
                        onEject={() => handleEject(1)}
                        disabled={state.isProcessing}
                        slotId={1}
                        deviceUid={uid}
                    />

                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleSynthesize}
                            disabled={!canSynthesize}
                            className={`
                                w-16 h-16 rounded-full border flex items-center justify-center transition-all duration-300
                                ${canSynthesize
                                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] hover:scale-110 hover:shadow-[0_0_20px_#D4AF37]'
                                    : 'bg-white/5 border-white/10 text-zinc-600 cursor-not-allowed'}
                            `}
                        >
                            {state.isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={24} />}
                        </button>
                    </div>

                    <Slot
                        ref={drop2}
                        isOver={isOver2}
                        card={card2}
                        variants={card2 ? (mergedVariants[card2.cardData.uid] || []) : []}
                        onEject={() => handleEject(2)}
                        disabled={state.isProcessing}
                        slotId={2}
                        deviceUid={uid}
                    />
                </div>

                <div className="absolute bottom-12 text-center w-full">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-mono">
                        {state.isProcessing ? 'Synthesizing...' : 'Awaiting Reagents'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

// Slot Component
interface SlotProps {
    isOver: boolean;
    card?: any;
    variants: any[]; // Added
    onEject: () => void;
    disabled: boolean;
    ref?: any;
    slotId?: number;
    deviceUid?: string;
}

const Slot = React.forwardRef<HTMLDivElement, SlotProps>((props, ref) => {
    const { isOver, card, variants, onEject, disabled } = props;
    return (
        <div
            ref={ref}
            data-slot-id={props.slotId}
            data-device-uid={props.deviceUid}
            className={`
                synthesis-slot w-[120px] h-[120px] rounded-[22px] transition-all duration-300 relative group
                ${card ? '' : 'border-2'} 
                ${isOver && !card ? 'border-[#D4AF37] bg-[#D4AF37]/10' : ''}
                ${!isOver && !card ? 'border-white/10 bg-black/20' : ''}
            `}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {card ? (
                <div className="w-full h-full relative">
                    <div className="w-full h-full rounded-lg overflow-hidden">
                        <SlottedCard card={card} variants={variants} />
                    </div>
                    {!disabled && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEject(); }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-50"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className={`w-8 h-8 rounded-full border border-dashed transition-colors ${isOver ? 'border-[#D4AF37]' : 'border-white/20'}`} />
                </div>
            )}
        </div>
    );
});
Slot.displayName = 'Slot';

import { useCardVariants } from '@/app/utils/mergeSplit/useCardVariants';

// Helper component to use hooks conditionally (only when card exists)
const SlottedCard: React.FC<{ card: any, variants: any[] }> = ({ card, variants }) => {
    const { currentCardData } = useCardVariants({
        cardData: card.cardData,
        variants: variants
    });

    return (
        <CompactCardVisual
            mode="icon"
            learningData={currentCardData.displayData[DEFAULT_LANGUAGE]!}
            senseInfo={currentCardData.senseInfo}
            visual={currentCardData.visual}
            persona={DefaultCardPersona}
            isActive={false}
        />
    );
};
