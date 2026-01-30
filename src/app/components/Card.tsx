import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion, useVelocity, useTransform, useSpring, useMotionTemplate, useMotionValue, MotionValue } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { CardVisual, getElementLabel } from '@/app/components/CardVisual';

// --- Types & Data ---
// (Moved to CardVisual.tsx)

interface CardProps {
  id: string;
  title: string;
  image: string;
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
  canvasScale: number;

  // Alchemy Props
  difficultyLevel?: string;
  partOfSpeech?: string;
  durability?: number;
  systemLanguage?: string;
  learningLanguage?: string;

  onDragStart?: () => void;
  onDragEnd?: () => void;
  updatePosition: (id: string, x: number, y: number) => void;
  onDelete?: () => void;
  onChangeImage?: (url: string) => void;
  onDropItem?: (item: any) => void;
  isHidden?: boolean;
}

export const Card: React.FC<CardProps> = ({
  id,
  title,
  image,
  x,
  y,
  width,
  height,
  canvasScale,
  difficultyLevel = "A1",
  partOfSpeech = "n.",
  durability = 100,
  systemLanguage = "EN",
  learningLanguage = "ENGLISH",
  onDragStart,
  onDragEnd,
  updatePosition,
  isHidden = false,
  onDropItem,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // --- Drop Target (Items) ---
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ITEM',
    drop: (item, monitor) => {
      onDropItem?.(item);
      return { name: title }; // Return drop result if needed
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const [windowDim, setWindowDim] = useState({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Mouse & Resize ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const centerX = useMotionValue(0);
  const centerY = useMotionValue(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateDim = () => {
        setWindowDim({ w: window.innerWidth, h: window.innerHeight });
        centerX.set(window.innerWidth / 2);
        centerY.set(window.innerHeight / 2);
      };
      updateDim();
      window.addEventListener('resize', updateDim);
      return () => window.removeEventListener('resize', updateDim);
    }
  }, [centerX, centerY]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded, mouseX, mouseY]);

  useEffect(() => {
    const handleGlobalClick = (e: PointerEvent) => {
      if ((isExpanded || isFlipped) && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsFlipped(false);
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
  }, [isExpanded, isFlipped]);

  // --- Physics ---
  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  const smoothXVelocity = useSpring(xVelocity, CardPersona.physics.springs.smoothVelocity);
  const smoothYVelocity = useSpring(yVelocity, CardPersona.physics.springs.smoothVelocity);

  const velocityRotateY = useTransform(smoothXVelocity, CardPersona.physics.tilt.velocityRange, CardPersona.physics.tilt.rotateY);
  // Invert X rotation to match physics drag (Leading edge pushes back)
  const rawRotateX = useTransform(smoothYVelocity, CardPersona.physics.tilt.velocityRange, CardPersona.physics.tilt.rotateX);
  const velocityRotateX = useTransform(rawRotateX, (v) => -v);
  const velocityRotateZ = useTransform(smoothXVelocity, [-2000, 2000], CardPersona.physics.tilt.rotateZ);

  const mouseSpringX = useSpring(mouseX, CardPersona.physics.springs.mouseTilt);
  const mouseSpringY = useSpring(mouseY, CardPersona.physics.springs.mouseTilt);

  const mouseRotateY = useTransform(mouseSpringX, (val) => {
    const center = windowDim.w / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const mouseRotateX = useTransform(mouseSpringY, (val) => {
    const center = windowDim.h / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const displayRotateX = isExpanded ? mouseRotateX : velocityRotateX;
  const displayRotateY = isExpanded ? mouseRotateY : velocityRotateY;
  const displayRotateZ = isExpanded ? 0 : velocityRotateZ;

  // --- Glare & Sheen ---
  const glarePos = useTransform(displayRotateY, [-20, 20], ["0%", "100%"]);
  const movementIntensity = useTransform(
    [smoothXVelocity, smoothYVelocity],
    ([vx, vy]) => {
      const speed = Math.sqrt(vx * vx + vy * vy);
      return Math.min(speed / 1000, CardPersona.physics.glare.opacityCap);
    }
  );
  const targetGlareOpacity = isExpanded ? 0 : movementIntensity;
  const glareBackground = useMotionTemplate`
    linear-gradient(
      115deg, 
      transparent 0%, 
      rgba(192, 160, 98, 0.0) ${glarePos}, 
      ${CardPersona.physics.glare.color} calc(${glarePos} + 10%), 
      rgba(192, 160, 98, 0.0) calc(${glarePos} + 25%), 
      transparent 100%
    )
  `;

  // --- Scale ---
  const getExpandedScale = () => {
    if (windowDim.w === 0) return 1.5;
    const minScreenDim = Math.min(windowDim.w, windowDim.h);
    const targetSize = minScreenDim * 0.8;
    const cardMaxDim = Math.max(width, height);
    const safeScale = canvasScale > 0 ? canvasScale : 1;
    return targetSize / (cardMaxDim * safeScale);
  };
  const expandedScale = getExpandedScale();
  const targetScale = isExpanded ? expandedScale : isDragging ? 1.15 : isHovered ? 1.05 : 1;

  // --- Parallax & Depth ---
  const bgParallaxX = useTransform(displayRotateY, [-20, 20], [15, -15]);
  const bgParallaxY = useTransform(displayRotateX, [-20, 20], [15, -15]);
  const fgParallaxX = useTransform(displayRotateY, [-20, 20], [-25, 25]);
  const fgParallaxY = useTransform(displayRotateX, [-20, 20], [-25, 25]);

  // --- Shadows ---
  const targetShadow = isDragging
    ? CardPersona.tokens.shadows.dragging
    : isExpanded
      ? CardPersona.tokens.shadows.expanded
      : isHovered
        ? CardPersona.tokens.shadows.hover
        : CardPersona.tokens.shadows.base;
  const zIndex = isDragging ? 100 : (isExpanded ? 50 : (isHovered ? 10 : 1));

  // --- Flip ---
  const flipSpring = useSpring(0, CardPersona.physics.springs.flip);
  useEffect(() => { flipSpring.set(isFlipped ? 1 : 0); }, [isFlipped, flipSpring]);
  const flipScaleX = useTransform(flipSpring, [0, 0.5, 1], [1, 0, 1]);
  const frontOpacity = useTransform(flipSpring, [0.45, 0.55], [1, 0]);
  const backOpacity = useTransform(flipSpring, [0.45, 0.55], [0, 1]);

  // --- Gesture ---
  const bind = useDrag(({ active, xy: [px, py], movement: [mx, my], delta: [dx, dy], first, last }) => {
    if (first) {
      setIsDragging(true);
      if (isExpanded) {
        // Smart Snap
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const oldCenterX = rect.left + rect.width / 2;
          const oldCenterY = rect.top + rect.height / 2;

          const targetDraggingScale = 1.15; // Match targetScale logic
          const ratio = targetDraggingScale / expandedScale;

          // Calculate shift needed to keep visual point constant
          const shiftScreenX = (px - oldCenterX) * (1 - ratio);
          const shiftScreenY = (py - oldCenterY) * (1 - ratio);

          const s = canvasScale || 1;
          x.set(x.get() + shiftScreenX / s);
          y.set(y.get() + shiftScreenY / s);
        }
        setIsExpanded(false);
      }
      onDragStart?.();
    }
    if (active) {
      const scale = canvasScale || 1;

      const nextX = x.get() + dx / scale;
      const nextY = y.get() + dy / scale;

      // STEP 4: Collision Blocking & Snap
      // Boundaries: 16000x10000 => -8000 to 8000, -5000 to 5000
      const WORLD_W = 16000;
      const WORLD_H = 10000;
      const minX = -(WORLD_W / 2) + width / 2;
      const maxX = (WORLD_W / 2) - width / 2;
      const minY = -(WORLD_H / 2) + height / 2;
      const maxY = (WORLD_H / 2) - height / 2;

      // Check distance to border for snapping (10px threshold)
      const snapThreshold = 10;
      let finalX = nextX;
      let finalY = nextY;

      // Snap logic
      if (Math.abs(finalX - minX) < snapThreshold) finalX = minX;
      else if (Math.abs(finalX - maxX) < snapThreshold) finalX = maxX;

      if (Math.abs(finalY - minY) < snapThreshold) finalY = minY;
      else if (Math.abs(finalY - maxY) < snapThreshold) finalY = maxY;

      // Hard Clamp
      finalX = Math.min(Math.max(finalX, minX), maxX);
      finalY = Math.min(Math.max(finalY, minY), maxY);

      x.set(finalX);
      y.set(finalY);

      updatePosition(id, finalX, finalY);
    }
    if (last) {
      setIsDragging(false);
      onDragEnd?.();
    }
  }, { pointer: { keys: false }, eventOptions: { passive: false } });
  const handlers = bind();

  // Active state for animations
  const isActive = isHovered || isDragging || isExpanded || isOver;

  return (
    <motion.div
      ref={(node) => {
        // @ts-ignore
        cardRef.current = node;
        drop(node);
      }}
      {...handlers}
      onClick={(e) => {
        if (isDragging) return;
        // Ensure only left click triggers this logic to prevent conflict with context menu
        if (e.button !== 0) return;

        // When back face is visible, ignore clicks on interactive back face content
        if (isFlipped) {
          const target = e.target as HTMLElement;
          // Check if the click is within the back face content area
          if (target.closest('.back-face-content')) {
            // This is within the back face, don't handle zoom here
            return;
          }
        }

        if (!isFlipped) {
          setIsExpanded(!isExpanded);
        } else {
          setIsExpanded(true);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isFlipped) {
          setIsFlipped(true);
        } else {
          setIsFlipped(false);
        }
      }}
      style={{
        x, y, width, height,
        rotateX: displayRotateX, rotateY: displayRotateY, rotateZ: displayRotateZ,
        zIndex,
        opacity: isHidden ? 0 : 1, // Hide when proxy is active
        // Dynamic performance optimization: 
        // Only hint will-change during active high-framerate dragging to prevent blurring during static reads
        willChange: isDragging ? 'transform' : 'auto',
        transformStyle: 'preserve-3d', // Enable 3D context for sharper scaling
        cursor: isDragging ? "grabbing" : (isExpanded ? "zoom-out" : "grab"),
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -width / 2, marginTop: -height / 2,
        touchAction: 'none',
      }}
      onPointerDown={(e) => { e.stopPropagation(); handlers.onPointerDown(e); }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onDoubleClick={(e) => e.stopPropagation()}
      animate={{ scale: targetScale, boxShadow: targetShadow }}
      transition={CardPersona.physics.springs.scale}
      className="canvas-card select-none group relative transition-colors duration-300"
    >
      <CardVisual
        title={title}
        difficultyLevel={difficultyLevel}
        partOfSpeech={partOfSpeech}
        durability={durability}
        systemLanguage={systemLanguage}
        learningLanguage={learningLanguage}
        isActive={isActive}
        isOver={isOver}

        flipScaleX={flipScaleX}
        frontOpacity={frontOpacity}
        backOpacity={backOpacity}

        bgParallaxX={bgParallaxX}
        bgParallaxY={bgParallaxY}
        fgParallaxX={fgParallaxX}
        fgParallaxY={fgParallaxY}

        glareBackground={glareBackground}
        targetGlareOpacity={targetGlareOpacity}
      />
    </motion.div>
  );
};
