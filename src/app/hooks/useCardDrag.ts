import { useMemo, useRef } from 'react';
import { useCanvasContext } from '@/app/context/CanvasContext';
import { useDrag } from '@use-gesture/react';
import { MotionValue } from 'motion/react';
import { useGameStore } from '@store/index';
import { WORLD_W, WORLD_H } from '@/config/canvas';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { tts } from '@/app/utils/audio/tts';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

interface useCardDragParams {
  cardRef: React.RefObject<HTMLDivElement>;
  cardData: CardEntity;
  isFlipped: boolean;
  isExpanded: boolean;
  isOverlayOpen: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
  canvasScale: MotionValue<number>;
  width: number;
  height: number;
  scaleSpring: MotionValue<number>;
  isHoveredRef: React.MutableRefObject<boolean>;
  targetCenterX: MotionValue<number>;
  targetCenterY: MotionValue<number>;
  learningLanguage: Language;
  title: string;
  updatePosition: (id: string, x: number, y: number) => void;
  startAnimation: () => void;
  setIsExpanded: (val: boolean) => void;
  setVisualFeedback: (val: 'merge' | 'split' | null) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  onDropIntoSlot?: (cardId: string, deviceUid: string, slotId: number) => void;
  onDropIntoSummoner?: (cardId: string, deviceUid: string) => void;
  onDropIntoRepository?: (cardId: string) => void;
  onCardEnterDevice?: (cardId: string) => void;
  isDraggingRef: React.MutableRefObject<boolean>;
  draggingIdRef: React.MutableRefObject<string | null>;
}

/**
 * Hook to manage card drag interactions using @use-gesture/react.
 * Handles movement, boundary constraints, and drop detection for various game targets.
 */
export function useCardDrag({
  cardRef,
  cardData,
  isFlipped,
  isExpanded,
  isOverlayOpen,
  x,
  y,
  canvasScale,
  width,
  height,
  scaleSpring,
  isHoveredRef,
  targetCenterX,
  targetCenterY,
  learningLanguage,
  title,
  updatePosition,
  startAnimation,
  setIsExpanded,
  setVisualFeedback,
  onDragStart,
  onDragEnd,
  onDropIntoSlot,
  onDropIntoSummoner,
  onDropIntoRepository,
  onCardEnterDevice,
  isDraggingRef,
  draggingIdRef,
}: useCardDragParams) {
  const { isZoomingRef, expandedIdsRef, isPanningRef } = useCanvasContext();
  const dragConfig = useMemo(() => ({
    target: cardRef,
    enabled: !isFlipped,
    pointer: { keys: false },
    eventOptions: { passive: false }
  }), [cardRef, isFlipped]);

  const targetsCacheRef = useRef<{ el: HTMLElement; rect: DOMRect }[]>([]);
  const lastHoveredElRef = useRef<HTMLElement | null>(null);

  useDrag(({ active, xy: [px, py], delta: [dx, dy], first, last, event }) => {
    if (first) {
      // READS: Cache all potential drop targets once at drag start BEFORE any DOM writes
      const allTargets = document.querySelectorAll('.synthesis-slot, .summoner-slot, .grimoire-slot, .closed-grimoire');
      targetsCacheRef.current = Array.from(allTargets).map(el => ({
        el: el as HTMLElement,
        rect: el.getBoundingClientRect()
      }));

      // WRITES: Update state and styles
      isDraggingRef.current = true;
      draggingIdRef.current = cardData.uid;
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
        if (isOverlayOpen) return;

        startAnimation();
        x.set(targetCenterX.get());
        y.set(targetCenterY.get());
        updatePosition(cardData.uid, targetCenterX.get(), targetCenterY.get());
        setIsExpanded(false);
      }
      onDragStart?.(cardData.uid);
      document.body.classList.add('is-dragging-card');
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

      const { clientX: cX, clientY: cY } = (event as any).touches ? (event as any).touches[0] : (event as any);
      
      let hoveredTarget: HTMLElement | null = null;
      for (const target of targetsCacheRef.current) {
        const rect = target.rect;
        if (cX >= rect.left && cX <= rect.right && cY >= rect.top && cY <= rect.bottom) {
          hoveredTarget = target.el;
          break;
        }
      }

      // Update classes only if necessary to avoid DOM thrashing and expensive selector lookups
      if (lastHoveredElRef.current !== hoveredTarget) {
        if (lastHoveredElRef.current) lastHoveredElRef.current.classList.remove('is-drag-over');
        if (hoveredTarget) hoveredTarget.classList.add('is-drag-over');
        lastHoveredElRef.current = hoveredTarget;
      }
    }

    if (last) {
      // READS: Get drop targets BEFORE any DOM writes/style resets
      const { clientX, clientY } = (event as any).touches ? (event as any).touches[0] : (event as any);
      const elements = document.elementsFromPoint(clientX, clientY);

      // WRITES: Reset state and styles
      isDraggingRef.current = false;
      draggingIdRef.current = null;
      scaleSpring.set(isHoveredRef.current ? 1.05 : 1);
      if (cardRef.current) {
        cardRef.current.style.cursor = isExpanded ? 'zoom-out' : 'grab';
        cardRef.current.style.boxShadow = isHoveredRef.current
          ? CardPersona.tokens.shadows.hover
          : CardPersona.tokens.shadows.base;
        cardRef.current.style.willChange = isHoveredRef.current ? 'transform' : 'auto';
      }
      onDragEnd?.(cardData.uid);
      document.body.classList.remove('is-dragging-card');

      // Clear drag-over status
      if (lastHoveredElRef.current) {
        lastHoveredElRef.current.classList.remove('is-drag-over');
        lastHoveredElRef.current = null;
      }
      
      // Use elementsFromPoint for primary targets
      const slotElement = elements.find(el => el.classList.contains('synthesis-slot')) as HTMLElement;
      if (slotElement) {
        const slotId = parseInt(slotElement.dataset.slotId || '0', 10);
        const deviceUid = slotElement.dataset.deviceUid;
        if (slotId && deviceUid && onDropIntoSlot) {
          onDropIntoSlot(cardData.uid, deviceUid, slotId);
        }
      }

      const summonerSlot = elements.find(el => el.classList.contains('summoner-slot')) as HTMLElement;
      if (summonerSlot) {
        const deviceUid = summonerSlot.dataset.summonerUid;
        if (deviceUid && onDropIntoSummoner) {
          onDropIntoSummoner(cardData.uid, deviceUid);
        }
      }

      const state = useGameStore.getState();
      const activeGrimoireId = state.activeGrimoireId;
      
      // Hit testing for Grimoire Slots and Closed Grimoires using cached rects
      let hitSlotId: string | null = null;
      let hitGrimoireId: string | null = null;

      for (const target of targetsCacheRef.current) {
        const rect = target.rect;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          if (target.el.classList.contains('grimoire-slot')) {
            hitSlotId = target.el.dataset.slotId || null;
          } else if (target.el.classList.contains('closed-grimoire')) {
            hitGrimoireId = target.el.dataset.grimoireId || null;
          }
          if (hitSlotId || hitGrimoireId) break;
        }
      }

      if (activeGrimoireId && hitSlotId) {
        state.updateSlotSense(activeGrimoireId, hitSlotId, cardData.rawSense.uid);
        onCardEnterDevice?.(cardData.uid);
      } else if (hitGrimoireId) {
        const targetGrimoire = state.activeGrimoires.find(g => g.id === hitGrimoireId);
        if (targetGrimoire && targetGrimoire.status !== 'EVALUATING' && targetGrimoire.status !== 'SUMMONING') {
          const emptySlot = targetGrimoire.slots.find(s => !s.senseId);
          if (emptySlot) {
            state.updateSlotSense(hitGrimoireId, emptySlot.id, cardData.rawSense.uid);
            onCardEnterDevice?.(cardData.uid);
          }
        }
      }

      const repoElement = elements.find(el => el.id === 'deck-repository-drop-zone');
      if (repoElement && onDropIntoRepository) {
        onDropIntoRepository(cardData.uid);
      }

      // Clear cache
      targetsCacheRef.current = [];
    }
  }, dragConfig);

  return { isDraggingRef };
}
