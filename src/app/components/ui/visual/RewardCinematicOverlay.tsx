import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, Zap, CheckCircle2 } from 'lucide-react';
import { RewardResult } from '@/app/hooks/useGrimoireReward';
import { CompactCardVisual } from '../card/CompactCardVisual';
import { DefaultCardPersona } from '../../persona/default/Card.persona.default';
import { useGameStore } from '@/core/store';
import { REWARD_CINEMATIC } from '@/config/timing';

interface RewardCinematicOverlayProps {
    result: RewardResult;
    onClose: () => void;
}

export const RewardCinematicOverlay: React.FC<RewardCinematicOverlayProps> = ({ result, onClose }) => {
    const [step, setStep] = useState<'intro' | 'tally' | 'echo' | 'final'>('intro');
    const learningLang = useGameStore(s => s.player.settings.learningLang);

    useEffect(() => {
        // Animation sequence
        const introTimer = setTimeout(() => setStep('tally'), REWARD_CINEMATIC.INTRO_MS);
        const tallyTimer = setTimeout(() => setStep('echo'), REWARD_CINEMATIC.TALLY_MS);
        const echoTimer = setTimeout(() => setStep('final'), REWARD_CINEMATIC.ECHO_MS);

        return () => {
            clearTimeout(introTimer);
            clearTimeout(tallyTimer);
            clearTimeout(echoTimer);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-2xl">
            {/* Background Particles (Conceptual) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: '110%', x: `${Math.random() * 100}%`, opacity: 0 }}
                        animate={{ y: '-10%', opacity: [0, 1, 0] }}
                        transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
                        className="absolute w-1 h-1 bg-amber-400 rounded-full blur-[1px]"
                    />
                ))}
            </div>

            <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center px-6">
                
                {/* 1. INTRO / DISSOLVE */}
                <AnimatePresence>
                    {step === 'intro' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
                            className="flex flex-col items-center"
                        >
                            <Sparkles className="text-amber-400 w-16 h-16 mb-4 animate-pulse" />
                            <h2 className="text-3xl font-serif italic text-amber-100">Ritual Essence Extracted</h2>
                            <p className="text-amber-100/40 text-sm mt-2 font-mono uppercase tracking-[0.3em]">Processing Sacred Data...</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. TALLY (XP & RESONANCE) */}
                <AnimatePresence>
                    {(step === 'tally' || step === 'echo' || step === 'final') && (
                        <div className="w-full flex flex-col gap-6">
                            <div className="flex justify-center gap-8">
                                {/* XP Card */}
                                <motion.div
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-zinc-800/50 border border-white/10 rounded-2xl p-6 w-40 shadow-2xl"
                                >
                                    <Zap className="text-cyan-400 w-8 h-8 mb-2 mx-auto" />
                                    <div className="text-2xl font-black text-white">+{result.xp}</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Mastery XP</div>
                                </motion.div>

                                {/* Resonance Card */}
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-zinc-800/50 border border-white/10 rounded-2xl p-6 w-40 shadow-2xl"
                                >
                                    <Heart className="text-pink-500 w-8 h-8 mb-2 mx-auto" />
                                    <div className="text-2xl font-black text-white">+{result.resonance}%</div>
                                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Resonance</div>
                                </motion.div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* 3. ECHO REVEAL */}
                <AnimatePresence>
                    {(step === 'echo' || step === 'final') && result.echo && (
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.5, rotateY: 180 }}
                            animate={{ y: 0, opacity: 1, scale: 1, rotateY: 0 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                            className="mt-12 group"
                        >
                            <div className="text-[10px] text-amber-400/60 uppercase tracking-[0.5em] mb-4 font-bold">
                                A New Echo Manifests
                            </div>
                            
                            {/* Card Container */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                <div className="relative bg-black rounded-lg shadow-[0_0_50px_rgba(251,191,36,0.2)] border-2 border-amber-500/30 overflow-hidden transform hover:scale-105 transition-transform duration-500">
                                    <CompactCardVisual 
                                        mode="repository"
                                        learningData={result.echo.word[learningLang] as any}
                                        senseInfo={result.echo as any}
                                        visual={typeof result.echo.visual === 'string' ? { status: 'loaded', payload: result.echo.visual } : (result.echo.visual as any || { status: 'idle', payload: '' })}
                                        isActive={true}
                                    />
                                </div>
                            </div>

                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="mt-8 text-white/60 font-serif italic text-lg"
                            >
                                "{result.echo.word[learningLang]}"
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 4. FINAL BUTTON */}
                <AnimatePresence>
                    {step === 'final' && (
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="mt-12 flex items-center gap-2 bg-white text-black px-12 py-4 rounded-full font-bold tracking-widest uppercase hover:bg-amber-100 transition-colors shadow-2xl"
                        >
                            <CheckCircle2 size={20} />
                            Return to Reality
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
