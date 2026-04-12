import React from 'react';
import { motion, useTransform, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';

interface Props {
    scale: MotionValue<number>;
    width: number;
    height: number;
}

export const CyberpunkGridSystem: React.FC<Props> = ({ scale, width, height }) => {
    const { palette: { colors }, slots } = useCanvasPersona();

    const smallGridOpacity = useTransform(scale, [0.1, 0.4, 1.5], [0, 0.3, 0.6]);
    const largeGridOpacity = useTransform(scale, [0.1, 1], [0.2, 0.5]);

    const gridColor = colors.primary;
    const accentColor = colors.accent;
    const bg = colors.bgVoid;
    const border = colors.borderBase;

    const HALF_W = width / 2;
    const HALF_H = height / 2;

    return (
        <div className="absolute inset-0 shadow-2xl overflow-hidden"
            style={{
                backgroundColor: bg,
                boxShadow: `0 0 100px ${colors.primaryDark} inset, 0 0 0 2px ${border}`,
                border: `1px solid ${colors.borderStrong}`
            }}>

            {/* Neon Grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="cpSmallGrid" width="50" height="50" patternUnits="userSpaceOnUse" x={HALF_W - 25} y={HALF_H - 25}>
                        <path d="M 25 0 L 25 50 M 0 25 L 50 25" fill="none" stroke={gridColor} strokeWidth="1" opacity="0.3" />
                    </pattern>
                    <pattern id="cpLargeGrid" width="500" height="500" patternUnits="userSpaceOnUse" x={HALF_W - 250} y={HALF_H - 250}>
                        <path d="M 250 0 L 250 500 M 0 250 L 500 250" stroke={accentColor} strokeWidth="2" opacity="0.5" />
                        <path d="M 240 250 L 260 250 M 250 240 L 250 260" stroke={colors.textHighlight} strokeWidth="3" />
                        <circle cx="250" cy="250" r="4" fill={colors.textHighlight} />
                    </pattern>
                </defs>
                <motion.rect width="100%" height="100%" fill="url(#cpSmallGrid)" style={{ opacity: smallGridOpacity }} />
                <motion.rect width="100%" height="100%" fill="url(#cpLargeGrid)" style={{ opacity: largeGridOpacity }} />

                {/* Center Target */}
                <g transform={`translate(${width / 2}, ${height / 2})`}>
                    <circle r="100" fill="none" stroke={colors.accent} strokeWidth="1" strokeDasharray="10 5" opacity="0.5" />
                    <path d="M -20 0 L 20 0 M 0 -20 L 0 20" stroke={colors.textHighlight} strokeWidth="2" />
                </g>
            </svg>

            {/* HUD slots */}
            <Slot slot={slots.CornerRune} props={{ position: 'top-left', color: colors.accent }} />
            <Slot slot={slots.CornerRune} props={{ position: 'top-right', color: colors.accent }} />
            <Slot slot={slots.CornerRune} props={{ position: 'bottom-left', color: colors.accent }} />
            <Slot slot={slots.CornerRune} props={{ position: 'bottom-right', color: colors.accent }} />

            {/* Digital Coordinates */}
            <div className="absolute bottom-4 left-4 font-mono text-xs opacity-70" style={{ color: colors.textSecondary }}>
                SYS.LOC // X:{-HALF_W} Y:{-HALF_H} // SECURE
            </div>
        </div>
    );
};
