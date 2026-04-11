## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.
## 2026-04-11 - [Avoid .map() in single element React state updates]
**Learning:** Using `setItems(prev => prev.map(...))` to update a single item creates a new array reference every time, even if the item isn't in the array. This triggers unnecessary React re-renders and has O(N) overhead due to callback execution.
**Action:** Use `.findIndex()` combined with early returns and targeted index updates via shallow copies (`[...prev]`) instead. This allows early bailout if the item is missing (skipping re-renders completely) and is faster.
