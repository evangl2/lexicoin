/**
 * GrimoireVisual.tsx
 *
 * 职责：纯渲染魔典书本外观。
 * 支持：Persona 皮肤系统。
 */

import React, { useState, useEffect } from 'react';
import { motion, MotionValue } from 'motion/react';
import { GrimoireEntity, GrimoireStatus } from '@/types/index';
import { Book, CheckCircle2, Lock, MousePointer2 } from 'lucide-react';
import { getGrimoirePersona } from '@/app/components/persona/grimoire';

interface GrimoireVisualProps {
    grimoire: GrimoireEntity;
    isLibraryView: boolean;
    isOver: boolean;
    canDrop: boolean;
    dropRef: React.Ref<HTMLDivElement>;
    x: number | MotionValue<number>;
    y: number | MotionValue<number>;
    canvasScale: MotionValue<number>;
    onOpen: () => void;
}

// Circular SVG countdown timer
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const GrimoireTimer: React.FC<{ expiresAt: number; createdAt: number; color: string }> = ({ expiresAt, createdAt, color }) => {
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
    canvasScale,
    onOpen
}) => {
    const persona = getGrimoirePersona(grimoire.personaId);
    const isOpenable = grimoire.status !== 'SUMMONING' && !isLibraryView;
    const { tokens, visuals } = persona;

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
                transition-[background-color,border-color,opacity,transform] duration-300 group
                relative overflow-hidden
                ${isOpenable ? 'cursor-pointer' : 'opacity-50 grayscale pointer-events-none'}
                ${isLibraryView ? 'scale-[0.85]' : ''}
                ${isOver && canDrop ? `ring-4 ring-amber-400 bg-amber-900/50 scale-[1.1] -translate-y-4` : ''}
                [&.is-drag-over]:ring-4 [&.is-drag-over]:ring-amber-400 [&.is-drag-over]:bg-amber-900/50 [&.is-drag-over]:scale-[1.1] [&.is-drag-over]:-translate-y-4
                ${tokens.colors.coverBase}
                ${tokens.colors.status[grimoire.status]}
            `}
            onClick={onOpen}
        >
            {/* Compositor-friendly Shadows (Box-shadow replacement) */}
            <div className={`absolute inset-0 rounded-r-xl rounded-l-sm transition-opacity duration-300 pointer-events-none ${tokens.shadows.book}`} />
            
            {/* Hover/Drag Glow Shadow */}
            <div className={`
                absolute inset-0 rounded-r-xl rounded-l-sm transition-opacity duration-300 pointer-events-none shadow-amber-500/50
                ${(isOver && canDrop) ? 'opacity-100' : 'opacity-0'}
            `} />
            {/* Book Spine */}
            <div className={`absolute left-0 top-0 bottom-0 w-4 ${tokens.colors.spineBase} border-r border-white/5 flex flex-col justify-evenly items-center shadow-inner z-10`}>
                <div className={`w-full h-[2px] ${tokens.colors.spineLines}`} />
                <div className={`w-full h-[2px] ${tokens.colors.spineLines}`} />
                <div className={`w-full h-[2px] ${tokens.colors.spineLines}`} />
                <div className={`w-full h-[2px] ${tokens.colors.spineLines}`} />
            </div>

            <visuals.CoverDecoration status={grimoire.status} />

            {/* Content Container (shifted right for spine) */}
            <div className="pl-4 w-full h-full flex flex-col items-center justify-between relative z-20">
                <div className="flex items-center gap-1 w-full opacity-60">
                    <div className={`w-1.5 h-1.5 rounded-full bg-white`} />
                    <span className="text-[8px] font-bold tracking-widest uppercase" style={{ fontFamily: tokens.typography.titleFamily }}>
                        {persona.identity.name}
                    </span>
                </div>

                {/* Icon / Body */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Book className="text-white/40" size={32} />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white/80 line-clamp-1" style={{ fontFamily: tokens.typography.titleFamily }}>
                            {grimoire.theme.title.system}
                        </span>
                        <span className="text-[8px] text-white/40 uppercase tracking-tighter">
                            {grimoire.slots.filter(s => s.senseId !== null).length} / {grimoire.slots.length}
                        </span>
                    </div>
                </div>

                <div className="w-full flex justify-center pt-2 border-t border-white/10 relative">
                    {grimoire.status === 'RESOLVED' ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : grimoire.status === 'SUMMONING' ? (
                        <div className="w-4 h-4 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                    ) : (grimoire.status === 'ACTIVE' || grimoire.status === 'EVALUATING' || grimoire.status === 'NEEDS_REVISION') && !isLibraryView ? (
                        <GrimoireTimer
                            expiresAt={grimoire.expiresAt}
                            createdAt={grimoire.createdAt}
                            color={grimoire.status === 'NEEDS_REVISION' ? '#f97316' : '#22d3ee'}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-1 group-hover:hidden">
                            <Lock size={12} className="text-white/20" />
                        </div>
                    )}

                    {isOpenable && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded-b-lg">
                            <MousePointer2 size={14} className="text-white/60 animate-bounce" />
                        </div>
                    )}
                </div>
            </div>

            <div className={`absolute inset-0 opacity-20 blur-xl pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/black-leather.png')] mix-blend-overlay`} />
        </motion.div>
    );
});

GrimoireVisual.displayName = 'GrimoireVisual';
