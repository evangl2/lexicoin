import React, { useState, useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { GrimoireEntity, GrimoireStatus } from '@/types/index';
import { Book, CheckCircle2, Lock, MousePointer2 } from 'lucide-react';
import { useGameStore } from '@/core/store';

interface GrimoireProps {
    grimoire: GrimoireEntity;
    x: number | MotionValue<number>;
    y: number | MotionValue<number>;
    canvasScale?: MotionValue<number>;
    isLibraryView?: boolean;
}

const statusColors: Record<GrimoireStatus, string> = {
    'SUMMONING':      'border-amber-500/50 bg-amber-500/20',
    'ACTIVE':         'border-cyan-500/50 bg-cyan-900/40',
    'EVALUATING':     'border-purple-500/50 bg-purple-900/40',
    'NEEDS_REVISION': 'border-orange-500/50 bg-orange-900/40',
    'RESOLVED':       'border-emerald-500/50 bg-emerald-900/40',
    'ARCHIVED':       'border-zinc-500/50 bg-zinc-900/40',
    'EXPIRED':        'border-red-500/50 bg-red-900/20'
};

// Circular SVG countdown timer
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function GrimoireTimer({ expiresAt, createdAt }: { expiresAt: number; createdAt: number }) {
    const totalDuration = expiresAt - createdAt;
    const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));

    useEffect(() => {
        const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
        tick();
        const id = setInterval(tick, 10_000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const progress = Math.max(0, Math.min(1, remaining / totalDuration));
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
    const remainingMins = Math.ceil(remaining / 60_000);

    const color =
        remaining > 20 * 60_000 ? '#22d3ee' :  // cyan
        remaining > 10 * 60_000 ? '#f97316' :  // orange
        '#ef4444';                               // red

    const isPulsing = remaining <= 10 * 60_000 && remaining > 0;

    return (
        <div className={`relative flex items-center justify-center ${isPulsing ? 'animate-pulse' : ''}`}>
            <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                {/* Track */}
                <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                {/* Progress */}
                <circle
                    cx="22" cy="22" r={RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
                />
            </svg>
            <span className="absolute text-[9px] font-mono font-bold" style={{ color }}>
                {remaining > 0 ? `${remainingMins}m` : 'EXP'}
            </span>
        </div>
    );
}

const personaShadows: Record<string, string> = {
    'CHILD':     'shadow-[0_0_20px_rgba(74,222,128,0.3)]',
    'GARDENER':  'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    'ALCHEMIST': 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    // Legacy keys kept until Group E rename completes
    'LOGICIAN':  'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    'POET':      'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    'MYSTIC':    'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
};

export const Grimoire: React.FC<GrimoireProps> = ({ grimoire, x, y, canvasScale, isLibraryView = false }) => {
    const setActiveGrimoireId = useGameStore(s => s.setActiveGrimoireId);
    
    const isOpenable = grimoire.status !== 'SUMMONING' && !isLibraryView;

    const handleOpen = () => {
        if (!isOpenable) return;
        setActiveGrimoireId(grimoire.id);
    };

    return (
        <motion.div
            style={isLibraryView ? { position: 'relative' } : {
                x, y,
                position: 'absolute' as const,
                left: '50%',
                top: '50%',
                marginLeft: -60, // width 120 / 2
                marginTop: -80,  // height 160 / 2
            }}
            className={`
                w-[120px] h-[160px] rounded-lg border-2 backdrop-blur-md flex flex-col items-center justify-between p-3
                transition-all duration-300 group
                ${!isLibraryView ? 'cursor-pointer hover:scale-[1.05]' : 'scale-100'}
                ${statusColors[grimoire.status]}
                ${personaShadows[grimoire.personaId] || ''}
            `}
            onClick={handleOpen}
        >
            {/* Header: Persona Label */}
            <div className="flex items-center gap-1 w-full opacity-60">
                <div className={`w-1.5 h-1.5 rounded-full ${grimoire.personaId === 'ALCHEMIST' ? 'bg-amber-400' : 'bg-white'}`} />
                <span className="text-[8px] font-bold tracking-widest uppercase">{grimoire.personaId}</span>
            </div>

            {/* Icon / Body */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Book className="text-white/40" size={32} />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/80 line-clamp-1">Grimoire</span>
                    <span className="text-[8px] text-white/40 uppercase tracking-tighter">
                        {grimoire.slots.filter(s => s.senseId !== null).length} / {grimoire.slots.length}
                    </span>
                </div>
            </div>

            {/* Footer: Status / Timer */}
            <div className="w-full flex justify-center pt-2 border-t border-white/10 relative">
                {grimoire.status === 'RESOLVED' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                ) : grimoire.status === 'SUMMONING' ? (
                    <div className="w-4 h-4 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                ) : (grimoire.status === 'ACTIVE' || grimoire.status === 'EVALUATING' || grimoire.status === 'NEEDS_REVISION') && !isLibraryView ? (
                    <GrimoireTimer expiresAt={grimoire.expiresAt} createdAt={grimoire.createdAt} />
                ) : (
                    <div className="flex flex-col items-center gap-1 group-hover:hidden">
                        <Lock size={12} className="text-white/20" />
                    </div>
                )}

                {/* Hover Interaction Hint */}
                {isOpenable && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded-b-lg">
                        <MousePointer2 size={14} className="text-white/60 animate-bounce" />
                    </div>
                )}
            </div>

            {/* Decorative Glow */}
            <div className={`absolute inset-0 opacity-10 blur-xl pointer-events-none -z-10 bg-white/5`} />
        </motion.div>
    );
};
