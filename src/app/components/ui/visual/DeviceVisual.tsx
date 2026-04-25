import React from 'react';
import { motion } from 'motion/react';
import { CircuitBoard, Wand2 } from 'lucide-react';
import { DefaultInterfacePersona as Persona } from '@/app/components/persona/default/Interface.persona.default';

interface DeviceVisualProps {
    type: 'synthesis-circle' | 'grimoire-summoner';
    size: number;
    className?: string;
    isHovered?: boolean;
}

export const DeviceVisual: React.FC<DeviceVisualProps> = ({ type, size, className, isHovered }) => {
    const isSummoner = type === 'grimoire-summoner';

    return (
        <div
            className={`relative flex items-center justify-center bg-black/40 rounded-xl border border-white/10 overflow-hidden ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Background glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isSummoner ? 'from-amber-500/10 to-orange-500/10' : 'from-purple-500/10 to-blue-500/10'}`} />

            {/* Icon */}
            {isSummoner ? (
                <Wand2
                    size={size * 0.5}
                    className={`text-amber-400 transition-[transform,opacity,filter] duration-300 ${isHovered ? 'scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'opacity-70'}`}
                />
            ) : (
                <CircuitBoard
                    size={size * 0.5}
                    className={`text-purple-400 transition-[transform,opacity,filter] duration-300 ${isHovered ? 'scale-110 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'opacity-70'}`}
                />
            )}

            {/* Label */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className={`text-[10px] uppercase tracking-wider font-mono ${isSummoner ? 'text-amber-200/50' : 'text-purple-200/50'}`}>
                    {isSummoner ? 'Summoner' : 'Device'}
                </span>
            </div>

            {/* Border Highlight on Hover */}
            <div className={`absolute inset-0 border-2 rounded-xl transition-[opacity,border-color] duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'} ${isSummoner ? 'border-amber-500/30' : 'border-purple-500/30'}`} />
        </div>
    );
};
