import React from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

export const DefaultEdgeRunes: React.FC = () => {
    const { assets } = useCanvasPersona();

    const edgeStyle = {
        backgroundImage: `url("${assets.textures.constellations}")`,
        filter: 'sepia(1) saturate(2) hue-rotate(10deg)', // Golden
    };

    const sideStyle = {
        backgroundImage: `url("${assets.textures.script}")`,
        filter: 'sepia(1) saturate(2) hue-rotate(10deg)',
    };

    return (
        <>
            {/* Top Edge */}
            <div
                className="absolute top-0 left-0 w-full h-[15vh] opacity-30 pointer-events-none"
                style={{
                    ...edgeStyle,
                    backgroundPosition: 'center top',
                    backgroundSize: '100% auto',
                    maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                }}
            />
            {/* Bottom Edge */}
            <div
                className="absolute bottom-0 left-0 w-full h-[15vh] opacity-30 pointer-events-none"
                style={{
                    ...edgeStyle,
                    backgroundPosition: 'center bottom',
                    backgroundSize: '100% auto',
                    maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                }}
            />
            {/* Left Edge */}
            <div
                className="absolute top-0 left-0 w-[10vw] h-full opacity-25 pointer-events-none mix-blend-plus-lighter"
                style={{
                    ...sideStyle,
                    backgroundRepeat: 'repeat-y',
                    backgroundSize: '100% auto',
                    maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                }}
            />
            {/* Right Edge */}
            <div
                className="absolute top-0 right-0 w-[10vw] h-full opacity-25 pointer-events-none mix-blend-plus-lighter"
                style={{
                    ...sideStyle,
                    backgroundRepeat: 'repeat-y',
                    backgroundSize: '100% auto',
                    transform: 'scaleX(-1)',
                    maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
                }}
            />
        </>
    );
};
