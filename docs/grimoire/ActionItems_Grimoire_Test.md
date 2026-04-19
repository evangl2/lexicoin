# Grimoire System E2E 测试中断 — Action Items

**测试执行人**: Alios Den
**中断阶段**: 阶段 1
**报告日期**: 2026/04/19

---

## 缺陷诊断与修复方案

### 🔴 Issue 1: 缺少全局 Persona 设置入口
**现象**: `ConfigMenu.tsx`（System Configuration）的第二列目前显示为 3 个下拉框（CARD SKIN, CANVAS SKIN, INTERFACE SKIN），未能实现 GDD 要求的“全局 Persona 选择”入口。
**根因分析**:
- 之前的 UI 原型保留了硬编码的皮肤切换组件。
- 尽管 Zustand store 已经存在 `activePersona` 状态，但 UI 需要修改为选取 Persona（如 `CHILD`, `GARDENER`, `ALCHEMIST`）并绑定对应的皮肤切换。
**Action Item**:
- [x] 修改 `ConfigMenu.tsx`：将栏位重构为单一的 `PERSONA` 选择下拉框。
- [x] 将其绑定到 `useGameStore(s => s.setActivePersona)`。
- [x] (可选) 在切换 Persona 时同步调用 `setSkin` 切换视觉体验。

### 🔴 Issue 2: 无法将卡片拖入 Summoner 槽位 (Blocker)
**现象**: 玩家拖拽卡片停留在 Summoner 槽位上时不仅毫无视觉反馈，在松手后卡片也无法放入（不触发绑定逻辑），导致流程在阶段 1 阻断。
**根因分析**:
- 架构历史遗留问题：卡片拖拽由 `@use-gesture/react` 接管（用于处理复杂的 3D 旋转、透视、边界回弹和性能优化），而 `react-dnd` 的 `useDrag` 由于会导致严重的重新渲染（50ms jank）在之前已经被废弃/剥离。
- `SynthesisCircle` 之前通过在 `Card.tsx` 拖拽松手时 (`useDrag` 的 `last` 阶段) 手动调用 `document.elementsFromPoint(px, py)` 检测类名 `.synthesis-slot` 绕过了 `react-dnd`，实现了碰撞检测回调 `onDropIntoSlot`。
- 但是，`GrimoireSummoner` 创建时依然使用了 `react-dnd` 的 `useDrop`（即代码里的 `ref={drop}`），而卡片根本不触发 `react-dnd` 拖拽事件，导致放入失效。
**Action Item**:
- [x] 给 `GrimoireSummoner.tsx` 的槽位元素添加专用类名标识 `summoner-slot` 以及数据属性 `data-summoner-uid={uid}`。
- [x] 修改 `Card.tsx`，在 `last` 松手阶段追加对 `.summoner-slot` 的 `elementsFromPoint` 扫掠检测逻辑。
- [x] 给 `Card.tsx` 新增 `onDropIntoSummoner` 回调属性。
- [x] 在 `App.tsx` 中新增 `handleDropIntoSummoner`，实现与 `DeviceManager` 的状态绑定，完成数据上的更新（更新 `seed_uid` 并通知入驻）。
- [x] 移除 `GrimoireSummoner` 以及它依赖的无效 `react-dnd` `useDrop` 逻辑，转而通过样式直接响应放入与否（它本身就是一个 UI Component，状态由 App.tsx 驱动）。

---
## 后续动作 (Next Steps)
完成以上代码修复后，将重新执行 `E2E_TestJourney.md` 阶段 1 和 2 的回归测试。

> **Update 2026/04/19:** 
> - 所有 P0 级别的阻断性 Bug（Persona 未配置及 Summoner 无法放置）均已修复完成。
> - 测试可以继续进行。推荐刷新并重新拉取进程进行走查验证。
