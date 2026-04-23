/**
 * GrimoireSlotVisual.tsx
 * 
 * 职责：纯渲染魔典槽位外观。
 * 包含：空槽位提示、已填充卡片预览、评级印章、反馈气泡。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageCircle, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { GrimoireSlot } from '@/types/index';

interface GrimoireSlotVisualProps {
    // 1. 数据层
    slot: GrimoireSlot;
    label: string;
    displayLang: 'learning' | 'system';
    personaId: string;

    // 2. 状态层
    isActive: boolean;
    isEvaluating: boolean;
    showGrade: boolean;

    // 3. Motion / Ref 层
    dropRef?: React.Ref<HTMLDivElement>;
}

export const GrimoireSlotVisual: React.FC<GrimoireSlotVisualProps> = React.memo(({
    slot,
    label,
    displayLang,
    personaId,
    isActive,
    isEvaluating,
    showGrade,
    dropRef
}) => {
    const isF = slot.grade === 'F';

    return (
        <div 
            ref={dropRef}
            className={`
                relative w-full p-4 rounded-xl border-2 transition-all duration-300
                grimoire-slot
                ${isActive ? 'bg-[#5d4037]/10 border-[#5d4037]/40 shadow-lg' : 'bg-[#5d4037]/5 border-[#5d4037]/10'}
                [&.is-drag-over]:bg-[#5d4037]/20 [&.is-drag-over]:border-[#5d4037]/60 [&.is-drag-over]:scale-[1.02]
            `}
            data-slot-id={slot.id}
        >
            <div className="flex items-center gap-4">
                {/* Slot Icon / Status */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-all
                    ${slot.senseId 
                        ? (isF ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5')
                        : 'border-dashed border-[#5d4037]/20 bg-transparent'
                    }
                `}>
                    {isEvaluating ? (
                        <div className="w-5 h-5 rounded-full border-2 border-[#5d4037]/40 border-t-transparent animate-spin" />
                    ) : slot.senseId ? (
                        isF ? <AlertCircle className="text-red-500" size={20} /> : <CheckCircle2 className="text-emerald-500" size={20} />
                    ) : (
                        <Sparkles className="text-[#5d4037]/20" size={20} />
                    )}
                </div>

                {/* Slot Content Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#8d6e63]">
                            Slot {label}
                        </span>
                        {slot.locked && <Lock size={10} className="text-[#8d6e63]/40" />}
                    </div>
                    
                    {slot.senseId ? (
                        <div className="mt-0.5">
                            <span className="text-lg font-serif font-bold text-[#3e2723]">
                                {slot.senseId} {/* TODO: In Phase 2, pass Sense display name instead of ID */}
                            </span>
                        </div>
                    ) : (
                        <div className="text-sm italic text-[#8d6e63]/60 font-serif">
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
                            className={`px-3 py-1 border-2 rounded font-serif font-black italic
                                ${isF ? 'border-red-600/40 text-red-600/60' : 'border-emerald-600/40 text-emerald-600/60'}
                            `}
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
                        className="mt-4 p-3 rounded-lg bg-white/40 border border-[#5d4037]/10 flex gap-3 relative"
                    >
                        <MessageCircle className="text-[#8d6e63]/40 flex-shrink-0" size={16} />
                        <div className="flex-1">
                            <div className="text-[9px] uppercase tracking-widest text-[#8d6e63] font-bold mb-1">
                                {personaId}'s Insight
                            </div>
                            <p className="text-[#3e2723] font-serif italic text-sm leading-relaxed">
                                {slot.commentary[displayLang]}
                            </p>
                        </div>
                        {/* Decorative tail */}
                        <div className="absolute -top-2 left-6 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-white/40" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Bar (Visual feedback for evaluation) */}
            {isEvaluating && (
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl bg-[#5d4037]/5">
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-1/2 h-full bg-[#8d6e63]/30"
                    />
                </div>
            )}
        </div>
    );
});

GrimoireSlotVisual.displayName = 'GrimoireSlotVisual';
