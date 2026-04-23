import React, { useRef, useEffect } from 'react';
import { type MotionValue } from 'motion/react';
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

export const MemoizedCardVisual = React.memo(({
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
}: MemoizedCardVisualProps) => {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Single microtask flush for all four parallax values.
    // Previously, bgParallaxX and bgParallaxY each had independent callbacks that could
    // both fire in the same frame, writing bgRef.style.transform twice with inconsistent values.
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
    const schedule = () => { if (pending) return; pending = true; Promise.resolve().then(flush); };
    flush();
    const unsubs = [
      bgParallaxX?.on?.('change', schedule),
      bgParallaxY?.on?.('change', schedule),
      fgParallaxX?.on?.('change', schedule),
      fgParallaxY?.on?.('change', schedule),
    ];
    return () => unsubs.forEach(u => u?.());
  }, [bgParallaxX, bgParallaxY, fgParallaxX, fgParallaxY]);

  return (
    <div
      className="relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center"
      style={{ boxShadow: isCompact ? 'none' : 'var(--card-shadow-inner-depth)' }}
    >
      <div
        ref={bgRef}
        className="absolute inset-[-20%]"
        style={{ background: 'var(--card-color-bg-deep)', opacity: 0.8 }}
      >
        <div
          className="w-full h-full opacity-[0.15]"
          style={{ backgroundImage: 'var(--card-texture-deep-pattern)', backgroundSize: '120px 60px' }}
        />
      </div>

      <Persona.visuals.Frame />

      <div
        ref={fgRef}
        className={`absolute inset-0 flex items-center justify-center z-40 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]
            ${isCompact ? 'scale-[1.0] opacity-30 mix-blend-screen' : ''}`}
      >
        <DynamicVisual code={visualPayload} isActive={isActive} fallbackElement={fallbackWord} />
      </div>

      {Persona.visuals.DurabilityBar ? (
        <div className="absolute bottom-0 inset-x-0 z-50 flex justify-center">
          <Persona.visuals.DurabilityBar progress={durability} />
        </div>
      ) : (
        !isCompact && (
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
        )
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isCompact      === nextProps.isCompact      &&
    prevProps.visualPayload  === nextProps.visualPayload  &&
    prevProps.isActive       === nextProps.isActive       &&
    prevProps.fallbackWord   === nextProps.fallbackWord   &&
    prevProps.durability     === nextProps.durability     &&
    prevProps.bgParallaxX    === nextProps.bgParallaxX    &&
    prevProps.bgParallaxY    === nextProps.bgParallaxY    &&
    prevProps.Persona        === nextProps.Persona
  );
});

MemoizedCardVisual.displayName = 'MemoizedCardVisual';
