import React from 'react';
import { GrimoirePersonaBundle } from './Grimoire.persona.base';

export const GardenerGrimoirePersona: GrimoirePersonaBundle = {
    identity: {
        id: 'GARDENER',
        name: 'The Gardener',
        theme: 'Botanical / Pressed Flowers',
    },
    
    tokens: {
        colors: {
            coverBase: 'bg-[#2e7d32]',
            coverBorder: 'border-green-900/40',
            spineBase: 'bg-green-900/60',
            spineLines: 'bg-green-100/10',
            
            status: {
                'SUMMONING':      'border-green-300 bg-green-50/50',
                'ACTIVE':         'border-teal-400 bg-teal-50/50',
                'EVALUATING':     'border-lime-400 bg-lime-50/50',
                'NEEDS_REVISION': 'border-brown-400 bg-orange-50/50',
                'RESOLVED':       'border-emerald-500 bg-emerald-50/50',
                'ARCHIVED':       'border-zinc-300 bg-zinc-100',
                'EXPIRED':        'border-red-400 bg-red-100'
            },
            
            pageBg: 'bg-[#f1f8e9]',
            pageBorder: 'border-green-800/10',
            textPrimary: 'text-[#1b5e20]',
            textSecondary: 'text-[#4caf50]/80',
            textAccent: 'text-[#2e7d32]',
            
            slotBg: 'bg-green-800/5',
            slotBorder: 'border-green-800/10',
            slotActive: 'bg-green-800/10 border-green-800/40',
            
            stampS: 'text-emerald-700 border-emerald-600',
            stampA: 'text-green-700 border-green-600',
            stampB: 'text-lime-700 border-lime-600',
            stampC: 'text-yellow-700 border-yellow-600',
            stampD: 'text-brown-700 border-brown-600',
            stampF: 'text-red-700 border-red-600',
        },
        
        shadows: {
            book: 'shadow-[15px_15px_30px_rgba(27,94,32,0.2)]',
            overlay: 'shadow-2xl shadow-green-900/20',
            stamp: 'shadow-none',
        },
        
        typography: {
            titleFamily: "'Outfit', sans-serif",
            bodyFamily: "'Lora', serif",
            handwritingFamily: "'Caveat', cursive",
        }
    },
    
    visuals: {
        CoverDecoration: () => (
            <div className="absolute inset-0 opacity-10 pointer-events-none p-6">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-current text-green-100">
                    <path d="M50 10 C60 40 90 50 50 90 C10 50 40 40 50 10" fill="none" strokeWidth="1" />
                    <path d="M50 30 L50 90" strokeWidth="0.5" strokeDasharray="2 2" />
                </svg>
            </div>
        ),
        
        PageTexture: () => (
            <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/linen.png')]" />
        ),
        
        Divider: () => (
            <div className="relative flex items-center justify-center w-full my-6 opacity-30">
                <div className="h-[1px] w-full bg-green-800" />
                <div className="absolute px-4 bg-[#f1f8e9] text-green-800 text-xs">🌿</div>
            </div>
        ),
        
        NarrativeVisuals: () => (
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-900/5 rotate-12 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-green-800/10">
                    <path d="M10 50 Q50 0 90 50 Q50 100 10 50" />
                </svg>
            </div>
        )
    }
};
