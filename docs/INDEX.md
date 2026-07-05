# 文档地图(INDEX)

> 状态: 现行 · 类型: 流程 · 更新: 2026-07-03
> 📖 人话: 全部文档的路由表。AI 每次会话从这里找该读什么;新文档必须在这里登记,否则视为不存在。

规范见 [documentation-standard.md](documentation-standard.md)。取代旧的 `_meta/index.md` 审计索引。

## 按任务路由(先看这里)

| 你要做的事 | 必读 |
|---|---|
| 任何会话开局 | `CLAUDE.md` → 本文件 → [workflow/session-protocol.md](workflow/session-protocol.md) |
| 隔段时间回来 / 重新上手项目 | [NOW.md](NOW.md)(1 分钟)→ [PROJECT-ATLAS.md](PROJECT-ATLAS.md)(全貌与系统总账) |
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
| [NOW.md](NOW.md) | 驾驶舱:上次/进行中/下一步/待决策。每次会话收尾更新,一屏上限 |
| [PROJECT-ATLAS.md](PROJECT-ATLAS.md) | 项目全貌:愿景与玩家体验蓝图 + 系统总账(预期 vs 现状)+ 技术地图 + 黑话词汇表 |
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
| [ADR-007](decisions/ADR-007-memory-model-and-review.md) | 记忆模型取代耐久度(遗忘曲线/新颖度经济/复习三层/画布"位置归玩家"设计律) |
| [ADR-008](decisions/ADR-008-persona-direction.md) | Persona 方向(evalBias 黑箱+存在感提示/Resonance 关系质感/三系统主从/阵容冻结) |

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

`SensePrompt.txt` / `SynthesisPrompt.txt` / `VisualPrompt.txt` / `perf-audit.md` — ⚠️ 原标注"游戏运行时依赖"经 2026-07-05 核验**失实**:src 中无任何引用,运行时 prompt 全部内置于 `supabase/functions/` 各 Edge Function。这些 txt 是历史底稿,归档候选;改 prompt 请直接改 Edge Function(注意 lib 双份同步)。

## 存量文档(root 平铺,2026-07-05 批量整理后)

> 原"约 28 份 + 9 份漏网"已实勘分流:11 份确认结构性失实/局部过期的移入 `archive/legacy-2026-04/`(下表);其余 17 份保留在 root,状态如下表标注。**不再有"待迁移,状态未核"的模糊地带**——本表即当前唯一真相。

| 文件 | 状态 | 备注 |
|---|---|---|
| `SenseEntity.md` | 🟢 较可信 | 被 ATLAS/ADR-007 交叉引用 |
| `SynthesisSystem.md` | 🟢 较可信 | 被 ATLAS 交叉引用 |
| `SynthesisDataFlow.md` | 🟢 较可信 | 数据层 |
| `card-data-pipeline.md` | 🟢 较可信 | 数据层 |
| `DB-schema-maintenance.md` | 🟢 较可信 | 数据层 |
| `storage-system.md` | 🟢 较可信 | 数据层 |
| `RepositorySystem.md` | 🟢 较可信 | 数据层 |
| `PersistenceSystem.md` | 🟢 较可信 | 数据层 |
| `InflectionSystem.md` | 🟢 较可信 | 数据层 |
| `LevelingSystem.md` | 🟢 较可信 | 数据层 |
| `persona-system.md` | 🟢 较可信 | 数据层;与 ADR-008 方向对照读 |
| `gameconfig.md` | 🟢 较可信 | 数据层 |
| `MessageBus-maintenance.md` | 🟡 未核 | 2026-07-05 才登记;呼应 [CLAUDE.md](../CLAUDE.md) 铁律六(状态归 store,通知归 MessageBus) |
| `genui-architecture.md` | 🟡 未核,方向待定 | 描述的"校验层/安全扫描"**与实际实现不符**(见 [strategic-command.md](strategic-command.md) §3.8),GenUI 去留待 ADR 决断 |
| `visual-pipeline.md` | 🟡 未核 | 同上,GenUI 管线一部分 |
| `performance-optimizations.md` | 🟡 未核 | 同上,含 sucrase 编译细节 |
| `tts-analysis.md` | 🟡 未核 | 被 ATLAS §3 引用;C7 定案后(发音进 v1)应据此推进 |
| `DurabilityLifecycle.md` | ⚠️ 已重写 | 整体改为**待实施规格**(记忆模型取代耐久度,见 [ADR-007](decisions/ADR-007-memory-model-and-review.md)),不再是现状描述 |
| `technical/callAI.md` | — | 自动生成 |

### archive/legacy-2026-04/ — 已归档(2026-07-05,C9 授权批量处置)

结构性失实或局部过期,不再维护,只读留存:`CompactModeSystem.md`、`infrastructure_wbs.md`、`frontend_analysis.md`(旧 React UI)、`BackendSchema.md`、`DataManagement.md`(版本号错误)、`infrastructure_prd.md`、`infrastructure_tdd.md`、`dynamic_text_feature.md`、`MergeSplitSystem.md`、`PixiJS-HMR-Remediation.md`、`file-structure-2026-03.md`。

### 已停用体系(冻结,只读,不再写入)

- `_meta/` — 旧审计轮换制,由本规范取代
- `feel/`、`perf/`、`entropy/`、`refactor/`、`params/` — 2026-04 各 Jules agent 的工作目录,历史记录
