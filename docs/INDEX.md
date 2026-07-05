# 文档地图(INDEX)

> 状态: 现行 · 类型: 流程 · 更新: 2026-07-03
> 📖 人话: 全部文档的路由表。AI 每次会话从这里找该读什么;新文档必须在这里登记,否则视为不存在。

规范见 [documentation-standard.md](documentation-standard.md)。取代旧的 `_meta/index.md` 审计索引。

## 按任务路由(先看这里)

| 你要做的事 | 必读 |
|---|---|
| 任何会话开局 | `CLAUDE.md` → 本文件 → [workflow/session-protocol.md](workflow/session-protocol.md) |
| 把握方向 / 规划下一步 / 新 AI 接班 | [strategic-command.md](strategic-command.md)(战略简报,事实部分用前先实勘) |
| 推进 Pixi 重构 | [refactor-pixi/roadmap.md](refactor-pixi/roadmap.md) + 当前 Stage 相关指南 |
| 写/改 shader 或视觉效果 | [decisions/ADR-004](decisions/ADR-004-shader-budget-and-tuning-workflow.md) + [refactor-pixi/Assets-guide.md](refactor-pixi/Assets-guide.md) |
| 处理游戏资材 | [decisions/ADR-005](decisions/ADR-005-asset-preprocessing-pipeline.md) + `scripts/assets/preprocess.mjs` 头注释 |
| 任何涉及文字渲染的功能 | [refactor-pixi/text-guidelines.md](refactor-pixi/text-guidelines.md) |
| 改玩法/数值/Persona 设定 | [grimoire/GDD_Grimoire.md](grimoire/GDD_Grimoire.md)(设计真相之源) |
| 质疑某个技术选型 | 先读 [decisions/](decisions/) 全部 ADR |
| 改数据层(store/schema/管道) | 对应 root 存量文档(下表,注意状态标记)+ 代码本身 |

## 现行文档

### 根目录

| 文件 | 内容 |
|---|---|
| `CLAUDE.md` | 项目铁律,Claude 系工具自动加载。**文件名不可改**(改名即失去自动加载) |
| `AGENTS.md` | 铁律摘要,给非 Claude 系 AI 工具的通用入口(Antigravity v1.20.3+ 原生读取) |
| `.agents/rules/project-rules.md` | Antigravity workspace 规则(兼容不认 AGENTS.md 的旧版),内容为铁律速览 |
| `README.md` | 人类门面:项目简介、当前状态、常用命令 |

### 战略

| 文件 | 内容 |
|---|---|
| [strategic-command.md](strategic-command.md) | 战略指挥简报:工作次序、坑雷图、接班协议(2026-07-05 代码实勘产出) |

### decisions/ — 决策记录(ADR)

| 文件 | 内容 |
|---|---|
| [ADR-001](decisions/ADR-001-pixi-rewrite.md) | 渲染层弃 React DOM,改 PixiJS v8(先卸载再重建) |
| [ADR-002](decisions/ADR-002-stay-on-web-stack.md) | 留在 Web 技术栈,不迁移 Godot 等原生引擎 |
| [ADR-003](decisions/ADR-003-text-layering.md) | 文字分层:Pixi Text + React DOM 混合,禁用 BitmapText |
| [ADR-004](decisions/ADR-004-shader-budget-and-tuning-workflow.md) | 视觉三层预算 + "AI 写管线、人调滑块"分工 |
| [ADR-005](decisions/ADR-005-asset-preprocessing-pipeline.md) | 高度/法线单一真相源,混用前必须一致性校验 |
| [ADR-006](decisions/ADR-006-material-model-family.md) | Centerpiece v4:共享骨架 + 可插拔材质模型家族(线性工作流/tonemap/matcap) |

### workflow/ — 开发流程

| 文件 | 内容 |
|---|---|
| [session-protocol.md](workflow/session-protocol.md) | AI 会话开局/收尾清单(文档同步的执行机制) |
| [documentation-standard.md](documentation-standard.md) | 本套文档规范(在 docs 根目录) |

### refactor-pixi/ — Pixi 重构专题(现行)

| 文件 | 内容 | 状态 |
|---|---|---|
| [roadmap.md](refactor-pixi/roadmap.md) | Stage 路线图 | 现行,⚠️ Stage 状态标记滞后,收尾时更新 |
| [plan-centerpiece-workbench.md](refactor-pixi/plan-centerpiece-workbench.md) | 光照重做 + 面板工作台化实施计划(第一包任务书) | 第一包已实施(见 ADR-006 补充),第二包(图层/演出页签)待另立计划 |
| [text-guidelines.md](refactor-pixi/text-guidelines.md) | 文字分层规范 | 现行 |
| [Assets-guide.md](refactor-pixi/Assets-guide.md) | 材质/shader 制作指南(HRBA/Mask 规范) | 现行 |
| [Coordinate-Systems.md](refactor-pixi/Coordinate-Systems.md) | 坐标系说明 | 现行 |
| [AABB-System.md](refactor-pixi/AABB-System.md) | AABB 碰撞系统 | 现行 |
| [pixi-walkthrough.md](refactor-pixi/pixi-walkthrough.md) | Pixi 代码导览 | 现行 |
| [troubleshooting-pixi-vite-react.md](refactor-pixi/troubleshooting-pixi-vite-react.md) | 排错手册 | 现行 |
| [README.md](refactor-pixi/README.md) | 重构背景与历史 | 现行 |
| archive/ | 废弃的双系统并行方案 | 归档,只读 |

### grimoire/ — 游戏设计(GDD)

| 文件 | 内容 | 状态 |
|---|---|---|
| [GDD_Grimoire.md](grimoire/GDD_Grimoire.md) | 游戏设计文档(设计真相之源) | 现行,审查进行中(偏差清单见 AI 记忆) |
| [architecture.md](grimoire/architecture.md) | Grimoire 架构 | 现行 |
| [WBS_Grimoire.md](grimoire/WBS_Grimoire.md) / [E2E_TestJourney.md](grimoire/E2E_TestJourney.md) | 任务分解 / 测试旅程 | 未核对 |

### prompts/ — AI 提示词模板

`SensePrompt.txt` / `SynthesisPrompt.txt` / `VisualPrompt.txt` / `perf-audit.md` — 现行,游戏运行时依赖。

## 存量文档(待迁移,读前先核对状态)

### root 平铺系统文档(约 28 份)

⚠️ **大部分写于 React UI 时代(2026-04 前),UI 相关部分已失实**;数据层部分(store/schema/pipeline)仍有参考价值。碰到对应模块时按规范 §5 处置。已知问题(摘自旧审计):

- 🔴 结构性失实:`CompactModeSystem.md`、`infrastructure_wbs.md`、`frontend_analysis.md`(旧 React UI)
- 🟡 局部过期:`BackendSchema.md`、`DataManagement.md`(版本号错误)
- 数据层类(相对可信):`card-data-pipeline.md`、`DB-schema-maintenance.md`、`storage-system.md`、`PersistenceSystem.md`、`SynthesisDataFlow.md`、`SenseEntity.md`、`InflectionSystem.md`、`LevelingSystem.md`、`persona-system.md`、`gameconfig.md` 等
- `technical/callAI.md` — 自动生成

### 已停用体系(冻结,只读,不再写入)

- `_meta/` — 旧审计轮换制,由本规范取代
- `feel/`、`perf/`、`entropy/`、`refactor/`、`params/` — 2026-04 各 Jules agent 的工作目录,历史记录
