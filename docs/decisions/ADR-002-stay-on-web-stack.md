# ADR-002: 留在 Web 技术栈,不迁移 Godot 等原生引擎

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-03
> 📖 人话: 讨论过要不要把整个游戏搬到 Godot 游戏引擎,结论是不搬。以后再有"换引擎"的念头,先读这篇。

## 背景

Pixi shader 开发受挫后,作者提出是否应趁"项目初期"切换到 Godot。评估发现前提不成立:数据/逻辑层(`src/core/`、`src/modules/`、`src/schemas/`,含 Zustand/Dexie/Supabase)已建成且经过验证,被重写的只是渲染层。

## 决策

留在 Web 技术栈(React 数据层 + PixiJS 渲染层)。不迁移 Godot/Unity 等原生引擎。

## 理由

- 换引擎需用 GDScript/C# 重写全部数据层;Godot 无 IndexedDB,Supabase 仅社区客户端
- 目标平台是桌面 + 手机**浏览器**,Godot 的 Web 导出(体积、加载、iOS Safari 兼容)是其弱项
- 本项目依赖 AI 辅助开发,TypeScript/Web 是 AI 最强语料域,GDScript 出错率显著更高
- 真正的痛点(shader 调参工作流)换引擎不会消失,见 [ADR-004](ADR-004-shader-budget-and-tuning-workflow.md)

## 后果

- 承认 Godot 在富文本排版(RTL/HarfBuzz)上更强,文字问题改由分层架构解决([ADR-003](ADR-003-text-layering.md))
- 将来上架应用商店时用 Capacitor/Tauri 包壳,不在现阶段考虑
