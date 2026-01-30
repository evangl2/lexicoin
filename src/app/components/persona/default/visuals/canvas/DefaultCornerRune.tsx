import React from 'react';

// Memoized for performance
export const DefaultCornerRune = React.memo<{
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | string,
    color: string
}>(({ position, color }) => {
    const isTop = position.includes('top');
    const isLeft = position.includes('left');
    const rotation = isTop && isLeft ? 0 : isTop && !isLeft ? 90 : !isTop && !isLeft ? 180 : 270;

    return (
        <div
            className={`absolute w-64 h-64 pointer-events-none opacity-80 ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'}`}
            style={{ color }}
        >
            <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ transform: `rotate(${rotation}deg)` }}>
                {/* Corner Brace */}
                <path d="M 4 200 L 4 4 L 200 4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M 12 200 L 12 12 L 200 12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />

                {/* Decorative Rivets */}
                <circle cx="20" cy="190" r="3" fill="currentColor" />
                <circle cx="190" cy="20" r="3" fill="currentColor" />
                <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2" />

                {/* Diagonal Ornament */}
                <path d="M 0 0 L 80 80" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                <circle cx="60" cy="60" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M 55 55 L 65 65 M 65 55 L 55 65" stroke="currentColor" strokeWidth="1" />
            </svg>
        </div>
    );
});
