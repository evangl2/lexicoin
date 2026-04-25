import React, { createContext, useContext, useRef } from 'react';

interface CanvasContextValue {
  isZoomingRef: React.MutableRefObject<boolean>;
  isPanningRef: React.MutableRefObject<boolean>;
  expandedIdsRef: React.MutableRefObject<Set<string>>;
  draggingIdRef: React.MutableRefObject<string | null>;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isZoomingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const expandedIdsRef = useRef<Set<string>>(new Set());
  const draggingIdRef = useRef<string | null>(null);

  const value = React.useMemo(() => ({
    isZoomingRef,
    isPanningRef,
    expandedIdsRef,
    draggingIdRef,
  }), []);

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvasContext = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};
