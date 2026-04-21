# Performance Backlog

Issues waiting for approval before fixing. See `daily/` for full context on each.

---

## Open

*(none)*

---

## Resolved

| # | Priority | Title | Resolved | Notes |
|---|----------|--------|----------|-------|
| B-006 | 🟢 P2 | Array allocation in useViewportCulling | 2026-04-21 | Replaced `[...next].every()` with `for...of` loop |
| B-001 | 🟡 P1 | No bundle chunking — all deps in one JS file | 2026-04-19 | `manualChunks` added to `vite.config.ts` (6 vendor chunks) |
| B-002 | 🟡 P1 | CJK fonts are local TTF (65 MB total) | 2026-04-19 | Removed `@font-face` blocks; switched to Google Fonts CDN in `index.html` |
| B-003 | 🟢 P2 | LibraryInterface eagerly loaded | 2026-04-19 | Converted to `React.lazy()` + `Suspense` in `src/app/App.tsx` |
| B-004 | 🟢 P2 | No font preload hints for Cinzel | 2026-04-19 | Preload tag added to `index.html`; stable font filenames via `assetFileNames` in vite config |
| B-005 | ⚪ P3 | sucrase always in main bundle | 2026-04-19 | Resolved by B-001: sucrase now in its own `vendor-sucrase` cached chunk |
