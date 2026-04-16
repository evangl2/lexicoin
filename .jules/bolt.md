## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.
## 2025-02-09 - React Array Maps vs Targeted findIndex
**Learning:** In highly interactive React components (`useCardManager.ts`), applying `.map()` over state arrays to update a single specific element causes unnecessary array allocations and re-renders if the target condition is unmet. This is especially true when components listen to generic event buses and evaluate every message.
**Action:** Replace `.map()` with `.findIndex()` inside state setters to selectively update only if `index !== -1`. Return `prev` exactly to skip re-renders if no match is found, improving performance on event broadcasts.
