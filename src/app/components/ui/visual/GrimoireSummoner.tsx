import React, { useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { useDrop } from 'react-dnd';
import { useDrag } from '@use-gesture/react';
import { X, Wand2, Loader2, Sparkles } from 'lucide-react';
import { DeviceState } from '@/types/DeviceEntity';
import { CompactCardVisual } from '../card/CompactCardVisual';
import { DefaultCardPersona } from '../../persona/default/Card.persona.default';
import { DEFAULT_LANGUAGE } from '@/types/CardEntity';
import { useGameStore } from '@store/index';
import { Language, GrimoireEntity, GrimoireStatus } from '@/types/index';
import { useGrimoireSummoning } from '@/app/hooks/useGrimoireSummoning';
import { nanoid } from 'nanoid';

interface GrimoireSummonerProps {
    uid: string;
    x: MotionValue<number>;
    y: MotionValue<number>;
    state: DeviceState;
    updateState: (uid: string, newState: Partial<DeviceState>) => void;
    inputCards: any[]; // All cards in the world
    canvasScale: MotionValue<number>;
    onDragEnd: (uid: string) => void;
    onCardEnter?: (cardUid: string) => void;
    onCardEject?: (cardUid: string) => void;
    mergedVariants?: Record<string, any[]>;
    onDropIntoRepository?: (uid: string) => void;
    onSummonComplete?: () => void; // Phase 3 trigger
}

export const GrimoireSummoner: React.FC<GrimoireSummonerProps> = ({
    uid, x, y, state, updateState, inputCards, canvasScale, onDragEnd,
    onCardEnter, onCardEject, mergedVariants = {}, onDropIntoRepository
}) => {
    const stamina = useGameStore(s => s.player.stamina);
    const consumeStamina = useGameStore(s => s.consumeStamina);
    const spawnGrimoire = useGameStore(s => s.spawnGrimoire);
    const activePersona = useGameStore(s => s.activePersona);
    const { summon, isSummoning, error: apiError } = useGrimoireSummoning();
    
    // Drop Target for Seed Card
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'CARD',
        drop: (item: { uid: string }) => {
            if (state.seed_uid || state.status !== 'IDLE' || isSummoning) return;
            updateState(uid, { seed_uid: item.uid });
            onCardEnter?.(item.uid);
        },
        collect: monitor => ({ isOver: monitor.isOver() })
    }), [state.seed_uid, state.status, uid, updateState, onCardEnter]);

    // Drag Logic
    const summonerRef = React.useRef<HTMLDivElement | null>(null);
    const dragConfig = React.useMemo(() => ({
        target: summonerRef,
        pointer: { keys: false },
        eventOptions: { passive: false }
    }), [summonerRef]);

    useDrag(({ active, delta: [dx, dy], xy: [px, py], last }) => {
        if (isSummoning) return;
        if (active) {
            const scale = canvasScale.get() || 1;
            x.set(x.get() + dx / scale);
            y.set(y.get() + dy / scale);
        }
        if (last) {
            onDragEnd(uid);
            const elements = document.elementsFromPoint(px, py);
            const repoElement = elements.find(el => el.id === 'deck-repository-drop-zone');
            if (repoElement && onDropIntoRepository) {
                onDropIntoRepository(uid);
            }
        }
    }, dragConfig);

    const setRefs = React.useCallback((node: HTMLDivElement | null) => {
        summonerRef.current = node;
    }, []);

    // Logic
    const seedCard = inputCards.find(c => c.cardData.rawSense.uid === state.seed_uid);
    const canSummon = !!seedCard && state.status === 'IDLE' && stamina >= 60 && !isSummoning;

    const handleSummon = async () => {
        if (!canSummon || !seedCard) return;
        
        updateState(uid, { status: 'GENERATING' });
        
        await summon(seedCard.cardData.rawSense, {
            x: x.get(),
            y: y.get() + 200
        });

        updateState(uid, { status: 'IDLE' });
    };

    const handleEject = () => {
        if (state.status !== 'IDLE' || !state.seed_uid) return;
        const target = state.seed_uid;
        updateState(uid, { seed_uid: null });
        onCardEject?.(target);
    };

    const currentStatus = (state.status as 'IDLE' | 'GENERATING' | 'READY') || 'IDLE';
    const isActuallySummoning = isSummoning || currentStatus === 'GENERATING';

    const statusColors = {
        IDLE: 'border-blue-500/50 bg-blue-500/5',
        GENERATING: 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.2)]',
        READY: 'border-emerald-500/50 bg-emerald-500/5'
    };

    return (
        <motion.div
            ref={setRefs}
            style={{
                x, y,
                zIndex: isActuallySummoning ? 100 : 0,
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -150, // width 300 / 2
                marginTop: -150,  // height 300 / 2
                touchAction: 'none'
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="canvas-card absolute rounded-full pointer-events-auto"
        >
            <div className={`w-[300px] h-[300px] rounded-full border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center backdrop-blur-md ${statusColors[currentStatus]}`}>
                
                {/* Seed Slot */}
                <div 
                    ref={drop}
                    className={`
                        w-24 h-24 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center relative group
                        ${seedCard ? 'border-transparent' : 'border-white/10 bg-black/40'}
                        ${isOver && !seedCard ? 'border-blue-400 bg-blue-400/10' : ''}
                        ${isActuallySummoning ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}
                    `}
                >
                    {seedCard ? (
                        <>
                            <SlottedCard card={seedCard} variants={mergedVariants[seedCard.cardData.uid] || []} />
                            {!isActuallySummoning && currentStatus === 'IDLE' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEject(); }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-white/20 flex flex-col items-center gap-1">
                            <Sparkles size={20} />
                            <span className="text-[8px] uppercase tracking-tighter">Seed Slot</span>
                        </div>
                    )}
                </div>

                {/* Status HUD */}
                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                         <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isActuallySummoning ? 'text-amber-400 animate-pulse' : 'text-white/40'}`}>
                            {isActuallySummoning ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={10} className="animate-spin" />
                                    Resonating...
                                </span>
                            ) : apiError ? (
                                <span className="text-red-400">{apiError}</span>
                            ) : currentStatus}
                        </span>
                    </div>

                    <button
                        onClick={handleSummon}
                        disabled={!canSummon}
                        className={`
                            px-6 py-2 rounded-full border flex items-center gap-2 transition-all text-xs font-bold
                            ${canSummon 
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95' 
                                : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}
                        `}
                    >
                        {isActuallySummoning ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Wand2 size={16} />
                        )}
                        SUMMON (60)
                    </button>
                </div>

                {/* Background Decorations */}
                {isActuallySummoning && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-[spin_4s_linear_infinite] pointer-events-none" 
                    />
                )}
                <div className={`absolute inset-0 rounded-full border border-white/5 pointer-events-none -z-10 ${isActuallySummoning ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            </div>
        </motion.div>
    );
};

// Helper Slotted Card Component
const SlottedCard: React.FC<{ card: any, variants: any[] }> = ({ card, variants }) => {
    return (
        <CompactCardVisual
            mode="icon"
            learningData={card.cardData.displayData[DEFAULT_LANGUAGE]!}
            senseInfo={card.cardData.senseInfo}
            visual={card.cardData.visual}
            persona={DefaultCardPersona}
            isActive={false}
        />
    );
};
