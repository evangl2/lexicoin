import React from 'react';
import { motion, useTransform, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';

interface DefaultGridSystemProps {
    scale: MotionValue<number>;
    width: number;
    height: number;
}

export const DefaultGridSystem: React.FC<DefaultGridSystemProps> = ({ scale, width, height }) => {
    const { palette: { colors }, decorations, slots } = useCanvasPersona();

    // Internal opacity calculation
    const smallGridOpacity = useTransform(scale, [0.1, 0.4, 1.5], [0, 0.2, 0.4]);
    const largeGridOpacity = useTransform(scale, [0.1, 1], [0.3, 0.6]);

    // Colors mapping (using defaults or safe fallbacks)
    const gridBase = '#44403c';     // Stone-700
    const gridHighlight = '#d97706';// Amber-600
    const surfaceBase = '#292524';  // Stone-800
    const bg = colors.bgVoid || '#0c0a09';
    const border = '#78350f';       // Amber-900

    const HALF_W = width / 2;
    const HALF_H = height / 2;

    return (
        <div
            className="absolute inset-0 shadow-2xl overflow-hidden"
            style={{
                backgroundColor: bg,
                // Main surface texture
                backgroundImage: `radial-gradient(circle at center, ${surfaceBase} 0%, ${bg} 100%)`,
                // Complex Frame Border
                boxShadow: `
              0 0 0 2px ${gridHighlight}, 
              0 0 0 12px ${border},
              0 0 50px 10px #000 inset
            `,
            }}
        >
            {/* GRID SYSTEM */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="smallGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke={gridBase} strokeWidth="1" opacity="0.4" />
                    </pattern>
                    <pattern id="largeGrid" width="1000" height="1000" patternUnits="userSpaceOnUse">
                        <rect width="1000" height="1000" fill="none" />
                        <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke={gridHighlight} strokeWidth="2" opacity="0.6" />
                        {/* Intersection Diamonds */}
                        <path d="M -15 0 L 0 15 L 15 0 L 0 -15 Z" fill={bg} stroke={gridHighlight} strokeWidth="2" />
                    </pattern>
                </defs>

                <motion.rect width="100%" height="100%" fill="url(#smallGrid)" style={{ opacity: smallGridOpacity }} />
                <motion.rect width="100%" height="100%" fill="url(#largeGrid)" style={{ opacity: largeGridOpacity }} />

                {/* Center Mark */}
                <g transform={`translate(${width / 2}, ${height / 2})`}>
                    <circle r="800" fill="none" stroke={gridBase} strokeWidth="1" opacity="0.1" />
                    <circle r="200" fill="none" stroke={gridHighlight} strokeWidth="2" opacity="0.3" strokeDasharray="50,20" />
                    <path d="M -150 0 L 150 0 M 0 -150 L 0 150" stroke={gridHighlight} strokeWidth="1" opacity="0.3" />
                </g>
            </svg>

            {/* DECORATION SLOTS */}
            <Slot slot={slots.CornerRune} props={{ position: 'top-left', color: decorations.cornerRuneColor }} />
            <Slot slot={slots.CornerRune} props={{ position: 'top-right', color: decorations.cornerRuneColor }} />
            <Slot slot={slots.CornerRune} props={{ position: 'bottom-left', color: decorations.cornerRuneColor }} />
            <Slot slot={slots.CornerRune} props={{ position: 'bottom-right', color: decorations.cornerRuneColor }} />

            {/* Coordinates */}
            <div className="absolute top-10 left-12 font-mono text-xs tracking-[0.3em] opacity-50" style={{ color: gridHighlight }}>
                SECTOR: PRIMUS // X: {-HALF_W} Y: {-HALF_H}
            </div>
            <div className="absolute bottom-10 right-12 font-mono text-xs tracking-[0.3em] opacity-50" style={{ color: gridHighlight }}>
                SECTOR: TERMINUS // X: {HALF_W} Y: {HALF_H}
            </div>
        </div>
    );
};
