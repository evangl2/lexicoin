/**
 * GrimoireRightPage.tsx
 * 
 * 职责：渲染魔典右页（交互与动作）。
 * 纯渲染组件，渲染 GrimoireSlot 列表。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Star, Archive, Send, Loader2 } from 'lucide-react';
import { GrimoireEntity } from '@/types/index';
import { GrimoireSlot } from './GrimoireSlot';

interface GrimoireRightPageProps {
    grimoire: GrimoireEntity;
    displayLang: 'learning' | 'system';
    isEvaluating: boolean;
    isFailing: boolean;
    submitting: boolean;
    onSubmit: () => void;
    onArchive: () => void;
}

export const GrimoireRightPage: React.FC<GrimoireRightPageProps> = React.memo(({
    grimoire,
    displayLang,
    isEvaluating,
    isFailing,
    submitting,
    onSubmit,
    onArchive
}) => {
    const grimoireStatus = grimoire.status;

    return (
        <div className="flex-1 h-full bg-[#faedd0] relative overflow-hidden flex flex-col p-12">
            {/* Parchment Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(139,69,19,0.05)] pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#8d6e63]">Sacred Slots</span>
                    <div className="flex gap-1">
                        {grimoire.slots.map((s) => (
                            <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${s.senseId ? 'bg-emerald-500' : 'bg-[#8d6e63]/20'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
                    {grimoire.slots.map((slot, index) => (
                        <GrimoireSlot
                            key={slot.id}
                            slot={slot}
                            index={index}
                            grimoireId={grimoire.id}
                            isEvaluating={isEvaluating}
                            showGrade={slot.grade !== null}
                            displayLang={displayLang}
                            personaId={grimoire.personaId}
                        />
                    ))}
                </div>

                {/* Final Grade Stamp - Only show when RESOLVED */}
                <AnimatePresence>
                    {grimoireStatus === 'RESOLVED' && grimoire.finalGrade && (
                        <motion.div
                            initial={{ scale: 2, opacity: 0, rotate: -20 }}
                            animate={{ scale: 1, opacity: 1, rotate: -12 }}
                            className="absolute bottom-32 right-12 pointer-events-none"
                        >
                            <div className="relative flex items-center justify-center">
                                <Award className="text-red-600/20 w-48 h-48" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-red-600/40 rounded-full scale-75 rotate-12">
                                    <span className="text-[10px] font-bold tracking-[0.4em] text-red-600/60 uppercase">Final Rating</span>
                                    <span className="text-6xl font-serif font-black text-red-600/80 italic">{grimoire.finalGrade}</span>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(3)].map((_, i) => <Star key={i} size={10} className="fill-red-600/40 text-transparent" />)}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions / Footer */}
                <div className="mt-8 pt-6 border-t border-[#3e2723]/10 flex justify-between items-center">
                    <div className="text-[10px] text-[#3e2723]/40 font-mono italic">
                        {grimoireStatus === 'RESOLVED' ? 'Ritual completed. Archive to Library.' : 'Assemble the senses to fulfill the persona\'s logic.'}
                    </div>

                    <div className="flex gap-4">
                        {grimoireStatus === 'RESOLVED' ? (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onArchive}
                                className="flex items-center gap-2 px-8 py-3 rounded-full font-serif italic font-bold shadow-xl transition-all bg-amber-700 text-white hover:bg-amber-800 shadow-amber-900/20"
                            >
                                <Archive size={20} />
                                Archive to Library
                            </motion.button>
                        ) : (
                            <button 
                                onClick={onSubmit}
                                disabled={grimoire.slots.some(s => !s.senseId) || isEvaluating || submitting}
                                className={`
                                    flex items-center gap-2 px-8 py-3 rounded-full font-serif italic font-bold shadow-xl transition-all
                                    ${grimoire.slots.every(s => s.senseId) && !isEvaluating && !submitting
                                        ? 'bg-[#3e2723] text-[#fdf2d5] hover:bg-[#2d1d1a]' 
                                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {submitting || isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                {submitting || isEvaluating ? (isFailing ? 'Rejudging...' : 'Judging...') : (isFailing ? 'Resubmit Ritual' : 'Seal Ritual')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

GrimoireRightPage.displayName = 'GrimoireRightPage';
