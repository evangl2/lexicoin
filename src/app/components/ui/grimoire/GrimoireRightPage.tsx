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
import { GrimoirePersonaBundle } from '@/app/components/persona/grimoire/Grimoire.persona.base';

interface GrimoireRightPageProps {
    grimoire: GrimoireEntity;
    displayLang: 'learning' | 'system';
    isEvaluating: boolean;
    isFailing: boolean;
    submitting: boolean;
    onSubmit: () => void;
    onArchive: () => void;
    persona: GrimoirePersonaBundle;
}

export const GrimoireRightPage: React.FC<GrimoireRightPageProps> = React.memo(({
    grimoire,
    displayLang,
    isEvaluating,
    isFailing,
    submitting,
    onSubmit,
    onArchive,
    persona
}) => {
    const { tokens, visuals } = persona;
    const grimoireStatus = grimoire.status;

    return (
        <div className={`flex-1 h-full ${tokens.colors.pageBg} relative overflow-hidden flex flex-col p-12`}>
            {/* Background Texture Overlay (Handled by PageTexture in parent, but can add specifics here) */}

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <span className={`text-[10px] font-bold tracking-[0.3em] uppercase ${tokens.colors.textSecondary}`} style={{ fontFamily: tokens.typography.titleFamily }}>
                        Sacred Slots
                    </span>
                    <div className="flex gap-1">
                        {grimoire.slots.map((s) => (
                            <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${s.senseId ? tokens.colors.textAccent : tokens.colors.textSecondary + ' opacity-20'}`} />
                        ))}
                    </div>
                </div>

                {/* Persona Divider */}
                <visuals.Divider />

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
                                <Award className={`${tokens.colors.textAccent} opacity-10 w-48 h-48`} />
                                <div className={`absolute inset-0 flex flex-col items-center justify-center border-4 ${tokens.colors.stampS} rounded-full scale-75 rotate-12`}>
                                    <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-60">Final Rating</span>
                                    <span className={`text-6xl font-serif font-black italic`} style={{ fontFamily: tokens.typography.titleFamily }}>
                                        {grimoire.finalGrade}
                                    </span>
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(3)].map((_, i) => <Star key={i} size={10} className={`fill-current text-current opacity-40`} />)}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions / Footer */}
                <div className={`mt-8 pt-6 border-t ${tokens.colors.pageBorder} flex justify-between items-center`}>
                    <div className={`text-[10px] ${tokens.colors.textSecondary} opacity-60 font-mono italic`}>
                        {grimoireStatus === 'RESOLVED' ? 'Ritual completed. Archive to Library.' : 'Assemble the senses to fulfill the persona\'s logic.'}
                    </div>

                    <div className="flex gap-4">
                        {grimoireStatus === 'RESOLVED' ? (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onArchive}
                                className={`flex items-center gap-2 px-8 py-3 rounded-full font-serif italic font-bold shadow-xl transition-all ${tokens.colors.coverBase} text-white hover:brightness-110 shadow-amber-900/20`}
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
                                        ? `${tokens.colors.textPrimary} bg-white border border-current hover:bg-zinc-50` 
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
