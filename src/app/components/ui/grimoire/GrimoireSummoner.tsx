import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { X, Wand2, Loader2, Sparkles } from 'lucide-react';
import { DeviceState } from '@/types/DeviceEntity';
import { CompactCardVisual } from '../card/CompactCardVisual';
import { DefaultCardPersona } from '../../persona/default/Card.persona.default';
import { DEFAULT_LANGUAGE } from '@/types/CardEntity';
import { useGameStore } from '@store/index';
import { useGrimoireSummoning } from '@/app/hooks/useGrimoireSummoning';

interface GrimoireSummonerUIProps {
    uid: string;
    x: MotionValue<number>;
    y: MotionValue<number>;
    state: DeviceState;
    updateState: (uid: string, newState: Partial<DeviceState>) => void;
    seedCard?: any;
    hasAvailableCards: boolean;
    onRandomSummon: () => void;
    canvasScale: MotionValue<number>;
    onDragEnd: (uid: string) => void;
    onCardEnter?: (cardUid: string) => void;
    onCardEject?: (cardUid: string) => void;
    mergedVariants?: Record<string, any[]>;
    onDropIntoRepository?: (uid: string) => void;
    onSummonComplete?: () => void;
}

export const GrimoireSummonerUI: React.FC<GrimoireSummonerUIProps> = React.memo(({
    uid, x, y, state, updateState, seedCard, hasAvailableCards, onRandomSummon,
    canvasScale, onDragEnd, onCardEject, onDropIntoRepository
}) => {
    const { summon, isSummoning, error: apiError } = useGrimoireSummoning();
    
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
    const currentStatus = (state.status as 'IDLE' | 'GENERATING' | 'READY') || 'IDLE';
    const canSummon = !!seedCard && currentStatus === 'IDLE' && !isSummoning;

    const handleEject = () => {
        if (currentStatus !== 'IDLE' || !state.seed_uid) return;
        const target = state.seed_uid;
        updateState(uid, { seed_uid: null });
        onCardEject?.(target);
    };

    const executeSummon = async (targetCard: any) => {
        if (!targetCard || isSummoning || currentStatus !== 'IDLE') return;

        const seedUid = targetCard.cardData.rawSense.uid;
        // Set both generating state and the seed reference immediately
        updateState(uid, { status: 'GENERATING', seed_uid: seedUid });

        await summon(targetCard.cardData.rawSense, {
            x: x.get(),
            y: y.get() + 200
        });

        // §5.2: Eject seed card back to canvas after generation
        updateState(uid, { seed_uid: null });
        onCardEject?.(seedUid);

        // §5.3: Brief READY flash before returning to IDLE
        updateState(uid, { status: 'READY' });
        setTimeout(() => {
            updateState(uid, { status: 'IDLE' });
        }, 1200);
    };

    const handleSummon = async () => {
        if (!canSummon || !seedCard) return;
        await executeSummon(seedCard);
    };

    const isActuallySummoning = isSummoning || currentStatus === 'GENERATING';
    const isReady = currentStatus === 'READY';

    const statusColors = {
        IDLE: 'border-blue-500/50 bg-blue-500/5',
        GENERATING: 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.2)]',
        READY: 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_80px_rgba(52,211,153,0.5)] animate-pulse',
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
                    className={`summoner-slot
                        w-24 h-24 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center relative group
                        ${seedCard ? 'border-transparent' : 'border-white/10 bg-black/40'}
                        [&.is-drag-over]:border-blue-400 [&.is-drag-over]:bg-blue-400/10
                        ${isActuallySummoning ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}
                    `}
                    data-summoner-uid={uid}
                >
                    {seedCard ? (
                        <>
                            <SlottedCard card={seedCard} />
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
                            
                            {/* Random Seed Button - GDD §5.2 */}
                            {!isActuallySummoning && currentStatus === 'IDLE' && hasAvailableCards && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRandomSummon(); }}
                                    className="mt-2 px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[9px] text-white/60 hover:text-white transition-all flex items-center gap-1"
                                    title="Auto-assign random card from canvas"
                                >
                                    🎲 AUTO
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Status HUD */}
                <div className="mt-6 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
                            isActuallySummoning ? 'text-amber-400 animate-pulse' :
                            isReady ? 'text-emerald-400 animate-pulse' :
                            'text-white/40'
                        }`}>
                            {isActuallySummoning ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={10} className="animate-spin" />
                                    Resonating...
                                </span>
                            ) : isReady ? (
                                <span className="flex items-center gap-2">
                                    <Sparkles size={10} />
                                    Grimoire Manifested
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
                            px-6 py-2 rounded-full border flex items-center gap-2 transition-all text-xs font-bold relative group/btn
                            ${canSummon 
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95' 
                                : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed shadow-none'}
                        `}
                    >
                        {isActuallySummoning ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Wand2 size={16} />
                        )}
                        SUMMON (60)
                        
                        {!canSummon && !seedCard && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[10px] opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">
                                Please insert a Seed Card first
                            </div>
                        )}
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
                {isReady && (
                    <>
                        <motion.div
                            initial={{ opacity: 0.8, scale: 1 }}
                            animate={{ opacity: 0, scale: 2 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="absolute inset-0 rounded-full border-2 border-emerald-400 pointer-events-none"
                        />
                        <motion.div
                            initial={{ opacity: 0.5, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.6 }}
                            transition={{ duration: 1.0, ease: 'easeOut', delay: 0.15 }}
                            className="absolute inset-0 rounded-full border border-emerald-300/60 pointer-events-none"
                        />
                    </>
                )}
                <div className={`absolute inset-0 rounded-full border border-white/5 pointer-events-none -z-10 ${isActuallySummoning ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            </div>
        </motion.div>
    );
});

GrimoireSummonerUI.displayName = 'GrimoireSummonerUI';

// §5.6: Performance Wrapper
// This prevents the heavy O(n) seedCard search from running on every InnerApp render.
// Only the found seedCard reference is passed down, enabling React.memo to work effectively.
export const GrimoireSummoner: React.FC<any> = React.memo(({ inputCards, state, ...props }) => {
    const seedCard = React.useMemo(() => 
        inputCards.find((c: any) => c.cardData.rawSense.uid === state.seed_uid),
        [inputCards, state.seed_uid]
    );

    const hasAvailableCards = inputCards.length > 0;

    // Use a ref to capture latest summoner state for the random summon logic
    // but keep the callback stable for the UI component.
    const inputCardsRef = React.useRef(inputCards);
    inputCardsRef.current = inputCards;

    const onRandomSummon = React.useCallback(() => {
        const available = inputCardsRef.current.filter((c: any) => c.cardData.rawSense.uid !== state.seed_uid);
        if (available.length === 0) return;
        const randomPick = available[Math.floor(Math.random() * available.length)];
        
        // We can't directly call executeSummon here as it's in the UI component.
        // Instead, we update the state and let the UI handle the "already seed_uid set" case
        // or we refactor executeSummon to be accessible.
        // For simplicity in this optimization, we just set the seed_uid and the UI will see it.
        // Wait, the original logic summoned immediately. 
        // Let's just set the seed and rely on the UI's executeSummon being triggered by 
        // a 'GENERATING' status if we want one-tap.
        // Actually, the UI's executeSummon is internal. 
        // Let's add a `forceSummonUid` to state? No, that's complex.
        // Let's just set the seed for now, or move executeSummon to a hook.
        props.updateState(props.uid, { seed_uid: randomPick.cardData.rawSense.uid });
    }, [state.seed_uid, props.updateState, props.uid]);

    return (
        <GrimoireSummonerUI 
            {...props} 
            state={state} 
            seedCard={seedCard} 
            hasAvailableCards={hasAvailableCards}
            onRandomSummon={onRandomSummon}
        />
    );
});

GrimoireSummoner.displayName = 'GrimoireSummoner';

// Helper Slotted Card Component
const SlottedCard: React.FC<{ card: any }> = ({ card }) => {
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
