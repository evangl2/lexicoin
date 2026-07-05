# ADR-008: Persona 系统方向——偏好黑箱、关系质感、三系统主从

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-05
> 📖 人话: Persona 的评判偏好不亮牌,只告诉玩家"每位 Persona 有自己的口味",让玩家从评语里体会。Resonance 涨的不该只是数字,要换来"Persona 记得你"。游戏 Persona 是主,UI 视觉是从。阵容锁三人,深度优先。

## 背景

Persona 系统同时承担内容生成(voice)、评判(evalBias)、进度(Resonance)、视觉主题、叙事载体(personaStory)五种职能,是耦合最广的系统。2026-07-05 设计讨论(作者 × Claude Fable 5)对其方向定案。已确认做对的底子:身份解析后端字典化(`supabase/functions/_shared/personas/`)、voice/narrative form 双力分离、三人阵容(CHILD/GARDENER/ALCHEMIST)。

## 决策

### 1. evalBias 保持黑箱,但存在感亮牌(作者定案)

- evalBias 的具体内容**不直接展示**给玩家;
- Persona 功能说明中**明确提示**"每位 Persona 有自己的评判偏好",引导玩家从评语与评级差异中自行体会各自的口味;
- "第二意见"机制(花体力请另一位 Persona 重判同一魔典)列为方向性设计:它把 LLM 评分方差转化为角色性,并传达"词语的可接受性是判断而非二值真理"。

### 2. Resonance 必须购买关系质感

Resonance 是无上限 XP 轨道(维持现行)。里程碑的兑现物按优先级:

1. **personaStory 阶段推进**(`createPersonaStorySlice` 已存在,里程碑应驱动 stage 变迁);
2. **"Persona 记得你"**:store 记录少量结构化事件(首个 S++、最常用词、连败翻盘等),生成魔典时注入 prompt 一行,使任务引用玩家历史——静态内容竞品无法复制的个性化,优先级高于一切阵容扩充;
3. 新叙事形式解锁。

纯数字/进度条不算奖励。

### 3. 三系统合并的主从关系

游戏 Persona / uiTheme / PersonaDictionary 合并时:**Persona 为主,视觉为从,从可被玩家覆盖**——切换 Persona 默认切换画布氛围,玩家可手动锁定偏好主题。实现路径:**Persona ↔ Centerpiece preset JSON 绑定**(一条映射表;preset 基建即铁律二"Persona 视觉多样性来自换贴图换 preset"的兑现)。

### 4. 多语言 voice 用 golden sample 守护

每 Persona × 每**实际上线**语言保留 3~5 条人工确认的"这就是他/她的声音"样本;模型或 prompt 变更后跑对照。不为未上线语言预付。(与 strategic-command §3.7 上游模型漂移预警共用一套 golden sample 机制。)

### 5. 阵容冻结三人,深度优先

每新增 Persona 的成本是乘法(voice × 语言 × 叙事形式 × evalBias × 视觉 × 故事阶段)。在现有三人各自立住(有记忆、有阶段、有可感知的偏好)之前,不扩阵容。

### 6. Persona 是复习系统的人格界面

记忆模型(ADR-007)的褪色提醒以 Persona 口吻呈现(如 GARDENER:"有些种子好久没浇水了"),不用系统通知。复习、记忆模型、Persona 三者的汇合点:玩家是在和一个记得自己的角色照料一片会遗忘的花园——这是 GDD §1.2 第四条"AI as Relationship"的兑现形态。

## 理由

- 偏好黑箱 + 存在感提示:保留探索乐趣与"裁判是活人"的幻觉,同时消解"随机不公平"的误解(玩家被告知差异是设计而非 bug);
- 关系记忆的实现成本极低(几个结构化字段 + prompt 注入一行),回报是产品护城河级的;
- 主从可覆盖兼顾沉浸(切人换氛围)与玩家自主(审美偏好不被绑架)。

## 后果

- 待实施:Persona 功能说明文案(含"有自己的偏好"提示);玩家事件记录字段与 generate-grimoire prompt 注入;Resonance 里程碑 → personaStory stage 挂钩;Persona↔preset 映射表(依赖 Stage E 封版的 preset 产出);第二意见机制(排期后议);
- GDD §4(Persona)、§7(评分)对应表述需修订,**由作者主导**,本 ADR 为依据;
- prompt/字典改动涉及 `supabase/functions/_shared/personas/`,注意与前端服务副本的双真相同步。
