## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.
## 2026-04-09 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In methods like `AssetManager.loadLanguageAssets`, this causes unnecessary O(N) array allocation overhead and garbage collection pressure.
**Action:** Replaced `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces memory allocation and improves iteration speed. Tested and confirmed identical behavior.
## 2026-04-19 - Parameter Console Pattern
**Learning:** Always export a TypeScript type alongside each config group/constant when extracting magic numbers, e.g., `export type MyType = typeof MY_CONST`.
**Action:** Include type exports automatically when creating or moving config variables to support DevPanel bindings.

## 2026-04-20 - Deep Component Rendering Audits
**Learning:** For React rendering performance audits (Zustand/memos), simple static analysis or `grep` is insufficient and risks finding "phantom" issues. Real performance bottlenecks often hide in how local state derives from store primitives (e.g. recreating complex objects during render based on multiple primitive selectors) rather than just the selectors themselves.
**Action:** In future React rendering audits, write a temporary Node.js parser script (using `ts-morph` or `acorn`) to programmatically analyze dependencies within `useMemo` blocks and verify if any object allocations are unnecessarily escaping the dependency array or if Zustand selectors are returning dynamically constructed objects without `useShallow`. Also, prioritize examining custom hooks that aggregate store state.
