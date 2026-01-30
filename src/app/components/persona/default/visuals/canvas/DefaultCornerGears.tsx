import React from 'react';
import { motion, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

interface DefaultCornerGearsProps {
    rotateSlow: MotionValue<number>;
    rotateReverse: MotionValue<number>;
}

export const DefaultCornerGears: React.FC<DefaultCornerGearsProps> = ({ rotateSlow, rotateReverse }) => {
    const { assets } = useCanvasPersona();

    const gearStyle = {
        backgroundSize: 'contain',
        filter: 'sepia(1) saturate(1.5) hue-rotate(5deg) brightness(1.1)', // Golden Glow
        backgroundImage: `url("${assets.textures.mechanism}")`,
    };

    return (
        <>
            {/* Top Left */}
            <motion.div
                className="absolute top-[-20vw] left-[-20vw] w-[40vw] h-[40vw] opacity-60 mix-blend-screen pointer-events-none"
                style={{ rotate: rotateSlow, ...gearStyle }}
            />
            {/* Top Right */}
            <motion.div
                className="absolute top-[-20vw] right-[-20vw] w-[40vw] h-[40vw] opacity-60 mix-blend-screen pointer-events-none"
                style={{ rotate: rotateReverse, ...gearStyle }}
            />
            {/* Bottom Left */}
            <motion.div
                className="absolute bottom-[-20vw] left-[-20vw] w-[40vw] h-[40vw] opacity-60 mix-blend-screen pointer-events-none"
                style={{ rotate: rotateReverse, ...gearStyle }}
            />
            {/* Bottom Right */}
            <motion.div
                className="absolute bottom-[-20vw] right-[-20vw] w-[40vw] h-[40vw] opacity-60 mix-blend-screen pointer-events-none"
                style={{ rotate: rotateSlow, ...gearStyle }}
            />
        </>
    );
};
