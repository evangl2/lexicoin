import React from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

export const DefaultMetalTexture: React.FC = () => {
    const { assets } = useCanvasPersona();

    return (
        <div
            className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
            style={{
                backgroundImage: `url("${assets.textures.metal}")`,
                backgroundSize: '20vw 20vw',
            }}
        />
    );
};
