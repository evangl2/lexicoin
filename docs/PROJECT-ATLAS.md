# PROJECT ATLAS —— 项目全貌(愿景 + 系统总账)

> 状态: 现行 · 类型: 战略 · 更新: 2026-07-05
> 📖 人话: 给隔段时间回来的作者看的"这是什么、有什么、各到哪了"。重返路径:先看 [NOW.md](NOW.md)(1 分钟)→ 扫本文 §3 总账(10 分钟)→ 需要深入的系统顺"真相源"列跳转。本文只在系统状态变化时更新;每处事实标注核实日期,越久越要怀疑。

---

## §1 这是什么游戏

**Lexicoin(语言炼金术)**:一个把语言学习伪装成炼金术游戏的实验。玩家在一张无限画布上摆弄"词义卡片"(Sense),把它们投入阵法合成新词、填进 AI 人格(Persona)召唤的魔典任务(Grimoire)里接受评判。**所有系统的最终目的只有一个:让玩家在游戏中不知不觉完成语言学习**(作者定案)。

```
        探索循环(主)                     任务循环(辅)
  ┌──────────────────┐          ┌──────────────────────┐
  │ 好奇 → 合成 → 新词 │──词汇──▶ │ Persona 召唤魔典(体力) │
  │   ▲          │    │          │  填词 → 评判 → 评语    │
  │   └── 词汇空缺 ◀───┼──空缺────│  归档 → Library → Echo │
  └──────────────────┘          └──────────┬───────────┘
          ▲                                │ Resonance
          │      记忆褪色拉玩家回访旧词      ▼
          └────── 记忆模型(ADR-007) ← Persona 关系成长
```

- 技术底座:React 18 壳(极薄)+ PixiJS v8 渲染(重建中)+ Zustand/Dexie 本地数据 + Supabase Edge Functions 代理 Gemini。
- 设计哲学五条见 [grimoire/GDD_Grimoire.md](grimoire/GDD_Grimoire.md) §1.2(正反馈优先 / 以创作代替操练 / 动机内化 / AI 作为关系 / 词汇网络性习得)。

## §2 玩家体验蓝图(预期)

> 骨架为作者 2026-07-05 原话定案(标【定案】);其余为 Claude 基于代码与 GDD 的推断扩写(标【推断】)。**2026-07-05 作者已审阅通过全部内容,含推断部分**——本节整体视为正式项目预期,【推断】标记保留仅作来源追溯,不代表仍待定。后续如有具体条目需要修订,当场更新并去除追溯标记。

### 2.1 核心幻想:儿童般的好奇心【定案】

玩家如同儿童一样,对词语合成的结果充满好奇心。**合成结果本身就是奖励**——新词是什么、它的视觉、它的 flavor 文本,这份"打开礼物"的期待是游戏的第一引擎;XP/评级只是包装纸【推断】。

设计检验标准【推断,呼应 GDD §1.2 动机内化】:任何新功能问一句——它是在喂好奇心,还是在喂进度条?优先喂前者。

### 2.2 双驱动结构:探索为主,任务为辅【定案】

- **探索驱动(主)**:无限画布是自由实验室,合成不设目标、不设正确答案;
- **任务驱动(辅)**:Grimoire 存在的原因是**很多玩家已经丧失了探索的能力**——任务是给他们的扶手,不是游戏的主菜。

推论【推断】:
1. 任务的设计义务是**把玩家推回探索**——魔典暴露词汇空缺,空缺驱动合成,而不是让玩家在任务队列里刷进度;体力节流(60/次)客观上防止任务驱动吞噬探索;
2. 衡量健康度的信号:玩家在两本魔典之间自发做了多少次"无目的合成"。这个比例塌了,说明任务驱动越位了。

### 2.3 延迟预算:等待是节奏,不是缺陷【定案数值】

玩家能容忍**平均 10 秒**的等待,以及**约 5% 比重的 90 秒级**长等待。这是对 AI 调用链的硬约束,也是演出设计的依据【推断】:

| 约束 | 设计义务 |
|---|---|
| 平均 ~10s(合成、评判) | 等待必须有可观看的演出(阵法运转、Summoner 状态机),把延迟变成"炼金需要火候"的仪式感 |
| ~5% 的 90s 级(魔典生成等) | 长等待**绝不锁死画布**:一切 AI 调用都是画布上的异步事件,玩家可以走开去摆卡片、做别的合成,完成时以事件通知(装置爆闪) |
| 超预算 | 生成/评判耗时若系统性超过此预算,属于必须修的工程问题,不许用更长的动画去遮 |

### 2.4 Persona:真实的人物感与视觉体验【定案】

Persona 给玩家带来**真实的人物感**和**视觉体验**。展开【推断,已落 ADR-008】:

- "真实人物感"= 有一致的声音(voice)、有偏好的评判(evalBias,不亮牌但告知存在)、有随 Resonance 推进的故事阶段、**记得玩家的共同经历**;
- "视觉体验"= 切换 Persona 改变画布氛围(Centerpiece preset 绑定),角色不是头像而是环境;
- 判词的差异是人格,不是 bug(第二意见机制,GDD §4.7)。

### 2.5 隐形学习:终极检验【定案】

**所有系统都是为了让玩家在游戏中不知不觉完成语言学习。** 操作化【推断】:

- 玩家任意时刻的直接目标永远是游戏目标(合成、填槽、收集、照料),语言习得是副产品;
- 界面上不出现"课程/测验/背诵"语汇;评语是角色说话,不是教师批改;
- 一小时后玩家记得的应该是"我合成出了 ember、GARDENER 夸了我",而不是"我今天背了 20 个词";
- 复习不做独立模式(ADR-007):遗忘以"词语褪色"呈现,巩固以"照料花园"呈现。

### 2.6 v1 第一小时旅程(期望轮廓)【推断,待作者校准】

| 时间 | 体验 | 关键情绪 |
|---|---|---|
| 0–5 min | 打开即画布,几张种子卡,第一次拖卡合成,~10s 阵法运转 → 新词诞生 | "咦,还能这样?" |
| 5–15 min | 自由乱合成几次(含失败,无惩罚);遇见 Persona,第一本魔典召唤(长等待,走开继续玩) | 好奇 + 期待 |
| 15–35 min | 填魔典 → 评判 → 第一条角色评语;发现空缺词 → 回头合成它 | 有目的的探索 |
| 35–60 min | 完成/归档第一本魔典,进 Library 领奖,试一次 Echo;体力见底 | 收藏满足 + "明天再来" |

体力曲线兼任会话节奏器:自然形成 30–60 分钟的会话长度与次日回访理由【推断】。

### 2.7 这个游戏不是什么【推断,划边界防跑偏】

- 不是课程表:没有大纲进度、没有"今日任务"的打卡压迫(Mastery 计数只加不减);
- 不是题库:没有选择题式的复习模式;
- 不是聊天应用:Persona 的存在感靠魔典/评语/环境,不靠自由对话窗口。

## §3 系统总账(预期 vs 现状)

> 状态图例:✅ 可用 · 🚧 进行中 · 📋 已定案未实施 · 💤 休眠/断链 · ❓ 未勘察。核实日期 **2026-07-05**(代码实勘);❓ 行未经勘察,只列存在性。

### 游戏系统

| 系统 | 一句话意图 | 状态 | 与预期的差距 / 备注 | 真相源 | 代码入口 |
|---|---|---|---|---|---|
| Sense 数据模型 | 以"义项"而非"单词"为原子,多语言词壳挂在意义上 | ✅ | 项目地基,稳定 | 代码本身;`docs/SenseEntity.md`(存量,较可信) | `src/types/index.ts`、`src/core/pipelines/senseToCard.ts` |
| 合成 Synthesis | 词义相合成新词,好奇心第一引擎 | ✅ 数据层 | 渲染未接(Stage F+);新颖度经济待接入(ADR-007 §1) | ADR-007;`docs/SynthesisSystem.md`(存量) | `src/core/services/`、`supabase/functions/synthesize-sense/` |
| 卡片视觉生成(GenUI) | AI 为新 Sense 生成专属视觉——**产物是 TSX 组件,运行时 sucrase 编译执行**;异步生成 + Realtime/轮询回填 | ✅ 数据层(React 时代) | ⚠️ **与 Pixi 重构正面冲突**:产物是 React 组件,Pixi 画布无法消费;Stage K 前必须 ADR 决断(见 strategic-command §3.9) | `docs/genui-architecture.md`、`docs/visual-pipeline.md`(2026-07-05 盘点发现,未登记 INDEX,状态未核) | `supabase/functions/generate-visual`、`VisualRegistry`、`useVisualPoll`、`DynamicVisual.tsx` |
| Grimoire 魔典 | AI 生成收集任务,任务驱动辅助线 | ✅ 数据层 | 渲染未接;⚠️ 2026-04 残余偏差(评分算法/归档拆分/过期路径)**可能已进一步失实**——`useGrimoireExpiry`/`useEchoSystem`/`useGrimoireReward` 均已实现,moduleInit 已含每日 Echo 重置与启动期过期清理(2026-07-05 盘点);重新盘点时先读这几个 hook 再假设缺失 | [GDD](grimoire/GDD_Grimoire.md)(2026-07-05 修订) | `src/app/hooks/useGrimoireSummoning.ts`、`useGrimoireExpiry.ts`、`useEchoSystem.ts`、`useGrimoireReward.ts`、`createGrimoireSlice.ts` |
| Persona | 真实人物感:生成之声、评判之偏、关系之忆 | ✅ 骨架 | 方向已定未实施:关系记忆/里程碑兑现/preset 绑定/第二意见 | [ADR-008](decisions/ADR-008-persona-direction.md);GDD §4 | `supabase/functions/_shared/personas/`、`src/modules/persona/` |
| 体力 | 节奏阀 + AI 成本阀 | ✅ | 时间戳恢复完整(登录补算 + 5min interval) | GDD §3 | `src/core/store/index.ts` `recoverStamina` |
| 评分/奖励/Mastery | 正反馈优先的评级与向下延递计数 | ✅ 数据层 | 前端算法与 GDD §7 的一致性**未核实**(残余盘点项) | GDD §7 | `useGrimoireInteraction.ts` |
| 记忆模型(遗忘曲线) | stability/R 取代耐久度,遗忘可见化 | 📋 | 全部待实施;现行代码仍是旧耐久度(合成扣减/归零删卡) | [ADR-007](decisions/ADR-007-memory-model-and-review.md);[DurabilityLifecycle.md](DurabilityLifecycle.md)(已重写为目标规格) | 现行:`src/core/services/DurabilitySystem.ts` |
| 复习(三层) | 无形层/引力层/Echo 回放,不做独立复习模式 | 📋 | 全部待实施;依赖记忆模型先行 | ADR-007 §3;GDD §8.5.2 | `src/modules/review/`(现存实现单薄) |
| Library / Echo | 收藏满足感 + 旧魔典再利用 | ✅ 数据层部分 | Echo·回放(新)未实施;归档/领奖流程与 GDD 一致性待盘点 | GDD §8 | `createGrimoireSlice.ts`、`src/modules/library/` |
| 沉淀 Sedimentation | 社区验证 AI 内容(赞踩/stability/首发现者) | 💤 | 骨架休眠;是未来内容经济的命脉,schema 决策别堵死它 | strategic-command §4(4.6 关联) | `src/modules/sedimentation/` |
| Construction 构式 | LEXEME→NARRATIVE 四层语法习得 | ❓ | 模块存在,未勘察 | `src/types/index.ts` 类型定义 | `src/modules/construction/` |
| Item / Level / Inflection | 道具/等级/屈折变化 | ❓ | 模块存在,未勘察 | — | `src/modules/` |

### 技术系统

| 系统 | 一句话意图 | 状态 | 与预期的差距 / 备注 | 真相源 | 代码入口 |
|---|---|---|---|---|---|
| Pixi 渲染重构 | 游戏手感的物理基础,React DOM → PixiJS v8 | 🚧 Stage E 尾声 | Stage A–D ✅;**F(卡片)未动,游戏当前不可玩**;F–O 待 | [roadmap.md](refactor-pixi/roadmap.md);[strategic-command.md](strategic-command.md) §2 | `src/pixi/`、`PixiRoot.tsx` |
| Centerpiece 材质系统 | 背景装置的材质家族(Persona 视觉多样性载体) | 🚧 | v4(matcap);**1000+ 行未提交**;待定 DoD 封版 | [ADR-006](decisions/ADR-006-material-model-family.md) | `src/pixi/backgrounds/` |
| 数据持久化 | 本地优先:Zustand persist → Dexie/IndexedDB | ✅ | partialize 白名单制;**本地单点,无云存档**;全量导出/导入服务已存在,但 UI 入口(ConfigMenu)随旧 UI 断链 | strategic-command §4.3 | `src/core/store/persistence.ts`、`ExportImportService.ts` |
| AI 后端 | Edge Functions 代理 AI 模型,prompt 资产集中后端 | ✅ | `supabase/functions/lib` ↔ `src/core/services` 强制双份,改动必须两处同步。⚠️ 2026-07-05 发现:**OpenRouter 多模型路由已经实现**(`_shared/callAI.ts` 按 `gemini-` 前缀双路由;`constants.ts` `AI_MODELS` 已列 4 个 Gemini + 4 个 `[OR]` 模型),应用内选模型系统(原设计缺口)也已存在但断链在旧 ConfigMenu 里——**已重接进 DevConsole**(System 面板新增 AI Model 下拉)。另有第二份 `callAI.ts` 副本(`synthesize-sense/utils/`,仅 `generate-visual` 使用),功能等价但是新的双份真相隐患 | GDD §9 | `supabase/functions/_shared/callAI.ts`、`src/config/constants.ts`、`DevConsole.tsx`(System 面板) |
| 资产管线 | 高度/法线单一真相源,HRBA 打包 | ✅ | — | [ADR-005](decisions/ADR-005-asset-preprocessing-pipeline.md) | `scripts/assets/preprocess.mjs` |
| 旧 React UI | 上代渲染层遗骸 | 💤 | 90 文件断链(仅 DevConsole 挂载);react-dnd 仍在依赖被 7 个孤儿文件引用;Stage N 只作参考、Stage O 删除。**hooks 里埋着已解题参考**:useViewportCulling / useGridSnap / useCardPhysics / useCardGrouping 正是 Stage F–J 要重新解决的问题 | strategic-command §1.3/§3.5 | `src/app/components/`、`src/app/hooks/` |
| 测试 | 数据层回归防护 | 💤 | 4 个 node:test 文件**无运行命令**,死资产;建议最低限度修活(strategic-command §3.6);**且无 CI**,连 `type-check` 都不挡提交 | — | `src/tests/` |

### 其它已确认存在的边角资产(2026-07-05 盘点,量小不单独立行)

- **初始词库**:`INITIAL_SENSES`(`schemas/data/initialSenses`)由 `moduleInit` 播种进 IndexedDB——新玩家第一批卡片的来源
- **成就系统半成品**:`ACHIEVEMENT_UNLOCKED` 消息 + 通知挂钩已通(`moduleInit.ts`),但无触发源、无 UI 展示面板
- **移动端适配基建已埋**:`PlatformAdapter.ts` 提供触摸/鼠标/reduced-motion/dark-mode 检测,当前无消费方——ADR-004 说移动适配是独立后续阶段,但地基已经在
- **featureFlags 是空壳**:目前只有一个 `antialiasEnabled` 开关,规模远小于其 slice 抽象暗示的用途
- **DB migrations 只有 1 份**(`20260407000000_synthesis_requests.sql`):schema 演化基本没走版本管理,多数改动可能是手改或经 Supabase CLI 直接同步

### 已识别的缺口(应存在,尚未开始;2026-07-05 盘点)

> 与 §3 系统总账的区别:以下不是"存在但状态不明"的系统,而是**产品/工程层面缺失、目前无任何代码承载**的能力。按紧迫度排序。

| 缺口 | 为什么应该存在 | 紧迫度 | 详情 |
|---|---|---|---|
| 服务端成本护栏 | 体力是纯客户端约束,`generate-visual` 显式 `verify_jwt=false`;持有 anon key 者可绕过游戏直接刷 Gemini 账单 | 🔴 公开部署前必须 | strategic-command §3.9 |
| 声音层(TTS/音效) | 语言学习产品听不到发音是反常;`AudioContext` 存在、`docs/tts-analysis.md` 有调研,但产品无声音设计 | 🟡 应进正式蓝图 | ATLAS §2.6 未覆盖,建议列为 Stage N 前后独立设计项 |
| 新手引导 | 蓝图 §2.6 第一小时旅程无任何承载系统;作者定案"很多玩家已丧失探索能力"——这些玩家最需要第一次合成/召唤被"递到手上" | 🟡 影响留存 | 无代码,无设计文档 |
| 学习效果测量 | "隐形学习"目前无法验证,无遥测、无本地统计;记忆模型(ADR-007)落地后 stability/R 数据可顺手做基础 | 🟢 可搭车实施 | 依赖 ADR-007 |
| 内容安全层 | AI 生成文本直接展示给玩家,无内容过滤;GenUI 更进一步是**运行 AI 生成的代码**(prompt 注入 → 恶意组件) | 🟡 随 GenUI 改造一并处理 | strategic-command §3.8 |
| CI / 提交门槛 | 无 `.github`,无任何自动化,`tsc --noEmit` 都不挡提交;测试已死 + 无 CI = 裸奔 | 🟢 低成本高回报 | 最低方案:一个跑 type-check 的 Action |

## §4 技术地图

```
入口链(2026-07-05 核实)
main.tsx → App.tsx(挂 DevConsole) → app/App.tsx(仅挂 ↓)
    ├── PixiPersonaBridge      React→Pixi 的 persona 桥
    └── PixiRoot ── src/pixi/
         ├── core/       app 初始化 / resize / stats
         ├── systems/    World / Camera(pixi-viewport) / Background / AABB / Debug
         ├── backgrounds/ Centerpiece 材质系统 + matcap + 调试面板 + preset
         └── bridges/    CameraBridge / PersonaBridge

数据层(无头运转,等待渲染层消费)
core/store/   Zustand + slices(progression/grimoire/cardState/config/personaStory)
              └─ persist(partialize 白名单) → Dexie/IndexedDB
core/         pipelines(senseToCard) / services / registries / protocol(MessageBus)
modules/      construction / item / level / library / persona / review / sedimentation

AI 后端
supabase/functions/  generate-grimoire / evaluate-grimoire / …
                     _shared/personas/(CHILD/GARDENER/ALCHEMIST 字典)
                     lib/(⚠️ 与 src/core/services 强制重复,同步改)

规则挂载点(改铁律三处同步): CLAUDE.md / AGENTS.md / .agents/rules/
```

常用命令:`npm run dev` / `npm run type-check` / `npm run assets`(资产管线)。

## §5 黑话词汇表

> 间歇性开发最先忘的是自己发明的名词;所有文档都用它们写成。

### 游戏名词

| 词 | 含义 |
|---|---|
| **Sense** | 义项——意义的原子单位,不是"单词"。一个 Sense 挂多语言词壳 |
| **Shell / 词壳** | 某语言下 Sense 的具体词形(`shells[lang]`) |
| **合成 Synthesis** | 两卡投入阵法 → AI 判定 → 新 Sense 或失败(失败无惩罚) |
| **Grimoire / 魔典** | Persona 生成的主题收集任务:3–6 个无标签槽位 + 1 小时时限 |
| **Summoner** | 画布装置,魔典生成的唯一入口(投入种子卡 + 60 体力) |
| **种子 Seed** | 驱动魔典主题方向的那张 Sense 卡,生成后弹回画布 |
| **Archetype / GrimoireType** | 魔典的 8 种语义方向(taxonomy/anatomy/locus/script/spectrum/qualia/ritual/metaphor) |
| **validationTags** | AI 生成的 10 个隐藏标准答案,玩家不可见,供评判锚点与 Echo 抽词 |
| **personaQuest** | 魔典的叙事场景文本(= `theme.description`),受 voice+form 双力塑造 |
| **fCount** | 累计 F 评级次数,拉低总评 |
| **Echo · 发现 / 回放** | 发现:从隐藏答案抽新词卡;回放:雾遮旧答案凭记忆指认(=复习仪式,GDD §8.5.2) |
| **Resonance** | Persona 专属 XP,无上限;里程碑兑现"关系质感"(ADR-008) |
| **Persona** | CHILD / GARDENER / ALCHEMIST 三人格:生成之声 + 评判之偏 + 视觉氛围 |
| **evalBias** | Persona 的评判偏好;**不亮牌**,只提示存在(作者定案) |
| **第二意见** | 花体力请另一位 Persona 重判(GDD §4.7,占位) |
| **Mastery / Streak** | 向下延递的评级计数器(高评级带动低档全 +1,S 系带倍率) |
| **体力 Stamina** | 300 上限,12.5/时恢复;节奏阀兼 AI 成本阀 |
| **记忆模型** | stability + lastRetrievalAt 两字段,R=exp(-Δt/S);取代耐久度(ADR-007,未实施) |
| **风化态** | R 长期过低的卡褪成剪影沉入档案,可唤醒——取代"归零删除" |
| **新颖度经济** | 重复合成组合返回缓存且零奖励,首次组合全额——防刷不误伤探索 |
| **记忆透镜** | 按键切换的全局记忆热力视图(滤镜,不动卡片位置) |
| **TRANSCREATE** | 双语文本原则:system 版是母语者视角再创作,不是翻译 |

### 技术与流程黑话

| 词 | 含义 |
|---|---|
| **Stage A–O** | Pixi 重构路线图阶段(roadmap.md);当前 E 尾声,F=卡片=关键路径 |
| **铁律** | CLAUDE.md 五条项目宪法;改动需三处挂载点同步 |
| **双份真相** | 本项目反复踩的病根:同一事实存在两份可变副本(ADR-005 / strategic-command §3.2) |
| **位置属于玩家,外观属于系统** | 画布设计律:系统永不自动移动卡片,记忆状态只改外观(ADR-007 §4) |
| **Centerpiece** | 画布背景中央装置(材质系统宿主,ADR-006) |
| **matcap / HRBA** | 材质捕捉贴图 / Height-Roughness-Bloom-Alpha 通道打包(Assets-guide §6) |
| **preset** | 调试面板导出的参数 JSON——"AI 写管线,人拖滑块"的产物,是美术资产 |
| **partialize** | Zustand persist 的持久化白名单(store/index.ts:305) |
| **MessageBus** | `core/protocol/` 的事件总线,模块间解耦通道 |
| **DoD** | Definition of Done——视觉类 Stage 必须先定完成标准再动手(防兔子洞) |
