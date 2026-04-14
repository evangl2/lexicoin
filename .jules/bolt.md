## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.

## 2026-04-14 - Array map to findIndex React optimization
**Learning:** In React hooks (e.g. useCardManager, useDeviceManager), state updates that blindly map over arrays () cause full array re-allocation. If an item isn't updated (like when reacting to pub/sub events that target specific UIDs), returning the newly allocated array forces unnecessary component re-renders.
**Action:** Use  with an early return () to bail out completely when target elements are missing. Only create shallow copies when a mutation is strictly required to preserve the O(N) array allocation overhead and bypass React render cycles.

## 2024-05-20 - React Array Map Re-render Optimization
**Learning:** In React state updaters, using `prev.map()` always creates a new array reference. Even if no elements are altered (e.g., a pub-sub handler searching for a UID that doesn't exist in the current subset of data), this new array forces a component re-render.
**Action:** Replace blind `.map()` calls with `.findIndex()`. If the target index is not found (`index === -1`), strictly return the original `prev` array reference to bail out of the update and avoid rendering. If found, create a targeted shallow copy (`const newArr = [...prev]; newArr[index] = {...}`) to maintain O(N) single-pass efficiency.
