# 游戏基础设施 — 产品需求文档 (PRD)

> **Version**: 1.1 · **Date**: 2026-03-29 · **Project**: Lexicoin · **状态**: 待开发
> **范围**：XP 体系、玩家等级（per-language）、合成难度分布、卡牌耐久度、合成日志、数据导出/导入、预留系统声明
>
> **v1.1 变更**：废除全局等级，改为 per-language 等级；废除 cefrUnlocked；isNewDiscovery 改为本地 SenseCollection 判断；合成失败不消耗耐久；重复合成定义修正；cardInventory 清理规则明确；SenseCollection 扩展定位声明。

---

## 目录

1. [背景与目标](#1-背景与目标)
2. [系统总览](#2-系统总览)
3. [XP 经验体系](#3-xp-经验体系)
4. [玩家等级系统（per-language）](#4-玩家等级系统per-language)
5. [合成难度分布系统](#5-合成难度分布系统)
6. [卡牌耐久度系统](#6-卡牌耐久度系统)
7. [SenseCollection 与合成日志系统](#7-sensecollection-与合成日志系统)
8. [数据导出/导入系统](#8-数据导出导入系统)
9. [预留系统声明](#9-预留系统声明)
10. [跨系统规则](#10-跨系统规则)
11. [超出范围](#11-超出范围)

---

## 1. 背景与目标

### 1.1 现状问题

当前版本的 Lexicoin 实现了核心合成玩法，但玩家每次合成结束后没有任何反馈。具体缺失：

- **无成长感**：合成 100 个词和合成 1 个词，玩家的账号状态没有任何区别
- **无难度曲线**：所有合成永远使用同一个 CEFR 难度，初学者和高级玩家体验完全相同
- **无消耗感**：卡牌没有任何消耗机制，无限合成无任何代价，稀有感为零
- **无记忆感**：合成过的词语没有任何留存记录，魔典（Grimoire）无法实现
- **无可迁移性**：数据全存在本地，换设备即清零

### 1.2 本次目标

搭建支撑所有后续功能模块的核心游戏基础设施：

| 目标 | 说明 |
|------|------|
| 建立成长反馈 | 每次合成都给玩家明确的进度感 |
| 动态调整难度 | 合成词汇难度随玩家在该语言下的等级自动适配 |
| 引入资源消耗 | 让每张卡牌都有价值，合成行为产生代价 |
| 奠定魔典基础 | 合成日志是魔典系统的唯一数据源 |
| 保障数据安全 | 本地数据可完整导出，跨设备迁移 |

### 1.3 设计原则

- **非阻塞优先**：所有基础设施操作（写日志、更新耐久、发 XP）对合成主流程透明，不增加感知延迟
- **数值集中**：所有游戏数值（XP 系数、耐久成本、升级阈值）集中在 `BalanceConfig`，不散落在业务代码中
- **可观测**：每个系统的关键状态变更都通过 MessageBus 广播，DevConsole 可实时追踪
- **本地判断优先**：凡是本地 IndexedDB 能判断的逻辑（如是否为新发现），不依赖 API 返回字段
- **预留扩展**：成就、连签、魔典系统在本次不实现，但接口、数据结构、事件类型全部声明到位

---

## 2. 系统总览

### 2.1 系统关系图

```
玩家执行一次合成
        │
        ▼
[合成难度分布系统]
  读取当前 learningLang 的 languageLevel
  → 采样本次 max_level
        │
        ▼
   Edge Function（携带 max_level）
        │
        ├── 合成失败 → 流程结束，无任何资源变更
        │
        └── 合成成功，返回 resultUid
                │
                ├──▶ [卡牌耐久度系统]
                │      输入卡耐久 - 消耗值
                │      耐久归零 → CARD_DEPLETED → Canvas 移除
                │
                ├──▶ [合成日志系统]
                │      写入一条合成记录 → 为魔典提供数据源
                │
                └──▶ 查询本地 SenseCollection（是否已有 resultUid？）
                        │
                        ├─ 不在 SenseCollection（新发现）
                        │    → 写入 SenseCollection
                        │    → [XP 体系] 根据 max_level 发放 XP
                        │    → [玩家等级] XP 满则该语言等级 +1
                        │    → 为 resultUid 创建 cardInventory 记录（耐久 100）
                        │
                        ├─ 在 SenseCollection，且在 cardInventory（画布/仓库中持有）
                        │    → 重复合成：结果卡耐久 + 恢复值，不发 XP
                        │
                        └─ 在 SenseCollection，但不在 cardInventory（曾拥有但已失去）
                             → 新卡：为 resultUid 创建 cardInventory 记录（耐久 100），不发 XP
```

### 2.2 系统优先级

| 优先级 | 系统 | 原因 |
|--------|------|------|
| P0 | 合成难度分布 | 立即影响 Edge Function 的 max_level 参数 |
| P0 | 卡牌耐久度 | 核心资源消耗机制 |
| P0 | 合成日志 | 魔典的基础，不写日志则魔典永远无法实现 |
| P1 | XP 体系 | 成长反馈 |
| P1 | 玩家等级（per-language） | XP 的直接产物，反向驱动难度分布 |
| P2 | 数据导出/导入 | 数据安全，跨设备场景 |
| P3 | 预留系统声明 | 类型占位，不实现逻辑 |

---

## 3. XP 经验体系

### 3.1 概述

XP（经验值）是玩家在**每种学习语言下独立积累**的成长货币。XP 驱动该语言的玩家等级提升，等级反过来影响该语言的合成词汇难度分布。

XP 归属于语言，不归属于全局账号。

### 3.2 XP 来源

**本次实现的唯一来源**：

| 来源 ID | 触发条件 | 判断方式 | 基础公式 |
|---------|----------|----------|----------|
| `SENSE_COLLECTED` | 合成出在本地 SenseCollection 中不存在的词 | 本地 IndexedDB 查询 | `基础值 × CEFR系数[max_level]` |

**不触发 XP 的情况**：

| 情况 | 说明 |
|------|------|
| 合成失败 | 无结果，无 XP |
| resultUid 已在 SenseCollection | 词已发现过，不再给 XP（无论该卡是否在画布上） |
| 合成成功但为重复持有（cardInventory 中有记录） | 改为恢复耐久，不给 XP |

> **判断新发现的方式**：在合成结果返回后，查询本地 `senses` 表（SenseCollection）是否已有 `resultUid`。不依赖 API 的任何返回字段。Supabase 缓存命中还是 AI 新生成，对 XP 判断毫无影响——只看本地有没有。

**预留（本次不实现）**：
- `GRIMOIRE_SLOT_SUCCESS`：魔典槽填充成功
- `STREAK_BONUS`：连续登录奖励

### 3.3 XP 数值规则

```
XP = 基础值 × CEFR系数[本次 max_level]
```

CEFR 系数仅表示趋势，具体数值在 `BalanceConfig` 中配置：

| CEFR 等级 | 系数倍率趋势 |
|-----------|-------------|
| A1 | 1.0×（基准） |
| A2 | ~1.5× |
| B1 | ~2.0× |
| B2 | ~2.5× |
| C1 | ~3.5× |
| C2 | ~5.0× |

### 3.4 XP 的可扩展性要求

XP 来源**必须设计为可注册的插件式结构**（XPRegistry）。未来新增来源时，只需调用 `register()` 注册新来源，无需修改核心逻辑。

每个 XP 来源包含：唯一 ID、人类可读标签（DevConsole 展示用）、计算函数（输入上下文，输出 XP 量）。

### 3.5 验收标准

- [ ] 合成出 SenseCollection 中不存在的词 → `languageProgress[lang].xp` 增加，增量 = `基础值 × 系数[max_level]`
- [ ] 合成出 SenseCollection 中已有的词 → `xp` 不变
- [ ] 合成失败 → `xp` 不变
- [ ] `XP_EARNED` 事件广播，payload 含 `source / amount / totalXp / language`
- [ ] DevConsole 可见 `XP_EARNED` 事件

---

## 4. 玩家等级系统（per-language）

### 4.1 概述

玩家**没有全局等级**。每种学习语言都有独立的等级（1–100）。切换 `learningLang` 时，显示的等级随之切换。

等级是**合成难度分布系统的唯一输入参数**。

### 4.2 数据结构

`PlayerState.languageProgress[lang]` 包含该语言的完整进度：

| 字段 | 说明 |
|------|------|
| `level` | 该语言当前等级（1–100） |
| `xp` | 当前已累积 XP（相对于当前等级起点） |
| `xpToNextLevel` | 升到下一级所需的总 XP |
| `sensesCollected` | 在该语言下发现的不重复 Sense 数量（统计用） |
| `startedAt` | 首次在该语言下合成的时间戳 |

初始化时机：玩家首次在某语言下完成合成且获得新 Sense 时，该语言条目被创建（`level: 1, xp: 0`）。

### 4.3 升级规则

- 升级条件：`xp >= xpToNextLevel`
- 升级时：`level += 1`，多余 XP 保留，`xpToNextLevel` 更新为下一级阈值
- 每次升级广播 `LEVEL_UP` 事件（携带 `language / newLevel / previousLevel`）
- 达到 100 级后：XP 继续增加，等级不再变化（为未来「传承」机制预留）

### 4.4 升级阈值曲线设计要求

具体 100 条数值在 `BalanceConfig` 中配置，设计要求：

- 前 20 级：快速升级，建立正反馈感知
- 20–60 级：稳定成长段，线性增长
- 60–100 级：显著放缓，体现高手门槛

### 4.5 等级与难度的关系

`languageProgress[learningLang].level` 是 LevelDistributionSampler 的输入，高等级 → 更高概率抽到难词（详见 §5）。

### 4.6 验收标准

- [ ] 初始时 `languageProgress` 为空 `{}`，没有任何语言条目
- [ ] 首次在英语下合成新词后，`languageProgress['en']` 被创建（level: 1, xp: 初始XP）
- [ ] 切换 learningLang 后，等级显示切换到对应语言的 level
- [ ] XP 达到 xpToNextLevel 后，`level` 自动 +1，多余 XP 保留
- [ ] 升级后 `xpToNextLevel` 更新为新一级的阈值
- [ ] 各语言等级独立，英语升级不影响日语等级
- [ ] `LEVEL_UP` 事件携带正确的 `language` 字段

---

## 5. 合成难度分布系统

### 5.1 概述

每次合成时，系统动态决定本次应使用的词汇难度上限（`max_level`），而非固定使用某一难度。这让游戏随玩家成长自动调整词汇难度。

### 5.2 采样逻辑

**输入**：`languageLevel`（玩家在当前 learningLang 下的等级，1–100）

**输出**：本次合成的 `max_level`（一个 CEFR 等级字符串：A1/A2/B1/B2/C1/C2）

采样步骤：
1. 从 `LEVEL_CEFR_DISTRIBUTION[languageLevel]` 取出对应等级的 CEFR 概率权重表
2. 加权随机抽取一个 CEFR 等级作为输出

> **注意**：不再有 `cefrUnlocked` 上限过滤。CEFR 出现概率完全由等级的概率分布决定。低等级时高难度词的权重极低（趋近 0），自然不会出现。

### 5.3 概率分布设计原则

- **低等级**（1–20）：A1 占绝大多数，A2 小概率
- **中等级**（20–60）：A1/A2/B1 混合
- **高等级**（60–100）：B1/B2/C1 为主，C2 小概率出现
- **永不归零**：任何等级保留极小概率出现简单词（A1 永不为 0）
- **平滑过渡**：相邻等级分布连续，无突兀跳变

具体的 100×6 概率矩阵在 `BalanceConfig.LEVEL_CEFR_DISTRIBUTION` 中配置。

### 5.4 `max_level` 的用途

传入 `synthesize-sense` Edge Function，作为 AI 生成词汇时的 CEFR 难度软约束。同时作为 XP 系数的来源（见 §3）。

### 5.5 边界情况

| 情况 | 处理方式 |
|------|----------|
| `languageLevel` 对应分布表条目不存在 | Fallback 到 `{ A1: 1.0 }` |
| 语言条目尚未创建（首次合成） | 视为 level 1 处理 |
| `languageLevel` > 100 | 使用第 100 级的分布 |

### 5.6 验收标准

- [ ] `sampleMaxLevel(1)` 总是（或极大概率）返回 `'A1'`
- [ ] `sampleMaxLevel(100)` 的分布中 B1+ 占多数
- [ ] 大量采样（≥1000次）后，各等级频率符合配置概率
- [ ] 语言条目不存在时 Fallback 正常，不抛出异常
- [ ] `max_level` 正确传入 Edge Function 调用体

---

## 6. 卡牌耐久度系统

### 6.1 概述

每张卡牌都有**耐久度（Durability）**，初始值为 100。耐久度是卡牌的「生命值」，通过合成消耗和重复合成补充，形成资源循环。

### 6.2 数据存储

耐久度存储于本地 `cardInventory` 表（IndexedDB）。

**关键概念分离**：

| 表 | 定义 | 生命周期 |
|----|------|---------|
| `senses`（SenseCollection） | 玩家历史上发现过的词语语义数据 | 永久保留，只增不减 |
| `cardInventory` | 玩家当前持有的卡牌及其耐久度 | 随卡牌进出画布/仓库而创建/删除 |

### 6.3 耐久度变化规则

#### 合成成功消耗（两张输入卡均消耗）

- 双方输入卡各自扣减 `DURABILITY_SYNTHESIS_COST`（配置值）
- 双方独立计算，互不影响
- **合成失败不消耗任何耐久度**

#### 重复合成恢复（结果卡已在 cardInventory 中）

- 「重复合成」定义：合成结果的 `resultUid` 已存在于 `cardInventory` 表（即该卡当前在画布或仓库中被持有）
- 执行恢复：`cardInventory[resultUid].durability += DURABILITY_DUPLICATE_RESTORE`（上限 100）
- 不发 XP

#### 再获得（SenseCollection 有记录，但 cardInventory 无记录）

- 定义：`resultUid` 在 SenseCollection 中存在（曾经发现过），但 cardInventory 中无记录（已丢失或从未持有）
- 执行：创建 cardInventory 新记录，耐久度 = 100
- 不发 XP（已发现过，不是新词）

### 6.4 卡牌 Depleted（耐久归零）的行为

1. 将 cardInventory 中该 uid 的记录**删除**
2. 广播 `CARD_DEPLETED` 事件（payload: `{ uid }`）
3. Canvas 组件监听此事件，触发消失动画后移除该卡

> SenseCollection 中的发现记录**永久保留**，不受耐久影响。

### 6.5 cardInventory 的清理规则

以下情况必须从 cardInventory 中**删除**对应记录：

| 触发场景 | 操作 |
|----------|------|
| 卡牌耐久归零 | 删除 cardInventory 记录 |
| 玩家主动从画布移除卡牌（且未放入仓库） | 删除 cardInventory 记录 |
| 玩家从仓库中丢弃卡牌 | 删除 cardInventory 记录 |
| 卡牌被魔典槽消耗（预留） | 删除 cardInventory 记录 |

**cardInventory 只存在「当前持有」的卡牌。一旦不再持有，记录即删除。**

### 6.6 边界情况

| 情况 | 处理方式 |
|------|----------|
| 合成时某输入卡在 cardInventory 中不存在 | 视为耐久 100，创建记录后立即扣减 |
| 扣减后耐久为负数 | 存储为 0 并触发 Depleted |
| 恢复后耐久超过 100 | 截断为 100 |
| 两张输入卡为同一张（uid 相同） | 仅扣减一次 |

### 6.7 验收标准

- [ ] 合成成功后，两张输入卡耐久各减 `DURABILITY_SYNTHESIS_COST`
- [ ] **合成失败后，输入卡耐久不变**
- [ ] 重复合成（resultUid 在 cardInventory 中）→ 结果卡耐久增加，不超过 100，不发 XP
- [ ] 再获得（resultUid 在 SenseCollection 但不在 cardInventory）→ 新建记录耐久 100，不发 XP
- [ ] 耐久归零 → cardInventory 记录删除 → `CARD_DEPLETED` 事件广播
- [ ] 卡牌从画布移除 → cardInventory 记录删除
- [ ] SenseCollection 中的记录在耐久归零后仍然存在

---

## 7. SenseCollection 与合成日志系统

### 7.1 SenseCollection 定位

`senses` 表（IndexedDB）是玩家**与 Sense 的所有关系记录**的永久存档。不仅记录「发现了哪个词」，也是未来记录以下行为的自然挂载点：

- 复习记录（review count、last review time）
- 魔典使用记录（被使用了几次）
- 首次进化时间
- 其他学习行为数据

当前版本只写入 `SenseEntity` 本体数据，其他字段预留。

### 7.2 合成日志概述

每次**合成成功**后，系统自动写入一条合成日志（`synthesisLog` 表，IndexedDB）。

合成日志是**只增（append-only）**的行为历史记录，是魔典系统的唯一数据源。

### 7.3 日志记录的信息

| 字段 | 含义 |
|------|------|
| `id` | 唯一标识符（UUID） |
| `input1Uid` | 输入卡 1 的 Sense UID |
| `input2Uid` | 输入卡 2 的 Sense UID |
| `resultUid` | 结果卡的 Sense UID |
| `language` | 合成时的 learningLang |
| `cefrLevel` | 本次合成使用的 max_level |
| `isNewDiscovery` | 合成前 SenseCollection 中是否没有 resultUid（本地判断，写日志时已知） |
| `timestamp` | 合成时间戳 |

> `isGlobalFirst`（是否为全球首次发现）字段**从本次设计中移除**。该信息依赖 Supabase 返回，且暂无明确用途，未来需要时再加回。

### 7.4 写入时机

- 合成**成功**时写入（有效 SenseEntity 返回）
- 合成失败不写入
- 重复合成（已有词）也写入（行为记录不因是否新词而省略）

### 7.5 只增性保证

日志记录**永不删除、永不修改**。卡牌耐久归零、从画布移除，对应日志记录不受影响。

### 7.6 查询能力要求

SynthesisLogRepository 须支持：

| 查询 | 用途 |
|------|------|
| 按 resultUid 查询 | 魔典：某词是如何合成出来的 |
| 按 language 过滤 | 按语言查看合成历史 |
| 按 (input1, input2) 查询配方（顺序无关） | 魔典：某配方是否已知 |
| 全量查询 | 导出 |
| 统计总数 | 统计展示 |

`getRecipe(uid1, uid2)` 须同时匹配 (uid1, uid2) 和 (uid2, uid1)。

### 7.7 验收标准

- [ ] 每次合成成功后，synthesisLog 新增一条记录
- [ ] 合成失败后，synthesisLog 无新记录
- [ ] 重复合成已有词，synthesisLog 仍新增记录
- [ ] `isNewDiscovery` 字段基于本地 SenseCollection 判断，结果正确
- [ ] `getRecipe(uid1, uid2)` 与 `getRecipe(uid2, uid1)` 返回相同结果
- [ ] 卡牌耐久归零后，对应日志记录不受影响

---

## 8. 数据导出/导入系统

### 8.1 概述

玩家所有游戏数据存储在本地 IndexedDB。本系统提供完整的数据导出/导入能力，支持跨设备迁移和数据备份。

### 8.2 导出

**触发**：设置页面「导出数据」按钮。

**导出内容**（全量 JSON 文件）：

| 数据类型 | 说明 |
|----------|------|
| `playerProfile` | 完整 PlayerState（含 languageProgress 所有语言等级进度） |
| `senses` | 所有已发现词语（SenseCollection） |
| `visuals` | 所有已加载视觉资产 |
| `cardInventory` | 当前持有卡牌的耐久度记录 |
| `synthesisLog` | 完整合成历史 |
| `canvasPositions` | Canvas 上的卡牌位置 |
| `devices` | Canvas 上的设备状态 |

文件命名：`lexicoin-backup-{YYYY-MM-DD}.json`

包含 `schemaVersion: 1` 字段供导入时版本判断。

**非阻塞**：导出在后台执行，不阻塞 UI，过程中有进度提示。

### 8.3 导入

**触发**：设置页面「导入数据」→ 选择 `.json` 文件。

**导入前确认弹窗**：
> 「导入将**完全覆盖**当前设备上的所有数据，此操作不可撤销。确认继续？」

**v1 导入策略：完全覆盖**。不做合并，不做冲突解决。清空本地数据后全量写入。

**版本兼容**：
- 当前版本（v1）：直接写入
- 未来版本的包导入旧客户端：提示版本不兼容，拒绝导入

**导入结果摘要**：导入完成后展示词语数量、合成记录数量、是否成功。

### 8.4 验收标准

- [ ] 导出文件含 `schemaVersion: 1` 及 7 类数据
- [ ] 清空 IndexedDB 后导入，游戏状态（各语言等级/XP/卡牌耐久度/Canvas 位置）完整恢复
- [ ] 导入前弹出确认提示
- [ ] 导入完成后展示结果摘要
- [ ] 导入格式错误的文件时，给出具体错误提示，不崩溃

---

## 9. 预留系统声明

以下系统**本次不实现任何业务逻辑**，但必须完成接口声明和事件类型定义（注释标注 `// RESERVED`）。

### 9.1 成就系统（AchievementSystem）

- `AchievementDef` 接口（id, label, check 函数, triggerEvent）
- `ACHIEVEMENT_UNLOCKED` 事件类型
- 设计约束：每个成就绑定一个 MessageBus 事件类型，通过订阅该事件检测达成条件

### 9.2 连签系统（DailySystem / Streak）

- `PlayerState.streak` 字段已在 PlayerState 中声明（current, best, lastPlayDate）
- `STREAK_UPDATED` 事件类型
- 设计约束：监听 `XP_EARNED` 事件以判断「今日有无学习行为」

### 9.3 魔典系统（GrimoireSystem）

- `GRIMOIRE_GENERATED` 事件类型（grimoireId, theme, slotCount）
- `GRIMOIRE_SLOT_FILLED` 事件类型（grimoireId, slotId, result, feedback）
- `GRIMOIRE_COMPLETED` 事件类型（grimoireId, score）
- `DragItemType` 中已有 `'GRIMOIRE'` 占位
- 数据源：`SynthesisLogRepository`（查询已知配方）

---

## 10. 跨系统规则

### 10.1 合成成功后的操作顺序

同一次合成成功后，以下操作**串行执行**（保证事件顺序）：

```
1. 查询 SenseCollection（判断 isNewDiscovery，用于日志字段和 XP 判断）
2. 输入卡耐久扣减
3. 写合成日志
4. 根据 isNewDiscovery：
   a. 新发现 → 写入 SenseCollection → 发放 XP → 检测升级 → 创建 cardInventory（耐久100）
   b. 重复持有 → cardInventory 恢复耐久
   c. 曾有但已失去 → 创建 cardInventory（耐久100），不发 XP
```

以上全部在原有 `SENSE_CREATED` 事件之后执行，不影响卡牌渲染流程。

### 10.2 失败处理

基础设施操作失败（写日志异常、IndexedDB 错误）：
- 记录到 DevConsole
- 不回滚合成结果
- 不重试
- 通过 Notification 提示「进度数据保存失败，建议导出备份」

### 10.3 数值集中原则

所有游戏数值**仅在 `src/config/balance.ts` 中定义**，业务代码只 import，禁止硬编码。

### 10.4 可观测性要求

| 系统 | 关键事件 |
|------|---------|
| XP 体系 | `XP_EARNED` |
| 玩家等级 | `LEVEL_UP`（含 language 字段） |
| 耐久度 | `CARD_DURABILITY_CHANGED`、`CARD_DEPLETED` |
| 合成日志 | 静默写入，DevConsole 提供日志查询界面 |

### 10.5 初始化顺序

应用启动时，第一次合成前必须完成：
1. BalanceConfig 静态 import
2. XPRegistry 注册 `SENSE_COLLECTED` 来源
3. Dexie DB 升级到 v6（异步，等待完成）

---

## 11. 超出范围

| 项目 | 说明 |
|------|------|
| 具体 Balance 数值 | 需测试迭代，本次只建结构 |
| 等级/升级的 UI 动画 | UI 层，本次只定义事件 |
| 成就系统逻辑 | 预留声明，不实现 |
| 连签系统逻辑 | 预留声明，不实现 |
| 魔典系统逻辑 | 预留声明，不实现 |
| 云端账号同步 | 依赖 Auth 体系，下一阶段 |
| 导出/导入的合并策略 | v1 只做覆盖 |
| 词汇进化（Evolution）机制 | 独立功能模块 |
| isGlobalFirst 字段 | 移除，未来有需要再加 |
| XP 的可视化曲线界面 | UI 层，本次只存数值 |
