/**
 * WorkbenchNode - Permanent Icon Component
 * 
 * Represents a clickable icon/entry point on the workbench
 * (e.g., Archive, Items)
 */

import React, { useState } from 'react';

interface WorkbenchNodeProps {
    label: string;
    icon: string;
    onClick: () => void;
    position?: 'left' | 'right';
}

export const WorkbenchNode: React.FC<WorkbenchNodeProps> = ({
    label,
    icon,
    onClick,
    position = 'left'
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`absolute bottom-8 ${position === 'left' ? 'left-12' : 'right-12'} flex flex-col items-center gap-2 cursor-pointer group`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Icon Container - looks like a physical object */}
            <div className={`
                relative w-24 h-24 rounded-2xl 
                bg-gradient-to-br from-amber-900/40 to-amber-950/60
                border-2 border-amber-700/30
                shadow-[0_8px_16px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset]
                transition-all duration-300
                ${isHovered ? 'transform -translate-y-2 shadow-[0_12px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(217,119,6,0.3)]' : ''}
                flex items-center justify-center
                backdrop-blur-sm
            `}>
                {/* Inner glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/5" />

                {/* Icon */}
                <span className="text-5xl relative z-10 filter drop-shadow-lg">
                    {icon}
                </span>

                {/* Shine effect on hover */}
                {isHovered && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-pulse" />
                )}
            </div>

            {/* Label */}
            <div className={`
                px-4 py-1.5 rounded-full
                bg-black/40 backdrop-blur-sm
                border border-white/20
                transition-all duration-300
                ${isHovered ? 'bg-black/60 border-amber-500/50' : ''}
            `}>
                <span className="text-white text-sm font-medium tracking-wide">
                    {label}
                </span>
            </div>

            {/* Tooltip on hover */}
            {isHovered && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap">
                    Click to open {label}
                </div>
            )}
        </div>
    );
};
