import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'motion/react';

export interface CullItem {
  uid: string;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  width: number;
  height: number;
}

// Extra pixels outside the viewport to keep rendered (prevents pop-in during slow pans)
const MARGIN = 350;
// Milliseconds to wait after camera stops before recomputing visibility
const DEBOUNCE_MS = 100;

/**
 * Returns the set of card UIDs that are currently inside (or near) the viewport.
 * Subscribes to camera MotionValues imperatively — no React re-render per frame.
 * Re-renders App only after the debounce fires and the visible set actually changes.
 *
 * expandedIdsRef: a MutableRefObject<Set<string>> updated imperatively by Card when expanding
 * or collapsing — never triggers a React re-render, so expand/collapse no longer causes App
 * to re-render just to keep the expanded card alive in the visible set.
 */
export function useViewportCulling(
  items: CullItem[],
  cameraX: MotionValue<number>,
  cameraY: MotionValue<number>,
  cameraScale: MotionValue<number>,
  expandedIdsRef: RefObject<Set<string>>,
  draggingIdRef: RefObject<string | null>,
): Set<string> {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(items.map(i => i.uid)),
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafGuardRef = useRef<number | null>(null);

  // Keep a mutable ref to items so compute() always sees the latest list
  // without needing to re-subscribe to camera MotionValues on every items change.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // computeRef is re-assigned every render so closures are always fresh.
  // Reading expandedIdsRef.current directly means expand/collapse updates are
  // visible immediately without any re-subscription (refs don't trigger effects).
  const computeRef = useRef<() => void>(null!);
  computeRef.current = () => {
    const sx = cameraX.get();
    const sy = cameraY.get();
    const scale = cameraScale.get();
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const expanded = expandedIdsRef.current!;
    const dragging = draggingIdRef.current;

    const next = new Set<string>();
    for (const item of itemsRef.current) {
      // Always keep expanded/flipped/dragging cards alive
      if (expanded.has(item.uid) || item.uid === dragging) {
        next.add(item.uid);
        continue;
      }
      const mx = item.mx.get();
      const my = item.my.get();
      const cx = mx * scale + sx;
      const cy = my * scale + sy;
      const hw = (item.width / 2) * scale;
      const hh = (item.height / 2) * scale;
      if (
        cx + hw > -MARGIN && cx - hw < sw + MARGIN &&
        cy + hh > -MARGIN && cy - hh < sh + MARGIN
      ) {
        next.add(item.uid);
      }
    }

    // Only setState if the visible set actually changed (avoids cascading re-renders)
    setVisibleIds(prev => {
      if (prev.size === next.size && [...next].every(id => prev.has(id))) return prev;
      return next;
    });
  };

  // Subscribe to camera MotionValues (debounced + rAF-guarded to fire at most once per frame)
  useEffect(() => {
    const debounced = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => computeRef.current(), DEBOUNCE_MS);
    };

    // Frame-level dedup: x, y, scale each fire on the same frame — only enter debounced once
    const debouncedWithRafGuard = () => {
      if (rafGuardRef.current !== null) return;
      rafGuardRef.current = requestAnimationFrame(() => {
        rafGuardRef.current = null;
        debounced();
      });
    };

    computeRef.current(); // immediate on mount / camera MV change

    const unsubs = [
      cameraX.on('change', debouncedWithRafGuard),
      cameraY.on('change', debouncedWithRafGuard),
      cameraScale.on('change', debouncedWithRafGuard),
    ];

    return () => {
      unsubs.forEach(u => u());
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafGuardRef.current !== null) cancelAnimationFrame(rafGuardRef.current);
    };
  }, [cameraX, cameraY, cameraScale]);

  // Recompute immediately when items list changes
  useEffect(() => {
    computeRef.current();
  }, [items]);

  return visibleIds;
}
