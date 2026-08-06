# Parameter Registry

Master list of extracted parameters. Updated by each parameter console session.

| # | Name | File Path | Type | Range / Values | Default | Owner Module | Tunable Live |
|---|------|-----------|------|----------------|---------|--------------|--------------|
| 1 | `GRIMOIRE_DURATION_MS` | `src/config/grimoireConfig.ts` | `number` | 900000–7200000 ms | 3600000 (1h) | grimoire | N |
| 2 | `GRIMOIRE_SLOT_COUNT.MIN` | `src/config/grimoireConfig.ts` | `number` | 1–6 | 3 | grimoire | N |
| 3 | `GRIMOIRE_SLOT_COUNT.MAX` | `src/config/grimoireConfig.ts` | `number` | 3–8 | 6 | grimoire | N |
| 4 | `GRIMOIRE_SLOT_COUNT.DEFAULT` | `src/config/grimoireConfig.ts` | `number` | 3–6 | 4 | grimoire | N |
| 5 | `WORLD_W` | `src/config/canvas.ts` | `number` | design decision | 9600 | canvas | N |
| 6 | `WORLD_H` | `src/config/canvas.ts` | `number` | design decision | 6000 | canvas | N |
| 7 | `SYNTHESIS_LONG_STATE_DELAY_MS` | `src/config/timing.ts` | `number` | 5000–30000 ms | 15000 | synthesis | N |
| 8 | `HUD_PROGRESS_BAR_SPRING` | `src/config/physics.ts` | `object` | stiffness: 10-200, damping: 5-50 | `{ stiffness: 50, damping: 20 }` | hud | Y |
| 9 | `GRIMOIRE_EXPIRY_POLL_INTERVAL_MS` | `src/config/grimoireConfig.ts` | `number` | 5000–120000 ms | 30000 (30s) | grimoire | N |
| 10 | `GRIMOIRE_EXPIRE_ANIMATION_DELAY_MS` | `src/config/grimoireConfig.ts` | `number` | 100–2000 ms | 500 | grimoire | N |
| 11 | `CARD_ANIMATION_LOCKOUT_MS` | `src/config/timing.ts` | `number` | 100-1000 ms | 600 | canvas | N |
| 12 | `TEXT_FIT_DEBOUNCE_MS` | `src/config/timing.ts` | `number` | 50-500 ms | 100 | text | N |
| 13 | `LEVEL_UP_DURATION_MS` | `src/config/timing.ts` | `number` | 1000-5000 ms | 3500 | hud | N |

_Registry size: 13. Next milestone at 25 entries._
