## Open
- [🟡] LevelUpOverlay radial background pulse feels default
- [🟢] RewardCinematicOverlay Sparkles icon uses default pulse
- [🟡] RewardCinematicOverlay Echo Reveal background uses default pulse
- [🟢] SynthesisCircle decorative dashed ring is completely linear
- [🟡] DynamicText fade-in is hardcoded and slow (structural change — needs separate work)
- [🟡] ProgressionHUD XP/Stamina bar fill feels too loose (mismatch — code uses configuration reference instead of inline values)
- [🟢] RewardCinematicOverlay XP/Resonance text count-up missing (structural change — needs separate work)
- [🟢] FlavorCarousel text change transition (structural change — needs separate work)

## Tried
- [🟡] ConfigMenu slide-up is harsh and abrupt (2026-04-22)
- [🟡] LevelUpOverlay backdrop appears instantly (2026-04-22)
- [🟡] GrimoireOverlay enter animation feels rigid (2026-04-22)
- [🟢] LibraryInterface transition is too linear (2026-04-22)
- [🟢] Card hover scale feels lifeless (2026-04-22)
- [🟡] Card snap-to-grid is overdamped (2026-04-22)
- [🟡] Card flip is sluggish (2026-04-22)
- [🟡] Card expand/zoom lacks punch (2026-04-22)
- [🟡] TieredText entry animation is too slow and lacks spring (2026-04-22)

## Accepted

## Rejected

## Open

### [🟡] Card Flip Spring is too loose
- **Location**: `src/app/components/persona/default/Card.persona.default.tsx:287`
- **Proposed change**: `flip: { stiffness: 220, damping: 24 }` → `flip: { stiffness: 280, damping: 28 }`
- **Date Added**: 2026-04-27

### [🟡] Drag Hover Lift missing anticipation
- **Location**: `src/app/components/ui/card/Card.tsx:410` and `src/app/hooks/useCardDrag.ts:75`
- **Proposed change**: Consider adding a very brief delay or a tighter curve (e.g. `scale: { stiffness: 400, damping: 30 }` just for hover state) to give the lift an explosive start.
- **Date Added**: 2026-04-27

### [🟢] Drag Drop lacks Follow-through audio
- **Location**: `src/app/hooks/useCardDrag.ts:130`
- **Proposed change**: Call `tts.speak('thud')` or a dedicated `playSFX('cardDrop')` in the `if (last)` block of `useDrag`.
- **Date Added**: 2026-04-27
