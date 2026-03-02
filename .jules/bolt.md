## 2024-10-25 - [React Framer Motion Layout Resize Optimization]
**Learning:**
A frequent performance anti-pattern in React apps using Framer Motion is responding to layout changes (like window resize) with `window.addEventListener('resize')` hooked to a React `useState`. This causes layout thrashing and continuous re-renders on every window dimension change, significantly degrading performance, especially for persistent top-level components like navigation Docks.

**Action:**
Instead of triggering React updates, store the window dimensions in singleton `MotionValues` via a shared `useEffect` event listener (e.g., `useWindowDimensions`). Then, within components, map this value using `useTransform(windowWidth, width => width * factor)` and pass it directly to `<motion.div style={{ transform: mappedValue }}>`. This strategy entirely bypasses React reconciliation and allows Framer Motion to update the DOM independently and directly, eliminating frame drops during browser resize operations.
