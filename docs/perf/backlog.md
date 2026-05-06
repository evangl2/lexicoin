# Performance Backlog

Issues waiting for approval before fixing. See `daily/` for full context on each.

---

## Open

| # | Priority | Title | Reported | Notes |
|---|----------|--------|----------|-------|
| B-007 | 🟡 P1 | Forced Layout Thrashing in useTextFit hook | 2026-04-22 | Proposing removing visual safety check and getComputedStyle |
| B-009 | 🟡 P1 | Forced Layout Thrashing in useTextFit hook | 2026-04-23 | Proposing removing visual safety check and getComputedStyle (repeated) |
| B-010 | 🟡 P1 | Missing Timeout on Edge Function Invocations | 2026-04-24 | Proposing Promise.race timeout for useGrimoireSummoning / Interaction |

---

## Resolved

| # | Priority | Title | Resolved | Notes |
|---|----------|--------|----------|-------|
| B-012 | 🟢 P2 | Nested requestAnimationFrame opacity toggle workaround | 2026-05-06 | Auto-fixed by removing REDRAW PULSE inside forceRerasterize |
| B-011 | 🟢 P2 | O(N) Sequential Database I/O during Export/Import | 2026-04-24 | Auto-fixed using Promise.all |
| P-001 | ⚪ P3 | ProgressionHUD primitive extraction verbose | 2026-04-20 | Auto-fixed missing `useShallow` for object state selector |
| B-001 | 🟡 P1 | No bundle chunking — all deps in one JS file | 2026-04-19 | `manualChunks` added to `vite.config.ts` (6 vendor chunks) |
| B-002 | 🟡 P1 | CJK fonts are local TTF (65 MB total) | 2026-04-19 | Removed `@font-face` blocks; switched to Google Fonts CDN in `index.html` |
| B-003 | 🟢 P2 | LibraryInterface eagerly loaded | 2026-04-19 | Converted to `React.lazy()` + `Suspense` in `src/app/App.tsx` |
| B-004 | 🟢 P2 | No font preload hints for Cinzel | 2026-04-19 | Preload tag added to `index.html`; stable font filenames via `assetFileNames` in vite config |
| B-005 | ⚪ P3 | sucrase always in main bundle | 2026-04-19 | Resolved by B-001: sucrase now in its own `vendor-sucrase` cached chunk |
| B-006 | 🟢 P2 | O(N) Array Allocation in libraryGrimoires update | 2026-04-23 | Auto-fixed using `.findIndex()` and shallow copy |
| B-008 | 🟢 P2 | Unnecessary re-renders from Zustand player selector | 2026-04-23 | Auto-fixed using specific property selection |
