import React from 'react';

export const CyberpunkCornerHUD: React.FC<{ position: string, color: string }> = ({ position, color }) => {
    const isTop = position.includes('top');
    const isLeft = position.includes('left');

    const style: React.CSSProperties = {
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: '150px',
        height: '150px',
        pointerEvents: 'none',
        color: color,
        opacity: 0.8,
    };

    // Flip logic
    const transform = `${isTop ? '' : 'scaleY(-1)'} ${isLeft ? '' : 'scaleX(-1)'}`;

    return (
        <div style={{ ...style, transform }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
                {/* Tech Corner */}
                <path d="M 0 0 L 40 0 L 50 10 L 0 10 Z" fill={color} opacity="0.2" />
                <path d="M 0 0 L 0 40 L 10 50 L 10 0 Z" fill={color} opacity="0.2" />
                <path d="M 2 2 L 30 2 L 35 7 L 7 7 L 7 35 L 2 30 Z" fill="none" stroke={color} strokeWidth="1" />

                {/* Deco Bits */}
                <rect x="45" y="2" width="10" height="2" fill={color} />
                <rect x="2" y="45" width="2" height="10" fill={color} />
            </svg>
        </div>
    );
};
