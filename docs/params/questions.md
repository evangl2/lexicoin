# Open Parameter Questions

Items where it's unclear if a number is a tunable param or a fixed spec. Awaiting user answer before acting.

---

## ~~Q1: World Dimension Mismatch~~ — RESOLVED 2026-04-19

**Decision**: 统一为 9600×6000。`WORLD_W`/`WORLD_H` 已提取至 `src/config/canvas.ts`，四处引用全部更新。

---

## ~~Q2: XPRegistry GRIMOIRE_COMPLETED inline gradeMap vs GRIMOIRE_REWARDS~~ — RESOLVED 2026-04-19

**Decision**: `GRIMOIRE_REWARDS.xp` (grimoireConfig.ts) is canonical per GDD §7.4. Inline gradeMap deleted from `XPRegistry.ts`. `calculateAmount` now accepts a proper `grade?` parameter instead of reusing `cefrLevel`. `GRIMOIRE_COMPLETED` case returns `GRIMOIRE_REWARDS[grade as Grade]?.xp ?? 0`.

---

## Q1 (archived): World Dimension Mismatch

**File A** — `src/app/components/ui/canvas/Canvas.tsx:40-41`
```ts
const WORLD_W = 9600;
const WORLD_H = 6000;
```

**File B** — `src/app/hooks/useGridSnap.ts:7-8`
```ts
const WORLD_W = 16000
const WORLD_H = 10000
```

**Issue**: Canvas panning limits are constrained to a 9600×6000 world, but the grid snap system places cards in a 16000×10000 world. Cards can snap to positions outside the pannable area — the player would be unable to reach them by panning.

**Interpretation A**: The Canvas values are intentionally smaller (viewport culling / performance), and the snap grid silently clamps. But the gap is large (67% larger in each axis).

**Interpretation B**: This is an accidental discrepancy from two developers using different assumptions. Canvas WORLD_W/H should match useGridSnap.

**Action needed**: Confirm which world size is correct before unifying into a shared `src/config/canvas.ts` constant.
