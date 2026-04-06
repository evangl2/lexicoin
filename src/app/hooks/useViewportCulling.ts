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
 */
export function useViewportCulling(
  items: CullItem[],
  cameraX: MotionValue<number>,
  cameraY: MotionValue<number>,
  cameraScale: MotionValue<number>,
  zoomedCardIds: string[],
  draggingIdRef: RefObject<string | null>,
): Set<string> {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(items.map(i => i.uid)),
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep mutable refs to avoid re-subscribing when items/zoomed change
  const itemsRef = useRef(items);
  const zoomedIdsRef = useRef(zoomedCardIds);
  itemsRef.current = items;
  zoomedIdsRef.current = zoomedCardIds;

  const compute = useRef(() => {
    const sx = cameraX.get();
    const sy = cameraY.get();
    const scale = cameraScale.get();
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const zoomedSet = new Set(zoomedIdsRef.current);
    const dragging = draggingIdRef.current;

    const next = new Set<string>();
    for (const item of itemsRef.current) {
      // Always keep expanded/flipped/dragging cards alive
      if (zoomedSet.has(item.uid) || item.uid === dragging) {
        next.add(item.uid);
        continue;
      }
      const mx = item.mx.get();
      const my = item.my.get();
      // Card center in viewport: camera already encodes the world-to-screen offset
      // (initial camera.x = sw/2, so world (0,0) maps to screen center)
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
  });

  // Re-point compute closure whenever camera MotionValues change (rare)
  useEffect(() => {
    compute.current = () => {
      const sx = cameraX.get();
      const sy = cameraY.get();
      const scale = cameraScale.get();
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const zoomedSet = new Set(zoomedIdsRef.current);
      const dragging = draggingIdRef.current;

      const next = new Set<string>();
      for (const item of itemsRef.current) {
        if (zoomedSet.has(item.uid) || item.uid === dragging) {
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
      setVisibleIds(prev => {
        if (prev.size === next.size && [...next].every(id => prev.has(id))) return prev;
        return next;
      });
    };
  }, [cameraX, cameraY, cameraScale, draggingIdRef]);

  // Subscribe to camera MotionValues (debounced to avoid 60fps setState calls)
  useEffect(() => {
    const debounced = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => compute.current(), DEBOUNCE_MS);
    };

    compute.current(); // immediate on mount / camera MV change

    const unsubs = [
      cameraX.on('change', debounced),
      cameraY.on('change', debounced),
      cameraScale.on('change', debounced),
    ];

    return () => {
      unsubs.forEach(u => u());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cameraX, cameraY, cameraScale]);

  // Recompute immediately when items list or zoomed state changes
  useEffect(() => {
    compute.current();
  }, [items, zoomedCardIds]);

  return visibleIds;
}
