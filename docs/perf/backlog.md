# Performance Backlog

## Open
- **[🟡] Large CJK font payloads**: Asian fonts (Noto Sans/Serif SC and JP) are massive (17MB and 25MB) and imported unconditionally in `fonts.css`. Suggest implementing a programmatic lazy-loading strategy via `AssetManager.ts` using the `FontFace` API.

## Resolved

- **[🟢] Implement explicit bundle chunk splitting**: Added manual chunks to vite config to separate vendor libraries. (Resolved 2026-04-19)
