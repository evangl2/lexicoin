/**
 * GrimoireSlotVisual.tsx
 * 
 * 职责：纯渲染魔典槽位外观。
 * 支持：Persona 皮肤系统。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageCircle, AlertCircle, CheckCircle2, Lock, MinusCircle } from 'lucide-react';
import { GrimoireSlot, Sense } from '@/types/index';
import { getGrimoirePersona } from '@/app/components/persona/grimoire';
import { CompactCardVisual } from '@/app/components/ui/card/CompactCardVisual';
import { DefaultCardPersona } from '@/app/components/persona/default';

interface GrimoireSlotVisualProps {
    // 1. 数据层
    slot: GrimoireSlot;
    sense: Sense | null;
    label: string;
    displayLang: 'learning' | 'system';
    activeLangCode: string;
    secondaryLangCode: string;
    personaId: any; // PersonaType

    // 2. 状态层
    isActive: boolean;
    isDragging: boolean;
    isEvaluating: boolean;
    showGrade: boolean;

    // 3. Motion / Ref 层
    dropRef?: React.Ref<HTMLDivElement>;
    dragRef?: React.Ref<HTMLDivElement>;

    // 4. 事件层
    onRemove?: () => void;
}

export const GrimoireSlotVisual: React.FC<GrimoireSlotVisualProps> = React.memo(({
    slot,
    sense,
    label,
    displayLang,
    activeLangCode,
    secondaryLangCode,
    personaId,
    isActive,
    isDragging,
    isEvaluating,
    showGrade,
    dropRef,
    dragRef,
    onRemove
}) => {
    const persona = getGrimoirePersona(personaId);
    const { tokens } = persona;
    const isF = slot.grade === 'F';
    
    // Select grade color token
    const gradeTokenKey = `stamp${(slot.grade?.charAt(0) || 'D')}` as keyof typeof tokens.colors;
    const gradeColorClass = (tokens.colors[gradeTokenKey] as string) || tokens.colors.stampD;

    return (
        <div 
            ref={dropRef}
            className={`
                relative w-full p-4 rounded-xl border-2 transition-all duration-300
                grimoire-slot group
                ${isActive ? tokens.colors.slotActive : `${tokens.colors.slotBg} ${tokens.colors.slotBorder}`}
                ${isDragging ? 'opacity-40 grayscale' : ''}
                [&.is-drag-over]:bg-[#5d4037]/20 [&.is-drag-over]:border-[#5d4037]/60 [&.is-drag-over]:scale-[1.02]
            `}
            data-slot-id={slot.id}
        >
            <div className="flex items-center gap-4">
                {/* Slot Icon / Status / Card Preview */}
                <div 
                    ref={dragRef}
                    className={`
                        relative w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-all overflow-hidden
                        ${slot.senseId 
                            ? (isF ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5 shadow-inner')
                            : 'border-dashed border-current opacity-20'
                        }
                        ${slot.senseId && !isEvaluating ? 'cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95' : ''}
                    `}
                >
                    {isEvaluating ? (
                        <div className={`w-6 h-6 rounded-full border-2 border-t-transparent animate-spin ${tokens.colors.textSecondary}`} />
                    ) : sense ? (
                        /* Use CompactCardVisual for "icon compact" mode */
                        <div className="absolute inset-0 pointer-events-none">
                            <CompactCardVisual 
                                mode="icon"
                                learningData={{
                                    word: (sense.word as any)[activeLangCode] || sense.word.en,
                                    level: sense.level,
                                    pos: (sense.partOfSpeech as any) || 'n.',
                                    definition: (sense.meaning as any)[activeLangCode] || sense.meaning.en,
                                    flavorContents: []
                                }}
                                senseInfo={{
                                    durability: sense.durability,
                                    ontology: 'OBJECT' as any, // Fallback
                                    frequency: 50,
                                    fingerprint: { items: [] },
                                    personas: []
                                }}
                                visual={{
                                    status: 'loaded',
                                    payload: sense.visual
                                }}
                            />
                        </div>
                    ) : (
                        <Sparkles className={tokens.colors.textSecondary} size={20} />
                    )}
                </div>

                {/* Slot Content Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${tokens.colors.textSecondary}`} style={{ fontFamily: tokens.typography.titleFamily }}>
                            Slot {label}
                        </span>
                        {slot.locked && <Lock size={10} className="opacity-40" />}
                    </div>
                    
                    {sense ? (
                        <div className="mt-0.5 flex items-center justify-between">
                            <span className={`text-lg font-serif font-bold ${tokens.colors.textPrimary}`} style={{ fontFamily: tokens.typography.bodyFamily }}>
                                {(sense.word as any)[activeLangCode] || sense.word.en}
                            </span>
                            
                            {/* Remove button if not evaluating */}
                            {!isEvaluating && !slot.locked && (
                                <button 
                                    className={`
                                        p-1 rounded-full hover:bg-black/5 opacity-0 group-hover:opacity-40 transition-all
                                        ${tokens.colors.textAccent} hover:scale-110 active:scale-90
                                    `}
                                    title="Remove Essence"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove?.();
                                    }}
                                >
                                    <MinusCircle size={18} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={`text-sm italic opacity-60 font-serif ${tokens.colors.textSecondary}`} style={{ fontFamily: tokens.typography.bodyFamily }}>
                            Waiting for essence...
                        </div>
                    )}
                </div>

                {/* Grade Stamp */}
                <AnimatePresence>
                    {showGrade && slot.grade && (
                        <motion.div
                            initial={{ scale: 2, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: -12 }}
                            className={`px-3 py-1 border-2 rounded font-serif font-black italic ${gradeColorClass} ${tokens.shadows.stamp}`}
                            style={{ fontFamily: tokens.typography.titleFamily }}
                        >
                            {slot.grade}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Commentary / Result Tooltip */}
            <AnimatePresence>
                {slot.commentary && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`mt-4 p-3 rounded-lg bg-black/5 border ${tokens.colors.pageBorder} flex gap-3 relative`}
                    >
                        <MessageCircle className={`${tokens.colors.textSecondary} opacity-40 flex-shrink-0`} size={16} />
                        <div className="flex-1">
                            <div className={`text-[9px] uppercase tracking-widest ${tokens.colors.textSecondary} font-bold mb-1`} style={{ fontFamily: tokens.typography.titleFamily }}>
                                {persona.identity.name}'s Insight
                            </div>
                            <p className={`${tokens.colors.textPrimary} italic text-sm leading-relaxed`} style={{ fontFamily: tokens.typography.handwritingFamily }}>
                                {slot.commentary[displayLang]}
                            </p>
                        </div>
                        {/* Decorative tail */}
                        <div className={`absolute -top-2 left-6 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-black/5`} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Bar (Visual feedback for evaluation) */}
            {isEvaluating && (
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-black/5">
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className={`w-1/2 h-full opacity-30 ${tokens.colors.textAccent} bg-current`}
                    />
                </div>
            )}
        </div>
    );
});

GrimoireSlotVisual.displayName = 'GrimoireSlotVisual';
