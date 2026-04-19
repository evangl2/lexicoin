# Open Parameter Questions

Items where it's unclear if a number is a tunable param or a fixed spec. Awaiting user answer before acting.

---

## Q2: XPRegistry vs GRIMOIRE_REWARDS — which grimoire XP values are canonical?

**File A** — `src/core/services/XPRegistry.ts:94-96`
```ts
const gradeMap: Record<string, number> = {
    'S++': 500, 'S+': 400, 'S': 300, 'A': 200, 'B': 100, 'C': 50, 'D': 25, 'F': 0
};
return gradeMap[cefrLevel || 'F'] || 50;
```

**File B** — `src/config/grimoireConfig.ts:83-92` (`GRIMOIRE_REWARDS`)
```ts
'S++': { xp: 150, resonance: 150, increments: 7 },
'S+': { xp: 110, resonance: 110, increments: 3 },
...
```

**Issue**: Two sources define "XP for grimoire completion" with completely different values. XPRegistry uses its own inline table (S++=500) that does not reference `GRIMOIRE_REWARDS.xp` (S++=150). One of them is dead code.

**Additional code smell**: XPRegistry reuses the `cefrLevel` parameter to pass a `Grade` string for the `GRIMOIRE_COMPLETED` case — a confusing dual-use that should be refactored once the canonical values are decided.

**Interpretation A**: `GRIMOIRE_REWARDS.xp` is canonical (confirmed in GDD §7.4). XPRegistry's gradeMap should be deleted and replaced with `GRIMOIRE_REWARDS[grade].xp`.  
**Interpretation B**: XPRegistry's gradeMap is a newer, more granular design that hasn't been synced back to grimoireConfig yet.

**Action needed**: Confirm which values are live / intended. Do not extract either set until resolved.

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
