import React from 'react';
import { motion, useTransform, MotionValue } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

interface DefaultScriptNoiseProps {
    x: MotionValue<number>;
    y: MotionValue<number>;
}

export const DefaultScriptNoise: React.FC<DefaultScriptNoiseProps> = ({ x, y }) => {
    const { assets } = useCanvasPersona();

    // Internal parallax calculation
    const deepParallaxX = useTransform(x, (v: number) => v * 0.05);
    const deepParallaxY = useTransform(y, (v: number) => v * 0.05);

    return (
        <motion.div
            className="absolute inset-[-50%] opacity-20 pointer-events-none mix-blend-color-dodge"
            style={{
                x: deepParallaxX,
                y: deepParallaxY,
                backgroundImage: `url("${assets.textures.script}")`,
                backgroundSize: '30vw 30vw',
                filter: 'sepia(1) saturate(2) hue-rotate(10deg)',
            }}
        />
    );
};
