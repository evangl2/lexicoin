import { useEffect, useRef } from 'react';
import { MotionValue } from 'motion/react';

interface PhysicsItem {
  id: string;
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
}

// Internal cache structure for optimization
// Changed 'item' to be optional/nullable to support object pooling initialization
interface CachedItem {
  item: PhysicsItem | null;
  x: number;
  y: number;
  r: number;
  w: number;
  h: number;
}

export const usePhysics = (items: PhysicsItem[], draggingId: string | null) => {
  const requestRef = useRef<number>();

  // OPTIMIZATION: Object Pooling
  // Persist the cache array between frames to avoid garbage collection pressure.
  // We reuse the objects inside this array instead of allocating new ones every frame.
  const cacheRef = useRef<CachedItem[]>([]);

  // World Boundaries
  const WORLD_W = 16000;
  const WORLD_H = 10000;
  const HALF_W = WORLD_W / 2;
  const HALF_H = WORLD_H / 2;

  const update = () => {
    // Simple relaxation steps
    const stiffness = 0.1; // How fast they bounce apart
    const padding = 20; // Extra space between cards
    const count = items.length;

    // 1. POOL MANAGEMENT
    // Ensure the pool is large enough. We only grow, rarely shrink (for stability).
    const cache = cacheRef.current;
    if (cache.length < count) {
      for (let i = cache.length; i < count; i++) {
        cache.push({
          item: null,
          x: 0,
          y: 0,
          r: 0,
          w: 0,
          h: 0
        });
      }
    }

    // 2. READ: Update pool with current frame data
    for (let i = 0; i < count; i++) {
      const item = items[i];
      // Skip invalid items if any
      if (!item) {
        if (cache[i]) cache[i].item = null;
        continue;
      }

      const c = cache[i];
      c.item = item;
      c.x = item.x.get();
      c.y = item.y.get();
      c.r = Math.min(item.width, item.height) / 2 + padding;
      c.w = item.width;
      c.h = item.height;
    }

    // 2b. CLEAR: Nullify items in the pool that are no longer active
    // This allows garbage collection of removed items and prevents phantom references
    for (let i = count; i < cache.length; i++) {
        cache[i].item = null;
    }

    // 3. CALCULATE: Resolve Collisions on cached data
    for (let i = 0; i < count; i++) {
      const a = cache[i];
      if (!a.item) continue;

      for (let j = i + 1; j < count; j++) {
        const b = cache[j];
        if (!b.item) continue;

        // Optimized Collision Check
        const minDist = a.r + b.r;

        // Fast AABB rejection check
        if (Math.abs(a.x - b.x) >= minDist || Math.abs(a.y - b.y) >= minDist) {
          continue;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDist * minDist && distSq > 0) {
          if (draggingId === a.item!.id || draggingId === b.item!.id) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const force = overlap * stiffness;

          // Optimized vector math: (dx / dist) * force = dx * (force / dist)
          const f_d = force / dist;
          const moveX = dx * f_d;
          const moveY = dy * f_d;

          // Push both apart equally (accumulate changes in cache)
          a.x -= moveX * 0.5;
          a.y -= moveY * 0.5;
          b.x += moveX * 0.5;
          b.y += moveY * 0.5;
        }
      }
    }

    // 4. CALCULATE & WRITE: Enforce Boundaries and Flush changes
    for (let i = 0; i < count; i++) {
      const c = cache[i];
      if (!c.item) continue;

      // Skip boundary enforcement if dragging
      if (draggingId !== c.item.id) {
        const minX = -HALF_W + c.w / 2;
        const maxX = HALF_W - c.w / 2;
        const minY = -HALF_H + c.h / 2;
        const maxY = HALF_H - c.h / 2;

        // Clamp position
        if (c.x < minX) c.x = minX;
        else if (c.x > maxX) c.x = maxX;

        if (c.y < minY) c.y = minY;
        else if (c.y > maxY) c.y = maxY;

        // Flush to MotionValue ONLY if changed
        // This prevents unnecessary React/DOM updates
        if (c.x !== c.item.x.get()) c.item.x.set(c.x);
        if (c.y !== c.item.y.get()) c.item.y.set(c.y);
      }
    }

    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [items, draggingId]);
};
