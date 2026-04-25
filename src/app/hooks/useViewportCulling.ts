import { useState, useEffect, useRef } from 'react';
import { useCanvasContext } from '@/app/context/CanvasContext';
import type { RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { GRID_CELL_W, GRID_CELL_H } from './useGridSnap';
import { VIEWPORT_CULL_MARGIN } from '@/config/physics';

export interface CullItem {
  uid: string;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  width: number;
  height: number;
}


/**
 * Returns the set of card UIDs that are currently inside (or near) the viewport.
 * Subscribes to camera MotionValues imperatively — no React re-render per frame.
 * Re-renders App only when the visible set actually changes.
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
): Set<string> {
  const { expandedIdsRef, draggingIdRef, isZoomingRef } = useCanvasContext();
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(items.map(i => i.uid)),
  );

  const rafIdRef = useRef<number | null>(null);
  const lastCullXRef = useRef(0);
  const lastCullYRef = useRef(0);

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
        cx + hw > -VIEWPORT_CULL_MARGIN && cx - hw < sw + VIEWPORT_CULL_MARGIN &&
        cy + hh > -VIEWPORT_CULL_MARGIN && cy - hh < sh + VIEWPORT_CULL_MARGIN
      ) {
        next.add(item.uid);
      }
    }

    // Only setState if the visible set actually changed (avoids cascading re-renders)
    setVisibleIds(prev => {
      if (prev.size === next.size) {
        let isEqual = true;
        for (const id of next) {
          if (!prev.has(id)) {
            isEqual = false;
            break;
          }
        }
        if (isEqual) return prev;
      }
      return next;
    });
  };

  // Subscribe to camera MotionValues — rAF throttle: at most one culling check per frame
  useEffect(() => {
    const throttledCompute = () => {
      // 缩放期间卡片位置固定（grid snap），跳过调度
      // markZoomEnd 会 re-emit scale，届时自动触发一次裁剪
      if (isZoomingRef?.current) return;

      // 平移时：摄像机移动量不足半个格子，可见集不会变化，跳过
      const currX = cameraX.get();
      const currY = cameraY.get();
      const halfCellX = (GRID_CELL_W * cameraScale.get()) / 2;
      const halfCellY = (GRID_CELL_H * cameraScale.get()) / 2;
      if (
        Math.abs(currX - lastCullXRef.current) < halfCellX &&
        Math.abs(currY - lastCullYRef.current) < halfCellY
      ) return;

      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        lastCullXRef.current = cameraX.get();
        lastCullYRef.current = cameraY.get();
        computeRef.current();
      });
    };

    computeRef.current(); // immediate on mount / camera MV change

    const unsubs = [
      cameraX.on('change', throttledCompute),
      cameraY.on('change', throttledCompute),
      cameraScale.on('change', throttledCompute),
    ];

    return () => {
      unsubs.forEach(u => u());
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [cameraX, cameraY, cameraScale]);

  // Recompute immediately when items list changes
  useEffect(() => {
    computeRef.current();
  }, [items]);

  return visibleIds;
}
