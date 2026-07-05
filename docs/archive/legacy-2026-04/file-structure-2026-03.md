# 文件结构重组记录（2026-03）

## 背景

项目初期文件缺乏统一的组织逻辑，根目录混放了脚本、数据库文件、日志等工具文件，
`src/` 内部层级也不一致（store/pipelines 游离于 core/ 之外，hooks 分散在两处，
ui/ 平铺了 18+ 个组件）。本次重组建立清晰的分层结构，让每类文件有唯一、可预期的归属。

---

## 根目录变更

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `context/` | `docs/` | 重命名，语义更清晰 |
| `prompt/` | `docs/prompts/` | AI 提示词归入文档目录 |
| `schemas/` | `src/schemas/` | 移入 src/，与代码同步管理 |
| `update_card.py` | `scripts/update_card.py` | 脚本归类 |
| `seed.sql` | `supabase/seeds/seed.sql` | 数据库文件归入 supabase/ |
| `seed_utf8.sql` | `supabase/seeds/seed_utf8.sql` | 同上 |
| `deploy_payload.json` | `scripts/deploy/deploy_payload.json` | 部署产物归类 |
| `deploy_req.json` | `scripts/deploy/deploy_req.json` | 同上 |
| `build_log.txt` | 删除 | 临时文件，不入版本控制 |
| `tsc_errors.txt` | 删除 | 同上 |
| `tsc_output.txt` | 删除 | 同上 |

---

## src/ 内部变更

### ui/ 组件细化分组

`src/app/components/ui/` 原有 18 个组件平铺，现按功能域分入 5 个子目录：

| 子目录 | 包含组件 |
|--------|----------|
| `ui/canvas/` | Canvas, CanvasControl, SelectionOverlay, DragLayer |
| `ui/card/` | Card, CardVisual, CompactCardVisual, DragPreviewCard |
| `ui/visual/` | AlchemyVisual, DynamicVisual, SynthesisCircle, DeviceVisual, PropVisual |
| `ui/shell/` | Dock, ConfigMenu, DeckRepository, SkinSwitcher, ImageWithFallback |
| `ui/text/` | DynamicText, FlavorCarousel, TieredText（从 app/utils/ 迁入） |

### hooks 整合

所有 hooks 统一到 `src/app/hooks/`，消除两个错位位置：

| 原路径 | 新路径 |
|--------|--------|
| `src/app/hooks/logic/useCanvasCamera.ts` | `src/app/hooks/useCanvasCamera.ts` |
| `src/app/hooks/logic/useCardManager.ts` | `src/app/hooks/useCardManager.ts` |
| `src/app/hooks/logic/useDeviceManager.ts` | `src/app/hooks/useDeviceManager.ts` |
| `src/app/hooks/logic/useSynthesis.ts` | `src/app/hooks/useSynthesis.ts` |
| `src/app/utils/mergeSplit/useCardGrouping.ts` | `src/app/hooks/useCardGrouping.ts` |
| `src/app/utils/mergeSplit/useCardVariants.ts` | `src/app/hooks/useCardVariants.ts` |

### core/ 内部重组

`src/core/api/` 拆分为两个职责分明的子目录：

| 原路径 | 新路径 | 职责 |
|--------|--------|------|
| `src/core/api/supabaseClient.ts` | `src/core/infra/supabaseClient.ts` | 网络基础设施 |
| `src/core/api/APIClient.ts` | `src/core/infra/APIClient.ts` | 网络基础设施 |
| `src/core/api/RealtimeService.ts` | `src/core/infra/RealtimeService.ts` | 网络基础设施 |
| `src/core/api/DeltaPromptBackend.ts` | `src/core/services/DeltaPromptBackend.ts` | AI 业务服务 |
| `src/core/api/SensePromtBackend.ts` | `src/core/services/SensePromtBackend.ts` | AI 业务服务 |
| `src/core/api/SynthesisPromptsBackend.ts` | `src/core/services/SynthesisPromptsBackend.ts` | AI 业务服务 |
| `src/core/api/PersonaDictionary.ts` | `src/core/services/PersonaDictionary.ts` | AI 业务服务 |
| `src/core/api/VisualDictionary.ts` | `src/core/services/VisualDictionary.ts` | AI 业务服务 |
| `src/core/api/VisualPromptsBackend.ts` | `src/core/services/VisualPromptsBackend.ts` | AI 业务服务 |
| `src/core/api/injectSenseMeta.ts` | `src/core/services/injectSenseMeta.ts` | AI 业务服务 |

`store/` 和 `pipelines/` 归入 `core/`：

| 原路径 | 新路径 |
|--------|--------|
| `src/store/` | `src/core/store/` |
| `src/pipelines/` | `src/core/pipelines/` |

---

## 配置文件更新

### tsconfig.json — 路径别名变更

| 别名 | 原指向 | 新指向 |
|------|--------|--------|
| `@store/*` | `./src/store/*` | `./src/core/store/*` |
| `@schemas/*` | `./schemas/*` | `./src/schemas/*` |

`include` 从 `["src", "schemas"]` 改为 `["src"]`（schemas 已在 src 内）。

### vite.config.ts — 别名同步更新

`@store` 和 `@schemas` 与 tsconfig 保持一致。

---

## 注意事项

- `@store/*` 和 `@schemas/*` 别名已更新，使用这些别名的 import 无需手动修改
- `supabase/functions/lib/` 中的重复文件是 Deno Edge Function 技术约束，保持不动
- `src/app/components/persona/` 主题系统内部结构保持不动
