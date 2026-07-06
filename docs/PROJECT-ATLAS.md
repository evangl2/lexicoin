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
| **Totem 管线**(卡片视觉资产;原名"GenUI"已废) | AI 为新 Sense 生成动画视觉资产;异步生成 + **轮询回填**(合成后 ~25s 自动 poll 一次 + 手动 poll 60s 冷却×3;Supabase Realtime 已禁用,`RealtimeService` 是空壳存根——2026-07-06 核实) | ✅ 旧合同运行中,📋 新合同已定案 | 合同改造已定案([ADR-009](decisions/ADR-009-totem-asset-contract.md)):TSX 可执行代码 → 分层 SVG + 动画清单,Pixi/GSAP 解释执行;实施主体在 Stage K;现行 TSX 机制(sucrase 运行时编译)在迁移前继续服役 | [ADR-009](decisions/ADR-009-totem-asset-contract.md);`genui-architecture.md` 等旧文档描述旧合同 | `supabase/functions/generate-visual`、`VisualRegistry`、`useVisualPoll`、`DynamicVisual.tsx`(旧) |
| Grimoire 魔典 | AI 生成收集任务,任务驱动辅助线 | ✅ 数据层 | 渲染未接。**2026-07-06 残余偏差盘点完毕**:评分算法/fCount/过期路径/归档领奖拆分全部达标;**唯一存活偏差 = Resonance 双轨**(store 轨无里程碑,魔典奖励绕过 PersonaModule 里程碑),修复并入 ADR-008 实施包。倒计时 UI 归 Stage F/M,归档领奖 UI 分流归 Stage N | [GDD](grimoire/GDD_Grimoire.md)(2026-07 修订);记忆 `project_gdd_recheck.md` | `useGrimoireSummoning/Interaction/Expiry/Reward.ts`、`createGrimoireSlice.ts` |
| Persona | 真实人物感:生成之声、评判之偏、关系之忆 | ✅ 骨架 | 方向已定未实施:关系记忆/里程碑兑现/preset 绑定/第二意见 | [ADR-008](decisions/ADR-008-persona-direction.md);GDD §4 | `supabase/functions/_shared/personas/`、`src/modules/persona/` |
| 体力 | 节奏阀 + AI 成本阀 | ✅ | 时间戳恢复完整(登录补算 + 5min interval) | GDD §3 | `src/core/store/index.ts` `recoverStamina` |
| 评分/奖励/Mastery | 正反馈优先的评级与向下延递计数 | ✅ | **2026-07-06 核实:与 GDD §7 完全一致**(数值化/F 惩罚/阈值/向下延递全对齐) | GDD §7;`grimoireConfig.ts` | `useGrimoireInteraction.ts:129`、`createProgressionSlice.ts:81` |
| 记忆模型(遗忘曲线) | stability/R 取代耐久度,遗忘可见化 | 📋 | 全部待实施;现行代码仍是旧耐久度(合成扣减/归零删卡) | [ADR-007](decisions/ADR-007-memory-model-and-review.md);[DurabilityLifecycle.md](DurabilityLifecycle.md)(已重写为目标规格) | 现行:`src/core/services/DurabilitySystem.ts` |
| 复习(三层) | 无形层/引力层/Echo 回放,不做独立复习模式 | 📋 | 全部待实施;依赖记忆模型先行 | ADR-007 §3;GDD §8.5.2 | `src/modules/review/`(现存实现单薄) |
| Library / Echo | 收藏满足感 + 旧魔典再利用 | ✅ 数据层部分 | Echo·回放(新)未实施;归档/领奖流程与 GDD 一致性待盘点 | GDD §8 | `createGrimoireSlice.ts`、`src/modules/library/` |
| 沉淀 Sedimentation | 社区验证 AI 内容(赞踩/stability/首发现者) | 💤 | 骨架休眠;是未来内容经济的命脉,schema 决策别堵死它 | strategic-command §4(4.6 关联) | `src/modules/sedimentation/` |
| Construction 构式 | LEXEME→NARRATIVE 四层语法习得 | 💤 冻结 | 2026-07-06 作者确认冻结:零投入、不删;解冻条件 = 词层循环被留存数据验证后以"句法炼金"重启 | [design-blueprints](design-blueprints-2026-07.md) §4.2 | `src/modules/construction/` |
| Inflection 屈折 | 词形变化双轨:不规则 AI 生成 key_forms + 规则前端引擎实时算 | ✅ 方案完整,部分实施 | **[InflectionSystem.md](InflectionSystem.md) 是完整现行方案**(英语引擎已实现);剩余=其"待集成"三项;⚠️ 其 UserSenseProgress(含 SRS)与记忆模型有双真相风险,已定 stability 为准 | [InflectionSystem.md](InflectionSystem.md);蓝图 §4.1 | `src/schemas/inflection/` |
| Progression 等级/XP | 按语言分轨等级,**难度爬升唯一指标**(驱动 targetLevel/CEFR),**向玩家展示**(星等徽记+升级仪式) | ✅ 数据层 | 2026-07-06 作者定案转正;等级将解锁 Persona(GDD §4.6)及更多(待定);XP 曲线待入经济总账 | 蓝图 §4.4;`docs/LevelingSystem.md`(存量较可信) | `src/core/services/`、`src/modules/level/` |
| Item 道具 | **奖励载体 + 玩家修改底层数据的接口 + 可生成新卡**(作者 2026-07-06 定义) | ✅ 骨架,📋 框架已设计 | 三品类(资源/词术/仪式);词性转化走 wordFamily+derive-sense;第二意见券=GDD §4.7 落地形态;交互=从道具袋拖到目标;品类数值表待经济总账专项 | 蓝图 §4.3 | `src/modules/item/` |

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
- **通信可靠性件**(2026-07-06 核实,无名但设计良好):`synthesis_requests` 幂等表(client 生成 request_id 防重复投递,10min 过期,RLS 仅 service_role)+ `MAX_CONCURRENT_SYNTHESES=3` 并发控制 + `useResumeProcessing` 中断恢复。⚠️ 幂等只覆盖 synthesize-sense,**grimoire 两个调用没有 request_id**
- **Story Triggers 地基**:evaluate-grimoire 返回 `triggeredCondition`,personaStory 结局 tag 机制的后端已埋,前端 counter 未实现(GDD §9.3 已标注)
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
| 内容安全层 | AI 生成文本直接展示给玩家,无内容过滤;旧 Totem 合同还**运行 AI 生成的代码**(prompt 注入 → 恶意组件) | 🟡 代码执行部分随 [ADR-009](decisions/ADR-009-totem-asset-contract.md) 迁移自动消灭;文本过滤仍待议 | strategic-command §3.8 |
| ~~CI / 提交门槛~~ | ~~无自动化~~ **已解决(2026-07-05)**:`.github/workflows/ci.yml` 跑 type-check + lint | ✅ | — |
| 部署漂移核查 | Edge Functions 手动 CLI 部署、无流水线——**云端实际运行的代码可能不是仓库里的**;DB 实际 schema vs 仅 1 份 migration 同理。这是未知风险最大的栖息地 | 🟡 下次动后端前先 `supabase functions list` / `db diff` 核对 | 2026-07-06 盘点 |
| 数据迁移系统 | Dexie/store schema 升级路径无人拥有——记忆模型加字段那天,老玩家的 IndexedDB 怎么升级?每次 schema 变更都会撞上 | 🟡 记忆模型实施(schema 首改)前必须回答 | ADR-007 实施依赖 |
| 时间语义 | 每日 Echo 重置用 `toISOString`(UTC)vs 玩家本地时区;体力时间戳;无人拥有"游戏里的一天从几点开始" | 🟢 小,但要有主 | `moduleInit.ts:50` |
| 经济总账 | XP 表/体力/奖励倍率/记忆参数散落各 config,无人守恒全局经济;数值调平没有单一视图 | 🟢 数值成熟期再做 | — |
| 前端错误遥测 | 玩家端崩溃/异常无上报,真实用户期是盲飞 | 🟡 公开部署 checklist 项 | — |
| 法务件 | LICENSE、隐私说明、AI 生成内容标注义务 | 🟢 公开部署 checklist 项 | — |

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
| **Totem / Totem 管线** | AI 为每个 Sense 生成的动画视觉资产及其生成管线(原名"GenUI"已废,该名误导);新合同=分层 SVG + 动画清单(ADR-009) |
| **边界三律** | 渲染分工法(ADR-010):世界归 Pixi 屏幕归 DOM / DOM 永不逐帧跟随世界物体 / 两界只在指定关口互通 |
| **交互宪法** | ADR-011:拖拽=动词、点击=阅读;四层结构(世界/檐口/仪式/透镜);五原则;**词卡不设仓库** |
| **搜索透镜** | 无仓库方案的找卡配套(ADR-011):键入片段 → 匹配卡片发光、相机飞行定位。搜索≠存储,卡不离开位置 |
| **动画清单** | Totem 新合同的 JSON 数据:每个 SVG 层的补间描述(props 关键帧/duration/repeat/ease/stagger),由 Pixi/GSAP 解释执行 |

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
