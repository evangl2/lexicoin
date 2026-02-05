import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion, useVelocity, useTransform, useSpring, useMotionValue, MotionValue } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { CardVisual } from '@/app/components/CardVisual';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';

// --- Types & Data ---

interface CardProps {
  /**
   * Complete card data (extracted from SenseEntity)
   * Contains all displayData, senseInfo, visual, and rawSense
   */
  cardData: CardEntity;

  /**
   * Current display language for the card
   * Used to select displayData[currentLanguage] for rendering
   */
  currentLanguage: Language;

  /**
   * System language for UI elements (fallback language)
   */
  systemLanguage: Language;

  // ========== Canvas Transform ==========
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
  canvasScale: number;

  // ========== Callbacks ==========
  onDragStart?: () => void;
  onDragEnd?: () => void;
  updatePosition: (id: string, x: number, y: number) => void;
  onDelete?: () => void;
  onDropItem?: (item: any) => void;
  isHidden?: boolean;
}

export const Card: React.FC<CardProps> = ({
  cardData,
  currentLanguage,
  systemLanguage,
  x,
  y,
  width,
  height,
  canvasScale,
  onDragStart,
  onDragEnd,
  updatePosition,
  isHidden = false,
  onDropItem,
}) => {
  // ========== Extract Display Data from CardEntity ==========
  // Select display data for current language
  const displayData = cardData.displayData[currentLanguage];

  // Extract commonly used fields for convenience
  const id = cardData.uid;
  const title = displayData.word;
  const difficultyLevel = displayData.level;
  const partOfSpeech = displayData.pos;
  const durability = cardData.senseInfo.durability;
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
    // Only track mouse on front face (when expanded but not flipped)
    if (!isExpanded || isFlipped) return;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded, isFlipped, mouseX, mouseY]);

  // Auto-expand when flipped to back face
  useEffect(() => {
    if (isFlipped) {
      setIsExpanded(true);
    }
  }, [isFlipped]);

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

  // Back face: no rotation at all. Front face: normal behavior
  const zeroRotation = useMotionValue(0);
  const displayRotateX = isFlipped ? zeroRotation : (isExpanded ? mouseRotateX : velocityRotateX);
  const displayRotateY = isFlipped ? zeroRotation : (isExpanded ? mouseRotateY : velocityRotateY);
  const displayRotateZ = isFlipped ? zeroRotation : (isExpanded ? zeroRotation : velocityRotateZ);

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
  // Back face: always expanded scale, no hover effect. Front face: normal behavior
  const targetScale = isFlipped ? expandedScale : (isExpanded ? expandedScale : isDragging ? 1.15 : isHovered ? 1.05 : 1);

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
    // Disable dragging when card is flipped to back face
    if (isFlipped) return;

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

      updatePosition(cardData.uid, finalX, finalY);
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
      {...(isFlipped ? {} : handlers)} // CRITICAL FIX: Only apply drag handlers on front face
      onClick={(e) => {
        if (isDragging) return;
        // Ensure only left click triggers this logic to prevent conflict with context menu
        if (e.button !== 0) return;

        // Back face: always expanded, clicks handled by selection boxes
        // No zoom toggle on back face - use right-click to flip back to front
        if (isFlipped) {
          const target = e.target as HTMLElement;
          // Back face content clicks are handled by selection boxes
          if (target.closest('.back-face-content')) {
            return;
          }
          // Clicking background area on back face does nothing
          // User should right-click to flip back to front
          return;
        }

        // Front face: toggle expansion
        setIsExpanded(!isExpanded);
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
        // GPU Acceleration: Force hardware acceleration with translate3d
        transform: 'translate3d(0, 0, 0)',
        // Dynamic performance optimization: 
        // Only hint will-change during active high-framerate operations to prevent blurring
        willChange: (isDragging || isExpanded) ? 'transform' : 'auto',
        transformStyle: 'preserve-3d', // Enable 3D context for sharper scaling
        cursor: isFlipped ? 'default' : (isDragging ? "grabbing" : (isExpanded ? "zoom-out" : "grab")),
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -width / 2, marginTop: -height / 2,
        touchAction: 'none',
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!isFlipped) handlers.onPointerDown(e);
      }}
      onHoverStart={() => !isFlipped && setIsHovered(true)}
      onHoverEnd={() => !isFlipped && setIsHovered(false)}
      onDoubleClick={(e) => e.stopPropagation()}
      animate={{ scale: targetScale, boxShadow: targetShadow }}
      transition={CardPersona.physics.springs.scale}
      className="canvas-card select-none group relative transition-colors duration-300"
    >
      <CardVisual
        displayData={displayData}
        senseInfo={cardData.senseInfo}
        visual={cardData.visual}
        systemLanguage={systemLanguage}
        currentLanguage={currentLanguage}
        isActive={isActive}
        isOver={isOver}

        flipScaleX={flipScaleX}
        frontOpacity={frontOpacity}
        backOpacity={backOpacity}

        bgParallaxX={bgParallaxX}
        bgParallaxY={bgParallaxY}
        fgParallaxX={fgParallaxX}
        fgParallaxY={fgParallaxY}

        displayRotateY={displayRotateY}
        smoothXVelocity={smoothXVelocity}
        smoothYVelocity={smoothYVelocity}
        isExpanded={isExpanded}
      />
    </motion.div>
  );
};
