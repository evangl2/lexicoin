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
      const tx = displayX.get();
      const ty = displayY.get();
      const rx = displayRotateX.get();
      const ry = displayRotateY.get();
      const rz = displayRotateZ.get();
      // 3D-form rotateX/rotateY forces "trivial 3d transform" GPU layer promotion
      // even at 0deg — confirmed via DevTools Layers panel. Drop them when idle
      // so cards share the world's compositor layer (instead of 1 layer per card).
      if (Math.abs(rx) < 0.05 && Math.abs(ry) < 0.05) {
        el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rz}deg)`;
      } else {
        el.style.transform = `translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
      }
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
    // Visual scale (what the wrapper actually scales by) — keep using externalScale.
    const visualScale = externalScale ?? scaleSpring;
    // Promotion hysteresis MUST track per-card hover/expand state only.
    // Using externalScale (item.scale managed by useCardManager) caused every card
    // to potentially promote on item-scale spring overshoot, AND prevented hover
    // from triggering demote — leaking will-change:transform inline indefinitely
    // on every card that was ever briefly above 1.05.
    const promotionSource = scaleSpring;

    const PROMOTE_AT = 1.05;
    const DEMOTE_AT = 0.97;
    let promoted = promotionSource.get() > PROMOTE_AT;

    const applyPromoted = () => {
      card.style.transformStyle = 'flat';
      card.style.willChange = 'transform';
      wrapper.style.transformStyle = 'preserve-3d';
      wrapper.style.transform = `scale(${visualScale.get()}) translateZ(0)`;
    };
    const applyDemoted = () => {
      card.style.transformStyle = 'preserve-3d';
      card.style.willChange = 'auto';
      wrapper.style.transformStyle = '';
      wrapper.style.transform = `scale(${visualScale.get()})`;
    };

    const sync = () => {
      const v = promotionSource.get();
      const vel = Math.abs(promotionSource.getVelocity());
      if (!promoted && v > PROMOTE_AT && vel > 0.1) {
        promoted = true;
        applyPromoted();
      } else if (promoted && v < DEMOTE_AT) {
        promoted = false;
        applyDemoted();
      } else if (promoted && v < PROMOTE_AT && vel < 0.05) {
        promoted = false;
        applyDemoted();
      }
    };
    // Visual updates run independently — wrapper's scale value follows externalScale
    // even when no promotion transition occurs.
    const visualSync = () => {
      const v = visualScale.get();
      wrapper.style.transform = promoted ? `scale(${v}) translateZ(0)` : `scale(${v})`;
    };

    if (promoted) { applyPromoted(); } else { applyDemoted(); }
    const unsubPromotion = promotionSource.on('change', sync);
    const unsubVisual = visualScale === promotionSource
      ? () => {}
      : visualScale.on('change', visualSync);
    const unsub = () => { unsubPromotion(); unsubVisual(); };

    // Demote to CPU rendering when scale settles: GPU compositing layers rasterize at the
    // element's natural CSS size and GPU-scale the result, causing blur at high scale values.
    // Removing translateZ(0) lets the browser render at the correct effective resolution.
    // The next animation (collapse) will re-promote via sync → applyPromoted; scale-down
    // compositing does not blur (shrinking a higher-res texture is always sharp).
    const forceRerasterize = () => {
      if (!card.isConnected || !wrapper.isConnected || !promoted) return;
      promoted = false;
      applyDemoted();
    };

    let scaleSettleRaf: number | null = null;
    const onScaleChange = (v: number) => {
      if (v <= PROMOTE_AT) {
        if (scaleSettleRaf !== null) { cancelAnimationFrame(scaleSettleRaf); scaleSettleRaf = null; }
        return;
      }
      if (Math.abs(visualScale.getVelocity()) < 0.5) {
        if (scaleSettleRaf === null) {
          scaleSettleRaf = requestAnimationFrame(() => {
            scaleSettleRaf = null;
            if (Math.abs(visualScale.getVelocity()) < 0.5 && visualScale.get() > PROMOTE_AT) {
              forceRerasterize();
            }
          });
        }
      } else {
        if (scaleSettleRaf !== null) { cancelAnimationFrame(scaleSettleRaf); scaleSettleRaf = null; }
      }
    };
    const unsubScale = visualScale.on('change', onScaleChange);

    const onFlipChange = (v: number) => {
      const atRest = v < 0.01 || v > 0.99;
      if (atRest && Math.abs(flipSpring.getVelocity()) < 0.5 && visualScale.get() > PROMOTE_AT) {
        forceRerasterize();
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
