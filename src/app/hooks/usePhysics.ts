import { useEffect, useRef } from 'react';
import { MotionValue } from 'motion/react';

interface PhysicsItem {
  id: string;
  x: MotionValue<number>;
  y: MotionValue<number>;
  width: number;
  height: number;
}

export const usePhysics = (items: PhysicsItem[], draggingId: string | null) => {
  const requestRef = useRef<number>();

  // World Boundaries (Step 1 & 4)
  const WORLD_W = 16000;
  const WORLD_H = 10000;
  const HALF_W = WORLD_W / 2;
  const HALF_H = WORLD_H / 2;

  const update = () => {
    // Simple relaxation steps
    const stiffness = 0.1; // How fast they bounce apart
    const padding = 20; // Extra space between cards

    // 1. Resolve Collisions
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i];
        const itemB = items[j];

        const ax = itemA.x.get();
        const ay = itemA.y.get();
        const bx = itemB.x.get();
        const by = itemB.y.get();

        // Approximate collision with circles for smooth "bounce"
        const rA = Math.min(itemA.width, itemA.height) / 2 + padding;
        const rB = Math.min(itemB.width, itemB.height) / 2 + padding;
        
        const dx = bx - ax;
        const dy = by - ay;
        const distSq = dx * dx + dy * dy;
        const minDist = rA + rB;

        if (distSq < minDist * minDist && distSq > 0) {
          if (draggingId === itemA.id || draggingId === itemB.id) {
            continue;
          }

          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          const force = overlap * stiffness;

          const nx = dx / dist;
          const ny = dy / dist;

          const moveX = nx * force;
          const moveY = ny * force;

          // Push both apart equally
          itemA.x.set(ax - moveX * 0.5);
          itemA.y.set(ay - moveY * 0.5);
          itemB.x.set(bx + moveX * 0.5);
          itemB.y.set(by + moveY * 0.5);
        }
      }
    }

    // 2. Enforce World Boundaries (Step 4)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // If user is dragging this item, we might want to let them drag it...
      // BUT Step 4 says "Collision Blocking: If element is about to move out of boundary, stop updating".
      // Since we are using MotionValues driven by drag controls in Card.tsx, 
      // the `usePhysics` loop might fight with the Drag gesture if we set it here while dragging.
      
      // Ideally, the Drag Gesture itself should be constrained. 
      // However, if we want "Physics" to enforce it (e.g. if pushed by another card), we do it here.
      
      // If dragging, we often let the Drag gesture handle constraints (dragConstraints prop).
      // But if we want a hard "Physics Wall", we can enforce it here even during drag 
      // if the drag updates the motion value directly.
      
      // Let's enforce it for NON-dragging items first to keep them inside.
      if (draggingId !== item.id) {
        const x = item.x.get();
        const y = item.y.get();
        const w = item.width;
        const h = item.height;

        const minX = -HALF_W + w / 2;
        const maxX = HALF_W - w / 2;
        const minY = -HALF_H + h / 2;
        const maxY = HALF_H - h / 2;

        let newX = x;
        let newY = y;

        if (x < minX) newX = minX;
        if (x > maxX) newX = maxX;
        if (y < minY) newY = minY;
        if (y > maxY) newY = maxY;

        if (newX !== x) item.x.set(newX);
        if (newY !== y) item.y.set(newY);
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
