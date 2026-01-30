import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

interface Props {
    rotateSlow: MotionValue<number>;
    rotateReverse: MotionValue<number>;
}

export const CyberpunkCircuitry: React.FC<Props> = ({ rotateSlow, rotateReverse }) => {
    const { palette: { colors } } = useCanvasPersona();
    const primary = colors.primary;
    const accent = colors.accent;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden mix-blend-screen">
            {/* Outer Data Ring */}
            <motion.div
                style={{ rotate: rotateSlow }}
                className="w-[70vmin] h-[70vmin] absolute opacity-30 border-2 border-dashed rounded-full flex items-center justify-center"
                animate={{ borderColor: [primary, accent, primary] }}
                transition={{ duration: 4, repeat: Infinity }}
            >
                <div className="absolute top-0 w-2 h-2 bg-current shadow-[0_0_10px_currentColor]" />
                <div className="absolute bottom-0 w-2 h-2 bg-current shadow-[0_0_10px_currentColor]" />
            </motion.div>

            {/* Inner HUD Layers */}
            <motion.div
                style={{ rotate: rotateReverse }}
                className="w-[50vmin] h-[50vmin] absolute opacity-40"
            >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="48" fill="none" stroke={accent} strokeWidth="0.2" strokeDasharray="10 20" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={primary} strokeWidth="0.5" strokeDasharray="25 25" />
                    <path d="M 50 10 L 50 20 M 50 80 L 50 90 M 10 50 L 20 50 M 80 50 L 90 50" stroke={accent} strokeWidth="1" />
                </svg>
            </motion.div>

            {/* Core Pulse */}
            <motion.div
                className="w-[20vmin] h-[20vmin] absolute opacity-20 bg-gradient-to-tr from-transparent to-current rounded-full"
                style={{ color: accent, rotate: rotateSlow }}
            />
        </div>
    );
};
