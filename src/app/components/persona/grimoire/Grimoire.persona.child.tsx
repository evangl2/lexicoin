import React from 'react';
import { GrimoirePersonaBundle } from './Grimoire.persona.base';

export const ChildGrimoirePersona: GrimoirePersonaBundle = {
    identity: {
        id: 'CHILD',
        name: 'The Child',
        theme: 'Whimsical / Scrapbook',
    },
    
    tokens: {
        colors: {
            coverBase: 'bg-[#ffecb3]',
            coverBorder: 'border-orange-200',
            spineBase: 'bg-orange-300/40',
            spineLines: 'bg-white/40',
            
            status: {
                'SUMMONING':      'border-blue-400/50 bg-blue-100/50',
                'ACTIVE':         'border-pink-400/50 bg-pink-100/50',
                'EVALUATING':     'border-purple-400/50 bg-purple-100/50',
                'NEEDS_REVISION': 'border-orange-400/50 bg-orange-100/50',
                'RESOLVED':       'border-green-400/50 bg-green-100/50',
                'ARCHIVED':       'border-zinc-300 bg-zinc-100',
                'EXPIRED':        'border-red-400 bg-red-100'
            },
            
            pageBg: 'bg-white',
            pageBorder: 'border-orange-100',
            textPrimary: 'text-orange-900',
            textSecondary: 'text-orange-600/70',
            textAccent: 'text-pink-500',
            
            slotBg: 'bg-orange-50',
            slotBorder: 'border-orange-200/50',
            slotActive: 'bg-orange-100 border-orange-400',
            
            stampS: 'text-yellow-500 border-yellow-400 font-bold',
            stampA: 'text-green-500 border-green-400',
            stampB: 'text-blue-500 border-blue-400',
            stampC: 'text-purple-500 border-purple-400',
            stampD: 'text-zinc-400 border-zinc-300',
            stampF: 'text-red-500 border-red-400',
        },
        
        shadows: {
            book: 'shadow-[10px_10px_0px_rgba(255,183,77,0.3)]',
            overlay: 'shadow-2xl shadow-orange-200/50',
            stamp: 'shadow-lg shadow-orange-100',
        },
        
        typography: {
            titleFamily: "'Short Stack', cursive, sans-serif",
            bodyFamily: "'Quicksand', sans-serif",
            handwritingFamily: "'Patrick Hand', cursive",
        }
    },
    
    visuals: {
        CoverDecoration: () => (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none p-4">
                <div className="w-full h-full border-4 border-dashed border-orange-400/30 rounded-lg flex items-center justify-center">
                    <span className="text-4xl text-orange-400">✨</span>
                </div>
            </div>
        ),
        
        PageTexture: () => (
            <div className="absolute inset-0 opacity-[0.4] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]" />
        ),
        
        Divider: () => (
            <div className="w-full h-1 border-b-2 border-dashed border-orange-200 my-6" />
        ),
        
        NarrativeVisuals: () => (
            <div className="absolute top-10 right-10 w-32 h-16 bg-blue-100/40 rounded-full blur-xl animate-pulse" />
        )
    }
};
