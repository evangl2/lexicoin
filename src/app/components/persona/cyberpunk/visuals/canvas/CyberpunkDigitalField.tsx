import React from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

export const CyberpunkDigitalField: React.FC = () => {
    const { palette: { colors } } = useCanvasPersona();

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Base Field */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(to bottom, ${colors.bgVoid} 0%, ${colors.bgBase} 100%)`
                }}
            />
            {/* Scanlines - Horizontal */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        ${colors.primary} 3px
                    )`,
                    backgroundSize: '100% 4px'
                }}
            />
            {/* Digital Glow */}
            <div
                className="absolute inset-0 opacity-20 Mix-blend-screen"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${colors.primaryDark} 0%, transparent 70%)`
                }}
            />

            {/* Random Data Noise (Simulated with dot pattern) */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `radial-gradient(${colors.accent} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}
            />
        </div>
    );
};
