# Lexicoin · PixiJS v8 重构

## 当前状态

main 分支正在执行**先卸载、再重建**策略：

1. 一次性卸载所有游戏 UI（仅保留 DevConsole 作为系统入口）
2. 从零搭建 PixiJS v8 画布（`src/pixi/`）
3. 把游戏内容增量接回新画布

游戏在重写期间不可玩。数据/逻辑层（`src/core/`、`src/modules/`、`src/schemas/`）完整保留，等于"打地基再造楼"。

## 文档

- [`roadmap.md`](./roadmap.md) — 当前 Stage 路线图
- [`archive/`](./archive/) — 已废弃的 feature-flag 双系统并行方案及其 Phase 计划，仅作参考

## 历史背景

最初的迁移方案是"双系统并行 + feature flag 切换"，文档在 `archive/`。该方案需要长期维护两套 UI 直到 Phase 11 清理，认知负担和资源占用都偏高。改用物理 import 切断后路径更短，但代价是中间一段时间游戏不可玩。
