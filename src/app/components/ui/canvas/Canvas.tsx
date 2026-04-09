import React, { useRef, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useTransform } from 'motion/react';
import { useCanvasPersona } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';

interface CanvasProps {
  children: React.ReactNode;
  scale: any; // MotionValue
  x: any;     // MotionValue
  y: any;     // MotionValue
  onDoubleClick?: (e: React.MouseEvent) => void;
  isZoomingRef?: React.MutableRefObject<boolean>;
}

export const Canvas: React.FC<CanvasProps> = ({ children, scale, x, y, onDoubleClick, isZoomingRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasPersona = useCanvasPersona();
  const { palette: { colors }, slots } = canvasPersona;

  // Plain refs for screen dimensions — cheaper than MotionValue.get() on every frame
  const screenWRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 0);
  const screenHRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 0);
  useEffect(() => {
    const onResize = () => {
      screenWRef.current = window.innerWidth;
      screenHRef.current = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ============================================================
  // WORLD DIMENSIONS
  // ============================================================
  const WORLD_W = 16000;  // Initial World Width (pixels)
  const WORLD_H = 10000;  // Initial World Height (pixels)
  const HALF_W = WORLD_W / 2;
  const HALF_H = WORLD_H / 2;

  // ============================================================
  // ZOOM INERTIA STATE
  // ============================================================
  // Wheel events accumulate pixel-delta into zoomVelocity.
  // The inertia loop consumes velocity each frame with friction — total zoom applied equals
  // accumulated input, but spread over ~10 frames instead of 1 → smooth deceleration.
  const accumulatedDy = useRef(0);      // wheel delta buffer (consumed by inertia loop)
  const zoomVelocityRef = useRef(0);    // remaining velocity in pixel-delta units
  const inertiaRafRef = useRef<number | null>(null);
  const latestMouseX = useRef(0);       // primitive refs — no heap allocation per event
  const latestMouseY = useRef(0);

  // ============================================================
  // ZOOM STATE SIGNALING
  // ============================================================
  const isZoomingInternalRef = useRef(false);
  const zoomEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markZoomStart = () => {
    isZoomingInternalRef.current = true;
    if (isZoomingRef) isZoomingRef.current = true;
  };

  const markZoomEnd = () => {
    if (zoomEndTimerRef.current) clearTimeout(zoomEndTimerRef.current);
    zoomEndTimerRef.current = setTimeout(() => {
      isZoomingInternalRef.current = false;
      if (isZoomingRef) isZoomingRef.current = false;
      // Re-emit scale so Card LOD subscribers fire once after zoom settles
      scale.set(scale.get());
    }, 150);
  };

  const clampCamera = (currentX: number, currentY: number, currentScale: number) => {
    if (typeof window === 'undefined') return { x: currentX, y: currentY };
    const screenW = screenWRef.current;
    const screenH = screenHRef.current;

    // Canvas Overscroll Distance (Allow users to see slightly beyond the edge)
    const OVERSCROLL_X = 300;
    const OVERSCROLL_Y = 150;

    const worldScreenW = WORLD_W * currentScale;
    const worldScreenH = WORLD_H * currentScale;

    // Calculate X Limits
    let minPosX, maxPosX;
    if (worldScreenW < screenW) {
      const centerX = screenW / 2;
      minPosX = centerX;
      maxPosX = centerX;
    } else {
      maxPosX = (worldScreenW / 2) + OVERSCROLL_X;
      minPosX = screenW - (worldScreenW / 2) - OVERSCROLL_X;
    }

    // Calculate Y Limits
    let minPosY, maxPosY;
    if (worldScreenH < screenH) {
      const centerY = screenH / 2;
      minPosY = centerY;
      maxPosY = centerY;
    } else {
      maxPosY = (worldScreenH / 2) + OVERSCROLL_Y;
      minPosY = screenH - (worldScreenH / 2) - OVERSCROLL_Y;
    }

    return {
      x: Math.min(Math.max(currentX, minPosX), maxPosX),
      y: Math.min(Math.max(currentY, minPosY), maxPosY),
    };
  };

  // ============================================================
  // ZOOM INERTIA LOOP
  // ============================================================
  // FRICTION = 0.72: each frame retains 72% of velocity → ~14 frames to 1% → ~233ms coast.
  // Total applied = v * (1-F) * (1 + F + F² + ...) = v * (1-F)/(1-F) = v  (same as instant).
  const ZOOM_FRICTION = 0.72;
  const ZOOM_MIN_VELOCITY = 0.5; // pixel-delta units; below this, stop the loop

  const runZoomInertia = () => {
    // Absorb any wheel events queued since last frame
    if (accumulatedDy.current !== 0) {
      zoomVelocityRef.current += accumulatedDy.current;
      accumulatedDy.current = 0;
    }

    markZoomStart();

    const v = zoomVelocityRef.current;
    if (Math.abs(v) < ZOOM_MIN_VELOCITY) {
      zoomVelocityRef.current = 0;
      inertiaRafRef.current = null;
      markZoomEnd();
      return;
    }

    const mouseX = latestMouseX.current;
    const mouseY = latestMouseY.current;
    const currentScale = scale.get();
    const currentX = x.get();
    const currentY = y.get();
    const screenW = screenWRef.current;
    const screenH = screenHRef.current;
    const limitMinScale = Math.max(0.08, Math.max(screenW / WORLD_W, screenH / WORLD_H));

    // Apply (1 - FRICTION) fraction of velocity this frame; remainder decays next frame
    const applied = v * (1 - ZOOM_FRICTION);
    const newScale = Math.min(
      Math.max(limitMinScale, currentScale * Math.exp(-applied * 0.001)),
      2.0
    );

    if (newScale !== currentScale) {
      const scaleRatio = newScale / currentScale;
      const clamped = clampCamera(
        mouseX - (mouseX - currentX) * scaleRatio,
        mouseY - (mouseY - currentY) * scaleRatio,
        newScale
      );
      scale.set(newScale);
      x.set(clamped.x);
      y.set(clamped.y);
    } else {
      // Scale limit reached — drain velocity so loop terminates
      zoomVelocityRef.current = 0;
      inertiaRafRef.current = null;
      markZoomEnd();
      return;
    }

    zoomVelocityRef.current = v * ZOOM_FRICTION;
    inertiaRafRef.current = requestAnimationFrame(runZoomInertia);
  };

  // Cancel any in-flight inertia on unmount
  useEffect(() => () => {
    if (inertiaRafRef.current !== null) cancelAnimationFrame(inertiaRafRef.current);
    if (zoomEndTimerRef.current !== null) clearTimeout(zoomEndTimerRef.current);
  }, []);

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], event }) => {
        if ((event.target as HTMLElement).closest('.canvas-card')) return;
        const currentScale = scale.get();
        const nextX = x.get() + dx;
        const nextY = y.get() + dy;
        const clamped = clampCamera(nextX, nextY, currentScale);
        x.set(clamped.x);
        y.set(clamped.y);
      },
      onWheel: ({ event, last }) => {
        // use-gesture fires a final onWheel with last:true (via 200ms timeout) reusing the last
        // real WheelEvent. Skipping it prevents every scroll tick from applying zoom twice.
        if (last) return;
        event.preventDefault();
        const we = event as WheelEvent;

        // deltaMode normalization: 0=pixels (trackpad), 1=lines (mouse), 2=pages (rare)
        const LINE_HEIGHT = 40;
        const normalizedDy =
          we.deltaMode === 1 ? we.deltaY * LINE_HEIGHT :
          we.deltaMode === 2 ? we.deltaY * window.innerHeight :
          we.deltaY;

        latestMouseX.current = we.clientX;
        latestMouseY.current = we.clientY;

        // Discrete (mouse wheel) vs continuous (trackpad) detection:
        // deltaMode !== 0  → line/page mode, always a physical wheel
        // deltaMode === 0 with large per-event delta → mouse in pixel mode
        // deltaMode === 0 with small delta → trackpad continuous gesture
        const isDiscreteWheel = we.deltaMode !== 0 || Math.abs(we.deltaY) >= 50;

        if (isDiscreteWheel) {
          // Mouse wheel: apply immediately in one frame — one click = one zoom step, no tail.
          const cs = scale.get(), cx = x.get(), cy = y.get();
          const sw = screenWRef.current, sh = screenHRef.current;
          const minScale = Math.max(0.08, Math.max(sw / WORLD_W, sh / WORLD_H));
          const ns = Math.min(Math.max(minScale, cs * Math.exp(-normalizedDy * 0.001)), 2.0);
          if (ns !== cs) {
            const r = ns / cs;
            const clamped = clampCamera(
              we.clientX - (we.clientX - cx) * r,
              we.clientY - (we.clientY - cy) * r,
              ns
            );
            markZoomStart();
            scale.set(ns);
            x.set(clamped.x);
            y.set(clamped.y);
            markZoomEnd();
          }
        } else {
          // Trackpad: feed inertia loop for smooth continuous zoom
          accumulatedDy.current += normalizedDy;
          if (inertiaRafRef.current === null) {
            inertiaRafRef.current = requestAnimationFrame(runZoomInertia);
          }
        }
      }
    },
    {
      target: containerRef,
      drag: { filterTaps: true },
      wheel: { eventOptions: { passive: false } }
    }
  );

  // Rotation values for animations (passed to slots)
  const rotateSlow = useTransform(x, (v: number) => v * 0.015);
  const rotateReverse = useTransform(x, (v: number) => v * -0.015);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative touch-none cursor-move"
      style={{ backgroundColor: colors.bgVoid }}
    >
      {/* --- THE VOID: SLOTS LAYERS --- */}

      {/* 1. Atmosphere */}
      <Slot slot={slots.VoidAtmosphere} />

      {/* 2. Metal Texture */}
      <Slot slot={slots.MetalTexture} />

      {/* 3. Parallax Noise */}
      <Slot slot={slots.ScriptNoise} props={{ x, y }} />

      {/* 4. Sacred Geometry (Background Lines) */}
      <Slot slot={slots.SacredGeometry} />

      {/* 5. Transmutation Circle (Center) */}
      <Slot slot={slots.TransmutationCircle} props={{ rotateSlow, rotateReverse }} />

      {/* 6. Corner Gears */}
      <Slot slot={slots.CornerGears} props={{ rotateSlow, rotateReverse }} />

      {/* 7. Edge Runes */}
      <Slot slot={slots.EdgeRunes} />

      {/* 8. Vignette (Global) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{ background: `radial-gradient(transparent 40%, ${colors.bgVoid || '#000000'} 100%)` }}
      />

      {/* --- THE WORLD: OBSIDIAN TABLET --- */}
      <motion.div
        style={{
          x,
          y,
          scale,
          width: WORLD_W,
          height: WORLD_H,
          top: -HALF_H,
          left: -HALF_W,
        }}
        className="absolute origin-center"
      >
        {/* Render the Grid System from slot */}
        <Slot slot={slots.GridSystem} props={{ scale, width: WORLD_W, height: WORLD_H }} />

        {/* Content Layer */}
        <div
          className="absolute inset-0"
          onDoubleClick={onDoubleClick}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};
