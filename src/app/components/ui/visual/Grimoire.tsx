import React from 'react';
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
                ${personaShadows[grimoire.personaType] || ''}
            `}
            onClick={handleOpen}
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

            {/* Footer: Status Indicator / Action Hint */}
            <div className="w-full flex justify-center pt-2 border-t border-white/10 relative">
                {grimoire.status === 'RESOLVED' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                ) : grimoire.status === 'SUMMONING' ? (
                    <div className="w-4 h-4 rounded-full border border-amber-400 border-t-transparent animate-spin" />
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
