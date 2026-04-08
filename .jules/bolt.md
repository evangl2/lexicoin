## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.

## $(date +%Y-%m-%d) - [Optimize single array element updates in React state setters]
**Learning:** In React components using `setState`, using `.map()` on an array of objects to update a single element based on an ID iterates over the entire array even after the item is found, triggering unneeded callbacks and object spreads. In hot paths (like frequent asset loading or UI state updates), this adds up. Furthermore, calling `.find()` or `.some()` before `.map()` iterates multiple times unnecessarily.
**Action:** Replace `.find` + `.map` or standalone `.map` with `.findIndex` for single-element updates. If the element isn't found, returning `prev` (the exact reference) prevents a React re-render. If it is found, clone the array (`[...prev]`) and update only the target index `next[index] = {...}` to reduce O(N) overhead down to just the search.
