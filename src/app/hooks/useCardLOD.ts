import { useState, useRef, useEffect } from 'react';
import { MotionValue } from 'motion/react';

const LOD_ENTER = 0.32;
const LOD_EXIT = 0.38;

/**
 * Hook to manage Level of Detail (LOD) for a card based on canvas zoom scale.
 * Implements hysteresis to prevent flickering at threshold boundaries.
 */
export function useCardLOD(canvasScale: MotionValue<number>): boolean {
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
    };

    check(canvasScale.get());
    return canvasScale.on('change', check);
  }, [canvasScale]);

  return isCompactLOD;
}
