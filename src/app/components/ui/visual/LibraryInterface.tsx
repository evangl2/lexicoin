import React from 'react';
import { motion } from 'motion/react';
import { Book, Sparkles, ArrowLeft, Search } from 'lucide-react';
import { useGameStore } from '@/core/store';
import { DefaultInterfacePersona as InterfacePersona } from '@/app/components/persona/default/Interface.persona.default';
import { Grimoire } from './Grimoire'; // Re-use the Grimoire component
import { useEchoSystem } from '@/app/hooks/useEchoSystem';

export const LibraryInterface: React.FC = () => {
    const viewMode = useGameStore(s => s.viewMode);
    const setViewMode = useGameStore(s => s.setViewMode);
    const libraryGrimoires = useGameStore(s => s.libraryGrimoires);
    const player = useGameStore(s => s.player);
    
    const { extractEcho, isExtracting } = useEchoSystem();

    const handleBack = () => setViewMode('WORLD');

    if (viewMode !== 'LIBRARY') return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[10] flex flex-col bg-black overflow-hidden"
        >
            {/* 1. Background Visuals */}
            <InterfacePersona.visuals.BackgroundVisuals />
            <InterfacePersona.visuals.AlchemyGeometricOverlay />
            
            {/* 2. Header Area */}
            <header className="relative z-10 flex items-center justify-between px-12 py-8 border-b border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={handleBack}
                        className="p-3 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-all group"
                    >
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-serif tracking-[0.3em] font-bold text-[#D4AF37]"
                            style={{ fontFamily: InterfacePersona.tokens.typography.label.family }}>
                            SACRED ARCHIVES
                        </h1>
                        <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mt-1">
                            The repository of forgotten knowledge
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {/* Echo Charges Display */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] tracking-[0.2em] text-zinc-500 uppercase">Echo Potential</span>
                        <div className="flex gap-2">
                            {[...Array(3)].map((_, i) => (
                                <motion.div 
                                    key={i}
                                    animate={{ 
                                        scale: i < player.echoCharges ? [1, 1.2, 1] : 1,
                                        opacity: i < player.echoCharges ? 1 : 0.2
                                    }}
                                    transition={{ repeat: i < player.echoCharges ? Infinity : 0, duration: 2, delay: i * 0.3 }}
                                    className={`w-3 h-3 rounded-full border ${i < player.echoCharges ? 'bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_10px_#D4AF37]' : 'border-zinc-700'}`}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div className="w-[1px] h-10 bg-white/10" />
                    
                    <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-full px-4 py-2">
                        <Search size={14} className="text-zinc-500" />
                        <input 
                            placeholder="SEARCH GRIMOIRES..." 
                            className="bg-transparent border-none outline-none text-[10px] tracking-[0.2em] text-zinc-300 w-48 placeholder:text-zinc-700 font-serif"
                        />
                    </div>
                </div>
            </header>

            {/* 3. Main Shelf Area */}
            <main className="flex-1 relative z-10 overflow-y-auto px-20 py-16 custom-scrollbar">
                {libraryGrimoires.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                        <Book size={80} className="mb-4 text-zinc-500" />
                        <span className="text-xs tracking-[0.4em] uppercase font-serif">The shelves remain empty</span>
                        <span className="text-[10px] tracking-[0.2em] uppercase mt-2">Claim ritual essences to populate the archives</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-24">
                        {libraryGrimoires.map((grimoire) => (
                            <div key={grimoire.id} className="relative group">
                                {/* Small Grimoire Visualization */}
                                <div className="h-[280px] w-full flex items-center justify-center bg-zinc-900/50 rounded-xl border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-500 group-hover:scale-105">
                                     <Grimoire 
                                        grimoire={grimoire} 
                                        x={100} 
                                        y={100} 
                                        canvasScale={{ get: () => 0.4 } as any} 
                                        isLibraryView={true}
                                    />
                                </div>
                                
                                {/* Info & Actions */}
                                <div className="mt-6 flex flex-col items-center">
                                    <h3 className="text-sm font-serif tracking-[0.1em] text-zinc-300">{grimoire.theme.title.system}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded">
                                            GRADE {grimoire.finalGrade}
                                        </span>
                                    </div>
                                    
                                    {/* Echo Button */}
                                    <button
                                        disabled={player.echoCharges === 0 || isExtracting}
                                        onClick={() => extractEcho(grimoire)}
                                        className={`mt-4 flex items-center gap-2 px-6 py-2 rounded-full border transition-all
                                            ${player.echoCharges > 0 
                                                ? 'border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10' 
                                                : 'border-zinc-800 text-zinc-600 grayscale'
                                            }`}
                                    >
                                        <Sparkles size={14} className={isExtracting ? 'animate-spin' : ''} />
                                        <span className="text-[10px] tracking-[0.2em] font-bold">EXTRACT ECHO</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Decoration */}
            <InterfacePersona.visuals.DecorativeCorners />
        </motion.div>
    );
};
