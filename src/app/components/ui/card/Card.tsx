import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, startTransition } from 'react';
import { useCardVariants } from '@/app/hooks/useCardVariants';
import { useDrop } from 'react-dnd';
import { motion, useMotionValue, MotionValue } from 'motion/react';
import { useWindowDimensions } from '@/app/hooks/useWindowDimensions';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { LexiCardChrome } from '@/app/components/ui/card/web/LexiCardChrome';
import { cardFocusRegistry } from '@/app/utils/cardFocusRegistry';
import { tts } from '@/app/utils/audio/tts';
import { useGameStore } from '@store/index';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

// --- New Extracted Hooks & Helpers ---
import { useCardPhysics } from '@/app/hooks/useCardPhysics';
import { useCardAnimation } from '@/app/hooks/useCardAnimation';
import { useCardDrag } from '@/app/hooks/useCardDrag';
import { getCardWCSlots } from '@/app/components/ui/card/CardWCSlots';

interface CardProps {
  cardData: CardEntity;
  variants?: CardEntity[];
  learningLanguage: Language;
  systemLanguage: Language;
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
  canvasScale: MotionValue<number>;
  canvasX: MotionValue<number>;
  canvasY: MotionValue<number>;
  externalScale?: MotionValue<number>;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  onDropItem?: (item: any) => void;
  isHidden?: boolean;
  groupFeedback?: { merge: string[], split: string[], timestamp: number } | null;
  onDropIntoSlot?: (cardId: string, deviceUid: string, slotId: number) => void;
  onDropIntoSummoner?: (cardId: string, deviceUid: string) => void;
  onDropIntoRepository?: (cardId: string) => void;
  onCardEnterDevice?: (cardId: string) => void;
  expandedIdsRef?: React.MutableRefObject<Set<string>>;
  isPanningRef?: React.MutableRefObject<boolean>;
  isZoomingRef?: React.MutableRefObject<boolean>;
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
  onCardEnterDevice,
  expandedIdsRef,
  isPanningRef,
  isZoomingRef,
}) => {
  // ========== Variant & Data Logic ==========
  const { setActiveUid, activeUid, sortedVariants, currentCardData } = useCardVariants({ cardData, variants });
  const learningData = currentCardData.displayData[learningLanguage]!;
  const systemData = currentCardData.displayData[systemLanguage]!;
  const title = learningData.word;
  const uid = cardData.uid;

  // ========== Local State ==========
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [visualFeedback, setVisualFeedback] = useState<'merge' | 'split' | null>(null);
  const isDraggingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const scaleWrapperRef = useRef<HTMLDivElement | null>(null);
  const { windowWidth, windowHeight } = useWindowDimensions();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const physics = useCardPhysics({
    x, y, mouseX, mouseY, windowWidth, windowHeight, isExpanded, isFlipped
  });

  const animation = useCardAnimation({
    isExpanded, isFlipped, x, y, canvasX, canvasY, canvasScale, width, height,
    externalScale, cardRef, scaleWrapperRef, isPanningRef,
    displayRotateX: physics.displayRotateX,
    displayRotateY: physics.displayRotateY,
    displayRotateZ: physics.displayRotateZ,
  });

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);
  }, []);

  const { isDraggingRef: _isDraggingRef } = useCardDrag({
    cardRef, cardData, isFlipped, isExpanded, isOverlayOpen, x, y, canvasScale, width, height,
    scaleSpring: animation.scaleSpring, isHoveredRef,
    targetCenterX: animation.targetCenterX, targetCenterY: animation.targetCenterY,
    learningLanguage, title, updatePosition, startAnimation,
    setIsExpanded, setVisualFeedback, onDragStart, onDragEnd,
    onDropIntoSlot, onDropIntoSummoner, onDropIntoRepository, onCardEnterDevice,
    isDraggingRef, isZoomingRef, expandedIdsRef, isPanningRef
  });

  // ========== UI Store & Theme ==========
  const uiTheme = useGameStore(s => s.uiTheme);
  const focusCard = useGameStore(s => s.focusCard);
  const blurCard = useGameStore(s => s.blurCard);

  // ========== Focus/Blur Registry ==========
  useEffect(() => {
    if (isExpanded || isFlipped) {
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

  useEffect(() => {
    if (!isExpanded && !isFlipped) {
      cardFocusRegistry.unregister(uid);
      return;
    }
    const handleGlobalClick = (e: PointerEvent) => {
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
  }, [isExpanded, isFlipped, uid, isOverlayOpen]);

  // ========== Mouse & Interaction ==========
  useEffect(() => {
    if (!isExpanded || isFlipped) return;
    // RAF throttle: accumulate latest coords and flush once per frame.
    // Without this, 120-240Hz mice drove the full tilt+parallax chain multiple times per frame.
    let lastX = 0, lastY = 0, rafId: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanningRef?.current) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        mouseX.set(lastX);
        mouseY.set(lastY);
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isExpanded, isFlipped, mouseX, mouseY, isPanningRef]);

  // ========== Visual Feedback Effect ==========
  useEffect(() => {
    if (!groupFeedback) return;
    if (groupFeedback.merge.includes(uid)) setVisualFeedback('merge');
    else if (groupFeedback.split.includes(uid)) setVisualFeedback('split');
  }, [groupFeedback, uid]);

  // ========== Web Component Shadow DOM Sync ==========
  const wcHostRef = useRef<HTMLElement | null>(null);
  const [wcFlavorIndex, setWcFlavorIndex] = useState(0);
  const [wcFlavorDirection, setWcFlavorDirection] = useState(0);
  const [wcActivePersonaId, setWcActivePersonaId] = useState(0);
  const wcFlavorContainerRef = useRef<HTMLDivElement>(null);

  const wcAvailablePersonas = useMemo(() => {
    const personas = Array.from(new Set(learningData.flavorContents.map((item: any) => item.persona)));
    personas.sort((a: any, b: any) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)));
    return personas.length === 0 ? ['default'] : personas;
  }, [learningData.flavorContents]);

  const wcCurrentPersonaName = wcAvailablePersonas[wcActivePersonaId] ?? wcAvailablePersonas[0] ?? 'default';
  const wcCurrentFlavorContents = useMemo(() =>
    learningData.flavorContents.filter((item: any) => item.persona === wcCurrentPersonaName),
    [learningData.flavorContents, wcCurrentPersonaName]
  );

  // ---- Stable Flavor Callbacks ----
  const flavorDataRef = useRef({ contents: wcCurrentFlavorContents, index: wcFlavorIndex });
  flavorDataRef.current = { contents: wcCurrentFlavorContents, index: wcFlavorIndex };

  const handleFlavorNavigateCb = useCallback((newIndex: number, newDir: number) => {
    setWcFlavorDirection(newDir);
    setWcFlavorIndex(newIndex);
  }, []);

  const handleFlavorContentClickCb = useCallback(() => {
    const { contents, index } = flavorDataRef.current;
    const text = contents[index]?.text;
    if (text) tts.speak(text, learningLanguage);
  }, [learningLanguage]);

  const handleFlavorIndicatorClickCb = useCallback((idx: number) => {
    const { index } = flavorDataRef.current;
    setWcFlavorDirection(idx > index ? 1 : -1);
    setWcFlavorIndex(idx);
  }, []);

  const handleDefinitionClickCb = useCallback(() => setIsOverlayOpen(true), []);

  const handleSelectDefinitionCb = useCallback((item: any) => {
    setActiveUid(item.id);
    setIsOverlayOpen(false);
    const variant = sortedVariants.find((v: CardEntity) => v.uid === item.id);
    const def = variant?.displayData[learningLanguage]?.definition;
    if (def) tts.speak(def, learningLanguage);
  }, [setActiveUid, sortedVariants, learningLanguage]);

  useEffect(() => {
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
  }, [isFlipped, isExpanded, wcAvailablePersonas.length]);

  useLayoutEffect(() => {
    const host = wcHostRef.current;
    if (!host?.shadowRoot) return;
    const flipEl = host.shadowRoot.querySelector('[part="flip-wrapper"]') as HTMLElement | null;
    const frontEl = host.shadowRoot.querySelector('[part="front-face"]') as HTMLElement | null;
    const backEl = host.shadowRoot.querySelector('[part="back-face"]') as HTMLElement | null;

    // Track last pointerEvents state to avoid forcing event-tree recalc every frame.
    let prevFrontOver = animation.frontOpacity.get() > 0.5;
    let prevBackOver = animation.backOpacity.get() > 0.5;
    let pending = false;

    // Batch all three shadow DOM writes into a single microtask flush.
    // Previously, three independent .on('change') callbacks each caused a separate style mutation.
    const flush = () => {
      pending = false;
      if (flipEl) flipEl.style.transform = `scaleX(${animation.flipScaleX.get()})`;
      if (frontEl) {
        const v = animation.frontOpacity.get();
        frontEl.style.opacity = String(v);
        const over = v > 0.5;
        if (over !== prevFrontOver) { frontEl.style.pointerEvents = over ? 'auto' : 'none'; prevFrontOver = over; }
      }
      if (backEl) {
        const v = animation.backOpacity.get();
        backEl.style.opacity = String(v);
        const over = v > 0.5;
        if (over !== prevBackOver) { backEl.style.pointerEvents = over ? 'auto' : 'none'; prevBackOver = over; }
      }
    };
    const schedule = () => { if (pending) return; pending = true; Promise.resolve().then(flush); };

    flush();
    const unsubs = [
      animation.flipScaleX.on('change', schedule),
      animation.frontOpacity.on('change', schedule),
      animation.backOpacity.on('change', schedule),
    ];
    return () => unsubs.forEach(u => u());
  }, [uiTheme, animation.flipScaleX, animation.frontOpacity, animation.backOpacity]);

  useEffect(() => {
    const host = wcHostRef.current;
    if (!host?.shadowRoot) return;
    const frontEl = host.shadowRoot.querySelector('[part="front-face"]') as HTMLElement | null;
    const backEl = host.shadowRoot.querySelector('[part="back-face"]') as HTMLElement | null;
    const applyFace = (el: HTMLElement | null, v: number) => {
      if (el) { el.style.opacity = String(v); el.style.pointerEvents = v > 0.5 ? 'auto' : 'none'; }
    };
    applyFace(frontEl, animation.frontOpacity.get());
    applyFace(backEl, animation.backOpacity.get());
  }, [uiTheme, isFlipped, isExpanded, animation.frontOpacity, animation.backOpacity]);

  // ========== Selection Overlay Helpers ==========
  const selectionItems = useMemo(() => sortedVariants.map(variant => ({
    id: variant.uid,
    definitions: Object.keys(variant.displayData).reduce((acc, lang) => {
      acc[lang as Language] = variant.displayData[lang as Language]?.definition || '';
      return acc;
    }, {} as Record<Language, string>),
    pos: variant.displayData[learningLanguage]?.pos || 'n.'
  })), [sortedVariants, learningLanguage]);

  // ========== Drop Target (Items) ==========
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ITEM',
    drop: (item) => { onDropItem?.(item); return { name: title }; },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }));

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    drop(node);
  }, [drop]);

  const isActive = (isHovered || isExpanded || isOver || isOverlayOpen) && !isAnimating;
  const backFaceMountedRef = useRef(false);
  if (isExpanded || isFlipped) backFaceMountedRef.current = true;

  const slots = useMemo(() => getCardWCSlots({
    learningData, systemData, currentCardData, learningLanguage, systemLanguage,
    isExpanded, isFlipped, isOverlayOpen, selectionItems,
    selectedDefId: activeUid,
    handleDefinitionClick: handleDefinitionClickCb,
    handleSelectDefinition: handleSelectDefinitionCb,
    wcFlavorContainerRef, wcCurrentFlavorContents, wcFlavorIndex, wcFlavorDirection,
    setWcFlavorIndex, setWcFlavorDirection,
    onFlavorNavigate: handleFlavorNavigateCb,
    onFlavorContentClick: handleFlavorContentClickCb,
    onFlavorIndicatorClick: handleFlavorIndicatorClickCb,
    isActive, visualFeedback,
    bgParallaxX: physics.bgParallaxX, bgParallaxY: physics.bgParallaxY,
    fgParallaxX: physics.fgParallaxX, fgParallaxY: physics.fgParallaxY,
    backFaceMounted: backFaceMountedRef.current,
    WcScrapLabel: CardPersona.visuals.ScrapLabel as any,
    title, CardPersona,
  }), [
    learningData, systemData, currentCardData, learningLanguage, systemLanguage,
    isExpanded, isFlipped, isOverlayOpen, selectionItems,
    activeUid, handleDefinitionClickCb, handleSelectDefinitionCb,
    wcCurrentFlavorContents, wcFlavorIndex, wcFlavorDirection,
    handleFlavorNavigateCb, handleFlavorContentClickCb, handleFlavorIndicatorClickCb,
    isActive, visualFeedback, title,
  ]);

  const targetShadow = isExpanded ? CardPersona.tokens.shadows.expanded 
    : isHoveredRef.current ? CardPersona.tokens.shadows.hover 
    : CardPersona.tokens.shadows.base;

  return (
    <motion.div
      ref={setRefs}
      onClick={(e) => {
        if (isDraggingRef.current || e.button !== 0) return;
        if (isFlipped) { if (! (e.target as HTMLElement).closest('.back-face-content')) return; return; }
        if (isOverlayOpen && isExpanded) return;
        setIsExpanded(!isExpanded);
        startAnimation();
        if (!isExpanded && title) tts.speak(title, learningLanguage);
      }}
      onContextMenu={(e) => {
        e.preventDefault(); e.stopPropagation();
        startAnimation();
        if (!isFlipped) { setIsFlipped(true); setIsExpanded(true); } else { setIsFlipped(false); }
      }}
      style={{
        width, height, opacity: isHidden ? 0 : 1, boxShadow: targetShadow,
        transition: 'box-shadow 0.3s ease-out', transformStyle: 'preserve-3d',
        cursor: isFlipped ? 'default' : (isExpanded ? 'zoom-out' : 'grab'),
        position: 'absolute', left: '50%', top: '50%',
        marginLeft: -width / 2, marginTop: -height / 2,
        touchAction: 'none', borderRadius: CardPersona.tokens.layout.radius, contain: 'layout style',
      }}
      onHoverStart={() => {
        if (isFlipped) return;
        isHoveredRef.current = true;
        // startTransition defers the re-render as non-urgent so it doesn't compete
        // with the scale spring animation kicking off in the same frame.
        startTransition(() => setIsHovered(true));
        setVisualFeedback(null);
        if (!isExpanded) animation.scaleSpring.set(1.08);
      }}
      onHoverEnd={() => {
        if (isFlipped) return;
        isHoveredRef.current = false;
        startTransition(() => setIsHovered(false));
        if (!isExpanded && !isDraggingRef.current) animation.scaleSpring.set(1);
      }}
      className="canvas-card select-none group relative transition-colors duration-300"
    >
      <div ref={scaleWrapperRef} style={{ width: '100%', height: '100%', transformOrigin: 'center center' }}>
        <LexiCardChrome
          persona={(uiTheme as 'default' | 'cyberpunk')}
          isActive={isActive} isExpanded={isExpanded} isFlipped={isFlipped} isOver={isOver}
          visualFeedback={visualFeedback} hostRef={wcHostRef}
          slots={slots}
        />
      </div>
    </motion.div >
  );
});

Card.displayName = 'Card';
