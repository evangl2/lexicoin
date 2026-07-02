# ADR-001: 渲染层弃 React DOM,改 PixiJS v8(先卸载再重建)

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-03(决策实际发生于 2026-04/05)
> 📖 人话: 游戏画面为什么从网页组件改成了 Canvas 游戏引擎,以及为什么中途游戏会有一段时间不能玩。

## 背景

游戏画布上有大量高频交互元素(卡片拖拽、平移、缩放)。React DOM 驱动每帧更新导致明显卡顿;优化(virtual list、transform 拖拽)收效有限。备选:继续优化 React / HTML5 Canvas 手写 / PixiJS。

## 决策

渲染层整体迁移到 PixiJS v8 + pixi-viewport + GSAP。采用"先卸载、再重建"路径:一次性卸载全部旧 UI(仅留 DevConsole),在 main 分支从零搭建 `src/pixi/`,按 Stage A–O 增量接回(见 [roadmap](../refactor-pixi/roadmap.md))。

## 理由

- WebGL/WebGPU 批量渲染天然适合大量精灵的高频变换
- 数据/逻辑层(store、services、Dexie、schemas)与渲染无耦合,完整保留
- 弃用曾考虑的"feature flag 双系统并行"方案:维护两套 UI 认知负担过高(旧方案见 `refactor-pixi/archive/`)

## 后果

- 重写期间游戏不可玩(作者已接受)
- 旧 React 组件文件保留在磁盘作参考,Stage O 统一删除
- react-dnd 体系彻底移除,交互改用 Pixi pointer events
