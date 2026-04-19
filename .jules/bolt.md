## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.
## 2026-04-09 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In methods like `AssetManager.loadLanguageAssets`, this causes unnecessary O(N) array allocation overhead and garbage collection pressure.
**Action:** Replaced `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces memory allocation and improves iteration speed. Tested and confirmed identical behavior.
## 2026-04-19 - Daily Performance Audit Workflow Insights
**Learning:** For Zustand state selection in React components, explicitly wrap array or object selectors in `useShallow` from `zustand/react/shallow` (e.g., `useGameStore(useShallow(s => s.activeGrimoires))`) to prevent unnecessary component re-renders.
**Action:** Always verify if a slice of a Zustand store is a primitive before returning it directly; if it's an object/array, use `useShallow`.

**Learning:** Use explicit `manualChunks` in `vite.config.ts` (`build.rollupOptions.output`) to split large external dependencies like React, Framer Motion, and Dexie into separate vendor chunks for improved caching.
**Action:** Include `manualChunks` config to properly isolate vendor libraries when creating new projects or updating Vite builds.

**Learning:** Performance audit findings are tracked in `docs/perf/backlog.md` with daily reports formatted in `docs/perf/daily/YYYY-MM-DD.md`.
**Action:** Adhere to the reporting structure and update the backlog for pending/resolved issues when asked to perform a performance audit.

## 2026-04-19 - Dynamic Font Loading Fixes
**Learning:** When initializing a `FontFace` programmatically for a variable font, the optional descriptor object must be supplied (e.g., `{ weight: '100 900', display: 'swap' }`) to ensure the browser supports the full variable weight range and avoids FOIT.
**Action:** Always include `weight` and `display` properties when creating `FontFace` objects for fonts that support multiple weights or require explicit swap rendering.
