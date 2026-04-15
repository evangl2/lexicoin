/**
 * GrimoireSlotVisual.tsx
 *
 * 职责：显示魔典中的单个槽位。
 * 1. 作为 SENSE 卡片的放置目标。
 * 2. 显示已填充卡片的预览。
 * 3. 显示评级 (Grade) 和评语入口。
 *
 * Note: Slots have no labels — labels would reveal the answer.
 * The player reasons from the quest's explicitInstruction alone.
 */

import React from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, AlertCircle, MessageSquare } from 'lucide-react';
import { GrimoireSlot, Grade, UUID } from '@/types/index';
import { useGameStore } from '@/core/store';
import { CompactCardVisual } from '../card/CompactCardVisual';
import { DefaultCardPersona } from '../../persona/default/Card.persona.default';

interface GrimoireSlotVisualProps {
    slot: GrimoireSlot;
    onDrop: (slotId: UUID, senseId: UUID) => void;
    isEvaluating: boolean;
    showGrade?: boolean;
}

export const GrimoireSlotVisual: React.FC<GrimoireSlotVisualProps> = ({ slot, onDrop, isEvaluating, showGrade = false }) => {
    const senses = useGameStore(s => s.senses);
    const filledSense = senses.find(s => s.id === slot.senseId);
    const learningLang = useGameStore(s => s.player.settings.learningLang);

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'CARD',
        canDrop: () => !slot.locked && !isEvaluating,
        drop: (item: { uid: UUID }) => {
            onDrop(slot.id, item.uid);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [slot.locked, isEvaluating, onDrop]);

    // 等级颜色映射
    const gradeColors: Record<string, string> = {
        'S++': 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]',
        'S+': 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]',
        'S': 'text-yellow-200',
        'A': 'text-emerald-400',
        'B': 'text-blue-400',
        'C': 'text-purple-400',
        'D': 'text-zinc-400',
        'F': 'text-red-500 font-black animate-pulse'
    };

    return (
        <div 
            ref={drop}
            className={`
                relative w-full p-4 rounded-xl border-2 transition-all duration-300
                ${slot.locked ? 'bg-black/40 border-[#3e2723]/30 shadow-inner' : 'bg-[#5d4037]/5 border-[#3e2723]/10 hover:border-[#3e2723]/30'}
                ${isOver && canDrop ? 'bg-amber-500/10 border-amber-500/50 scale-[1.01]' : ''}
                flex items-center gap-4 group
            `}
        >
            {/* Slot Icon / Status */}
            <div className={`
                flex-shrink-0 w-12 h-12 rounded-lg border border-dashed flex items-center justify-center transition-colors
                ${filledSense ? 'border-amber-500/30 bg-black/60 shadow-lg' : 'border-[#3e2723]/20 bg-black/20'}
            `}>
                {filledSense ? (
                    <div className="scale-75">
                         <CompactCardVisual 
                            mode="icon" 
                            learningData={filledSense.word[learningLang] as any}
                            senseInfo={filledSense as any}
                            visual={filledSense.visual}
                            persona={DefaultCardPersona}
                            isActive={false}
                        />
                    </div>
                ) : (
                    <Sparkles className="text-[#3e2723]/20 group-hover:text-amber-500/40 transition-colors" size={20} />
                )}
            </div>

            {/* Content — no label, slot index conveyed by position */}
            <div className="flex-1 min-w-0">
                {filledSense ? (
                    <div className="text-sm text-[#3e2723] font-serif leading-tight font-medium truncate">
                        {filledSense.word[learningLang] as string}
                    </div>
                ) : (
                    <div className="text-sm text-[#8d6e63]/60 font-serif italic">
                        Place a Sense here…
                    </div>
                )}
            </div>

            {/* Grade / Evaluation */}
            <AnimatePresence>
                {slot.grade && showGrade && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 3, rotate: -15, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                        className="flex items-center gap-3 relative z-10"
                    >
                        <div className={`text-3xl font-serif tracking-tighter italic font-black ${gradeColors[slot.grade]}`}>
                            {slot.grade}
                        </div>
                        {slot.locked && <Check size={16} className="text-emerald-600 drop-shadow-sm" />}
                        {slot.grade === 'F' && <AlertCircle size={16} className="text-red-600 animate-bounce" />}
                        
                        {/* Glow Reveal Effect */}
                        <motion.div 
                            initial={{ opacity: 0.8, scale: 0 }}
                            animate={{ opacity: 0, scale: 4 }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 bg-white rounded-full blur-xl pointer-events-none"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Commentary Flag */}
            <AnimatePresence>
                {slot.commentary && showGrade && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="absolute -top-1 -right-1 group/comment"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#3e2723] border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl cursor-help hover:scale-110 transition-transform">
                            <MessageSquare size={14} />
                        </div>
                        
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#3e2723] text-[#fdf2d5] text-[11px] rounded-lg shadow-2xl opacity-0 group-hover/comment:opacity-100 transition-opacity pointer-events-none z-50 border border-amber-500/20 font-serif leading-relaxed">
                            <div className="flex flex-col gap-2">
                                <div className="text-amber-400/60 font-mono italic">"{slot.commentary.learning}"</div>
                                <div className="pt-2 border-t border-white/5 opacity-80">{slot.commentary.system}</div>
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full right-4 border-8 border-transparent border-top-[#3e2723]" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Lock Overlay */}
            {slot.locked && (
                <div className="absolute inset-0 bg-[#3e2723]/5 rounded-xl pointer-events-none" />
            )}
        </div>
    );
};
