# Lexicoin · PixiJS v8 Roadmap

本文是公开 roadmap。（原引用的 `~/.claude/plans/unmount-pixijs-v8-toasty-sonnet.md` 经 2026-07-05 核验已不存在，本文即唯一方案文档。）

## Stage 列表

| Stage | 状态 | 内容 |
|---|---|---|
| A | ✅ 已完成 | 卸载所有游戏 UI（仅保留 DevConsole）+ 归档旧方案 |
| B | ✅ 已完成 | 安装 PixiJS v8 + GSAP + pixi-viewport，建立 `src/pixi/` 骨架 |
| C | ✅ 已完成 | 挂载空白 PixiRoot（bgVoid 背景 + Stats overlay） |
| D | ✅ 已完成 | Camera 系统（pixi-viewport：pan / zoom / clamp） |
| E | ⏳ 进行中 | Persona Bridge + 背景层（IBackground 接口）；Centerpiece 材质系统见 [Assets-guide.md](Assets-guide.md)，shader 预算规则见 [ADR-004](../decisions/ADR-004-shader-budget-and-tuning-workflow.md)。**封版 DoD（2026-07-05 作者定案）**：① CHILD/GARDENER/ALCHEMIST 三个 Persona 各导出一个氛围 preset；② 调试面板功能冻结（此后只修 bug，不加新滑块）；③ 本行状态改 ✅ 并记录封版日期。三条齐全即完成，不得追加范围 |
| F | 待开始 | 卡片 Sprite（占位色块、坐标桥、Variant Stack、LOD）；坐标契约需落实 ADR-007 画布设计律（位置属于玩家，外观属于系统） |
| G | 待开始 | Hover 交互 + 文字层（卡片标题 Pixi `Text`；HTMLText 已禁用，见 [ADR-010](../decisions/ADR-010-render-boundary-and-tooling.md)）；**发音顺带接入**（作者 2026-07-05 定案进 v1：卡片交互时用浏览器原生 SpeechSynthesis 朗读词形，零成本零延迟） |
| H | 待开始 | InspectOverlay（DOM 检视态） |
| I | 待开始 | 拖拽系统（PixiJS Pointer events + Edge Pan） |
| J | 待开始 | 落点检测（Grid Snap + 设备碰撞） |
| K | 待开始 | 真实卡片视觉：**Totem 渲染器**（分层 SVG → 纹理组 + GSAP 按动画清单驱动，见 [ADR-009](../decisions/ADR-009-totem-asset-contract.md)）+ `generate-visual` prompt 换新合同 + 存量 TSX 批量重生成 |
| L | 待开始 | 画布动画（GSAP + 粒子） |
| M | 待开始 | 设备双态（SynthesisCircle / Grimoire 重设计） |
| N | 待开始 | Dock / Library / HUD / Overlay 重新接入（按 [ADR-011](../decisions/ADR-011-interaction-constitution.md) 四层结构：檐口极简，功能归世界内装置）。**DeckRepository 不回归**——词卡不设仓库（ADR-011 §4），组件随 Stage O 删除 |
| O | 待开始 | 删除磁盘上保留的旧组件文件 |

每个 Stage 完成后单独开规划对话推进下一 Stage。

## 隔离原则

新旧代码用 **import 树物理切断** 隔离，不用 feature flag：

- `main.tsx → App.tsx → app/App.tsx` 链路上不 import 任何旧 UI 组件
- 旧组件文件保留在磁盘但无人引用 → Vite/Rollup 不会打包，dev server 不会加载
- 数据/逻辑层（store、services、modules、Dexie）继续运转，被新画布消费
- `<DndProvider>` 已从运行链删除；⚠️ 但 react-dnd 仍在 package.json dependencies 且被 7 个断链文件 import——**误引用不会 throw,会静默工作**。Stage O 时从依赖中移除（届时孤儿文件的 TS 报错恰好充当警报），在那之前隔离只靠"没人 import"
