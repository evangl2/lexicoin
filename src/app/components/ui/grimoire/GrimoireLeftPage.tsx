/**
 * GrimoireLeftPage.tsx
 * 
 * 职责：渲染魔典左页（叙事与引导）。
 * 纯渲染组件，无 Hook。
 */

import React from 'react';
import { BookOpen, Languages, Scroll } from 'lucide-react';
import { GrimoireEntity } from '@/types/index';

interface GrimoireLeftPageProps {
    grimoire: GrimoireEntity;
    displayLang: 'learning' | 'system';
    onToggleLang: () => void;
}

export const GrimoireLeftPage: React.FC<GrimoireLeftPageProps> = React.memo(({
    grimoire,
    displayLang,
    onToggleLang
}) => {
    const t = (bilingual: { learning: string; system: string }) => bilingual[displayLang];

    return (
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
                    {/* Language Toggle */}
                    <button
                        onClick={onToggleLang}
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
    );
});

GrimoireLeftPage.displayName = 'GrimoireLeftPage';
