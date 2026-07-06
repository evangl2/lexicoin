# Lexicoin Grimoire: Complete Game Design Document (GDD)

> 修订记录:2026-07-05 —— 依据 [ADR-007](../decisions/ADR-007-memory-model-and-review.md)(记忆模型与复习)、[ADR-008](../decisions/ADR-008-persona-direction.md)(Persona 方向)更新 §2.6、§4.4、§4.5、§4.7(新增)、§8.5、§9.3。作者与 Claude Fable 5 讨论定案,修订内容以本记录覆盖处为准。
> 修订记录:2026-07-06 —— 依据 [ADR-011](../decisions/ADR-011-interaction-constitution.md)(交互宪法,词卡不设仓库)更新 §2.3、§5.2、§6.5 的填词/种子来源表述:仓库改为 Canvas 唯一来源。

---

## 📑 Table of Contents

1.  **[§1 设计哲学与概述](#1-设计哲学与概述)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S1_design_philosophy.md)
2.  **[§2 核心游戏循环](#2-核心游戏循环)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S2_core_loop.md)
3.  **[§3 体力系统（Grimoire 应用）](#3-体力系统grimoire-应用)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S3_stamina.md)
4.  **[§4 Persona 系统（Grimoire 应用）](#4-persona-系统grimoire-应用)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S4_persona.md)
5.  **[§5 Grimoire Summoner 装置](#5-grimoire-summoner-装置)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S5_summoner.md)
6.  **[§6 Grimoire 实体规格](#6-grimoire-实体规格)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S6_grimoire_entity.md)
7.  **[§7 评分与奖励系统](#7-评分与奖励系统)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S7_scoring.md)
8.  **[§8 Library 与 Echo 系统](#8-library-与-echo-系统)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S8_library_echo.md)
9.  **[§9 AI 规格（生成与评判）](#9-ai-规格生成与评判)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S9_ai_spec.md)
10. **[§10 数据 Schema 草图](#10-数据-schema-草图)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S10_schema.md)
11. **[§11 UI/UX 规格](#11-uiux-规格)** - [Original](file:///a:/lexicoin/context/grimoire/GDD_S11_uiux.md)

---

<div id="1-设计哲学与概述"></div>

# §1 设计哲学与概述
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 1.1 系统概述

**Grimoire（魔典）** 是 Lexicoin 的核心进阶玩法系统。玩家以一张 Sense 卡片作为种子，由当前激活的 Persona 生成一个有主题的语义挑战；玩家寻找并填入词语，由 Persona 评判，给予评分与奖励。

**系统根本目的**：驱动玩家探索尚未拥有的词汇，而非测验已知词汇。

---

## 1.2 核心设计哲学

### 一、正反馈优先（Positive-First Feedback）
以**奖励幅度的差异**替代**惩罚的存在**。错误是可修正的信息，不是被惩戒的对象。没有玩家因为"玩了"而变得更糟。

### 二、以创作代替操练（Creation Over Drill）
语言能力通过**主动产出**而非被动接受来内化。系统要求玩家从整个语义空间中自主判断并放置词语，而非从给定选项中识别答案。"这个词适不适合放在这里，为什么"——这个决策过程本身就是语言学习。

> *依据：Swain 输出假说（Output Hypothesis）——被迫产出时注意到自身词汇空缺（noticing the gap）是能力发展的核心机制。*

### 三、动机内化（Intrinsic Motivation Architecture）
外部奖励（XP、Streak、Resonance）强化内在动机，而非制造它。所有设计决策的检验标准：**移除奖励后，玩家是否仍然 想要 完成这本魔典？**

系统通过三个维度构建内在动机（参照 SDT）：
- **自主感**：选择 Persona、种子词、填入的词
- **胜任感**：评级反馈、Streak、Resonance 进度
- **关联感**：与 Persona 的长期叙事关系

### 四、AI 作为关系（AI as Relationship, Not Execution Engine）
每个 Persona 有独立且一致的世界观与语言偏好。AI 评语是角色视角的真实回应，而非标准答案的审判。**个性表达优先于判断的客观"准确性"**。

### 五、词汇的网络性习得（Lexical Network Acquisition）
词汇习得发生在理解词语间关系的时刻，而非孤立记忆时。Grimoire 的主题挑战迫使玩家构建局部语义网络，在游戏过程中无声地建立词汇连接。

> *依据融合：Lewis 词汇学习法（意义关系网络）/ Vygotsky ZPD（略超出当前能力的挑战）/ Flow Theory（难度动态校准）*

---

## 1.3 系统定位

```
[Synthesis] ──产出──▶ [Sense Cards]
                            │ 填入槽位
                            ▼
[Stamina] ──消耗──▶ [GRIMOIRE] ──归档──▶ [Library]
                            │                  │ Echo
[Persona] ──评判──▶         │                  ▼
    ▲                       │           [Sense Cards]
    └── Resonance XP ───────┘
```

- **消费场**：赋予 Sense 卡片语义上下文与使用目的
- **反向驱动**：词汇空缺驱动玩家主动合成新词
- **Persona 进度引擎**：完成魔典产出 Resonance XP
- **Library 内容来源**：归档魔典经 Echo 转化为新 Sense 卡，形成闭环

---

## 1.4 目标玩家体验

| 阶段 | 目标心理状态 |
|------|------------|
| 发现新魔典 | 好奇、跃跃欲试 |
| 寻找词语 | 探索的专注感 |
| 发现词汇空缺 | 有目的的驱动感（我要去合成它） |
| 感受时间压力 | 轻度 FOMO，而非焦虑 |
| 等待评判 | 娱乐性期待 |
| 收到高评级 | 成就感 + 正向循环意愿 |
| 归档后看图书馆 | 收藏癖满足感 |

---
[Back to Top](#📑-table-of-contents)

<div id="2-核心游戏循环"></div>

# §2 核心游戏循环
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 2.1 Loop 总览

```
                    ┌─────────────────────┐
                    │   激活 Persona (全局) │
                    └──────────┬──────────┘
                                │
                    ┌──────────▼──────────┐
                    │  放入 Seed / 随机选  │  Grimoire Summoner 装置
                    │    消耗体力          │  上一本生成完成后才可再次触发
                    └──────────┬──────────┘
                                │ AI 生成
                    ┌──────────▼──────────┐
                    │   Grimoire 出现在    │  携带时间条（1h，实时倒计时）
                    │   Canvas（闭合态）   │
                    └──────────┬──────────┘
                                │
               ┌────────────────▼─────────────────┐
               │            填词阶段               │
               │  拖入 Sense → 填槽 → 所有槽位满   │  时间条持续运行
               │  （可多次关闭/重新打开 Modal）     │
               └────────────────┬─────────────────┘
                                │ 提交
               ┌────────────────▼─────────────────┐
               │            评判阶段               │
               │  AI 逐槽评分 → F 槽弹出词语       │
               │  非 F 槽锁定 → 重填 F 槽循环      │
               │  F 次数累计记录（影响总评）         │
               └────────────────┬─────────────────┘
                                │ 所有槽位均非 F
               ┌────────────────▼─────────────────┐
               │            结算阶段               │
               │  前端计算最终评级                  │
               │  奖励进入"待领取"状态              │
               └────────────────┬─────────────────┘
                                │ 玩家点击 Archive
               ┌────────────────▼─────────────────┐
               │       归档 → Library（上限 99）    │
               │  玩家进入 Library 领取奖励         │
               │  XP + Resonance 到账 / Streak 更新│
               └────────────────┬─────────────────┘
                                │ Echo（每日 3 次）
                    ┌──────────▼──────────┐
                    │  从隐藏答案随机抽取  │
                    │  生成新 Sense 卡     │
                    └─────────────────────┘

───────── 并行路径 ─────────

时间条归零 → 已填词语弹回 Canvas → Grimoire 消散
（无惩罚，无 Streak 影响）
```

---

## 2.2 生成阶段（Generation Phase）

| 要素 | 说明 |
|------|------|
| 触发方式 | 将 Sense 卡拖入 Grimoire Summoner 槽位，或触发随机选种（仅从当前 Canvas 选取） |
| 前置条件 | 体力充足；上一本魔典已生成完成（自然冷却） |
| 体力消耗 | 中等（含生成 + 预留评判配额，与 AI token 消耗正相关） |
| AI 输出 | 主题标题、叙事场景（personaQuest）、explicitInstruction、隐藏标准答案组（validationTags）；槽位数量（3–6）由服务端随机、AI 原样回填。**GrimoireType 由前端选定后传入（非 AI 输出）；槽位无标签**（§6.5/§10 设计原则，2026-07-05 修正本行与其矛盾的旧表述） |
| Seed 命运 | 生成完成后弹回 Canvas；Seed 词可被填入魔典自身的槽位 |
| 冷却逻辑 | 非固定计时器；上一次生成的 AI 请求返回后方可触发下一次 |

---

## 2.3 填词阶段（Filling Phase）

| 要素 | 说明 |
|------|------|
| Canvas 闭合态 | 显示 Persona 图标、已填/总槽位（x/y）、时间条 |
| 展开态 | 完整 UI：主题、任务描述、所有槽位、时间条 |
| 填词方式 | 从 Canvas 直接拖拽 Sense 卡到槽位（词卡不设仓库，[ADR-011](../decisions/ADR-011-interaction-constitution.md)；找卡用搜索透镜） |
| 部分填写 | 允许。关闭 Modal 后已填词语保留，时间条继续运行 |
| 提交条件 | 所有槽位均已填入（全满）后方可提交 |
| 时间条 | 实时运行，打开 Modal 期间不暂停 |

---

## 2.4 评判阶段（Evaluation Phase）

| 要素 | 说明 |
|------|------|
| 提交方式 | 单次提交（无逐槽即时反馈） |
| 评判逻辑 | 先客观评估词语与主题/任务的语义契合度，再叠加 Persona 偏好权重 |
| 评分范围 | 每槽：S++ / S+ / S / A / B / C / D / F |
| F 槽处理 | Sense 卡弹回 Canvas；该槽必须重新填入才能继续 |
| 非 F 槽处理 | 词语封印（锁定），不可再拖出 |
| F 次数记录 | 每次提交中出现的 F 数量累计，最终影响总评级（扣分） |
| 重评范围 | 仅对替换后的 F 槽词语重新进行 AI 评判；锁定槽位不再调用 |
| 评语 | Persona 以自身语言风格输出碎片化叙事评语（界面语言），非教学反馈 |
| 循环条件 | 存在 F 槽时无法进入结算；全部槽位非 F 后自动进入结算 |

---

## 2.5 结算阶段（Resolution Phase）

| 要素 | 说明 |
|------|------|
| 总评计算 | 前端根据各槽 grade 分布 + F 次数惩罚计算最终评级 |
| 评级范围 | S++ / S+ / S / A / B / C / D |
| 奖励状态 | 计算完成后进入"待领取"，不立即发放 |
| Archive 操作 | 玩家主动点击 Archive 将魔典存入 Library |
| 奖励发放 | 玩家进入 Library 界面后手动领取：XP（按评级倍率）+ Persona Resonance XP |
| Streak 更新 | 与奖励同步，在 Library 领取时触发 |

**Streak 更新规则：**
- 得 S / S+ / S++ → 为 A、B、C、D 四个 Streak 各 +1；S-Score 按 1 / 2 / 3 累加
- 得 A / B / C / D → 对应 Streak +1，其余不变
- 时间过期（魔典未完成）→ 所有 Streak 不受影响

---

## 2.6 归档与 Echo（Archive & Echo Phase）

| 要素 | 说明 |
|------|------|
| Library 容量 | 上限 99 本（已完成魔典） |
| 查看内容 | 主题、Persona、各槽词语、评语、最终评级 |
| Echo 次数 | 每日 3 次（跨所有已归档魔典共享,含下方两种模式） |
| Echo · 发现 | 从该魔典的隐藏标准答案组中随机抽取一个词，生成对应 Sense 卡到 Canvas |
| Echo · 回放（新增,ADR-007） | 重新展开一本旧魔典,当年填入的词被雾遮蔽,凭记忆重新指认——是复习在本系统里的仪式化呈现,详见 §8.5.2 |
| 隐藏答案 | 由 AI 在生成阶段同步产出，对玩家全程不可见 |

---

## 2.7 时间过期路径（Expiry Path）

时间条归零时：
1. 魔典中已填入的 Sense 卡全部弹回 Canvas
2. Grimoire 实体从 Canvas 消散（淡出动画）
3. 无体力损失、无 HP 损失、无 Streak 影响
4. Summoner 冷却立即解除，可重新生成

> 过期是**机会代价**，不是惩罚。其唯一后果是：这本魔典的奖励窗口关闭。

---
[Back to Top](#📑-table-of-contents)

<div id="3-体力系统grimoire-应用"></div>

# §3 体力系统（Grimoire 应用）
## Lexicoin Grimoire 系统游戏设计文档（GDD）

> 本节仅记录体力系统在 Grimoire 系统中的应用规则。体力系统的完整设计见独立文档。

---

## 3.1 参数速查

| 参数 | 数值 |
|------|------|
| 体力上限 | 300 |
| 自然恢复速率 | 12.5 / 小时（24 小时回满） |
| 合成 Sense 消耗 | 5 |
| 生成魔典消耗 | 60 |
| Echo 消耗 | 0（受每日次数限制，不消耗体力） |

---

## 3.2 Grimoire 体力消耗规则

**消耗时机**：玩家触发魔典生成时，**一次性扣除全额体力（60）**。

此费用涵盖两个后端行为的资源配额：
- 生成调用（AI 生成主题、槽位、隐藏答案）
- 评判调用（AI 评判玩家提交的词语）

两者合并预扣，原因：后端在生成时即为本次魔典的完整生命周期预留了资源。

**过期情况**：魔典时间到期未完成，已扣体力**不予退还**。玩家承担机会代价，而非惩罚，但生成决策应具有一定成本意识。

---

## 3.3 设计意图

体力消耗与后端资源压力和 AI token 消耗正相关，是系统的**自然限速机制**：

- 防止玩家无节制地生成魔典堆积在 Canvas
- 使生成决策具有重量感（玩家会思考"我现在有时间完成它吗"）
- 在玩家基数扩大时，保持后端调用频率在可控范围内

体力不是游戏内的"生命值"，而是**玩家参与后端密集型行为的日配额**。

---

## 3.4 与其他 Grimoire 行为的关系

| 行为 | 是否消耗体力 | 限制机制 |
|------|------------|---------|
| 生成魔典 | ✅ 60 | 体力 + Summoner 冷却 |
| 填词（拖拽） | ❌ | 无限制 |
| 提交评判 | ❌（已含在生成费中） | 无额外消耗 |
| Archive | ❌ | 无限制 |
| Library 领取奖励 | ❌ | 无限制 |
| Echo | ❌ | 每日 3 次 |

---
[Back to Top](#📑-table-of-contents)

<div id="4-persona-系统grimoire-应用"></div>

# §4 Persona 系统（Grimoire 应用）
## Lexicoin Grimoire 系统游戏设计文档（GDD）

> 本节仅记录 Persona 系统在 Grimoire 中的应用规则。Persona 系统的完整设计见独立文档。

---

## 4.1 Persona 选择与绑定

**选择方式**：玩家在全局状态中维护一个"当前激活 Persona"，生成魔典时自动使用该 Persona。

**绑定规则**：魔典在生成瞬间将当前 Persona 绑定。此后全局 Persona 切换不影响该魔典的评判行为——整个生命周期（生成 → 填词 → 评判 → 归档）均使用生成时绑定的 Persona。

**解锁状态**：现阶段所有 Persona 默认全部解锁。等级解锁机制为未来版本预留，见 § 4.5。

---

## 4.2 初始 Persona 阵容（v1）

现阶段实现三个 Persona：

| ID | 名称 | 排除的 GrimoireType |
|----|------|-------------------|
| `CHILD` | The Child | taxonomy, spectrum, script |
| `GARDENER` | The Gardener | script, taxonomy |
| `ALCHEMIST` | The Alchemist | script, taxonomy |

**GrimoireType 分配逻辑**：生成时，系统从 8 种 GrimoireType 中过滤掉当前 Persona 的 `excludedTypes`，从剩余兼容类型中随机选取一种。

---

## 4.3 Persona 在生成阶段的作用

Persona 的以下属性作为 AI 生成提示词的组成部分传入：

| 属性 | 用途 |
|------|------|
| `genPrompt` | 引导 AI 以 Persona 的视角 和 语言风格生成主题、指令与隐藏答案 |
| `excludedTypes` | 限制可生成的 GrimoireType 范围 |

Persona 的世界观与偏好影响魔典主题的生成方向，但不限制槽位数量 or 结构。

---

## 4.4 Persona 在评判阶段的作用

评判逻辑分两层，顺序固定：

```
第一层（客观）：词语与魔典主题及任务要求的语义契合度
       ↓
第二层（偏好）：Persona 的个性偏好作为加权条件叠加
```

| 属性 | 用途 |
|------|------|
| `evalPrompt` | 定义 Persona 的评判视角与核心标准 |
| `evalBias` | 描述 Persona 的偏好偏向（提升或降低特定词语的评级）|

**偏好的可见性（ADR-008）**：`evalBias` 的具体数值与方向**不直接展示**给玩家。Persona 功能说明(全局 Persona 介绍面板,见 §11)应明确提示"每位 Persona 有自己的评判偏好"，引导玩家从评语与评级差异中自行体会,而非通过界面数值获知——偏见是活人裁判的一部分,不是需要摊开的公式。

**评语（Commentary）**：Persona 以自身语言风格生成逐槽评语。评语是碎片化叙事工具，以界面语言输出，目的是呈现角色个性，游戏叙事和提供魔典任务完成反馈（语言学习功能）。

---

## 4.5 Resonance 系统

每次归档魔典并领取奖励时，当前魔典绑定的 Persona 获得 Resonance XP。

| 要素 | 说明 |
|------|------|
| Resonance 性质 | Persona 的专属 XP，与玩家 XP 独立 |
| 获得时机 | 玩家在 Library 领取奖励时，按最终评级发放 |
| Resonance 总量与评级的关系 | 与最终评级正相关（具体数值见 §7.5） |
| 等级上限 | 无上限，持续累积升级 |
| 里程碑兑现物 | personaStory 阶段推进 + 关系记忆（见下，ADR-008），而非纯数字/进度条 |

**里程碑设计原则（ADR-008）**：Resonance 数字本身不是奖励，里程碑必须兑换成可感知的关系变化，按优先级：

1. **personaStory 阶段推进**：里程碑触发 `personaStage` 变迁，改变后续生成时 Persona 的叙事姿态（呼应 §9.2 `personaStory.stage`）。
2. **Persona 记得你**：系统记录少量结构化事件（如首次获得 S++、最常使用的词、连败后的翻盘），生成新魔典时将其注入 prompt，使 Persona 的叙事引用玩家与自己的共同经历——这是静态内容无法复制的个性化，优先级高于阵容扩充。
3. 新叙事形式（narrativeForm）解锁，作为里程碑的补充产出。

具体阈值与兑现内容的映射表待排期实现，现阶段占位。

---

## 4.6 等级解锁（占位）

```typescript
// TODO: 实现 Persona 的玩家等级解锁机制
// 现阶段：所有 Persona 默认可用
// 计划：达到特定玩家等级后解锁对应 Persona
// 参考：CHILD (Lv.5), GARDENER (Lv.7), ALCHEMIST (Lv.40)
```

---

## 4.7 第二意见机制（占位，ADR-008）

玩家可消耗体力，请求另一位 Persona 对同一本已评判的魔典重新给出评级与评语。

- **目的**：让 `evalBias` 造成的评级差异从"AI 判断不一致"的疑虑，转化为"不同角色有不同判断"的角色内容——呼应 §1.2 第四条设计哲学（AI 作为关系）与 §4.4 偏好可见性原则。
- **展示**：两位 Persona 的评级与评语并列展示，不合并、不取平均、不互相覆盖。
- **状态**：方向已定案，具体交互流程与体力成本待排期实现，现阶段占位。

---
[Back to Top](#📑-table-of-contents)

<div id="5-grimoire-summoner-装置"></div>

# §5 Grimoire Summoner 装置
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 5.1 装置概述

Grimoire Summoner 是一个可放置在 Canvas 上的交互式装置，是魔典生成的唯一入口。其行为模式参照 SynthesisCircle，玩家从 Dock 中取出并拖入 Canvas 使用。

| 属性 | 说明 |
|------|------|
| 类型 | Canvas 可拖拽装置 |
| 每位玩家上限 | 1 个（同时只允许 1 个 Summoner 在 Canvas 上） |
| 存储 | 可拖回 Dock 归库 |

---

## 5.2 种子槽位（Seed Slot）

Summoner 拥有 1 个槽位，接受一张 Sense 卡作为魔典的生成种子。

| 操作 | 说明 |
|------|------|
| 放入种子 | 将 Sense 卡从 Canvas 拖入槽位（词卡不设仓库，ADR-011） |
| 随机种子 | 触发装置上的随机按钮，系统从当前 Canvas 上随机选取一张 Sense 卡 |
| 种子命运 | 生成完成后，种子卡弹回 Canvas；种子词可被填入由其生成的魔典槽位 |

---

## 5.3 生成状态机

```
        放入种子 / 触发随机
IDLE ─────────────────────────▶ GENERATING
                                    │
                          等待 AI 响应返回
                                    │
                                    ▼
                                  READY ──── Grimoire 出现在 Canvas
                                    │
                          （自动回到 IDLE）
                                 IDLE
```

| 状态 | 说明 |
|------|------|
| `IDLE` | 可接受新种子，等待触发 |
| `GENERATING` | AI 调用进行中；此时不可触发新生成（自然冷却） |
| `READY` | 生成完成，Grimoire 已出现在 Canvas；装置立即回到 IDLE |

---

## 5.4 触发前置条件

生成触发时同时满足以下条件方可执行：

1. 装置状态为 `IDLE`（上一次生成的 AI 请求已返回）
2. 玩家当前体力 ≥ 60
3. 槽位有种子（或触发随机种子）

任一条件不满足时，触发无效并给予提示。

---

## 5.5 与 Persona 的关系

Summoner 本身不持有 Persona 配置。生成时读取当前全局激活的 Persona，将其与新生成的 Grimoire 绑定。

Persona 的切换入口在独立的全局 UI 中（详见 §11 UI/UX 规格）。

---
[Back to Top](#📑-table-of-contents)

<div id="6-grimoire-实体规格"></div>

# §6 Grimoire 实体规格
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 6.1 数据模型

### GrimoireEntity

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符 |
| `x, y` | number | Canvas 上的世界坐标 |
| `personaId` | PersonaId | 生成时绑定的 Persona，不可变 |
| `grimoireType` | GrimoireType | 魔典类型（如 taxonomy, anatomy 等） |
| `targetLevel` | WordLevel | 目标 CEFR 等级（A1-C2），指导生成与评判 |
| `seedWord` | string | 种子词原文 |
| `theme` | `{ title: LocalizedText, description: LocalizedText }` | 主题标题与叙事文本（含 3rd/1st 视角混合） |
| `explicitInstruction` | LocalizedText | 明确的任务指令（规则） |
| `validationTags` | string[] | **隐藏标准答案组**（10 个词），用于 Echo 和评判锚点 |
| `designRationale` | string | **AI 设计依据**（隐藏），记录生成时的逻辑意图，确保评判一致性 |
| `slots` | GrimoireSlot[] | 槽位数组，长度 3–6 |
| `createdAt` | timestamp | 生成时刻（UTC） |
| `expiresAt` | timestamp | 过期时刻（createdAt + 1h） |
| `status` | GrimoireStatus | 当前状态 |
| `fCount` | number | 累计收到 F 评级的次数 |
| `finalGrade` | Grade \| null | 最终总评级 |

### GrimoireSlot

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 槽位标识符 |
| `label` | string | 槽位名称/位置占位（如 "Component A"） |
| `sense` | Sense \| null | 当前填入的 Sense 卡 |
| `grade` | Grade \| null | 该槽实时/锁定评级 |
| `locked` | boolean | true = 已通过（非 F），不可更换 |
| `commentary` | LocalizedText \| null | Persona 对该槽的针对性评语（含任务反馈 + 叙事） |

> **BilingualText 结构**：`{ learning: string, system: string }`，分别对应玩家的**学习语言**及**系统语言**，由 AI 在生成时同步产出。魔典不硬编码语言种类，语言组合由玩家设置决定。

---

## 6.2 状态机

```
  生成完成 (含 Rationale & Tags)
     │
     ▼
  ACTIVE ──── 所有槽填满 ──── 提交 ────▶ EVALUATING (参考 Tags 评判)
     │                                       │
     │                              AI 响应返回 (含 Grade & Commentary)
     │                                       │
     │                          ┌────────────┴────────────┐
     │                    存在 F 槽               无 F 槽
     │                          │                         │
     │                          ▼                         ▼
     │                   NEEDS_REVISION            RESOLVED
     │                          │                         │
     │              替换 F 槽 → 重新提交           玩家 Archive
     │              ↩ EVALUATING                          │
     │                                                    ▼
     │                                               ARCHIVED
```

| 状态 | 说明 |
|------|------|
| `ACTIVE` | 时间条运行中，可填槽、可提交（全满时） |
| `EVALUATING` | AI 调用进行中，槽位冻结，无法操作 |
| `NEEDS_REVISION` | 存在 F 槽，需替换词语后再次提交 |
| `RESOLVED` | 所有槽非 F，最终评级已计算，奖励待领取 |
| `ARCHIVED` | 已归档至 Library |
| `EXPIRED` | 时间条归零，实体消散 |

---

## 6.3 闭合态（Canvas 实体）

Grimoire 在 Canvas 上的紧凑形态，持续可见直至归档或过期。

| 显示元素 | 说明 |
|---------|------|
| Persona 图标 | 绑定 Persona 的视觉标识 |
| 槽位进度 | `x / y`（已填 / 总槽位数） |
| 时间条 | 实时倒计时，视觉上随时间缩短 |
| 状态指示 | 区分 ACTIVE / EVALUATING / NEEDS_REVISION / RESOLVED |

**交互**：点击/双击打开展开态。支持拖拽移动位置。

---

## 6.4 展开态（二级 UI）

| 区域 | 内容 |
|------|------|
| 头部 | 主题标题、Persona 名称、GrimoireType 标签、时间条 |
| 主题描述 | `theme.description`（叙事文本） |
| 任务指令 | `explicitInstruction`（明确任务要求） |
| 槽位区域 | 所有槽位（见 §6.5） |
| 操作区 | 根据状态显示不同按钮（见下表） |

**语言切换按钮**：展开态固定显示一个语言切换按钮，将所有非 UI 的文字内容（主题标题、叙事描述、任务指令、槽位标签、Persona 评语）在 `learningLanguage` 还有 `systemLanguage` 之间切换显示。UI 框架本身（按钮文字、状态提示）不受切换影响，始终使用系统语言。此功能为学习辅助工具——可以在沉浸状态（仅学习语言）与理解验证状态（系统语言）之间自由切换。

**操作按钮逻辑：**

| 状态 | 显示按钮 | 条件 |
|------|---------|------|
| `ACTIVE` | 提交 | 所有槽位已填满 |
| `ACTIVE` | （灰色提交） | 存在空槽位 |
| `EVALUATING` | 评判中（禁用） | — |
| `NEEDS_REVISION` | 提交（重评） | 所有 F 槽已替换 |
| `RESOLVED` | Archive | 随时可点击 |
| `ARCHIVED` | — | 仅在 Library 中查看 |

---

## 6.5 槽位规则

| 规则 | 说明 |
|------|------|
| 填词来源 | Canvas 上的 Sense 卡，直接拖拽（词卡不设仓库，[ADR-011](../decisions/ADR-011-interaction-constitution.md)） |
| 种子词 | 可被填入该魔典自身的任意槽位 |
| 替换 | 未评判/F 槽可以替换；非 F 锁定后不可替换 |
| F 槽弹出 | 评判后 F 槽的 Sense 卡自动弹回 Canvas，槽位清空 |
| F 计数 | 每次提交中每个 F 槽计 1 次，累计记录于 `fCount` |
| 锁定 | 非 F 槽评判后 `locked = true`，Sense 卡封印在槽内 |
| 约束 | 当前版本所有槽位 `constraint = null`；约束系统为高阶功能占位 |

---

## 6.6 GrimoireType 枚举

| 类型 | 语义方向 |
|------|---------|
| `taxonomy` | 范畴与分类（同类词、上下位词） |
| `anatomy` | 部件与构成（整体-部件关系） |
| `locus` | 场景与空间（特定地点的相关词汇） |
| `script` | 事件与脚本（行为序列、对话场景） |
| `spectrum` | 程度与对比（反义词、程度词） |
| `qualia` | 感官与体验（感官形容词、主观描述） |
| `ritual` | 仪式与过程（程序性动词序列） |
| `metaphor` | 隐喻与映射（源域-目标域词汇对） |

---
[Back to Top](#📑-table-of-contents)

<div id="7-评分与奖励系统"></div>

# §7 评分与奖励系统
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 7.1 评分算法概览

评分分两个层次：**槽位评分**（AI 逐槽输出）及**总评级**（前端计算）。

```
[AI 评判]                    [前端计算]
每个槽位 → Grade        →  数值化  →  加权平均  →  减去 F 惩罚  →  总评级
S++ / S+ / S / A / B / C / D
```

---

## 7.2 槽位评级数值化

| 评级 | 数值 |
|------|------|
| S++ | 8 |
| S+ | 7 |
| S | 6 |
| A | 5 |
| B | 4 |
| C | 3 |
| D | 2 |
| F | 已弹出，不参与计算 |

---

## 7.3 总评级计算

### 步骤一：加权平均

```
原始分 = Σ(所有非 F 槽的数值) ÷ 槽位总数
```

> 说明：分母为**总槽位数**（含曾经 F 过的槽位），而非最终非 F 数量。这样多次 F 会间接拉低平均分，形成轻微但自然的惩罚。

### 步骤二：F 次数扣分

```
最终分 = 原始分 - (fCount × 0.3)
```

| 变量 | 说明 |
|------|------|
| `fCount` | 整个魔典生命周期内累计 F 评级次数 |
| `0.3` | 每次 F 的扣分量（可调节参数） |

### 步骤三：映射总评级

| 最终分区间 | 总评级 |
|-----------|--------|
| ≥ 6.8 | S++ |
| ≥ 5.9 | S+ |
| ≥ 5.2 | S |
| ≥ 4.5 | A |
| ≥ 3.5 | B |
| ≥ 2.5 | C |
| < 2.5 | D |

---

## 7.4 XP 奖励

玩家在 Library 领取奖励时，按总评级发放 XP。

| 总评级 | 基础 XP |
|--------|--------|
| D | 10 |
| C | 20 |
| B | 35 |
| A | 55 |
| S | 80 |
| S+ | 110 |
| S++ | 150 |

---

## 7.5 Resonance XP

同一次领取时，向绑定 Persona 发放 Resonance XP，数值与 XP 奖励表相同。

| 总评级 | Resonance XP |
|--------|-------------|
| D | 10 |
| C | 20 |
| B | 35 |
| A | 55 |
| S | 80 |
| S+ | 110 |
| S++ | 150 |

---

## 7.6 Mastery 计数器（Streak）

每位玩家维护 5 个独立计数器：

| 计数器 | 说明 |
|--------|------|
| `aCount` | 累计获得 A 的次数 |
| `bCount` | 累计获得 B 的次数 |
| `cCount` | 累计获得 C 的次数 |
| `dCount` | 累计获得 D 的次数 |
| `sScore` | S 级得分累计（永久累加） |

### 更新规则

Mastery 计数器采用**向下延递（Downward Propagation）**机制。获得高评级时，所有低于该评级的计数器同步增加。S 级档位提供倍率加成。

| 总评级 | aCount | bCount | cCount | dCount | sScore |
|--------|--------|--------|--------|--------|--------|
| **D** | — | — | — | +1 | — |
| **C** | — | — | +1 | +1 | — |
| **B** | — | +1 | +1 | +1 | — |
| **A** | +1 | +1 | +1 | +1 | — |
| **S** | +1 | +1 | +1 | +1 | +1 |
| **S+** | +3 | +3 | +3 | +3 | +3 |
| **S++** | +7 | +7 | +7 | +7 | +7 |

---
[Back to Top](#📑-table-of-contents)

<div id="8-library-与-echo-系统"></div>

# §8 Library 与 Echo 系统
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 8.1 Library 概述

Library（图书馆）是一个独立的全屏模块，用于管理及查阅所有已 Archive 的魔典。它不是 Canvas 的一部分，而是通过 Dock / 导航栏独立访问。

| 属性 | 规格 |
|------|------|
| 访问方式 | 独立模块，全屏展示 |
| 存储上限 | 99 本魔典（已 Archive） |
| 排列方式 | 按 Archive 时间倒序，最新在前 |
| 内容来源 | 仅包含玩家主动 Archive 的魔典，过期消散的不纳入 |

---

## 8.2 书架展示（Bookshelf View）

Library 将所有魔典以**书架**形式排列——使用与 Canvas 上完全相同的**魔典闭合态视觉组件**，拼排成书架布局，如书店书架般呈现收藏感。

**视觉规格：**
- 展示单元 = Canvas 上的 Grimoire 闭合态组件（同款视觉）
- 禁用拖拽（不可移动位置）
- 保留闭合态上的视觉元素：Persona 图标、评级徽章、待领取高亮
- 时间条不显示（魔典已归档，无时间概念）

---

## 8.3 奖励领取机制

魔典在玩家点击 Archive 后进入"奖励待领取"状态，奖励**不自动发放**，必须玩家进入 Library 主动领取。

```
Archive 魔典
  → 进入 Library（高亮提示未领取条目）
  → 点击条目 → 展开详情
  → 点击「领取」按钮
  → XP + Resonance XP 发放 + Mastery 计数器更新
  → 奖励标记消失，该条目进入普通浏览状态
```

---

## 8.4 魔典展开态（详情视图）

点击书架上的魔典后，展开态与 Canvas 上完全一致，**复用同一 UI 组件**。

差异点（Library 上下文）：

| 元素 | Canvas 展开态 | Library 展开态 |
|------|------------|---------------|
| 时间条 | 实时倒计时 | 不显示 |
| 提交按钮 | 按状态显示 | 不显示 |
| Archive 按钮 | 存在 | 不显示 |
| 额外按钮 | — | 「领取」（待领取）/ 「Echo」（已领取） |

---

## 8.5 Echo 系统

Echo 是 Library 的核心交互功能，包含两种模式，共享每日 3 次的总配额，玩家自行选择用于探索新词还是巩固旧词。

### 8.5.1 Echo · 发现（原有机制）

允许玩家从魔典的隐藏标准答案中随机抽取词语。

| 属性 | 规格 |
|------|------|
| 使用范围 | Library 中任意已领取奖励的魔典 |
| 随机来源 | 从其 `validationTags`（10 个隐藏答案）中随机抽取 1 个 |
| 产出 | 在 Canvas 上生成对应的 Sense 卡 |

### 8.5.2 Echo · 回放（新增，ADR-007）

允许玩家重新打开一本旧魔典，凭记忆回忆自己当年填入的词——是"复习"在本系统里的仪式化呈现：检索的是玩家自己的创作，而非题库，情感黏性与教学价值都高于通用复习模式。

| 属性 | 规格 |
|------|------|
| 使用范围 | Library 中任意已归档魔典（不要求已领取奖励） |
| 呈现方式 | 展开态与原魔典一致，但各槽当年填入的 Sense 被雾遮蔽，仅题面（主题/指令）可见 |
| 判定 | 玩家重新指认词语：命中原答案 → 精确匹配，零 AI 调用；给出不同但合理的词 → 可选择再次调用 `evaluate-grimoire` 评判 |
| 奖励 | 命中的词记忆稳定度显著提升（检索质量记满分，见记忆模型设计），伴随"唤醒"视觉反馈 |
| 与 Echo · 发现 的关系 | 共享每日 3 次配额，互不额外计费 |

> 设计依据：[ADR-007](../decisions/ADR-007-memory-model-and-review.md)《记忆模型取代耐久度》。记忆模型（stability/lastRetrievalAt 字段、检索事件权重、卡片风化态）属于 Sense/Card 系统范畴，不在本 Grimoire GDD 内详述，完整设计见该 ADR 及后续 Sense 系统文档修订。

---
[Back to Top](#📑-table-of-contents)

<div id="9-ai-规格生成与评判"></div>

# §9 AI 规格（生成与评判）
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 9.1 概述

Grimoire 系统依赖两个独立的 Supabase Edge Function：

| 函数名 | 触发时机 | 职责 |
|--------|---------|------|
| `generate-grimoire` | 玩家激活 Summoner | 生成魔典主题、指令、槽位、隐藏答案 |
| `evaluate-grimoire` | 玩家提交槽位 | 逐槽评判、输出评级与评语 |

---

## 9.2 generate-grimoire

### 前端传入参数

| 字段 | 说明 |
|------|------|
| `personaId` | Persona 标识符（'CHILD'/'GARDENER'/'ALCHEMIST'）；后端查字典，不信任客户端数据 |
| `archetypeId` | 8 种语义类型之一；由前端随机选取（过滤 Persona 的 `excludedTypes`） |
| `seedWord` | 种子词（learningLang 下的字符串），用于驱动 archetype 语义方向 |
| `targetLevel` | CEFR 等级（A1-C2），由玩家语言进度计算；目前仅供后端记录，不注入 prompt |
| `learningLanguage` | 学习语言代码（如 `'en'`） |
| `systemLanguage` | 系统语言代码（如 `'zh'`） |
| `personaStory` | `{ stage: string }` — 叙事阶段；后端 `resolvePersonaContext` 据此选取 stage override |

### 服务端生成（不由 AI 决定）

- **slotCount**：服务端随机 3–6，AI 仅在输出 JSON 中原样回填
- **narrativeForm**：从 persona 的 `narrativeForms[]` 中随机选取，注入 prompt

### Prompt 架构（五段）

1. **`# ROLE`** — Persona 完整人物描述 + 当前故事阶段（startingpoint 不注入）
2. **`# GLOBAL RULES`** — TRANSCREATE 原则（以目标语言本地读者视角重新找到同等表达，禁止逐词翻译）；validationTags 语言约束；JSON 格式要求
3. **`# TASK`** — 种子词、Archetype 双向逻辑（A→B / B→A 两方向均展示）、双向 example 各一条（仅供定向参考，非模板）
4. **`# PERSONA QUEST — TWO SHAPING FORCES`** — 明确区分两种力量的作用范围：
   - **(A) Persona 声音**：仅管辖 Persona 自身的台词与内心独白
   - **(B) Narrative Form**：管辖场景、其他角色、氛围、结构与节奏，Persona 自身话语以外的一切
5. **`# OUTPUT SCHEMA`** — _reasoning 作为 scratchpad（4 步：双向分析 → 收词逻辑 → 场景构建 → voice/form 分工），字段顺序：`_reasoning → title → explicitInstruction → validationTags → personaQuest`

### AI 输出 Schema（由 Gemini `response_schema` 强制）

```json
{
  "_reasoning": "...",
  "title":               { "learning": "...", "system": "..." },
  "explicitInstruction": { "learning": "...", "system": "..." },
  "validationTags":      ["word1", ..., "word10"],
  "personaQuest":        { "learning": "...", "system": "..." },
  "slotCount":           4
}
```

> 字段顺序设计原则：AI 先确定收词规则（`explicitInstruction`）与 10 个样例（`validationTags`），再写以这些词为隐含前提的叙事场景（`personaQuest`），防止场景先行导致规则被倒推凑合。

### 前端映射

| AI 字段 | GrimoireEntity 字段 |
|---------|---------------------|
| `title` | `theme.title` |
| `personaQuest` | `theme.description` |
| `explicitInstruction` | `explicitInstruction` |
| `validationTags` | `validationTags` |
| `_reasoning` | `designRationale` |
| `slotCount` | 决定 `slots[]` 数组长度（前端生成空 slot，无 label） |

### TRANSCREATE 原则

双语字段的 `system` 版本不是翻译，是**以目标语言母语者视角重新找到同等感受或意涵的表达**。允许使用不同意象、不同句式结构；`personaQuest.system` 中 Persona 的台词应贴近目标语言文化语境下该角色会使用的措辞，而非英文台词的逐字映射。

---

## 9.3 evaluate-grimoire

### 前端传入参数

| 字段 | 说明 |
|------|------|
| `personaId` | Persona 标识符；后端查字典，与 generate-grimoire 保持一致 |
| `personaStory` | `{ stage }` — 与生成时相同的叙事状态，确保 evalBias 和 triggers 来自同一上下文 |
| `grimoire` | `{ id, personaQuest, explicitInstruction, validationTags }` — 评判所需的魔典信息 |
| `slotsToEvaluate` | `[{ slotId, word, meaning, level }]` — 仅未锁定的槽位（已锁定槽位不重复评判） |
| `learningLanguage` | 学习语言代码 |
| `systemLanguage` | 系统语言代码 |

### Prompt 架构

1. **ROLE + evaluatorProfile** — Persona 描述 + 评判者视角（`evaluatorProfile`，独立于生成时的叙事描述）
2. **evalBias 描述** — `evalBias > 0.1` → "generous，tip close calls upward"；`< -0.1` → "hold high standards"；否则 "fair"
3. **YOUR VOICE（双语）** — learning 和 system 两套 voiceDescription，分别指导 commentary 两个字段的写作
4. **TASK CONTEXT** — personaQuest、explicitInstruction、validationTags（作为隐藏参考答案，不出现在玩家界面）
5. **SCORING SCALE** — F / D / C / B / A / S / S+ / S++ 完整定义
6. **COMMENTARY** — 以 Persona 身份从场景内部给出反馈；不是语义分析；commentary.system 为 TRANSCREATE。**评语长度与评级负相关（ADR-007）**：S++/S+ 一两句由衷赞叹即可；F/C 应展开到 3~5 句，具体说明差在哪、差多远、以及该词在什么语境下反而会成立——学习价值集中在低分反馈，高分不需要说教
7. **STORY TRIGGERS（条件注入）** — 若 persona.triggers 非空，AI 逐词检查是否语义命中，命中时用 trigger 的 `comm` 替代 COMMENTARY 指令；grade 逻辑不变

### Scoring Scale（完整定义）

| 评级 | 含义 |
|------|------|
| F | 完全不属于此处。错误、语法损坏或无意义 |
| D | 几乎不相关，语义连接太弱 |
| C | 略有关联，但未满足 explicitInstruction |
| B | 方向正确，但错过核心要求 |
| A | 正确满足 explicitInstruction —— 完成任务 |
| S | 正确 + 词语属于 Persona 的世界，有共鸣 |
| S+ | 正确 + Persona 会主动寻找此词 |
| S++ | 正确 + 揭示了一个 Persona 才会发现的瞬间真相 |

### AI 输出 Schema

```json
{
  "results": [
    {
      "slotId": "<原样 echo 输入的 slotId>",
      "grade": "S++ | S+ | S | A | B | C | D | F",
      "triggeredCondition": "<命中的 trigger id，或 null>",
      "commentary": {
        "learning": "长度与评级负相关(S++/S+ 1~2句;F/C 3~5句,展开说明差距与适用语境),learningLanguage，Persona 第一人称",
        "system": "TRANSCREATE：同一 Persona，同一判断，systemLanguage 本地语感"
      }
    }
  ]
}
```

> temperature = 0.6（低于生成的 0.95）——评判需要一致性，不需要创造性随机。

### 前端处理流程

1. 发送前：仅发送 `!locked` 的槽位，已锁定槽位保留原评级
2. 结果处理：非 F → 锁定槽位；F → 不锁定，允许玩家修改重提
3. 全通过（无 F）→ 状态改为 `RESOLVED`，计算 finalGrade（§7.3 算法）
4. 含 F → 状态改为 `NEEDS_REVISION`，玩家修改后可重新提交

### Story Trigger 状态（前端待实现）

- 后端每个 slot 结果包含 `triggeredCondition`（trigger id 或 null）
- **前端待实现**：读取 triggeredCondition → 递增对应故事 counter（权重在前端配置）→ counter 达阈值时写入结局 tag 并触发叙事事件

---
[Back to Top](#📑-table-of-contents)

<div id="10-数据-schema-草图"></div>

# §10 数据 Schema 草图
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 10.1 核心数据结构

### GrimoireEntity
```typescript
export interface GrimoireEntity {
    id: UUID;
    x: number;          // Canvas position
    y: number;          // Canvas position

    personaId: PersonaType;
    grimoireType: GrimoireType;
    targetLevel: CEFRLevel;   // A1–C2，由玩家语言进度计算
    seedWord: string;

    theme: {
        title: BilingualText;
        description: BilingualText;  // = AI 输出的 personaQuest
    };
    explicitInstruction: BilingualText;

    validationTags: string[];   // 10 个隐藏验证词（learningLang）
    designRationale: string;    // = AI 输出的 _reasoning

    slots: GrimoireSlot[];      // 3–6 个空槽，无 label

    createdAt: Timestamp;
    expiresAt: Timestamp;       // createdAt + 1h

    status: GrimoireStatus;
    fCount: number;             // 累计 F 次数（影响最终评分）
    finalGrade: Grade | null;
    rewardClaimed: boolean;
}
```

### GrimoireSlot
```typescript
export interface GrimoireSlot {
    id: UUID;
    senseId: UUID | null;            // 已放置的 Sense ID
    grade: Grade | null;             // 评判结果
    locked: boolean;                 // 非 F 结果锁定槽位
    commentary: BilingualText | null; // Persona 评语
    // ⚠️ 无 label 字段 — 槽位不展示标签，避免直接给出答案（§6 设计原则）
}
```

### GrimoireStatus
```typescript
export type GrimoireStatus =
    | 'SUMMONING'       // Edge Function 调用中
    | 'ACTIVE'          // 画布上，可交互
    | 'EVALUATING'      // 等待评判结果
    | 'NEEDS_REVISION'  // 含 F 评级，需修改
    | 'RESOLVED'        // 全部槽位评级 ≥ D
    | 'ARCHIVED'        // 已归档至 Library
    | 'EXPIRED';        // 超时
```

### GrimoireType
```typescript
export type GrimoireType =
    | 'taxonomy' | 'anatomy' | 'locus' | 'time'
    | 'spectrum' | 'qualia' | 'ritual' | 'metaphor';
```

---
[Back to Top](#📑-table-of-contents)

<div id="11-uiux-规格"></div>

# §11 UI/UX 规格
## Lexicoin Grimoire 系统游戏设计文档（GDD）

---

## 11.1 视觉组件总览与”点位”哲学

Grimoire 系统设计目标为 **”装饰点位（Mount Points）”** 系统：基础骨架（Base Frame）+ 标准化位置的网络插槽，允许通过配置热插拔不同材质与挂件。当前实现为功能性占位，点位系统为后续视觉完成度工作。

---

## 11.2 Grimoire Summoner 视觉

| 状态 | 设计描述 | 实现状态 |
|------|---------|---------|
| **IDLE** | 静默待机，光晕脉动 | ✅ 蓝色虚线圆边框 |
| **GENERATING** | 阵纹旋转，粒子上升，锁定状态 | ⚠️ 有旋转环 + amber 阴影；粒子上升待实现 |
| **READY** | 闪光爆发，生成完成 | ✅ 双层扩散环动画 + “Grimoire Manifested” |

---

## 11.3 闭合态：点位装配系统（设计目标，待实现）

- **物理构型层**：书脊护甲、装订缝线、材质底纹、边角包边。
- **标识与字样层**：主印章（Persona 图标）、封印锁扣（ACTIVE 扣拢 / RESOLVED 碎裂）。
- **动态附属物层**：吊坠/书签（形态反映 GrimoireType）。

> **当前实现**：`Grimoire.tsx` 为 120×160px 彩色卡片，按 status 变色，显示 Persona 名 + 槽位填充进度 + 倒计时。完整点位系统待后续视觉迭代。

---

## 11.4 展开态：双页模态框

| 区域 | 设计描述 | 实现状态 |
|------|---------|---------|
| 左页 | Persona 信息、标题、personaQuest、指令框、语言切换 | ✅ 已实现 |
| 右页 | 槽位列表垂直排列，填充进度指示器 | ✅ 已实现 |
| 槽位基座 | 空槽视觉按 Persona 动态映射 | ✅ CHILD=Star / GARDENER=Leaf / ALCHEMIST=FlaskConical；默认 Sparkles |
| 最终评级印章 | RESOLVED 后在右页叠加大型 finalGrade 水印 | ✅ 已实现 |

---

## 11.5 评级视觉语言

| 等级 | 设计描述 | 实现状态 |
|------|---------|---------|
| S++ / S+ / S | 金色发光，Serif 大字，光晕强度递减 | ✅ amber + drop-shadow glow + serif italic |
| A / B / C / D | 普通字体，低饱和度 | ✅ 实现为多色分级（A=emerald, B=blue, C=purple, D=zinc），表达力优于原设计 |
| F | 红色脉动，语义断裂感 | ✅ red + animate-pulse + AlertCircle 弹跳 |

---
[Back to Top](#📑-table-of-contents)

---

*Lexicoin Grimoire System | Comprehensive Master GDD | 2026-04-14（2026-07-05 修订，见 ADR-007/ADR-008）*
