/**
 * GrimoireLeftPage.tsx
 * 
 * 职责：渲染魔典左页（叙事内容）。
 * 纯渲染组件，接收 persona 传参。
 */

import React from 'react';
import { motion } from 'motion/react';
import { GrimoireEntity } from '@/types/index';
import { GrimoirePersonaBundle } from '@/app/components/persona/grimoire/Grimoire.persona.base';

interface GrimoireLeftPageProps {
    grimoire: GrimoireEntity;
    displayLang: 'learning' | 'system';
    persona: GrimoirePersonaBundle;
}

export const GrimoireLeftPage: React.FC<GrimoireLeftPageProps> = React.memo(({
    grimoire,
    displayLang,
    persona
}) => {
    const { tokens, visuals } = persona;

    return (
        <div className={`flex-1 h-full ${tokens.colors.pageBg} relative overflow-hidden flex flex-col p-16 border-r ${tokens.colors.pageBorder}`}>
            {/* Persona Specific Narrative Visuals */}
            <visuals.NarrativeVisuals />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header: Grimoire Title */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <span className={`text-[10px] font-bold tracking-[0.4em] uppercase ${tokens.colors.textSecondary} mb-2 block`} style={{ fontFamily: tokens.typography.titleFamily }}>
                        {grimoire.grimoireType} Template
                    </span>
                    <h1 className={`text-4xl font-serif font-black ${tokens.colors.textPrimary} leading-tight mb-4`} style={{ fontFamily: tokens.typography.titleFamily }}>
                        {grimoire.theme.title[displayLang]}
                    </h1>
                    <div className={`h-1 w-20 ${tokens.colors.textAccent} opacity-40`} />
                </motion.div>

                {/* Body: Instructions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12 flex-1"
                >
                    <p className={`text-lg font-serif italic ${tokens.colors.textSecondary} leading-relaxed max-w-md`} style={{ fontFamily: tokens.typography.bodyFamily }}>
                        "{grimoire.theme.description[displayLang]}"
                    </p>

                    <div className="mt-12 p-8 rounded-2xl bg-black/5 border border-black/5 relative">
                        <span className={`absolute -top-3 left-6 px-3 ${tokens.colors.pageBg} text-[10px] font-bold uppercase tracking-widest ${tokens.colors.textSecondary}`} style={{ fontFamily: tokens.typography.titleFamily }}>
                            Master's Instruction
                        </span>
                        <p className={`text-xl font-serif ${tokens.colors.textPrimary} leading-relaxed`} style={{ fontFamily: tokens.typography.bodyFamily }}>
                            {grimoire.explicitInstruction[displayLang]}
                        </p>
                    </div>
                </motion.div>

                {/* Footer: Metadata */}
                <div className="mt-auto flex items-center gap-6 opacity-40">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-tighter">Difficulty</span>
                        <span className="text-sm font-bold">{grimoire.targetLevel}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-black/10" />
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-tighter">Seed Essence</span>
                        <span className="text-sm font-bold">{grimoire.seedWord}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

GrimoireLeftPage.displayName = 'GrimoireLeftPage';
