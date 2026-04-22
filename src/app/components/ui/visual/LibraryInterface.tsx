import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Sparkles, ArrowLeft, Search, Gift, Check } from 'lucide-react';
import { useGameStore } from '@/core/store';
import { DefaultInterfacePersona as InterfacePersona } from '@/app/components/persona/default/Interface.persona.default';
import { Grimoire } from './Grimoire';
import { useEchoSystem } from '@/app/hooks/useEchoSystem';
import { useGrimoireReward } from '@/app/hooks/useGrimoireReward';
import { GrimoireEntity } from '@/types/index';

export const LibraryInterface: React.FC = () => {
    const viewMode = useGameStore(s => s.viewMode);
    const setViewMode = useGameStore(s => s.setViewMode);
    const libraryGrimoires = useGameStore(s => s.libraryGrimoires);
    const player = useGameStore(s => s.player);

    const { extractEcho, isExtracting } = useEchoSystem();
    const { claim, isClaiming, rewardResult, resetReward } = useGrimoireReward();

    const handleBack = () => setViewMode('WORLD');

    const pendingCount = libraryGrimoires.filter(g => !g.rewardClaimed).length;

    if (viewMode !== 'LIBRARY') return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 100, damping: 25, mass: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[10] flex flex-col bg-black overflow-hidden"
        >
            {/* Background Visuals */}
            <InterfacePersona.visuals.BackgroundVisuals />
            <InterfacePersona.visuals.AlchemyGeometricOverlay />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-12 py-8 border-b border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handleBack}
                        className="p-3 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-all group"
                    >
                        <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1
                                className="text-3xl font-serif tracking-[0.3em] font-bold text-[#D4AF37]"
                                style={{ fontFamily: InterfacePersona.tokens.typography.label.family }}
                            >
                                SACRED ARCHIVES
                            </h1>
                            {/* Pending reward badge */}
                            {pendingCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40"
                                >
                                    <Gift size={10} className="text-amber-400" />
                                    <span className="text-[9px] font-bold text-amber-400">{pendingCount} unclaimed</span>
                                </motion.div>
                            )}
                        </div>
                        <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mt-1">
                            The repository of forgotten knowledge
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {/* Echo Charges */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] tracking-[0.2em] text-zinc-500 uppercase">Echo Potential</span>
                        <div className="flex gap-2">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        scale: i < player.echoCharges ? [1, 1.2, 1] : 1,
                                        opacity: i < player.echoCharges ? 1 : 0.2,
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

            {/* Shelf */}
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
                            <GrimoireCard
                                key={grimoire.id}
                                grimoire={grimoire}
                                echoCharges={player.echoCharges}
                                isExtracting={isExtracting}
                                isClaiming={isClaiming}
                                onClaim={() => claim(grimoire.id)}
                                onEcho={() => extractEcho(grimoire)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Reward Toast */}
            <AnimatePresence>
                {rewardResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-8 py-4 rounded-2xl bg-[#2a241e] border border-[#D4AF37]/40 shadow-2xl"
                        onClick={resetReward}
                    >
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                            <Check size={20} className="text-[#D4AF37]" />
                        </div>
                        <div>
                            <div className="text-xs font-bold tracking-widest text-[#D4AF37] uppercase">Rewards Claimed</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                                +{rewardResult.xp} XP · +{rewardResult.resonance} Resonance
                            </div>
                        </div>
                        <span className="text-[9px] text-zinc-600 ml-4">tap to dismiss</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <InterfacePersona.visuals.DecorativeCorners />
        </motion.div>
    );
};

// ── Card item ──────────────────────────────────────────────────────────────────

interface GrimoireCardProps {
    grimoire: GrimoireEntity;
    echoCharges: number;
    isExtracting: boolean;
    isClaiming: boolean;
    onClaim: () => void;
    onEcho: () => void;
}

const GrimoireCard: React.FC<GrimoireCardProps> = ({
    grimoire, echoCharges, isExtracting, isClaiming, onClaim, onEcho,
}) => {
    const isPending = !grimoire.rewardClaimed;

    return (
        <div className={`relative group transition-all duration-300 ${isPending ? 'ring-1 ring-amber-500/30 rounded-2xl' : ''}`}>
            {/* Pending glow */}
            {isPending && (
                <div className="absolute -inset-1 rounded-2xl bg-amber-500/5 pointer-events-none animate-pulse" />
            )}

            {/* Grimoire Visual */}
            <div className={`
                relative h-[280px] w-full flex items-center justify-center rounded-xl border transition-all duration-500 group-hover:scale-105
                ${isPending
                    ? 'bg-amber-900/20 border-amber-500/30 group-hover:border-amber-400/50'
                    : 'bg-zinc-900/50 border-white/5 group-hover:border-[#D4AF37]/30'}
            `}>
                {isPending && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                        <Gift size={9} className="text-amber-400" />
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">Unclaimed</span>
                    </div>
                )}
                <Grimoire grimoire={grimoire} x={100} y={100} canvasScale={{ get: () => 0.4 } as any} isLibraryView={true} />
            </div>

            {/* Info & Actions */}
            <div className="mt-6 flex flex-col items-center gap-2">
                <h3 className="text-sm font-serif tracking-[0.1em] text-zinc-300 text-center line-clamp-2">
                    {grimoire.theme.title.system}
                </h3>
                <span className="text-[10px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded">
                    GRADE {grimoire.finalGrade}
                </span>

                {/* §8.3 — Claim button (unclaimed) or Echo button (claimed) */}
                {isPending ? (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isClaiming}
                        onClick={onClaim}
                        className="mt-2 flex items-center gap-2 px-6 py-2 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Gift size={14} className={isClaiming ? 'animate-pulse' : ''} />
                        <span className="text-[10px] tracking-[0.2em] font-bold">
                            {isClaiming ? 'CLAIMING...' : 'CLAIM REWARD'}
                        </span>
                    </motion.button>
                ) : (
                    <button
                        disabled={echoCharges === 0 || isExtracting}
                        onClick={onEcho}
                        className={`mt-2 flex items-center gap-2 px-6 py-2 rounded-full border transition-all
                            ${echoCharges > 0
                                ? 'border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10'
                                : 'border-zinc-800 text-zinc-600 grayscale'}
                        `}
                    >
                        <Sparkles size={14} className={isExtracting ? 'animate-spin' : ''} />
                        <span className="text-[10px] tracking-[0.2em] font-bold">EXTRACT ECHO</span>
                    </button>
                )}
            </div>
        </div>
    );
};
