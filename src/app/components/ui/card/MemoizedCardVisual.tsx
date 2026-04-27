import React, { useRef, useEffect } from 'react';
import { motion, type MotionValue } from 'motion/react';
import { DynamicVisual } from '@/app/components/ui/visual/DynamicVisual';

export interface MemoizedCardVisualProps {
  isCompact: boolean;
  visualPayload: any;
  isActive: boolean;
  fallbackWord: string;
  Persona: any;
  bgParallaxX: MotionValue<number>;
  bgParallaxY: MotionValue<number>;
  fgParallaxX: MotionValue<number>;
  fgParallaxY: MotionValue<number>;
  durability: number;
}

/**
 * CardVisual - Inner component to handle the actual rendering logic.
 * Named distinctly to avoid collision with the MemoizedCardVisual HOC in DevTools.
 */
const CardVisual: React.FC<MemoizedCardVisualProps> = ({
  isCompact,
  visualPayload,
  isActive,
  fallbackWord,
  Persona,
  bgParallaxX,
  bgParallaxY,
  fgParallaxX,
  fgParallaxY,
  durability,
}) => {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Single microtask flush for all four parallax values to avoid layout thrashing
    let pending = false;
    const flush = () => {
      pending = false;
      if (bgRef.current) {
        bgRef.current.style.transform =
          `translateX(${bgParallaxX?.get?.() ?? 0}px) translateY(${bgParallaxY?.get?.() ?? 0}px)`;
      }
      if (fgRef.current) {
        fgRef.current.style.transform =
          `translateX(${fgParallaxX?.get?.() ?? 0}px) translateY(${fgParallaxY?.get?.() ?? 0}px)`;
      }
    };

    const schedule = () => {
      if (pending) return;
      pending = true;
      Promise.resolve().then(flush);
    };

    flush();

    const unsubs = [
      bgParallaxX?.on?.('change', schedule),
      bgParallaxY?.on?.('change', schedule),
      fgParallaxX?.on?.('change', schedule),
      fgParallaxY?.on?.('change', schedule),
    ];

    return () => unsubs.forEach(u => u?.());
  }, [bgParallaxX, bgParallaxY, fgParallaxX, fgParallaxY]);

  if (isCompact) {
    return (
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-normal overflow-hidden pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center scale-105 -translate-y-[5%]">
          <DynamicVisual code={visualPayload} isActive={false} fallbackElement={fallbackWord} />
        </div>
      </div>
    );
  }

  // Visual Parts from Persona
  const Background = Persona.visuals.Background;
  const TextureOverlay = Persona.visuals.TextureOverlay;
  const Frame = Persona.visuals.Frame;
  const DurabilityBar = Persona.visuals.DurabilityBar;

  return (
    <div
      className="relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center isolate"
      style={{ boxShadow: 'var(--card-shadow-inner-depth)' }}
    >
      {/* 1. Background Layer (Parallax 1) */}
      <div
        ref={bgRef}
        className="absolute inset-[-20%] z-0"
        style={{ background: 'var(--card-color-bg-deep)' }}
      >
        {Background ? (
          <Background />
        ) : (
          <div
            className="w-full h-full opacity-[0.15]"
            style={{ backgroundImage: 'var(--card-texture-deep-pattern)', backgroundSize: '120px 60px' }}
          />
        )}
      </div>

      {/* 2. Texture Overlay */}
      {TextureOverlay && (
        <div className="absolute inset-0 z-10 opacity-30 mix-blend-overlay pointer-events-none">
          <TextureOverlay />
        </div>
      )}

      {/* 3. Main Subject (Parallax 2) */}
      <div
        ref={fgRef}
        className="absolute inset-0 flex items-center justify-center z-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] pointer-events-none"
      >
        <DynamicVisual code={visualPayload} isActive={isActive} fallbackElement={fallbackWord} />
      </div>

      {/* 4. Corners Decoration (Removed per user request) */}

      {/* 5. Frame Layer (Slotted) */}
      {Frame && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <Frame />
        </div>
      )}

      {/* 6. Durability Bar (Status Layer) */}
      {DurabilityBar ? (
        <div className="absolute bottom-0 inset-x-0 z-50 flex justify-center">
          <DurabilityBar progress={durability} />
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-50 w-full h-[4px] bg-black/20 flex justify-center items-center">
          <div
            className="h-full opacity-90"
            style={{
              width: `${durability}%`,
              transition: 'width 0.5s ease-out',
              background: 'linear-gradient(to right, var(--card-color-gold-metallic), var(--card-color-gold-bright), var(--card-color-gold-metallic))',
              boxShadow: '0 0 10px var(--card-color-gold-metallic)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export const MemoizedCardVisual = React.memo(CardVisual, (prevProps, nextProps) => {
  return (
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.visualPayload === nextProps.visualPayload &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.fallbackWord === nextProps.fallbackWord &&
    prevProps.durability === nextProps.durability &&
    prevProps.bgParallaxX === nextProps.bgParallaxX &&
    prevProps.bgParallaxY === nextProps.bgParallaxY &&
    prevProps.fgParallaxX === nextProps.fgParallaxX &&
    prevProps.fgParallaxY === nextProps.fgParallaxY &&
    prevProps.Persona === nextProps.Persona
  );
});

MemoizedCardVisual.displayName = 'MemoizedCardVisual';
