## 2026-03-07 - React render optimization for resize event
**Learning:** Attaching native `window.addEventListener('resize')` to drive React component scaling (like the HUD in `Dock.tsx`) triggers expensive and unnecessary re-renders of the entire component tree on every single pixel change.
**Action:** Always replace manual window resize React state with a shared `MotionValue` (`useWindowDimensions`) and `useTransform` to compute layout changes directly. This pushes updates to the DOM directly via Framer Motion, completely bypassing React's render cycle during window resizing.
