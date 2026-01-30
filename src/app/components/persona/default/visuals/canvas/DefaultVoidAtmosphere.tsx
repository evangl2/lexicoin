import React from 'react';
import { useCanvasPersona } from '@/app/context/PersonaContext';

export const DefaultVoidAtmosphere: React.FC = () => {
    // Hardcoded colors to match original "Dark Alchemy" theme exactly
    // as these specific gradients aren't in the standard palette
    const colors = {
        atmosphereStart: '#603813',
        atmosphereMid: '#2e1a05',
        voidBase: '#0a0502',
    };

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                background: `radial-gradient(circle at center, ${colors.atmosphereStart} 0%, ${colors.atmosphereMid} 60%, ${colors.voidBase} 100%)`
            }}
        />
    );
};
