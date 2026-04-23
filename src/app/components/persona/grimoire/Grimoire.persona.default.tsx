import React from 'react';
import { GrimoirePersonaBundle } from './Grimoire.persona.base';

export const DefaultGrimoirePersona: GrimoirePersonaBundle = {
    identity: {
        id: 'ALCHEMIST',
        name: 'The Alchemist',
        theme: 'Hermetic / Alchemy',
    },
    
    tokens: {
        colors: {
            coverBase: 'bg-[#3e2723]',
            coverBorder: 'border-amber-900/30',
            spineBase: 'bg-black/40',
            spineLines: 'bg-amber-500/10',
            
            status: {
                'SUMMONING':      'border-amber-500/50 bg-amber-500/20',
                'ACTIVE':         'border-cyan-500/50 bg-cyan-900/40',
                'EVALUATING':     'border-purple-500/50 bg-purple-900/40',
                'NEEDS_REVISION': 'border-orange-500/50 bg-orange-900/40',
                'RESOLVED':       'border-emerald-500/50 bg-emerald-900/40',
                'ARCHIVED':       'border-zinc-500/50 bg-zinc-900/40',
                'EXPIRED':        'border-red-500/50 bg-red-900/20'
            },
            
            pageBg: 'bg-[#faedd0]',
            pageBorder: 'border-[#3e2723]/10',
            textPrimary: 'text-[#3e2723]',
            textSecondary: 'text-[#8d6e63]',
            textAccent: 'text-amber-700',
            
            slotBg: 'bg-[#5d4037]/5',
            slotBorder: 'border-[#5d4037]/10',
            slotActive: 'bg-[#5d4037]/10 border-[#5d4037]/40',
            
            stampS: 'text-amber-600/60 border-amber-600/40',
            stampA: 'text-emerald-600/60 border-emerald-600/40',
            stampB: 'text-blue-600/60 border-blue-600/40',
            stampC: 'text-purple-600/60 border-purple-600/40',
            stampD: 'text-zinc-600/60 border-zinc-600/40',
            stampF: 'text-red-600/60 border-red-600/40',
        },
        
        shadows: {
            book: 'shadow-[20px_20px_40px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.5)]',
            overlay: 'shadow-2xl shadow-amber-900/20',
            stamp: 'shadow-none',
        },
        
        typography: {
            titleFamily: "'Cinzel', serif",
            bodyFamily: "'Merriweather', serif",
            handwritingFamily: "'Cinzel', serif",
        }
    },
    
    visuals: {
        CoverDecoration: ({ status }) => (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-current text-white">
                    <circle cx="50" cy="50" r="45" fill="none" strokeWidth="0.5" />
                    <path d="M50 5 L95 80 H5 Z" fill="none" strokeWidth="0.5" />
                    <circle cx="50" cy="50" r="10" fill="none" strokeWidth="0.5" />
                </svg>
            </div>
        ),
        
        PageTexture: () => (
            <>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]" />
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(139,69,19,0.05)] pointer-events-none" />
            </>
        ),
        
        Divider: () => (
            <div className="relative flex items-center justify-center w-full my-6 opacity-40">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#3e2723] to-transparent" />
                <div className="absolute w-2 h-2 rotate-45 border border-[#3e2723] bg-[#faedd0]" />
            </div>
        ),
        
        NarrativeVisuals: () => (
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-amber-900/5 blur-[100px] rounded-full pointer-events-none" />
        )
    }
};
