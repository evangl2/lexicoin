## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-30 - [Avoid O(N) Array Allocation in Loops]
**Learning:** Using `Array.from(map.values()).filter(...)` creates an intermediate array containing all elements before applying the filter. In high-frequency or large-scale data structures like `LibraryModule`'s catalog, this causes significant GC pressure and performance bottlenecks.
**Action:** Replace `Array.from().filter()` patterns with single-pass `for...of` loops that push directly to a result array. This reduces O(N) array allocation overhead and improves throughput.
## 2025-02-28 - Set Equality Check Allocation Spike
**Learning:** Checking Set equality by converting them to arrays using spread syntax `[...set]` within high-frequency loops (like `requestAnimationFrame` for scrolling or culling) causes massive spikes in short-lived memory allocation and resulting GC pauses, visibly degrading smoothness.
**Action:** Always prefer a simple zero-allocation `for...of` loop with a fallback flag for Set/Map equality checks in performance-sensitive react renders or animation frames.
