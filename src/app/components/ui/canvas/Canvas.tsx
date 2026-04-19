import React, { useRef, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useGameStore } from '@store/index';
import { useCanvasPersona } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';
import { WORLD_W, WORLD_H } from '@/config/canvas';
import {
  ZOOM_FRICTION, ZOOM_MIN_VELOCITY, ZOOM_SENSITIVITY, ZOOM_MAX, ZOOM_MIN_FLOOR,
  CANVAS_ZOOM_END_DEBOUNCE_MS, CANVAS_OVERSCROLL,
} from '@/config/physics';
import { CANVAS_PARALLAX_FACTOR } from '@/config/visual';

interface CanvasProps {
  children: React.ReactNode;
  scale: any; // MotionValue
  x: any;     // MotionValue
  y: any;     // MotionValue
  onDoubleClick?: (e: React.MouseEvent) => void;
  isZoomingRef?: React.MutableRefObject<boolean>;
  isPanningRef?: React.MutableRefObject<boolean>;
  expandedIdsRef?: React.MutableRefObject<Set<string>>;
}

export const Canvas: React.FC<CanvasProps> = ({ children, scale, x, y, onDoubleClick, isZoomingRef, isPanningRef, expandedIdsRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
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
  const HALF_W = WORLD_W / 2;
  const HALF_H = WORLD_H / 2;

  // ============================================================
  // ZOOM INERTIA STATE
  // ============================================================
  // All wheel input (mouse + trackpad) feeds this accumulator.
  // The inertia loop spreads the zoom over ~10 frames → smooth deceleration.
  // Mouse wheel: one click = one step, same total zoom, but eased over ~233ms.
  // Trackpad: continuous input, naturally smooth.
  const accumulatedDy = useRef(0);
  const zoomVelocityRef = useRef(0);
  const inertiaRafRef = useRef<number | null>(null);
  const latestMouseX = useRef(0);
  const latestMouseY = useRef(0);

  // ============================================================
  // ZOOM STATE SIGNALING
  // ============================================================
  const isZoomingInternalRef = useRef(false);
  const zoomEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markZoomStart = () => {
    if (isZoomingInternalRef.current) return; // 已在缩放中，无需重复执行
    isZoomingInternalRef.current = true;
    if (isZoomingRef) isZoomingRef.current = true;
    // 1. 禁用卡片层 hit-test — 缩放期间无需计算子元素指针碰撞
    // 注意：作用于 world div 而非 container，container 需要保持接收 wheel 事件
    if (worldRef.current) worldRef.current.style.pointerEvents = 'none';
  };

  const markZoomEnd = () => {
    if (zoomEndTimerRef.current) clearTimeout(zoomEndTimerRef.current);
    zoomEndTimerRef.current = setTimeout(() => {
      isZoomingInternalRef.current = false;
      if (isZoomingRef) isZoomingRef.current = false;
      // 还原卡片层 pointer-events
      if (worldRef.current) worldRef.current.style.pointerEvents = '';
      // Re-emit scale so Card LOD subscribers fire once after zoom settles
      scale.set(scale.get());
    }, CANVAS_ZOOM_END_DEBOUNCE_MS);
  };

  // ============================================================
  // PAN STATE — ref used by background-freeze logic and App.tsx
  // ============================================================
  // Declared here (before useGesture) so the onDrag closure captures it correctly.
  const isPanningInternalRef = useRef(false);

  // ============================================================
  // CURSOR STATE — direct DOM write, no React re-render
  // ============================================================
  const setCursor = (grabbing: boolean) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = grabbing ? 'grabbing' : 'grab';
    }
  };

  // ============================================================

  const clampCamera = (currentX: number, currentY: number, currentScale: number) => {
    if (typeof window === 'undefined') return { x: currentX, y: currentY };
    const screenW = screenWRef.current;
    const screenH = screenHRef.current;

    const OVERSCROLL_X = CANVAS_OVERSCROLL.X;
    const OVERSCROLL_Y = CANVAS_OVERSCROLL.Y;

    const worldScreenW = WORLD_W * currentScale;
    const worldScreenH = WORLD_H * currentScale;

    let minPosX, maxPosX;
    if (worldScreenW < screenW) {
      const centerX = screenW / 2;
      minPosX = centerX;
      maxPosX = centerX;
    } else {
      maxPosX = (worldScreenW / 2) + OVERSCROLL_X;
      minPosX = screenW - (worldScreenW / 2) - OVERSCROLL_X;
    }

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
  // ZOOM_FRICTION retains that % per frame → smooth deceleration.
  // Total zoom applied equals accumulated input — same as instant, but spread over frames.

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
    const limitMinScale = Math.max(ZOOM_MIN_FLOOR, Math.max(screenW / WORLD_W, screenH / WORLD_H));

    const applied = v * (1 - ZOOM_FRICTION);
    const newScale = Math.min(
      Math.max(limitMinScale, currentScale * Math.exp(-applied * ZOOM_SENSITIVITY)),
      ZOOM_MAX
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
      onDrag: ({ delta: [dx, dy], first, last, event }) => {
        if ((event.target as HTMLElement).closest('.canvas-card')) return;

        if (first) {
          setCursor(true);
          // Freeze background elements for pan duration — see isPanningInternalRef comment above.
          isPanningInternalRef.current = true;
          if (isPanningRef) isPanningRef.current = true;
        }

        // Move camera
        const nextX = x.get() + dx;
        const nextY = y.get() + dy;
        const clamped = clampCamera(nextX, nextY, scale.get());
        x.set(clamped.x);
        y.set(clamped.y);

        if (last) {
          setCursor(false);
          // Unfreeze background and snap to final camera position.
          // Values were held constant during pan; apply the accumulated delta now
          // so gears/noise reflect the new camera position without a jarring jump.
          isPanningInternalRef.current = false;
          if (isPanningRef) isPanningRef.current = false;
          const fx = x.get();
          const fy = y.get();
          rotateSlow.set(fx * CANVAS_PARALLAX_FACTOR);
          rotateReverse.set(fx * -CANVAS_PARALLAX_FACTOR);
          bgX.set(fx);
          bgY.set(fy);
        }
      },
      onWheel: ({ event, last }) => {
        // use-gesture fires a final onWheel with last:true reusing the last real WheelEvent.
        // Skipping it prevents every scroll tick from applying zoom twice.
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
        const isDiscreteWheel = we.deltaMode !== 0 || Math.abs(we.deltaY) >= 50;

        if (isDiscreteWheel) {
          // Mouse wheel: apply instantly in one frame — no inertia tail.
          const cs = scale.get(), cx = x.get(), cy = y.get();
          const sw = screenWRef.current, sh = screenHRef.current;
          const minScale = Math.max(ZOOM_MIN_FLOOR, Math.max(sw / WORLD_W, sh / WORLD_H));
          const ns = Math.min(Math.max(minScale, cs * Math.exp(-normalizedDy * ZOOM_SENSITIVITY)), ZOOM_MAX);
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

  // ============================================================
  // BACKGROUND PARALLAX / ROTATION — FROZEN DURING PAN & ZOOM
  // ============================================================
  // CornerGears (×4) + TransmutationCircle (×3) subscribe to rotateSlow/Reverse.
  // ScriptNoise subscribes to bgX/bgY.
  // All 8 elements carry CSS filter + mix-blend-* which forces the browser onto
  // the main-thread paint path on every style write.
  // During pan: x/y change at 60 Hz → 8 × 60 = 480 expensive repaints/s.
  // Fix: gate updates with isPanningInternalRef so background elements hold still
  // while the camera moves. Values are snapped to final position on pan-end.

  const rotateSlow = useMotionValue(x.get() * CANVAS_PARALLAX_FACTOR);
  const rotateReverse = useMotionValue(x.get() * -CANVAS_PARALLAX_FACTOR);
  // Frozen copies of camera x/y passed to ScriptNoise instead of raw x/y.
  const bgX = useMotionValue(x.get());
  const bgY = useMotionValue(y.get());

  useEffect(() => {
    const unsubX = x.on('change', (v: number) => {
      // Gate: skip during zoom (zoom-to-cursor changes x every frame) AND during pan
      if (isZoomingInternalRef.current || isPanningInternalRef.current) return;
      rotateSlow.set(v * CANVAS_PARALLAX_FACTOR);
      rotateReverse.set(v * -CANVAS_PARALLAX_FACTOR);
      bgX.set(v);
    });
    const unsubY = y.on('change', (v: number) => {
      if (isZoomingInternalRef.current || isPanningInternalRef.current) return;
      bgY.set(v);
    });
    return () => { unsubX(); unsubY(); };
  // x/y/rotateSlow/rotateReverse/bgX/bgY are stable MotionValue object refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAnyCardZoomed = useGameStore(s => s.zoomedCardIds.length > 0);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative touch-none cursor-grab"
      style={{ backgroundColor: colors.bgVoid }}
    >
      {/* --- THE VOID: SLOTS LAYERS --- */}

      {/* 1. Atmosphere */}
      <Slot slot={slots.VoidAtmosphere} />

      {/* 2. Metal Texture */}
      <Slot slot={slots.MetalTexture} />

      {/* 3. Parallax Noise — use frozen bgX/bgY to avoid per-frame repaint during pan */}
      <Slot slot={slots.ScriptNoise} props={{ x: bgX, y: bgY }} />

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
        ref={worldRef}
        style={{
          x,
          y,
          scale,
          width: WORLD_W,
          height: WORLD_H,
          top: -HALF_H,
          left: -HALF_W,
          willChange: isAnyCardZoomed ? 'auto' : 'transform',
          contain: 'layout',
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
