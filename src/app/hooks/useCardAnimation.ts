import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useSpring, useMotionValue, useTransform, MotionValue } from 'motion/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';

interface useCardAnimationParams {
  isExpanded: boolean;
  isFlipped: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
  canvasX: MotionValue<number>;
  canvasY: MotionValue<number>;
  canvasScale: MotionValue<number>;
  width: number;
  height: number;
  externalScale?: MotionValue<number>;
  cardRef: React.RefObject<HTMLDivElement>;
  scaleWrapperRef: React.RefObject<HTMLDivElement>;
  isPanningRef?: React.MutableRefObject<boolean>;
  displayRotateX: MotionValue<number>;
  displayRotateY: MotionValue<number>;
  displayRotateZ: MotionValue<number>;
}

/**
 * Hook to manage card expansion, flipping, and GPU-optimized transforms.
 * Handles the imperative transform applications and compositor layer promotions.
 */
export function useCardAnimation({
  isExpanded,
  isFlipped,
  x,
  y,
  canvasX,
  canvasY,
  canvasScale,
  width,
  height,
  externalScale,
  cardRef,
  scaleWrapperRef,
  isPanningRef,
  displayRotateX,
  displayRotateY,
  displayRotateZ,
}: useCardAnimationParams) {
  // targetCenterX / targetCenterY: only subscribed to camera when card is expanded or flipped.
  const targetCenterX = useMotionValue(0);
  const targetCenterY = useMotionValue(0);

  useEffect(() => {
    if (!isExpanded && !isFlipped) return;
    const update = () => {
      const s = canvasScale.get() || 1;
      targetCenterX.set((window.innerWidth / 2 - canvasX.get()) / s);
      targetCenterY.set((window.innerHeight / 2 - canvasY.get()) / s);
    };
    update();
    const unsubs = [
      canvasX.on('change', update),
      canvasY.on('change', update),
      canvasScale.on('change', update),
    ];
    window.addEventListener('resize', update, { passive: true });
    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('resize', update);
    };
  }, [isExpanded, isFlipped, canvasX, canvasY, canvasScale, targetCenterX, targetCenterY]);

  const zoomSpring = useSpring(0, CardPersona.physics.springs.flip);
  useEffect(() => {
    zoomSpring.set((isExpanded || isFlipped) ? 1 : 0);
  }, [isExpanded, isFlipped, zoomSpring]);

  const displayX = useTransform([x, targetCenterX, zoomSpring], (latest: number[]) => {
    const currentX = latest[0] || 0;
    const targetX = latest[1] || 0;
    const z = latest[2] || 0;
    return currentX + (targetX - currentX) * z;
  });

  const displayY = useTransform([y, targetCenterY, zoomSpring], (latest: number[]) => {
    const currentY = latest[0] || 0;
    const targetY = latest[1] || 0;
    const z = latest[2] || 0;
    return currentY + (targetY - currentY) * z;
  });

  // expandedScale: only subscribed when card is active.
  const expandedScale = useMotionValue(1.5);

  useEffect(() => {
    if (!isExpanded && !isFlipped) return;
    const update = () => {
      const s = canvasScale.get();
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) { expandedScale.set(1.5); return; }
      const safeScale = s > 0 ? s : 1;
      expandedScale.set((Math.min(w, h) * 0.8) / (Math.max(width, height) * safeScale));
    };
    update();
    const unsubs = [canvasScale.on('change', update)];
    window.addEventListener('resize', update, { passive: true });
    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('resize', update);
    };
  }, [isExpanded, isFlipped, canvasScale, expandedScale, width, height]);

  const scaleSpring = useSpring(1, CardPersona.physics.springs.scale);

  // Update scaleSpring based on mode and canvasScale
  useEffect(() => {
    if (isExpanded || isFlipped) {
      const unsubscribe = expandedScale.on("change", (v) => {
        scaleSpring.set(v);
      });
      scaleSpring.set(expandedScale.get());
      return unsubscribe;
    } else {
      scaleSpring.set(1);
    }
  }, [isExpanded, isFlipped, expandedScale, scaleSpring]);

  // Z-index imperative management
  const isFlippedRef = useRef(isFlipped);
  useEffect(() => { isFlippedRef.current = isFlipped; }, [isFlipped]);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const applyZIndex = (v: number) => {
      el.style.zIndex = (v > 1.01 || isFlippedRef.current) ? '500' : '1';
    };
    applyZIndex(scaleSpring.get());
    return scaleSpring.on('change', applyZIndex);
  }, [scaleSpring, cardRef]);

  // Re-apply when isFlipped changes
  useEffect(() => {
    isFlippedRef.current = isFlipped;
    const el = cardRef.current;
    if (!el) return;
    const v = scaleSpring.get();
    el.style.zIndex = (v > 1.01 || isFlipped) ? '500' : '1';
  }, [isFlipped, scaleSpring, cardRef]);

  // Imperative transforms on outer card
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const apply = () => {
      el.style.transform = `translateX(${displayX.get()}px) translateY(${displayY.get()}px) rotateX(${displayRotateX.get()}deg) rotateY(${displayRotateY.get()}deg) rotateZ(${displayRotateZ.get()}deg)`;
    };
    let pending = false;
    const scheduleApply = () => {
      if (pending) return;
      pending = true;
      Promise.resolve().then(() => {
        pending = false;
        if (isPanningRef?.current && !isExpanded && zoomSpring.get() < 0.001) return;
        apply();
      });
    };
    apply();
    const unsubs = [
      displayX.on('change', scheduleApply),
      displayY.on('change', scheduleApply),
      displayRotateX.on('change', scheduleApply),
      displayRotateY.on('change', scheduleApply),
      displayRotateZ.on('change', scheduleApply),
    ];
    return () => unsubs.forEach(u => u());
  }, [displayX, displayY, displayRotateX, displayRotateY, displayRotateZ, isExpanded, zoomSpring, isPanningRef, cardRef]);

  const flipSpring = useSpring(0, CardPersona.physics.springs.flip);
  useEffect(() => { flipSpring.set(isFlipped ? 1 : 0); }, [isFlipped, flipSpring]);
  const flipScaleX = useTransform(flipSpring, [0, 0.5, 1], [1, 0, 1]);
  const frontOpacity = useTransform(flipSpring, [0.45, 0.55], [1, 0]);
  const backOpacity = useTransform(flipSpring, [0.45, 0.55], [0, 1]);

  // GPU rasterization / compositor layer promotion
  useLayoutEffect(() => {
    const wrapper = scaleWrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;
    const scaleSource = externalScale ?? scaleSpring;

    const sync = (v: number) => {
      if (v > 1.01) {
        card.style.transformStyle = 'flat';
        card.style.willChange = 'transform';
        wrapper.style.transformStyle = 'preserve-3d';
        wrapper.style.transform = `scale(${v}) translateZ(0)`;
      } else {
        card.style.transformStyle = 'preserve-3d';
        card.style.willChange = 'auto';
        wrapper.style.transformStyle = '';
        wrapper.style.transform = `scale(${v})`;
      }
    };
    sync(scaleSource.get());
    const unsub = scaleSource.on('change', sync);

    const forceRerasterize = (v: number) => {
      if (!card.isConnected || !wrapper.isConnected) return;
      card.style.willChange = 'auto';
      card.style.opacity = '0.999';
      wrapper.style.transform = `scale(${v})`;
      requestAnimationFrame(() => {
        if (!card.isConnected || !wrapper.isConnected) return;
        requestAnimationFrame(() => {
          if (!card.isConnected || !wrapper.isConnected) return;
          card.style.willChange = 'transform';
          card.style.opacity = '1';
          wrapper.style.transform = `scale(${v}) translateZ(0)`;
        });
      });
    };

    let scaleSettleRaf: number | null = null;
    const onScaleChange = (v: number) => {
      if (v <= 1.01) {
        if (scaleSettleRaf !== null) { cancelAnimationFrame(scaleSettleRaf); scaleSettleRaf = null; }
        return;
      }
      if (Math.abs(scaleSource.getVelocity()) < 0.5) {
        if (scaleSettleRaf === null) {
          scaleSettleRaf = requestAnimationFrame(() => {
            scaleSettleRaf = null;
            if (Math.abs(scaleSource.getVelocity()) < 0.5 && scaleSource.get() > 1.01) {
              forceRerasterize(scaleSource.get());
            }
          });
        }
      } else {
        if (scaleSettleRaf !== null) { cancelAnimationFrame(scaleSettleRaf); scaleSettleRaf = null; }
      }
    };
    const unsubScale = scaleSource.on('change', onScaleChange);

    const onFlipChange = (v: number) => {
      const atRest = v < 0.01 || v > 0.99;
      if (atRest && Math.abs(flipSpring.getVelocity()) < 0.5 && scaleSource.get() > 1.01) {
        forceRerasterize(scaleSource.get());
      }
    };
    const unsubFlip = flipSpring.on('change', onFlipChange);

    return () => {
      unsub();
      unsubScale();
      unsubFlip();
      if (scaleSettleRaf !== null) cancelAnimationFrame(scaleSettleRaf);
    };
  }, [externalScale, scaleSpring, flipSpring, cardRef, scaleWrapperRef]);

  return {
    displayX,
    displayY,
    flipScaleX,
    frontOpacity,
    backOpacity,
    scaleSpring,
    flipSpring,
    targetCenterX,
    targetCenterY,
    zoomSpring,
  };
}
