/**
 * GrimoireOverlay.tsx
 * 
 * 职责：全屏沉浸式魔典评判界面。
 * 1. 实物化古籍风格（Manuscript）。
 * 2. 左页：叙事背景与角色引导。
 * 3. 右页：交互槽位放置。
 * 4. 提交动作与评语展示。
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Send, Loader2, Scroll, Archive, Languages } from 'lucide-react';
import { useGrimoireInteraction } from '@/app/hooks/useGrimoireInteraction';
import { useGameStore } from '@/core/store';
import { GrimoireSlotVisual } from './GrimoireSlotVisual';
import { Award, Star } from 'lucide-react';

export const GrimoireOverlay: React.FC = () => {
    const {
        grimoire,
        submitting,
        error,
        handleUpdateSlot,
        submit,
        close
    } = useGrimoireInteraction();
    const archiveGrimoire = useGameStore(s => s.archiveGrimoire);

    // §6.4: Language toggle — 'learning' = immersive, 'system' = native comprehension check
    const [displayLang, setDisplayLang] = useState<'learning' | 'system'>('learning');

    if (!grimoire) return null;

    const grimoireStatus = grimoire.status;
    const isFailing = grimoireStatus === 'NEEDS_REVISION';
    const isEvaluating = grimoireStatus === 'EVALUATING';

    const t = (bilingual: { learning: string; system: string }) => bilingual[displayLang];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-8"
            >
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={close} />

                {/* The Physical Book / Manuscript */}
                <motion.div
                    initial={{ scale: 0.9, y: 20, rotateX: 10 }}
                    transition={{ type: "spring", damping: 20, stiffness: 150 }}
                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                    className="relative w-full max-w-5xl aspect-[1.4/1] bg-[#2a241e] rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex border border-[#4a3e35]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left Page (Parchment) */}
                    <div className="flex-1 h-full bg-[#fdf2d5] relative overflow-hidden flex flex-col p-12 border-r border-black/10">
                        {/* Parchment Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
                        <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(139,69,19,0.1)] pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="text-[#5d4037]" size={20} />
                                    <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#8d6e63]">Grimoire Objective</span>
                                </div>
                                {/* §6.4 Language Toggle */}
                                <button
                                    onClick={() => setDisplayLang(l => l === 'learning' ? 'system' : 'learning')}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#5d4037]/20 bg-[#5d4037]/5 hover:bg-[#5d4037]/10 transition-all group"
                                    title="Toggle display language"
                                >
                                    <Languages size={12} className="text-[#8d6e63]" />
                                    <span className="text-[9px] font-bold tracking-widest uppercase text-[#8d6e63]">
                                        {displayLang === 'learning' ? 'Learning' : 'Native'}
                                    </span>
                                </button>
                            </div>

                            <h1 className="text-3xl font-serif font-black text-[#2d1b0d] mb-4 leading-tight">
                                {t(grimoire.theme.title)}
                            </h1>

                            <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#8d6e63]/20">
                                {/* personaQuest: unified scene + voice from the Persona */}
                                <p className="text-[#5d4037] font-serif italic text-lg leading-relaxed mb-8 indent-8 first-letter:text-5xl first-letter:font-black first-letter:mr-1 first-letter:float-left first-letter:leading-[0.8]">
                                    {t(grimoire.theme.description)}
                                </p>

                                <div className="p-4 rounded-lg bg-[#5d4037]/5 border border-[#5d4037]/10 flex gap-3">
                                    <Scroll className="text-[#3e2723]/40 flex-shrink-0" size={18} />
                                    <div>
                                        <div className="text-[9px] uppercase tracking-widest text-[#8d6e63] font-bold mb-1">Ritual Requirement</div>
                                        <div className="text-sm text-[#3e2723] font-bold leading-snug">
                                            {t(grimoire.explicitInstruction)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-[#8d6e63]/20 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#5d4037]/10 border border-[#5d4037]/20 flex items-center justify-center">
                                    <span className="text-[#5d4037] font-bold text-lg">{grimoire.personaId[0]}</span>
                                </div>
                                <div>
                                    <div className="text-[9px] uppercase tracking-widest text-[#8d6e63] font-bold">Author Persona</div>
                                    <div className="text-sm text-[#3e2723] font-serif italic">{grimoire.personaId}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Page (Interaction) */}
                    <div className="flex-1 h-full bg-[#faedd0] relative overflow-hidden flex flex-col p-12">
                         {/* Parchment Texture Overlay */}
                         <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
                         <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(139,69,19,0.05)] pointer-events-none" />

                         <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#8d6e63]">Sacred Slots</span>
                                <div className="flex gap-1">
                                    {grimoire.slots.map((s, i) => (
                                        <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${s.senseId ? 'bg-emerald-500' : 'bg-[#8d6e63]/20'}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
                                {grimoire.slots.map((slot, i) => (
                                    <GrimoireSlotVisual
                                        key={slot.id}
                                        slot={slot}
                                        onDrop={handleUpdateSlot}
                                        isEvaluating={isEvaluating}
                                        showGrade={slot.grade !== null}
                                        displayLang={displayLang}
                                        personaId={grimoire.personaId}
                                    />
                                ))}
                            </div>

                            {/* Final Grade Stamp - 仅在全部揭晓后显示 */}
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
                                            onClick={() => { archiveGrimoire(grimoire!.id); close(); }}
                                            className="flex items-center gap-2 px-8 py-3 rounded-full font-serif italic font-bold shadow-xl transition-all bg-amber-700 text-white hover:bg-amber-800 shadow-amber-900/20"
                                        >
                                            <Archive size={20} />
                                            Archive to Library
                                        </motion.button>
                                    ) : (
                                        <button 
                                            onClick={submit}
                                            disabled={grimoire.slots.some(s => !s.senseId) || isEvaluating}
                                            className={`
                                                flex items-center gap-2 px-8 py-3 rounded-full font-serif italic font-bold shadow-xl transition-all
                                                ${grimoire.slots.every(s => s.senseId) && !isEvaluating
                                                    ? 'bg-[#3e2723] text-[#fdf2d5] hover:bg-[#2d1d1a]' 
                                                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'}
                                            `}
                                        >
                                            {isEvaluating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                            {isEvaluating ? (isFailing ? 'Rejudging...' : 'Judging...') : (isFailing ? 'Resubmit Ritual' : 'Seal Ritual')}
                                        </button>
                                    )}
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* Close Button */}
                    <button 
                        onClick={close}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors z-20"
                    >
                        <X size={20} className="text-[#3e2723]" />
                    </button>
                </motion.div>
            </motion.div>

        </AnimatePresence>
    );
};
