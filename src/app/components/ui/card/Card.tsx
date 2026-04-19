import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useCardVariants } from '@/app/hooks/useCardVariants';
import { useDrop } from 'react-dnd';
import { motion, useVelocity, useTransform, useSpring, useMotionValue, MotionValue, animate } from 'motion/react';
import { useWindowDimensions } from '@/app/hooks/useWindowDimensions';
import { useDrag } from '@use-gesture/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { CardVisual } from '@/app/components/ui/card/CardVisual';
import { CompactCardVisual } from '@/app/components/ui/card/CompactCardVisual';
import { cardFocusRegistry } from '@/app/utils/cardFocusRegistry';
import { tts } from '@/app/utils/audio/tts';
import { useGameStore } from '@store/index';
import { WORLD_W, WORLD_H } from '@/config/canvas';
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
  canvasScale: MotionValue<number>; // Changed to MotionValue for performance
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
  onDropIntoSlot?: (cardId: string, deviceUid: string, slotId: number) => void;
  onDropIntoSummoner?: (cardId: string, deviceUid: string) => void;
  onDropIntoRepository?: (cardId: string) => void;
  isZoomingRef?: React.MutableRefObject<boolean>;
  expandedIdsRef?: React.MutableRefObject<Set<string>>;
  isPanningRef?: React.MutableRefObject<boolean>;
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
  externalScale,
  onDropIntoSlot,
  onDropIntoSummoner,
  onDropIntoRepository,
  isZoomingRef,
  expandedIdsRef,
  isPanningRef,
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
  // isHoveredRef: drives imperative updates (scaleSpring, boxShadow) without waiting for re-render
  // isHovered state: drives isActive → CardVisual re-render for visual animation activation
  const isHoveredRef = useRef(false);
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

  const isDraggingRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // LOD: switch to CompactCardVisual at low canvas zoom (hysteresis prevents threshold flicker)
  // isCompactLODRef gates setState — only called on threshold crossing, not every zoom tick.
  // This avoids entering React scheduler N times per frame during zoom (was: N×setIsCompactLOD
  // functional-updater per canvasScale event even when returning prev with no re-render).
  const LOD_ENTER = 0.32;
  const LOD_EXIT = 0.38;
  const isCompactLODRef = useRef(canvasScale.get() < LOD_ENTER);
  const [isCompactLOD, setIsCompactLOD] = useState(isCompactLODRef.current);
  useEffect(() => {
    const check = (v: number) => {
      if (isCompactLODRef.current && v > LOD_EXIT) {
        isCompactLODRef.current = false;
        setIsCompactLOD(false);
      } else if (!isCompactLODRef.current && v < LOD_ENTER) {
        isCompactLODRef.current = true;
        setIsCompactLOD(true);
      }
      // else: pure ref read, React scheduler not entered
    };
    check(canvasScale.get());
    return canvasScale.on('change', check);
  }, [canvasScale]);
  const animatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    };
  }, []);

  // Sync zoom state directly to store — single source of truth, no callback chains
  const uid = cardData.uid;
  const focusCard = useGameStore(s => s.focusCard);
  const blurCard = useGameStore(s => s.blurCard);
  useEffect(() => {
    if (isExpanded || isFlipped) {
      // Update ref first (synchronous, no re-render) so viewport culling immediately sees
      // this card as "expanded" — avoids a culling recompute that would drop it mid-animation.
      expandedIdsRef?.current?.add(uid);
      focusCard(uid);
    } else {
      expandedIdsRef?.current?.delete(uid);
      blurCard(uid);
    }
    return () => {
      expandedIdsRef?.current?.delete(uid);
      blurCard(uid);
    };
  }, [isExpanded, isFlipped, uid, focusCard, blurCard, expandedIdsRef]);

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


  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    animatingTimerRef.current = setTimeout(() => setIsAnimating(false), 600);
  }, []);

  // --- Selection Overlay State ---
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const selectedDefId = activeUid;
  const { windowWidth, windowHeight } = useWindowDimensions();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const scaleWrapperRef = useRef<HTMLDivElement | null>(null);

  // --- Mouse & Resize ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    if (!isExpanded || isFlipped) return;
    const handleMouseMove = (e: MouseEvent) => {
      // Skip during canvas pan: mouse position drives parallax + tilt on the expanded card,
      // causing bgRef/fgRef DOM writes + glare gradient updates every frame — expensive inside
      // a blurred world. Freeze at last position; resumes naturally when pan ends.
      if (isPanningRef?.current) return;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isExpanded, isFlipped, mouseX, mouseY, isPanningRef]);

  useEffect(() => {
    if (!isExpanded && !isFlipped) {
      cardFocusRegistry.unregister(uid);
      return;
    }
    const handleGlobalClick = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        isHoveredRef.current = false;
        setIsHovered(false);
        setIsExpanded(false);
        if (isFlipped) setIsFlipped(false);
      }
    };
    cardFocusRegistry.register(uid, handleGlobalClick);
    return () => cardFocusRegistry.unregister(uid);
  }, [isExpanded, isFlipped, uid]);

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

  const mouseRotateY = useTransform([mouseSpringX, windowWidth], ([val = 0, w = 0]: number[]) => {
    const center = w / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const mouseRotateX = useTransform([mouseSpringY, windowHeight], ([val = 0, h = 0]: number[]) => {
    const center = h / 2;
    return ((val - center) / center) * CardPersona.physics.inspection.tiltFactor;
  });

  const zeroRotation = useMotionValue(0);
  const displayRotateX = isFlipped ? zeroRotation : (isExpanded ? mouseRotateX : velocityRotateX);
  const displayRotateY = isFlipped ? zeroRotation : (isExpanded ? mouseRotateY : velocityRotateY);
  const displayRotateZ = isFlipped ? zeroRotation : (isExpanded ? zeroRotation : velocityRotateZ);

  // targetCenterX / targetCenterY: only subscribed to camera when card is expanded or flipped.
  // As useTransform they would fire for every card on every zoom frame (canvasScale/X/Y changes).
  // As conditional imperative subscriptions they are silent during normal zoom → 0 overhead.
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

  // ========== Scale Logic Optimization ==========
  // expandedScale: same treatment as targetCenterX/Y — only subscribed when card is active.
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
      // Subscribe to expandedScale updates for live zoom
      const unsubscribe = expandedScale.on("change", (v) => {
        scaleSpring.set(v);
      });
      scaleSpring.set(expandedScale.get());
      return unsubscribe;
    } else {
      // Idle/Drag — hover scale is set imperatively in onHoverStart/onHoverEnd
      scaleSpring.set(1);
    }
  }, [isExpanded, isFlipped, expandedScale, scaleSpring]);

  // --- Z-index: driven imperatively by scaleSpring to stay in sync with the visual scale.
  // This avoids the React re-render timing gap that caused other cards to appear in front
  // during the collapse animation (when isExpanded flips to false before the spring settles).
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
  }, [scaleSpring]);

  // Re-apply when isFlipped changes (scaleSpring may not emit a new event)
  useEffect(() => {
    isFlippedRef.current = isFlipped;
    const el = cardRef.current;
    if (!el) return;
    const v = scaleSpring.get();
    el.style.zIndex = (v > 1.01 || isFlipped) ? '500' : '1';
  }, [isFlipped, scaleSpring]);

  // --- Imperative transforms on outer card + scale on inner wrapper.
  // Removes ALL MotionValues from FM's style prop so FM never sets will-change:transform.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const apply = () => {
      el.style.transform = `translateX(${displayX.get()}px) translateY(${displayY.get()}px) rotateX(${displayRotateX.get()}deg) rotateY(${displayRotateY.get()}deg) rotateZ(${displayRotateZ.get()}deg)`;
    };
    // Dedup: displayX, displayY, displayRotate* often change in the same FM frame (all driven
    // by zoomSpring). Coalesce to one apply() per frame via microtask — 5 calls → 1.
    let pending = false;
    const scheduleApply = () => {
      if (pending) return;
      pending = true;
      Promise.resolve().then(() => {
        pending = false;
        // During canvas pan, skip DOM writes for idle non-expanded cards.
        // If the card is collapsing (zoomSpring > 0.001), we MUST apply to prevent it from freezing mid-animation.
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
  }, [displayX, displayY, displayRotateX, displayRotateY, displayRotateZ]);

  const flipSpring = useSpring(0, CardPersona.physics.springs.flip);
  useEffect(() => { flipSpring.set(isFlipped ? 1 : 0); }, [isFlipped, flipSpring]);
  const flipScaleX = useTransform(flipSpring, [0, 0.5, 1], [1, 0, 1]);
  const frontOpacity = useTransform(flipSpring, [0.45, 0.55], [1, 0]);
  const backOpacity = useTransform(flipSpring, [0.45, 0.55], [0, 1]);

  useLayoutEffect(() => {
    const wrapper = scaleWrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;
    const scaleSource = externalScale ?? scaleSpring;

    // When expanded, create an independent compositor sublayer so Chrome rasterizes THIS
    // card at device pixel ratio × its actual rendered size, instead of inheriting the
    // world container's low-res GPU texture (rasterized at the small canvas zoom level).
    //
    // Key insight: transformStyle:'preserve-3d' on an element BLOCKS Chrome from creating
    // an independent compositor layer for it — the element is forced into the parent's layer.
    // Fix: when expanded, move preserve-3d DOWN to the wrapper (inner), so the outer card
    // element becomes layer-promotable, while inner 3D effects (tilt/flip) still work.
    const sync = (v: number) => {
      if (v > 1.01) {
        // Expanded: outer card loses preserve-3d → can form its own GPU layer.
        // Inner wrapper gets preserve-3d → 3D tilt + flip effects still work.
        card.style.transformStyle = 'flat';
        card.style.willChange = 'transform';
        wrapper.style.transformStyle = 'preserve-3d';
        wrapper.style.transform = `scale(${v}) translateZ(0)`;
      } else {
        // Collapsed: restore standard hierarchy.
        card.style.transformStyle = 'preserve-3d';
        card.style.willChange = 'auto';
        wrapper.style.transformStyle = '';
        wrapper.style.transform = `scale(${v})`;
      }
    };
    sync(scaleSource.get());
    const unsub = scaleSource.on('change', sync);

    // Force Chrome to re-rasterize BOTH GPU layers (card + wrapper sublayer) at the
    // correct terminal scale. GPU layers are rasterized when first created (scale ≈ 1.01),
    // then stretched as the spring animates to the final expandedScale → blurry.
    // Fix: two-frame cycle —
    //   Frame 1: destroy both layers (willChange='auto', drop translateZ(0))
    //   Frame 2: recreate at the current (terminal) visual size → correct resolution
    const forceRerasterize = (v: number) => {
      if (!card.isConnected || !wrapper.isConnected) return;

      // Stage 1: Break the layers and slightly change a paint-triggering property
      card.style.willChange = 'auto';
      card.style.opacity = '0.999';
      wrapper.style.transform = `scale(${v})`; // Drop translateZ(0) to destroy sub-compositor layer

      // Stage 2: Wait for next frame to restore
      requestAnimationFrame(() => {
        if (!card.isConnected || !wrapper.isConnected) return;
        requestAnimationFrame(() => {
          if (!card.isConnected || !wrapper.isConnected) return;

          // Stage 3: Recreate layers at terminal scale
          card.style.willChange = 'transform';
          card.style.opacity = '1';
          wrapper.style.transform = `scale(${v}) translateZ(0)`; // Recreate at new pixel ratio
        });
      });
    };

    // Scene 1: re-rasterize after scale spring settles at expanded position.
    // Use rAF-based debounce: schedule on first sub-threshold velocity event,
    // cancel if velocity rises again (spring still animating), confirm with a
    // second velocity check inside the rAF before firing.
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

    // Scene 2: re-rasterize after flip animation settles.
    // Also refreshes the wrapper sublayer (previously only card.willChange was cycled).
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
  }, [externalScale, scaleSpring, flipSpring]);


  const bgParallaxX = useTransform(displayRotateY, [-20, 20], [15, -15]);
  const bgParallaxY = useTransform(displayRotateX, [-20, 20], [15, -15]);
  const fgParallaxX = useTransform(displayRotateY, [-20, 20], [-25, 25]);
  const fgParallaxY = useTransform(displayRotateX, [-20, 20], [-25, 25]);

  const targetShadow = isExpanded
    ? CardPersona.tokens.shadows.expanded
    : isHoveredRef.current
      ? CardPersona.tokens.shadows.hover
      : CardPersona.tokens.shadows.base;

  const dragConfig = useMemo(() => ({
    target: cardRef,
    enabled: !isFlipped,
    pointer: { keys: false },
    eventOptions: { passive: false }
  }), [cardRef, isFlipped]);

  useDrag(({ active, xy: [px, py], delta: [dx, dy], first, last }) => {
    if (first) {
      isDraggingRef.current = true;
      setVisualFeedback(null);
      scaleSpring.set(1.15);
      if (cardRef.current) {
        cardRef.current.style.cursor = 'grabbing';
        cardRef.current.style.boxShadow = CardPersona.tokens.shadows.dragging;
        cardRef.current.style.willChange = 'transform';
      }
      if (title) {
        tts.speak(title, learningLanguage);
      }
      if (isExpanded) {
        startAnimation();
        x.set(targetCenterX.get());
        y.set(targetCenterY.get());
        updatePosition(cardData.uid, targetCenterX.get(), targetCenterY.get());
        setIsExpanded(false);
      }
      onDragStart?.(cardData.uid);
    }
    if (active) {
      const scale = canvasScale.get() || 1;
      const nextX = x.get() + dx / scale;
      const nextY = y.get() + dy / scale;

      const minX = -(WORLD_W / 2) + width / 2;
      const maxX = (WORLD_W / 2) - width / 2;
      const minY = -(WORLD_H / 2) + height / 2;
      const maxY = (WORLD_H / 2) - height / 2;

      const finalX = Math.min(Math.max(nextX, minX), maxX);
      const finalY = Math.min(Math.max(nextY, minY), maxY);

      x.set(finalX);
      y.set(finalY);

      updatePosition(cardData.uid, finalX, finalY);

      // --- Hover Visuals ---
      const elements = document.elementsFromPoint(px, py);
      document.querySelectorAll('.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
      
      const hoveredSlot = elements.find(el => el.classList.contains('synthesis-slot') || el.classList.contains('summoner-slot')) as HTMLElement;
      if (hoveredSlot) {
        hoveredSlot.classList.add('is-drag-over');
      }
    }
    if (last) {
      isDraggingRef.current = false;
      scaleSpring.set(isHoveredRef.current ? 1.05 : 1);
      if (cardRef.current) {
        cardRef.current.style.cursor = isExpanded ? 'zoom-out' : 'grab';
        cardRef.current.style.boxShadow = isHoveredRef.current
          ? CardPersona.tokens.shadows.hover
          : CardPersona.tokens.shadows.base;
        cardRef.current.style.willChange = isHoveredRef.current ? 'transform' : 'auto';
      }
      onDragEnd?.(cardData.uid);

      // Clean up hover visuals
      document.querySelectorAll('.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));

      // Manual Drop Detection for Synthesis Slots (Bridge between use-gesture and react-dnd)
      const elements = document.elementsFromPoint(px, py);
      const slotElement = elements.find(el => el.classList.contains('synthesis-slot')) as HTMLElement;

      if (slotElement) {
        const slotId = parseInt(slotElement.dataset.slotId || '0', 10);
        const deviceUid = slotElement.dataset.deviceUid;

        if (slotId && deviceUid && onDropIntoSlot) {
          onDropIntoSlot(cardData.uid, deviceUid, slotId);
        }
      }

      // Manual Drop Detection for Grimoire Summoner
      const summonerSlot = elements.find(el => el.classList.contains('summoner-slot')) as HTMLElement;
      if (summonerSlot) {
        const deviceUid = summonerSlot.dataset.summonerUid;
        if (deviceUid && onDropIntoSummoner) {
          onDropIntoSummoner(cardData.uid, deviceUid);
        }
      }

      // Manual Drop Detection for Repository
      const repoElement = elements.find(el => el.id === 'deck-repository-drop-zone');
      if (repoElement && onDropIntoRepository) {
        onDropIntoRepository(cardData.uid);
      }
    }
  }, dragConfig);

  const isActive = (isHovered || isExpanded || isOver || isOverlayOpen) && !isAnimating;

  // Lazy-mount back face: once the card is expanded or flipped for the first time, the back face
  // content mounts and stays mounted. This avoids rendering ~60 DOM nodes on cards that have
  // never been opened, and prevents unmount/remount flicker during collapse animations.
  const backFaceMountedRef = useRef(false);
  if (isExpanded || isFlipped) backFaceMountedRef.current = true;
  const backFaceMounted = backFaceMountedRef.current;

  // z-index is now driven imperatively via scaleSpring.on('change') above — removed from style prop.

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    drop(node);
  }, [drop]);

  return (
    <motion.div
      ref={setRefs}
      onClick={(e) => {
        if (isDraggingRef.current) return;
        if (e.button !== 0) return;

        if (isFlipped) {
          const target = e.target as HTMLElement;
          if (target.closest('.back-face-content')) return;
          return;
        }

        const nextState = !isExpanded;
        setIsExpanded(nextState);
        startAnimation();

        if (nextState && title) {
          tts.speak(title, learningLanguage);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();

        startAnimation();

        if (!isFlipped) {
          setIsFlipped(true);
          setIsExpanded(true);
        } else {
          setIsFlipped(false);
        }
      }}
      style={{
        width, height,
        opacity: isHidden ? 0 : 1,
        boxShadow: targetShadow,
        transition: 'box-shadow 0.3s ease-out',
        transformStyle: 'preserve-3d',
        cursor: isFlipped ? 'default' : (isExpanded ? 'zoom-out' : 'grab'),
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -width / 2, marginTop: -height / 2,
        touchAction: 'none',
        borderRadius: CardPersona.tokens.layout.radius,
        contain: 'layout style',
      }}

      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onHoverStart={() => {
        if (isFlipped) return;
        isHoveredRef.current = true;
        setIsHovered(true);
        setVisualFeedback(null);
        if (!isExpanded) scaleSpring.set(1.05);
      }}
      onHoverEnd={() => {
        if (isFlipped) return;
        isHoveredRef.current = false;
        setIsHovered(false);
        if (!isExpanded && !isDraggingRef.current) scaleSpring.set(1);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="canvas-card select-none group relative transition-colors duration-300"
    >
      <div ref={scaleWrapperRef} style={{ width: '100%', height: '100%', transformOrigin: 'center center' }}>
        {(isCompactLOD && !isExpanded && !isFlipped) ? (
          <CompactCardVisual
            mode="repository"
            learningData={learningData}
            senseInfo={currentCardData.senseInfo}
            visual={currentCardData.visual}
            persona={CardPersona}
            isActive={isActive}
          />
        ) : (
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
            backFaceMounted={backFaceMounted}

            isOverlayOpen={isOverlayOpen}
            selectionItems={selectionItems}
            selectedDefId={selectedDefId}
            definitionOverride={definitionOverride}
            onDefinitionClick={handleDefinitionClick}
            onSelectDefinition={handleSelectDefinition}
            visualFeedback={visualFeedback}
          />
        )}
      </div>
    </motion.div >
  );
});

Card.displayName = 'Card';
