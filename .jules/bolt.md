## 2024-05-24 - [Memoize Language Code Mapping in App Render Loop]
**Learning:** Calling mapping functions like `mapLanguageCode` directly inside high-frequency render loops (like `.map()` for large lists of components) causes redundant function calls and string comparisons on every render cycle.
**Action:** Always compute and memoize lightweight state transformations (e.g., language code mapping) via `useMemo` outside of component list mapping functions, converting O(N) operations to O(1) per render cycle.
