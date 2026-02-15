import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCardVariants } from '@/app/utils/mergeSplit/useCardVariants';
import { useDrop } from 'react-dnd';
import { motion, useVelocity, useTransform, useSpring, useMotionValue, MotionValue } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { CardVisual } from '@/app/components/ui/CardVisual';
import { tts } from '@/app/utils/audio/tts';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

// --- Types & Data ---

interface CardProps {
  /**
   * Complete card data (extracted from SenseEntity)
   * Contains all displayData, senseInfo, visual, and rawSense
   */
  cardData: CardEntity;

  /**
   * Variants are other cards that have been merged into this one.
   * They share the same word but have different senses/definitions.
   */
  variants?: CardEntity[];

  /**
   * Learning language - the target language being studied
   * Used for card content (word, definition, flavor text)
   */
  learningLanguage: Language;

  /**
   * System language - the familiar language for assistance
   * Used for supplementary translations and UI elements
   */
  systemLanguage: Language;

  // ========== Canvas Transform ==========
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
  canvasScale: number;
  canvasX: MotionValue<number>;
  canvasY: MotionValue<number>;

  // Optional: Override scale for global animations (e.g. merge absorb)
  externalScale?: MotionValue<number>;

  // ========== Callbacks ==========
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  onDelete?: (id: string) => void; // Kept for interface compatibility but unused
  onDropItem?: (item: any) => void;
  isHidden?: boolean;
  groupFeedback?: { merge: string[], split: string[], timestamp: number } | null;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Card = React.memo<CardProps>(({
  cardData,
  variants = [],
  learningLanguage,
  systemLanguage,
  x,
  y,
  width,
  height,
  canvasScale,
  canvasX,
  canvasY,
  onDragStart,
  onDragEnd,
  updatePosition,
  isHidden = false,
  onDropItem,
  groupFeedback,
  onFocus,
  onBlur,
  externalScale,
}) => {
  // ========== Variant Logic (Extracted) ==========
  const {
    activeUid,
    setActiveUid,
    sortedVariants,
    currentCardData
  } = useCardVariants({ cardData, variants });

  // ========== Extract Display Data from Current Active Card ==========
  // Extract data for BOTH languages (bilingual support)
  const learningData = currentCardData.displayData[learningLanguage]!;
  const systemData = currentCardData.displayData[systemLanguage]!;

  const title = learningData.word;
  const [isHovered, setIsHovered] = useState(false);

  // --- Drop Target (Items) ---
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ITEM',
    drop: (item) => {
      onDropItem?.(item);
      return { name: title };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // ========== Visual Feedback Logic ==========
  const [visualFeedback, setVisualFeedback] = useState<'merge' | 'split' | null>(null);

  useEffect(() => {
    if (!groupFeedback) return;
    const uid = cardData.uid;

    if (groupFeedback.merge.includes(uid)) {
      setVisualFeedback('merge');
    } else if (groupFeedback.split.includes(uid)) {
      setVisualFeedback('split');
    }
  }, [groupFeedback, cardData.uid]);

  useEffect(() => {
    if (isHovered || isDragging) {
      setVisualFeedback(null);
    }
  }, [isHovered, isDragging]);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Selection Overlay State ---
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const selectedDefId = activeUid;
  const [windowDim, setWindowDim] = useState({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);

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
    if (!isExpanded || isFlipped) return;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded, isFlipped, mouseX, mouseY]);

  useEffect(() => {
    const handleGlobalClick = (e: PointerEvent) => {
      if ((isExpanded || isFlipped) && cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsHovered(false);
        setIsExpanded(false);
        if (isFlipped) {
          setIsFlipped(false);
        }
        onBlur?.();
      }
    };
    window.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
  }, [isExpanded, isFlipped, onBlur]);

  // --- Selection Overlay Handlers ---
  const handleDefinitionClick = useCallback(() => {
    setIsOverlayOpen(true);
  }, []);

  const handleSelectDefinition = useCallback((item: any) => {
    setActiveUid(item.id);
    setIsOverlayOpen(false);

    const selectedVariant = sortedVariants.find(v => v.uid === item.id);
    if (selectedVariant) {
      const def = selectedVariant.displayData[learningLanguage]?.definition;
      if (def) {
        tts.speak(def, learningLanguage);
      }
    }
  }, [setActiveUid, sortedVariants, learningLanguage]);

  const selectionItems = useMemo(() => sortedVariants.map(variant => ({
    id: variant.uid,
    definitions: Object.keys(variant.displayData).reduce((acc, lang) => {
      acc[lang as Language] = variant.displayData[lang as Language]?.definition || '';
      return acc;
    }, {} as Record<Language, string>),
    pos: variant.displayData[learningLanguage]?.pos || 'n.'
  })), [sortedVariants, learningLanguage]);

  const definitionOverride = undefined;

  // --- Physics ---
  const xVelocity = useVelocity(x);
  const yVelocity = useVelocity(y);

  const smoothXVelocity = useSpring(xVelocity, CardPersona.physics.springs.smoothVelocity);
  const smoothYVelocity = useSpring(yVelocity, CardPersona.physics.springs.smoothVelocity);

  const velocityRotateY = useTransform(smoothXVelocity, CardPersona.physics.tilt.velocityRange, CardPersona.physics.tilt.rotateY);
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

  const canvasScaleMotion = useMotionValue(canvasScale);
  useEffect(() => { canvasScaleMotion.set(canvasScale); }, [canvasScale]);

  const zeroRotation = useMotionValue(0);
  const displayRotateX = isFlipped ? zeroRotation : (isExpanded ? mouseRotateX : velocityRotateX);
  const displayRotateY = isFlipped ? zeroRotation : (isExpanded ? mouseRotateY : velocityRotateY);
  const displayRotateZ = isFlipped ? zeroRotation : (isExpanded ? zeroRotation : velocityRotateZ);

  const targetCenterX = useTransform([canvasX, canvasScaleMotion], (latest: number[]) => {
    const cx = latest[0] || 0;
    const s = latest[1] || 1;
    if (typeof window === 'undefined') return 0;
    return (windowDim.w / 2 - cx) / (s || 1);
  });

  const targetCenterY = useTransform([canvasY, canvasScaleMotion], (latest: number[]) => {
    const cy = latest[0] || 0;
    const s = latest[1] || 1;
    if (typeof window === 'undefined') return 0;
    return (windowDim.h / 2 - cy) / (s || 1);
  });

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

  const getExpandedScale = () => {
    if (windowDim.w === 0) return 1.5;
    const minScreenDim = Math.min(windowDim.w, windowDim.h);
    const targetSize = minScreenDim * 0.8;
    const cardMaxDim = Math.max(width, height);
    const safeScale = canvasScale > 0 ? canvasScale : 1;
    return targetSize / (cardMaxDim * safeScale);
  };
  const expandedScale = getExpandedScale();
  const targetScale = (isExpanded || isFlipped) ? expandedScale : isDragging ? 1.15 : isHovered ? 1.05 : 1;

  const bgParallaxX = useTransform(displayRotateY, [-20, 20], [15, -15]);
  const bgParallaxY = useTransform(displayRotateX, [-20, 20], [15, -15]);
  const fgParallaxX = useTransform(displayRotateY, [-20, 20], [-25, 25]);
  const fgParallaxY = useTransform(displayRotateX, [-20, 20], [-25, 25]);

  const targetShadow = isDragging
    ? CardPersona.tokens.shadows.dragging
    : isExpanded
      ? CardPersona.tokens.shadows.expanded
      : isHovered
        ? CardPersona.tokens.shadows.hover
        : CardPersona.tokens.shadows.base;

  const flipSpring = useSpring(0, CardPersona.physics.springs.flip);
  useEffect(() => { flipSpring.set(isFlipped ? 1 : 0); }, [isFlipped, flipSpring]);
  const flipScaleX = useTransform(flipSpring, [0, 0.5, 1], [1, 0, 1]);
  const frontOpacity = useTransform(flipSpring, [0.45, 0.55], [1, 0]);
  const backOpacity = useTransform(flipSpring, [0.45, 0.55], [0, 1]);

  const dragConfig = useMemo(() => ({
    target: cardRef,
    enabled: !isFlipped,
    pointer: { keys: false },
    eventOptions: { passive: false }
  }), [cardRef, isFlipped]);

  useDrag(({ active, xy: [px, py], delta: [dx, dy], first, last }) => {
    if (first) {
      setIsDragging(true);
      if (title) {
        tts.speak(title, learningLanguage);
      }
      if (isExpanded) {
        x.set(targetCenterX.get());
        y.set(targetCenterY.get());
        updatePosition(cardData.uid, targetCenterX.get(), targetCenterY.get());
        setIsExpanded(false);
        onBlur?.();
      }
      onDragStart?.(cardData.uid);
    }
    if (active) {
      const scale = canvasScale || 1;
      const nextX = x.get() + dx / scale;
      const nextY = y.get() + dy / scale;

      const WORLD_W = 16000;
      const WORLD_H = 10000;
      const minX = -(WORLD_W / 2) + width / 2;
      const maxX = (WORLD_W / 2) - width / 2;
      const minY = -(WORLD_H / 2) + height / 2;
      const maxY = (WORLD_H / 2) - height / 2;

      const snapThreshold = 10;
      let finalX = nextX;
      let finalY = nextY;

      if (Math.abs(finalX - minX) < snapThreshold) finalX = minX;
      else if (Math.abs(finalX - maxX) < snapThreshold) finalX = maxX;

      if (Math.abs(finalY - minY) < snapThreshold) finalY = minY;
      else if (Math.abs(finalY - maxY) < snapThreshold) finalY = maxY;

      finalX = Math.min(Math.max(finalX, minX), maxX);
      finalY = Math.min(Math.max(finalY, minY), maxY);

      x.set(finalX);
      y.set(finalY);

      updatePosition(cardData.uid, finalX, finalY);
    }
    if (last) {
      setIsDragging(false);
      onDragEnd?.(cardData.uid);
    }
  }, dragConfig);

  const isActive = isHovered || isDragging || isExpanded || isOver || isOverlayOpen;
  const baseZIndex = isDragging ? 100 : (isHovered ? 10 : 1);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    drop(node);
  }, [drop]);

  return (
    <motion.div
      ref={setRefs}
      onClick={(e) => {
        if (isDragging) return;
        if (e.button !== 0) return;

        if (isFlipped) {
          const target = e.target as HTMLElement;
          if (target.closest('.back-face-content')) return;
          return;
        }

        const nextState = !isExpanded;
        setIsExpanded(nextState);

        if (nextState) {
          onFocus?.();
        } else {
          onBlur?.();
        }

        if (nextState && title) {
          tts.speak(title, learningLanguage);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();

        setIsAnimating(true);
        if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
        animatingTimerRef.current = setTimeout(() => setIsAnimating(false), 600);

        if (!isFlipped) {
          setIsFlipped(true);
          setIsExpanded(true);
          onFocus?.();
        } else {
          setIsFlipped(false);
          if (!isExpanded) {
            onBlur?.();
          }
        }
      }}
      style={{
        x: displayX, y: displayY, width, height,
        rotateX: displayRotateX, rotateY: displayRotateY, rotateZ: displayRotateZ,
        zIndex: isExpanded || isFlipped ? 500 : baseZIndex,
        opacity: isHidden ? 0 : 1,
        transform: 'translate3d(0, 0, 0)',
        willChange: (isDragging || isAnimating || externalScale || (!isExpanded && canvasScale < 1)) ? 'transform' : 'auto',
        boxShadow: targetShadow,
        transition: 'box-shadow 0.3s ease-out',
        transformStyle: 'preserve-3d',
        cursor: isFlipped ? 'default' : (isDragging ? "grabbing" : (isExpanded ? "zoom-out" : "grab")),
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -width / 2, marginTop: -height / 2,
        touchAction: 'none',
        borderRadius: CardPersona.tokens.layout.radius,
        ...(externalScale ? { scale: externalScale } : {}),
      }}

      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onHoverStart={() => !isFlipped && setIsHovered(true)}
      onHoverEnd={() => !isFlipped && setIsHovered(false)}
      onDoubleClick={(e) => e.stopPropagation()}
      animate={externalScale ? undefined : { scale: targetScale }}
      transition={CardPersona.physics.springs.scale}
      className="canvas-card select-none group relative transition-colors duration-300"
    >
      <CardVisual
        learningData={learningData}
        systemData={systemData}
        senseInfo={currentCardData.senseInfo}
        visual={currentCardData.visual}
        learningLanguage={learningLanguage}
        systemLanguage={systemLanguage}
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

        isOverlayOpen={isOverlayOpen}
        selectionItems={selectionItems}
        selectedDefId={selectedDefId}
        definitionOverride={definitionOverride}
        onDefinitionClick={handleDefinitionClick}
        onSelectDefinition={handleSelectDefinition}
        visualFeedback={visualFeedback}
      />
    </motion.div >
  );
});

Card.displayName = 'Card';
