# Lexicoin · PixiJS v8 Roadmap

完整方案见 `~/.claude/plans/unmount-pixijs-v8-toasty-sonnet.md`（用户机器本地）。本文是公开 roadmap。

## Stage 列表

| Stage | 状态 | 内容 |
|---|---|---|
| A | ⏳ 进行中 | 卸载所有游戏 UI（仅保留 DevConsole）+ 归档旧方案 |
| B | 待开始 | 安装 PixiJS v8 + GSAP + pixi-viewport，建立 `src/pixi/` 骨架 |
| C | 待开始 | 挂载空白 PixiRoot（bgVoid 背景 + Stats overlay） |
| D | ✅ 已完成 | Camera 系统（pixi-viewport：pan / zoom / clamp） |
| E | 待开始 | Persona Bridge + 背景层（IBackground 接口） |
| F | 待开始 | 卡片 Sprite（占位色块、坐标桥、Variant Stack、LOD） |
| G | 待开始 | Hover 交互 + HTMLText 文字层 |
| H | 待开始 | InspectOverlay（DOM 检视态） |
| I | 待开始 | 拖拽系统（PixiJS Pointer events + Edge Pan） |
| J | 待开始 | 落点检测（Grid Snap + 设备碰撞） |
| K | 待开始 | 真实卡片视觉（SVG → Texture） |
| L | 待开始 | 画布动画（GSAP + 粒子） |
| M | 待开始 | 设备双态（SynthesisCircle / Grimoire 重设计） |
| N | 待开始 | Dock / Library / DeckRepository / HUD / Overlay 重新接入 |
| O | 待开始 | 删除磁盘上保留的旧组件文件 |

每个 Stage 完成后单独开规划对话推进下一 Stage。

## 隔离原则

新旧代码用 **import 树物理切断** 隔离，不用 feature flag：

- `main.tsx → App.tsx → app/App.tsx` 链路上不 import 任何旧 UI 组件
- 旧组件文件保留在磁盘但无人引用 → Vite/Rollup 不会打包，dev server 不会加载
- 数据/逻辑层（store、services、modules、Dexie）继续运转，被新画布消费
- react-dnd 体系彻底移除（删除 `<DndProvider>`），任何后续误引用会立刻 throw
