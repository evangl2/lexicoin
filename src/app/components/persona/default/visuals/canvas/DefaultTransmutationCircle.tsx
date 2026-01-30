import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

interface DefaultTransmutationCircleProps {
    rotateSlow: MotionValue<number>;
    rotateReverse: MotionValue<number>;
}

export const DefaultTransmutationCircle: React.FC<DefaultTransmutationCircleProps> = ({ rotateSlow, rotateReverse }) => {
    const { geometry } = useCanvasPersona();
    const goldMetallic = '#D4AF37';

    // Guard against missing geometry in other skins if they fallback here
    if (!geometry) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {/* Outer Rune Ring */}
            <motion.div
                style={{ rotate: rotateSlow, borderColor: goldMetallic }}
                className="w-[80vmin] h-[80vmin] absolute opacity-20 border rounded-full flex items-center justify-center"
            >
                <div className="absolute inset-2 border border-dashed rounded-full" style={{ borderColor: `${goldMetallic}80` }} />
                <div className="absolute inset-8 border-[2px] rounded-full" style={{ borderStyle: 'dotted', borderColor: `${goldMetallic}4d` }} />
            </motion.div>

            {/* Geometric Array - Hexagram */}
            <motion.div
                style={{ rotate: rotateReverse }}
                className="w-[60vmin] h-[60vmin] absolute opacity-25 mix-blend-plus-lighter"
            >
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <polygon points={geometry.hexagram.triangleUp} fill="none" stroke={goldMetallic} strokeWidth="0.5" />
                    <polygon points={geometry.hexagram.triangleDown} fill="none" stroke={goldMetallic} strokeWidth="0.5" />
                    <circle cx={geometry.hexagram.innerCircle.cx} cy={geometry.hexagram.innerCircle.cy} r={geometry.hexagram.innerCircle.r} fill="none" stroke={goldMetallic} strokeWidth="0.5" />
                    {geometry.hexagram.lines.map((line: any, i: number) => (
                        <line key={i} {...line} stroke={goldMetallic} strokeWidth="0.2" />
                    ))}
                </svg>
            </motion.div>

            {/* Inner Mechanics */}
            <motion.div
                style={{ rotate: rotateSlow }}
                className="w-[30vmin] h-[30vmin] absolute opacity-30 mix-blend-screen"
            >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect {...geometry.centralArray.outerSquare} fill="none" stroke={goldMetallic} strokeWidth="1" transform="rotate(45 50 50)" />
                    <rect {...geometry.centralArray.innerSquare} fill="none" stroke={goldMetallic} strokeWidth="1" />
                    <circle {...geometry.centralArray.centerCircle} fill="none" stroke={goldMetallic} strokeWidth="2" strokeDasharray="5 2" />
                </svg>
            </motion.div>
        </div>
    );
};
