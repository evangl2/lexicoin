/**
 * GrimoireVisual.tsx
 * 
 * 职责：纯渲染魔典书本外观。
 * 包含：书脊、封面、计时器、状态反馈。
 */

import React, { useState, useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { GrimoireEntity, GrimoireStatus } from '@/types/index';
import { Book, CheckCircle2, Lock, MousePointer2 } from 'lucide-react';

interface GrimoireVisualProps {
    // 1. 数据层
    grimoire: GrimoireEntity;

    // 2. 状态层
    isLibraryView: boolean;
    isOver: boolean;
    canDrop: boolean;

    // 3. Motion / Ref 层
    dropRef: React.Ref<HTMLDivElement>;
    x: number | MotionValue<number>;
    y: number | MotionValue<number>;

    // 4. 回调层
    onOpen: () => void;
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

const personaShadows: Record<string, string> = {
    'CHILD':     'shadow-[0_0_20px_rgba(74,222,128,0.3)]',
    'GARDENER':  'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    'ALCHEMIST': 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    'LOGICIAN':  'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    'POET':      'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    'MYSTIC':    'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
};

// Circular SVG countdown timer
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const GrimoireTimer: React.FC<{ expiresAt: number; createdAt: number }> = ({ expiresAt, createdAt }) => {
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
                <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
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
};

export const GrimoireVisual: React.FC<GrimoireVisualProps> = React.memo(({
    grimoire,
    isLibraryView,
    isOver,
    canDrop,
    dropRef,
    x,
    y,
    onOpen
}) => {
    const isOpenable = grimoire.status !== 'SUMMONING' && !isLibraryView;

    return (
        <motion.div
            ref={dropRef}
            data-grimoire-id={grimoire.id}
            style={isLibraryView ? { position: 'relative' } : {
                x, y,
                position: 'absolute' as const,
                left: '50%',
                top: '50%',
                marginLeft: -65, // width 130 / 2
                marginTop: -90,  // height 180 / 2
                touchAction: 'none'
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`
                closed-grimoire
                w-[130px] h-[180px] rounded-r-xl rounded-l-sm border-2 backdrop-blur-xl flex flex-col items-center justify-between p-4
                transition-all duration-300 group shadow-[20px_20px_40px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(0,0,0,0.5)]
                relative overflow-hidden
                ${isOpenable ? 'cursor-pointer hover:scale-[1.05] hover:-translate-y-2' : 'scale-100 opacity-50 grayscale pointer-events-none'}
                ${isLibraryView ? 'scale-[0.85]' : ''}
                ${isOver && canDrop ? 'ring-4 ring-amber-400 bg-amber-900/50 scale-[1.1] -translate-y-4 shadow-amber-500/50' : ''}
                [&.is-drag-over]:ring-4 [&.is-drag-over]:ring-amber-400 [&.is-drag-over]:bg-amber-900/50 [&.is-drag-over]:scale-[1.1] [&.is-drag-over]:-translate-y-4 [&.is-drag-over]:shadow-amber-500/50
                ${statusColors[grimoire.status]}
                ${personaShadows[grimoire.personaId] || ''}
            `}
            onClick={onOpen}
        >
            {/* Book Spine */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/80 to-transparent border-r border-white/5 flex flex-col justify-evenly items-center shadow-inner z-10">
                <div className="w-full h-[2px] bg-white/10" />
                <div className="w-full h-[2px] bg-white/10" />
                <div className="w-full h-[2px] bg-white/10" />
                <div className="w-full h-[2px] bg-white/10" />
            </div>

            {/* Content Container (shifted right for spine) */}
            <div className="pl-4 w-full h-full flex flex-col items-center justify-between relative z-20">
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
            </div>

            {/* Decorative Glow */}
            <div className={`absolute inset-0 opacity-20 blur-xl pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/black-leather.png')] mix-blend-overlay`} />
        </motion.div>
    );
});

GrimoireVisual.displayName = 'GrimoireVisual';
