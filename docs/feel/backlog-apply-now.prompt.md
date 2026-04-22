# One-Shot Feel Debt Payoff

Apply every change listed below. No confirmation needed — just do it.

For each item:
1. Read the file at the cited path to verify the current value matches.
2. If it matches → apply the edit.
3. If it doesn't match → log `⚠️ Mismatch: [file:line] expected X found Y` and skip.
4. One `Edit` call per change. Never batch.

---

## Changes to Apply

### 1. ConfigMenu — reduce damping so menu bounces slightly on open
- **File**: `src/app/components/ui/shell/ConfigMenu.tsx` near line 340
- **Find**: `type: "spring", stiffness: 300, damping: 30`
- **Change**: `damping: 30` → `damping: 22`

### 2. LevelUpOverlay — fade the backdrop instead of popping it
- **File**: `src/app/components/ui/system/LevelUpOverlay.tsx` near line 40
- **Find**: the `motion.div` that is the fixed full-screen backdrop (has `backdrop-blur-md` or similar)
- **Change**: add `transition={{ duration: 0.4, ease: "easeOut" }}` to that element

### 3. GrimoireOverlay — add spring weight to the book entrance
- **File**: `src/app/components/ui/visual/GrimoireOverlay.tsx` near line 42
- **Find**: `<motion.div initial={{ scale: 0.9, y: 20, rotateX: 10 }}`
- **Change**: add `transition={{ type: 'spring', damping: 20, stiffness: 150 }}` to that element

### 4. LibraryInterface — heavier spring so entering feels like stepping into a large space
- **File**: `src/app/components/ui/visual/LibraryInterface.tsx` near line 150
- **Find**: `initial={{ opacity: 0, scale: 1.1 }}`
- **Change**:
  - `scale: 1.1` → `scale: 1.05` in the `initial` prop
  - add `transition={{ type: "spring", stiffness: 100, damping: 25, mass: 1.2 }}` to that element

### 5. Card hover — scale up more so the card visibly lifts
- **File**: `src/app/components/ui/card/Card.tsx` near lines 630 and 745
- **Find**: `scaleSpring.set(1.05)` (appears twice)
- **Change**: both occurrences → `scaleSpring.set(1.08)`

### 6. Card snap-to-grid — lower damping so the card settles with a tiny bounce
- **File**: `src/config/physics.ts` near line 35 (look for `SNAP_SPRING`)
- **Find**: `stiffness: 400, damping: 35, mass: 0.8`
- **Change**: `damping: 35` → `damping: 28`

### 7. Card flip — raise stiffness so the flip feels snappy not floaty
- **File**: `src/app/components/persona/default/Card.persona.default.tsx` near line 303 (look for `springs.flip`)
- **Find**: `stiffness: 150, damping: 20`
- **Change**: `stiffness: 150, damping: 20` → `stiffness: 220, damping: 24`

### 8. Card expand/zoom — tighter spring so the card pops into focus
- **File**: `src/app/components/persona/default/Card.persona.default.tsx` near line 302 (look for `springs.scale`)
- **Find**: `stiffness: 200, damping: 25, mass: 0.8`
- **Change**: `stiffness: 200, damping: 25` → `stiffness: 260, damping: 22`

### 9. TieredText — replace linear duration with a spring so text pops in
- **File**: `src/app/components/ui/text/TieredText.tsx` near line 50
- **Find**: `transition={{ duration: 0.2 }}`
- **Change**: `transition={{ duration: 0.2 }}` → `transition={{ type: "spring", stiffness: 300, damping: 25 }}`

### 10. ProgressionHUD — tighten XP/Stamina bar spring so fills feel punchy
- **File**: `src/app/components/ui/shell/ProgressionHUD.tsx` near lines 64 and 82
- **Find**: `stiffness: 50, damping: 20` (appears twice)
- **Change**: both occurrences → `stiffness: 150, damping: 25`

---

## Items NOT to apply (need new code, not just value changes)

- **DynamicText fade-in**: requires switching from CSS `transition-opacity` to a Framer Motion `motion.p` — structural change, skip for now.
- **RewardCinematicOverlay count-up**: requires adding `useSpring` + `useTransform` hooks — new logic, skip.
- **FlavorCarousel blur/skew**: Confidence was Low in the report — skip.

---

## After Applying

Update `docs/feel/backlog.md`:
- Move items 1–10 (if applied) from **Open** → **Tried** with today's date (2026-04-22).
- Leave the three skipped items in **Open** with a note `(structural change — needs separate work)`.

End with a summary:
```
Applied: N | Skipped (mismatch): M | Deferred (structural): 3
── Check in browser ──
• ConfigMenu — should bounce slightly as it slides up
• LevelUpOverlay — backdrop should fade in over ~0.4s
• GrimoireOverlay — book should feel heavy as it settles
• LibraryInterface — entrance should feel cinematic, not zippy
• Card hover — card should visibly lift on hover
• Card snap — should bounce slightly into grid slot
• Card flip — should flip with a snappy crack, not float
• Card zoom — should pop into view with energy
• TieredText — text should spring in with a tiny bounce
• ProgressionHUD bars — should snap to new value, not slowly crawl
```
