import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useCardVariants } from '@/app/hooks/useCardVariants';
import { useDrop } from 'react-dnd';
import { motion, useVelocity, useTransform, useSpring, useMotionValue, MotionValue, animate } from 'motion/react';
import { useWindowDimensions } from '@/app/hooks/useWindowDimensions';
import { useDrag } from '@use-gesture/react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { CardVisual, MemoizedCardVisual, getTitleClass } from '@/app/components/ui/card/CardVisual';
import { CompactCardVisual } from '@/app/components/ui/card/CompactCardVisual';
import { LexiCardChrome } from '@/app/components/ui/card/web/LexiCardChrome';
import { FlavorCarousel } from '@/app/components/ui/text/FlavorCarousel';
import { SelectionOverlay } from '@/app/components/ui/canvas/SelectionOverlay';
import { cardFocusRegistry } from '@/app/utils/cardFocusRegistry';
import { tts } from '@/app/utils/audio/tts';
import { useGameStore } from '@store/index';
import { WORLD_W, WORLD_H } from '@/config/canvas';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';
import { TieredText } from '@/app/components/ui/text/TieredText';
import type { TextTier } from '@/utils/textTierUtils';



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
  // Feature flag: WC card path (TDD §8.3 — sole consumer of this flag)
  const useWCCards = useGameStore(s => s.featureFlags.useWCCards);

  // ── WC back face state (flavor carousel navigation) ────────────────────────
  // These are only consumed in the WC rendering branch but must not be
  // conditionally called (React rules of hooks).
  const [wcFlavorIndex, setWcFlavorIndex] = useState(0);
  const [wcFlavorDirection, setWcFlavorDirection] = useState(0);
  const [wcActivePersonaId, setWcActivePersonaId] = useState(0);
  const wcFlavorContainerRef = useRef<HTMLDivElement>(null);

  const wcAvailablePersonas = useMemo(() => {
    const personas = Array.from(new Set(learningData.flavorContents.map(item => item.persona)));
    personas.sort((a, b) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return a.localeCompare(b);
    });
    return personas.length === 0 ? ['default'] : personas;
  }, [learningData.flavorContents]);

  const wcCurrentPersonaName = wcAvailablePersonas[wcActivePersonaId] ?? wcAvailablePersonas[0] ?? 'default';

  const wcCurrentFlavorContents = useMemo(() =>
    learningData.flavorContents.filter(item => item.persona === wcCurrentPersonaName),
    [learningData.flavorContents, wcCurrentPersonaName]
  );

  // Attach wheel listener to flavor container for persona cycling.
  // Deps include isFlipped/isExpanded so the listener re-attaches after
  // first flip (when backFaceMounted becomes true and the container mounts).
  useEffect(() => {
    if (!useWCCards) return;
    const el = wcFlavorContainerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (Math.abs(e.deltaY) > 20) {
        const dir = e.deltaY > 0 ? 1 : -1;
        setWcActivePersonaId(prev => {
          const next = prev + dir;
          if (next < 0) return wcAvailablePersonas.length - 1;
          if (next >= wcAvailablePersonas.length) return 0;
          return next;
        });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWCCards, isFlipped, isExpanded, wcAvailablePersonas.length]);
  const uiTheme    = useGameStore(s => s.uiTheme);
  const focusCard  = useGameStore(s => s.focusCard);
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
  // WC path: ref to the lexi-card-chrome-* host element for shadow DOM writes
  const wcHostRef = useRef<HTMLElement | null>(null);

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
      // FORCED SELECTION: Do not allow closing via clicking outside if overlay is open.
      if (isOverlayOpen) return;

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

  // ── WC path: wire flip / face-opacity MotionValues to shadow DOM ─────────────
  // Mirrors CardVisual.tsx's useLayoutEffect, but queries through shadowRoot.
  // Only active when useWCCards flag is on (TDD §5.1).
  //
  // IMPORTANT: isFlipped and isExpanded are intentionally EXCLUDED from deps.
  // Subscriptions to MotionValues (backOpacity, frontOpacity, flipScaleX) are
  // set up ONCE when LexiCardChrome mounts and persist for its full lifetime.
  // Including isFlipped would tear down + re-establish subscriptions on every
  // flip, creating a race window where the spring starts firing events between
  // the cleanup and re-subscribe calls. The MotionValue subscriptions work
  // correctly across all state changes without re-setup. (§BUG-2 fix)
  useLayoutEffect(() => {
    // Only wire when LexiCardChrome is actually mounted.
    // Compact LOD falls back to CompactCardVisual, so skip in that case.
    // NOTE: we check the actual ref rather than derivating from React state
    // to avoid stale closure issues.
    if (!useWCCards) return;
    const host = wcHostRef.current;
    if (!host?.shadowRoot) return;

    const flipEl  = host.shadowRoot.querySelector('[part="flip-wrapper"]') as HTMLElement | null;
    const frontEl = host.shadowRoot.querySelector('[part="front-face"]')   as HTMLElement | null;
    const backEl  = host.shadowRoot.querySelector('[part="back-face"]')    as HTMLElement | null;

    const applyFlip  = (v: number) => {
      if (flipEl) flipEl.style.transform = `scaleX(${v})`;
    };
    const applyFront = (v: number) => {
      if (frontEl) {
        frontEl.style.opacity = String(v);
        frontEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      }
    };
    const applyBack  = (v: number) => {
      if (backEl) {
        backEl.style.opacity = String(v);
        backEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
      }
    };

    // Apply current values immediately so shadow reflects React state on mount.
    applyFlip(flipScaleX.get());
    applyFront(frontOpacity.get());
    applyBack(backOpacity.get());

    const unsubs = [
      flipScaleX.on('change', applyFlip),
      frontOpacity.on('change', applyFront),
      backOpacity.on('change', applyBack),
    ];
    return () => unsubs.forEach(u => u());
    // isFlipped / isExpanded / isCompactLOD intentionally omitted: subscriptions
    // must persist across flip/expand transitions. The compact LOD case (where
    // LexiCardChrome is replaced by CompactCardVisual) naturally returns early
    // because wcHostRef.current is null when the element is unmounted.
    // uiTheme IS included: persona switch replaces the custom element entirely,
    // so the new shadow DOM must be re-wired after mount. (Phase 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWCCards, uiTheme, flipScaleX, frontOpacity, backOpacity]);

  // ── WC path: synchronise face opacity on flip/expand transitions ────────────
  // After isFlipped changes, the spring animation drives continuous updates via
  // the subscriptions above. But on the FIRST frame (before the spring fires),
  // we need to push the correct "starting" opacity so the shadow DOM is in sync.
  // This runs AFTER layout (useEffect, not useLayoutEffect) so the spring's
  // useEffect also runs in this batch, ensuring flipSpring.set() has been called.
  useEffect(() => {
    if (!useWCCards) return;
    const host = wcHostRef.current;
    if (!host?.shadowRoot) return;
    const frontEl = host.shadowRoot.querySelector('[part="front-face"]') as HTMLElement | null;
    const backEl  = host.shadowRoot.querySelector('[part="back-face"]')  as HTMLElement | null;
    if (frontEl) {
      const v = frontOpacity.get();
      frontEl.style.opacity = String(v);
      frontEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
    if (backEl) {
      const v = backOpacity.get();
      backEl.style.opacity = String(v);
      backEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    }
  }, [useWCCards, uiTheme, isFlipped, isExpanded, frontOpacity, backOpacity]);

  // ── WC path: persona switch latency measurement (Phase 3, Task 3.4) ─────────
  // Each card emits a mark on every persona change. To measure total switch time:
  //   const marks = performance.getEntriesByType('mark')
  //     .filter(m => m.name.startsWith('wc-persona-switch:'));
  //   marks.sort((a,b) => a.startTime - b.startTime);
  //   console.log('total ms:', marks.at(-1).startTime - marks[0].startTime);
  useLayoutEffect(() => {
    if (!useWCCards) return;
    performance.mark(`wc-persona-switch:${uid}:${uiTheme}`);
  }, [useWCCards, uiTheme, uid]);

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
        // FORCED SELECTION: Do not auto-collapse on drag start if overlay is open.
        if (isOverlayOpen) return;

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
  // Captured for JSX narrowing — TypeScript can't narrow property-access expressions
  // inside JSX element position, but CAN narrow a local const.
  // Cast to the union type so TS narrows correctly in the truthy branch.
  // Default persona has `null`; future personas may supply an actual component.
  const WcScrapLabel = CardPersona.visuals.ScrapLabel as
    React.ComponentType<{ children: React.ReactNode }> | null | undefined;

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
        
        // FORCED SELECTION: Do not allow toggling expansion (closing) if overlay is open.
        if (isOverlayOpen && !nextState) return;

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
        if (!isExpanded) scaleSpring.set(1.08);
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
        {useWCCards ? (
          /* ── WC path ──────────────────────────────────────────────────────
             Phase 2: compact LOD is driven by layout-mode attribute instead
             of swapping to CompactCardVisual. back face slots are lazy-mounted
             (only after first flip/expand) via backFaceMounted flag.        */
          <LexiCardChrome
            persona={(uiTheme as 'default' | 'cyberpunk')}
            isActive={isActive}
            isExpanded={isExpanded}
            isFlipped={isFlipped}
            isOver={isOver}
            layoutMode={isCompactLOD && !isExpanded && !isFlipped ? 'compact' : 'default'}
            visualFeedback={visualFeedback}
            hostRef={wcHostRef}
            slots={{
              // ── Front face ──────────────────────────────────────────────
              level: WcScrapLabel ? (
                <WcScrapLabel>
                  {learningData.level}
                </WcScrapLabel>
              ) : (
                <span style={{
                  fontFamily: 'var(--card-font-label)',
                  background: 'var(--card-gradient-label-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 12px rgba(240,208,130,0.4))',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.2em',
                }}>{learningData.level}</span>
              ),
              visual: (
                <MemoizedCardVisual
                  isCompact={false}
                  visualPayload={currentCardData.visual.payload}
                  isActive={isActive}
                  fallbackWord={title}
                  Persona={CardPersona}
                  bgParallaxX={bgParallaxX}
                  bgParallaxY={bgParallaxY}
                  fgParallaxX={fgParallaxX}
                  fgParallaxY={fgParallaxY}
                  durability={currentCardData.senseInfo.durability}
                />
              ),
              word: (
                <div className={`w-full flex justify-center items-center ${isCompactLOD && !isExpanded && !isFlipped ? 'h-[4rem]' : 'h-[2.75rem]'}`}>
                  <TieredText
                    text={title}
                    tiers={isCompactLOD && !isExpanded && !isFlipped ? [
                      { id: 'compact-xl', fontSize: 48, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'XL' },
                      { id: 'compact-lg', fontSize: 40, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'LG' },
                      { id: 'compact-md', fontSize: 32, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'MD' },
                      { id: 'compact-sm', fontSize: 24, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 0.95, label: 'SM' },
                    ] : CardPersona.tokens.typography.mainWordTiers}
                    style={{
                      fontFamily: 'var(--card-font-label)',
                      backgroundImage: 'var(--card-gradient-gold-text)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                      textAlign: 'center',
                      paddingBottom: '2px',
                    }}
                  />
                </div>
              ),
              pronunciation: learningData.pronunciation ? (
                <span
                  className="font-serif text-[10px] tracking-[0.2em] opacity-50 mix-blend-plus-lighter inline-block"
                  style={{ color: 'var(--card-color-gold-bright)' }}
                >
                  {learningData.pronunciation}
                </span>
              ) : null,
              systemWord: learningLanguage !== systemLanguage ? (
                <span
                  style={{
                    fontFamily: 'var(--card-font-label)',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    // 几何居中
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1',
                    minWidth: '64px',
                    height: '18px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    marginTop: '6px',
                    borderRadius: '2px',
                    // 平行光源、通透暗金 (Parallel top-down lighting, semi-transparent)
                    // 180deg = 光从正上方平行射下
                    background: 'linear-gradient(180deg, rgba(205,168,72,0.82) 0%, rgba(100,72,18,0.96) 38%, rgba(88,62,14,0.98) 62%, rgba(190,150,62,0.82) 100%)',
                    // 极简边框：仅顶部细高光棱、底部暗棱
                    border: '1px solid rgba(10,7,2,0.55)',
                    boxShadow: [
                      '0 1px 3px rgba(0,0,0,0.55)',
                      'inset 0 1px 0 rgba(250,215,100,0.55)',
                      'inset 0 -1px 0 rgba(0,0,0,0.65)',
                    ].join(','),
                    // 亮色阴刻文字，深阴影确保清晰度
                    color: '#faeea0',
                    textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                  }}
                >
                  {systemData.word}
                </span>
              ) : null,

              // ── Back face (lazy-mounted) ─────────────────────────────────
              ...(backFaceMounted ? {
                ontology: currentCardData.senseInfo.ontology,

                wordBack: (
                  <div className="w-full flex items-center h-[2.75rem] mr-3">
                    <TieredText
                      text={title}
                      tiers={CardPersona.tokens.typography.mainWordTiers}
                      style={{
                        fontFamily: 'var(--card-font-label)',
                        backgroundImage: 'var(--card-gradient-gold-text)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                        textAlign: 'left',
                        paddingBottom: '2px',
                      }}
                    />
                  </div>
                ),

                pos: (
                  <span style={{
                    fontSize: '1.125rem',
                    fontStyle: 'italic',
                    fontFamily: 'var(--card-font-body)',
                    color: 'var(--card-color-gold-metallic)',
                    opacity: 0.8,
                  }}>
                    {learningData.pos}
                  </span>
                ),

                definition: (
                  <div
                    style={{
                      flex: 1,
                      borderRadius: '0.375rem',
                      paddingTop: '0.375rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1rem',
                      paddingRight: '0.125rem',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      overflow: 'hidden',
                      border: '2px solid var(--card-color-border-outer)',
                      boxShadow: 'var(--card-shadow-def-box)',
                      background: 'var(--card-gradient-def-box-overlay), var(--card-color-def-box-bg)',
                      transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.borderColor = 'var(--card-color-gold-metallic)';
                      el.style.boxShadow = 'inset 0 1px 0 0 rgba(240,208,130,0.2), inset 0 -1px 0 0 rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3), 0 2px 8px rgba(0,0,0,0.4)';
                      el.style.transform = 'scale(1.01)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.borderColor = 'var(--card-color-border-outer)';
                      el.style.boxShadow = 'var(--card-shadow-def-box)';
                      el.style.transform = 'scale(1)';
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDefinitionClick();
                    }}
                  >
                    <div style={{
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--card-font-body)',
                      letterSpacing: '0.1em',
                      marginBottom: '2px',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingRight: '14px',
                      color: 'var(--card-color-gold-metallic)',
                      opacity: 0.6,
                    }}>
                      <span style={{ transform: 'scale(0.9)', transformOrigin: 'left', display: 'inline-block' }}>DEFINITION</span>
                      <span style={{ opacity: 0.3 }}>•</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        width: '100%',
                        height: '100%',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--card-color-scrollbar-thumb) transparent',
                      } as React.CSSProperties}
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <p style={{
                        color: 'var(--card-color-text-primary)',
                        fontFamily: 'var(--card-font-body)',
                        lineHeight: 1.65,
                        letterSpacing: '0.01em',
                        fontSize: '1rem',
                        flex: 1,
                        userSelect: 'none',
                        paddingRight: '2px',
                        margin: 0,
                      }}>
                        {systemData.definition}
                      </p>
                    </div>
                  </div>
                ),

                flavor: (
                  <div
                    ref={wcFlavorContainerRef}
                    style={{
                      flex: 1,
                      borderRadius: '0.375rem',
                      padding: '6px 2px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      position: 'relative',
                      backgroundColor: 'var(--card-color-flavor-box-bg)',
                      border: '1px solid var(--card-color-border-subtle)',
                      boxShadow: 'var(--card-shadow-flavor-box)',
                      cursor: 'default',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      color: 'white',
                      opacity: 0.7,
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 5 L19 18 L5 18 Z" />
                        <circle cx="12" cy="13" r="2.5" fill="currentColor" fillOpacity="0.4" stroke="none" />
                      </svg>
                    </div>
                    <FlavorCarousel
                      items={wcCurrentFlavorContents}
                      persona={CardPersona}
                      tokens={CardPersona.tokens}
                      currentIndex={wcFlavorIndex}
                      direction={wcFlavorDirection}
                      onNavigate={(newIndex, newDir) => {
                        setWcFlavorDirection(newDir);
                        setWcFlavorIndex(newIndex);
                      }}
                      onContentClick={() => {
                        const text = wcCurrentFlavorContents[wcFlavorIndex]?.text;
                        if (text) tts.speak(text, learningLanguage);
                      }}
                    />
                  </div>
                ),

                backOverlay: (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 50,
                    pointerEvents: 'none',
                  }}>
                    {/* Flavor indicators — only visible on back face */}
                    {isFlipped && wcCurrentFlavorContents.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        zIndex: 50,
                        pointerEvents: 'none',
                      }}>
                        {wcCurrentFlavorContents.map((item, idx) => (
                          <button
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setWcFlavorDirection(idx > wcFlavorIndex ? 1 : -1);
                              setWcFlavorIndex(idx);
                            }}
                            style={{
                              width: '12px',
                              height: '1px',
                              borderRadius: '9999px',
                              opacity: idx === wcFlavorIndex ? 1 : 0.2,
                              transform: idx === wcFlavorIndex ? 'scaleX(1.25)' : 'scaleX(1)',
                              transition: 'opacity 0.3s, transform 0.3s',
                              backgroundColor: 'white',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              pointerEvents: 'auto',
                            }}
                            title={item.type}
                          />
                        ))}
                      </div>
                    )}
                    {/* SelectionOverlay */}
                    {isOverlayOpen && (
                      <div style={{ pointerEvents: 'auto' }}>
                        <SelectionOverlay
                          items={selectionItems}
                          selectedId={selectedDefId}
                          onSelect={handleSelectDefinition}
                          systemLang={systemLanguage}
                          learningLang={learningLanguage}
                          tokens={CardPersona.tokens}
                        />
                      </div>
                    )}
                  </div>
                ),
              } : {}),
            }}
          />
        ) : (isCompactLOD && !isExpanded && !isFlipped) ? (
          /* ── Legacy compact path ─────────────────────────────────────── */
          <CompactCardVisual
            mode="repository"
            learningData={learningData}
            senseInfo={currentCardData.senseInfo}
            visual={currentCardData.visual}
            persona={CardPersona}
            isActive={isActive}
          />
        ) : (
          /* ── Legacy full path ────────────────────────────────────────── */
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
