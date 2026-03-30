## 2024-03-27 - [Pre-compile regex in hot loops]
**Learning:** In utility functions called frequently (like `getScriptType` which is used inside text rendering and resizing loops), inline regular expressions (`/pattern/`) are re-compiled and re-allocated on every function call. This creates a significant GC overhead and performance bottleneck in V8.
**Action:** Always hoist static regular expressions outside of the function body to the module scope as constants (e.g., `const CJK_REGEX = /.../`). In local benchmarks, this simple change yielded a ~10x speedup for the `getScriptType` function.

## 2024-03-28 - [Hash Map replacing nested filter loops]
**Learning:** In review session completion (`ReviewModule.ts`), finding related mini-games for each `senseId` using `session.miniGames.filter` creates an O(N*M) nested loop bottleneck, unnecessarily scanning the array multiple times.
**Action:** Replace `Array.filter()` inside an iterative map logic with an O(N) pre-computed Map grouping data, which drastically reduces algorithmic complexity for datasets with a larger number of reviews per session.
