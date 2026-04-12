import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { GrimoireEntity, GrimoireStatus } from '@/types/index';
import { Book, CheckCircle2, Lock } from 'lucide-react';

interface GrimoireProps {
    grimoire: GrimoireEntity;
    x: number | MotionValue<number>;
    y: number | MotionValue<number>;
    canvasScale: MotionValue<number>;
}

const statusColors: Record<GrimoireStatus, string> = {
    'SUMMONING': 'border-amber-500/50 bg-amber-500/20',
    'ACTIVE': 'border-cyan-500/50 bg-cyan-900/40',
    'RESOLVED': 'border-emerald-500/50 bg-emerald-900/40',
    'ARCHIVED': 'border-zinc-500/50 bg-zinc-900/40',
    'EXPIRED': 'border-red-500/50 bg-red-900/20'
};

const personaShadows: Record<string, string> = {
    'LOGICIAN': 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    'POET': 'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    'ALCHEMIST': 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    'MYSTIC': 'shadow-[0_0_20px_rgba(168,85,247,0.3)]'
};

export const Grimoire: React.FC<GrimoireProps> = ({ grimoire, x, y, canvasScale }) => {
    return (
        <motion.div
            style={{
                x, y,
                position: 'absolute',
                left: '50%',
                top: '50%',
                marginLeft: -60, // width 120 / 2
                marginTop: -80,  // height 160 / 2
            }}
            className={`
                w-[120px] h-[160px] rounded-lg border-2 backdrop-blur-md flex flex-col items-center justify-between p-3
                transition-all duration-500
                ${statusColors[grimoire.status]}
                ${personaShadows[grimoire.personaType] || ''}
            `}
        >
            {/* Header: Persona Label */}
            <div className="flex items-center gap-1 w-full opacity-60">
                <div className={`w-1.5 h-1.5 rounded-full ${grimoire.personaType === 'ALCHEMIST' ? 'bg-amber-400' : 'bg-white'}`} />
                <span className="text-[8px] font-bold tracking-widest uppercase">{grimoire.personaType}</span>
            </div>

            {/* Icon / Body */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <Book className="text-white/40" size={32} />
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/80 line-clamp-1">Grimoire</span>
                    <span className="text-[8px] text-white/40 uppercase tracking-tighter">
                        {grimoire.slots.length} Slots
                    </span>
                </div>
            </div>

            {/* Footer: Status Indicator */}
            <div className="w-full flex justify-center pt-2 border-t border-white/10">
                {grimoire.status === 'RESOLVED' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                ) : grimoire.status === 'SUMMONING' ? (
                    <div className="w-4 h-4 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                ) : (
                    <Lock size={12} className="text-white/20" />
                )}
            </div>

            {/* Decorative Glow */}
            <div className={`absolute inset-0 opacity-10 blur-xl pointer-events-none -z-10 bg-white/5`} />
        </motion.div>
    );
};
