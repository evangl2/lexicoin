import React, { useRef } from 'react';
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
}

export const Canvas: React.FC<CanvasProps> = ({ children, scale, x, y, onDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasPersona = useCanvasPersona();
  const { palette: { colors }, slots } = canvasPersona;

  // ============================================================
  // WORLD DIMENSIONS
  // ============================================================
  const WORLD_W = 16000;  // Initial World Width (pixels)
  const WORLD_H = 10000;  // Initial World Height (pixels)
  const HALF_W = WORLD_W / 2;
  const HALF_H = WORLD_H / 2;

  const clampCamera = (currentX: number, currentY: number, currentScale: number) => {
    if (typeof window === 'undefined') return { x: currentX, y: currentY };
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

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
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault();
        const currentScale = scale.get();
        const currentX = x.get();
        const currentY = y.get();
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const minScaleW = screenW / WORLD_W;
        const minScaleH = screenH / WORLD_H;
        const dynamicMinScale = Math.max(minScaleW, minScaleH);
        const limitMinScale = Math.max(0.08, dynamicMinScale);

        const zoomFactor = -dy * 0.001;
        const newScale = Math.min(Math.max(limitMinScale, currentScale + zoomFactor), 2.0);

        if (newScale === currentScale) return;

        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const scaleRatio = newScale / currentScale;
        const nextX = mouseX - (mouseX - currentX) * scaleRatio;
        const nextY = mouseY - (mouseY - currentY) * scaleRatio;
        const clamped = clampCamera(nextX, nextY, newScale);

        scale.set(newScale);
        x.set(clamped.x);
        y.set(clamped.y);
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
