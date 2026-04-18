# WBS — Grimoire 系统实现 (带完整代码库上下文)
> 本文档旨在指导 AI（Agent）直接执行开发任务。包含所有具体实现路径、架构约定、依赖关系，**以及核心设计目的与功能语境（指向原 GDD 章节以供追查设计初衷）**。

---

## 📌 当前架构上下文（必读）

在执行本 WBS 之前，请熟知当前项目的核心代码模式：
1. **状态管理**：使用 Zustand (`a:\lexicoin\lexicoin\src\core\store\index.ts`)，采用 Slice 拆分模式（例如 `createConfigSlice.ts`）。所有的界面同步必须依赖 Store，严禁脱离 Store 的本地数据闭环。
2. **点位架构 (Mount Points)**：Persona 系统使用热插拔 Slot 模式 (`a:\lexicoin\lexicoin\src\app\components\persona\slots.tsx`)。UI 设计需严格遵循 `<Slot slot={slots.ObjectName} />`，禁止硬编码外观逻辑。
3. **Canvas 体系**：所有画布实体需要在 `src/app/components/ui/canvas/Canvas.tsx` 中配合 Zustand 坐标数据渲染。

---

## Phase 1 — Foundation（数据层与类型定义）
> **功能语境与目的：** 建立基于“框架优先生成模式”的数据结构，彻底脱离写死的题库。定义魔典实体结构以及玩家的多语言掌控度计量基座。
> **指向 GDD 章节：** 
> - [GDD_S10_schema.md](./GDD_S10_schema.md) (核心接口草图)
> - [GDD_S6_grimoire_entity.md](./GDD_S6_grimoire_entity.md) (数据生命周期与定位)
> - [GDD_S7_scoring.md](./GDD_S7_scoring.md) (评分阈值与掌控度衍生逻辑)

### 1.1 类型体系 (TypeScript Interfaces)
在 `a:\lexicoin\lexicoin\src\types\index.ts` 中完成类型追加：
- [ ] **追加 `BilingualText` 和基础枚举** (`Grade`, `GrimoireStatus`, `GrimoireType`)。
- [ ] **追加核心模型 `GrimoireSlot` 和 `GrimoireEntity`**。
- [ ] **追加玩家掌握度数据 `GrimoireMastery`**（并注意更新已有的 `PlayerState` 接口以包含它）。

### 1.2 注册表与常量 (Registries & Constants)
在 `a:\lexicoin\lexicoin\src\config\`（或就近的 configs 目录）下新建配置：
- [ ] **新建 `grimoireConfig.ts`**：
  - 定义评分常量：`GRADE_THRESHOLDS` (S++ 至 D), `F_PENALTY_MULTIPLIER` (0.3)。
  - 定义 `GRIMOIRE_TYPES_REGISTRY`，包含分类的 targetLogic 文本。
- [ ] **扩展现有的 Persona 类型**：在 Persona 相关定义（如 `a:\lexicoin\lexicoin\src\modules\persona\PersonaModule.ts` 等）中补充 `spineColor`, `glowColor`, `evalPrompt`, `evalBias` 等模型所需的属性。

### 1.3 状态管理切片 (Zustand Slices)
扩展 `useGameStore`：
- [ ] **新建 `src/core/store/slices/createGrimoireSlice.ts`** 并在 `index.ts` 中注册：
  - 核心状态：`activeGrimoires` (画布上的魔典), `libraryGrimoires` (库存, max:99), `summonerStatus` ('IDLE'|'GENERATING')。
  - Actions：`spawnGrimoire`, `updateGrimoire`, `expireGrimoire`, `resolveGrimoire` (计算 final grade), `archiveGrimoire`。
- [ ] **扩展 progression / player 相关 Slice**：
  - 追加 `claimGrimoireReward(id)` action，封装 XP 发放与 Mastery 计数器的“向下延递”逻辑。
  - 追加扣除 60 体力 (Stamina) 的能力接口。

---

## Phase 2 — Grimoire Summoner 装置
> **功能语境与目的：** 将 AI 的随机生成能力包装为一种有代价的“献祭召唤”仪式，消耗 Stamina 换取定制化的任务。
> **指向 GDD 章节：** 
> - [GDD_S5_summoner.md](./GDD_S5_summoner.md) (召唤器交互逻辑)
> - [GDD_S3_stamina.md](./GDD_S3_stamina.md) (体力消费规则)

### 2.1 装置本体开发
- [ ] **新建 `GrimoireSummoner.tsx`**：
  - 在 Canvas 内定位与拖拽渲染（可参考 `SynthesisCircle.tsx`）。
  - 包含 1 个接受 Sense 卡拖入的槽位，以及 1 个【随机抽取】按钮。
- [ ] **装置三态视觉动画**：根据 `summonerStatus`（IDLE / GENERATING / READY），实现脉动/阵纹旋转/结束爆闪动画。

### 2.2 核心触发逻辑
- [ ] **绑定触发 Action**：
  - “拖入种子”或“点击随机”时拦截校验（体力 ≥ 60，状态为 IDLE）。
  - 触发状态变更为 GENERATING，并准备发起 Supabase Request (生成 Edge Function)。

---

## Phase 3 — Canvas 实体 (Point 装配系统)
> **功能语境与目的：** 让魔典能像真实的道具一样被丢弃在主世界的桌面上。采用“骨架+挂载”的设计，彻底分离核心功能和外观表现，为未来不同画师/Persona引入皮肤扫清障碍。
> **指向 GDD 章节：** 
> - [GDD_S11_uiux.md](./GDD_S11_uiux.md) (Mount Point 切片与装饰体系)
> - [GDD_S6_grimoire_entity.md](./GDD_S6_grimoire_entity.md) (外壳展示态)

### 3.1 闭合态外壳框架
- [ ] **新建 `GrimoireItem.tsx`** (类似于现有的 Item 卡片结构)：
  - 负责从 `activeGrimoires` 循环读取并在 Canvas 渲染。
  - 双击控制展开交互，并包含坐标同步存储。

### 3.2 提取并运用 `<Slot>` 架构设计
- [ ] **构建魔典层析骨架：** 不写死 UI，而使用 Persona 系统提供的组件热插拔，如：
  ```tsx
  <Slot slot={slots.GrimoireTexture} blendMode="overlay" />
  <Slot slot={slots.GrimoireSpine} fill={personaCfg.spineColor} />
  <Slot slot={slots.GrimoireCenterSeal} progress={timeRemainingRatio} />
  <Slot slot={slots.GrimoirePendant} type={entity.grimoireType} />
  ```
  *(在 `src/app/components/persona/slots.tsx` 和相关 Persona Registry 补充声明)*
- [ ] **状态附加装饰**：
  - 实现 S++ `GradeBrand`（发光徽章）高层级覆盖。
  - 实现 `LockClasp`（基于 `status !== 'RESOLVED'` 进行锁死动画）。

---

## Phase 4 — Modal 展开态与核心交互
> **功能语境与目的：** 沉浸式的答题与正向反馈闭环。摆脱单纯的判断正误，走向“叙事驱动 + AI主观评判”的互动体验。语言隔离(Transcreation)强制在这里体现。
> **指向 GDD 章节：** 
> - [GDD_S11_uiux.md](./GDD_S11_uiux.md) (双页展开交互)
> - [GDD_S2_core_loop.md](./GDD_S2_core_loop.md) (正向反馈流与F评价阻断机制)

### 4.1 双页结构与语境开关
- [ ] **新建 `GrimoireView.tsx` (模态弹窗版)**：
  - 1/3左侧页（沉浸/描述），2/3右侧页（插槽）的双页布局。
  - `<Slot slot={slots.GrimoireBackdrop} />` 替代纯黑蒙版。
- [ ] **设计语言切换 State**：
  - 组件顶层控制 `displayLang: 'learning' | 'system'` ，并加入明显的 Toggle 按钮，使得所有 `BilingualText` 即时翻转。

### 4.2 左页（沉浸渲染栏）
- [ ] **布局 Persona 叙事组件**：
  - 绑定 `theme.title[displayLang]` 和 `theme.description[displayLang]`。
  - 高亮显示具体执行要求 `explicitInstruction` 区块。

### 4.3 右页（功能与槽位区）
- [ ] **开发 `GrimoireSlotReceptacle.tsx`**：
  - 接受 Sense 卡落入 (`react-dnd`)。
  - 挂载专属的基座底纹 (`<Slot slot={slots.GrimoireSlotBase} />`)。
  - 根据 `slot.grade` 控制物理弹出 (如果是F被退回)。
- [ ] **状态流转与动画集成**：
  - 卡片填满后，解除底部的【Submit / Request Judgment】按钮禁用。

---

## Phase 5 — AI Serverless Functions (Supabase)
> **功能语境与目的：** 确保客户端绝对安全（决不允许客户端生成数值）。通过分层 Prompt 架构保证 AI 的产出稳定、具备文学色彩且严守格式化。
> **指向 GDD 章节：** 
> - [GDD_S9_ai_spec.md](./GDD_S9_ai_spec.md) (三层提示词架构与全量规范定义)

*(可与前端 Phase 3/4 并行开发，必须使用 Deno/TypeScript 环境)*
- [ ] **创建 Edge Function: `generate-grimoire`**：
  - **职责**：基于传入的种子或随机词，生成结构体并附带 `validationTags`。
  - **核心限制**：强制依赖 `Structured Outputs`（Google GenAI `Type.OBJECT`Schema）。
- [ ] **创建 Edge Function: `evaluate-grimoire`**：
  - **职责**：提取用户填入的词，比对隐藏的 `validationTags` 和设计意图进行强制单点打分，输出 F-S++ 及双语短评(`commentary`)。
  - **优化动作**：必须具备增量重评逻辑（只传入 F 槽位进行重新评分），节约 API Tokens。

---

## Phase 6 — Library 与 Echo 系统
> **功能语境与目的：** 提供长期的荣誉展览室，提供成就正反馈，此外通过 Echo 提供每日的低门槛词汇复习途径（从已获高分书籍中抽出复习词根）。
> **指向 GDD 章节：** 
> - [GDD_S8_library_echo.md](./GDD_S8_library_echo.md) (v1简化版书架系统与Echo抽取法则)
> - [GDD_S7_scoring.md](./GDD_S7_scoring.md) (结算XP核发体系)

### 6.1 图书馆集成
- [ ] **拓展 Library 视图路由 (`LibraryModule.tsx` 区)**：
  - 引入书架阵列视图，重用 `GrimoireItem` 外壳 (`isLibraryContext={true}` 禁用其时间条和自由拖动)。
- [ ] **阻塞与提醒机制**：
  - 书籍满载 (99本) 报警提示。解决小红点强迫症交互。

### 6.2 奖励认领与日常消耗 (Echo)
- [ ] **Claim（认领）动作**：
  - 从 `S7_scoring` 中读取公式，结算 XP 与 Mastery 衍生数据（含向下延递与 S 级加成）。
  - **触发 Player State 系统状态更新**：计算并应用连胜 (Streak) 奖励，同时向魔典所绑定的 Persona 发放专属 Resonance XP (GDD §4)。消除对应 UI 的小红点提醒。
- [ ] **处理 Expire 动作 (补充)**：
  - 若在 Canvas 的时间条归零（过期），触发 `expireGrimoire`：将内含的 Sense 卡全部安全弹回画布坐标，魔典实体消散。
- [ ] **Daily Echo 系统 (每日3次复读)**：
  - 本地状态（或是基于登入 Date 的每日刷新钩子）控制 3 次 `Echo Charges`。
  - 触发动作：从书籍隐藏的 `validationTags` 中随机选择，实例化一张对应的基础 Sense 卡并投掷到主画布 `spawnSense`。

---
*编撰：Lexicoin Agent System*
*用途：可独立被 AI 直接读取并开始 Coding Session*
