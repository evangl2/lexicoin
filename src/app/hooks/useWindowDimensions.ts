import { useState, useEffect } from 'react';

// Shared state for window dimensions
type Dimensions = { w: number; h: number };
type Listener = (dim: Dimensions) => void;

let listeners: Listener[] = [];
let dimensions: Dimensions = { w: 0, h: 0 };

if (typeof window !== 'undefined') {
  dimensions = { w: window.innerWidth, h: window.innerHeight };

  const handleResize = () => {
    // Update global dimensions
    dimensions = { w: window.innerWidth, h: window.innerHeight };
    // Notify all listeners
    listeners.forEach((listener) => listener(dimensions));
  };

  // Passive listener for performance
  window.addEventListener('resize', handleResize, { passive: true });
}

export const useWindowDimensions = () => {
  const [windowDim, setWindowDim] = useState<Dimensions>(dimensions);

  useEffect(() => {
    // Check if dimensions changed since initial render
    if (dimensions.w !== windowDim.w || dimensions.h !== windowDim.h) {
      setWindowDim(dimensions);
    }

    // Add listener
    listeners.push(setWindowDim);

    // Cleanup
    return () => {
      listeners = listeners.filter((l) => l !== setWindowDim);
    };
  }, []); // Empty dependency array means this runs once on mount

  return windowDim;
};
