import React from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

export const DefaultSacredGeometry: React.FC = () => {
    // Hardcoded to match original Theme
    const goldMetallic = '#D4AF37';

    return (
        <div
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen"
            style={{
                backgroundImage: `
            linear-gradient(to right, ${goldMetallic} 1px, transparent 1px),
            linear-gradient(to bottom, ${goldMetallic} 1px, transparent 1px)
          `,
                backgroundSize: '10vw 10vw',
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
            }}
        />
    );
};
