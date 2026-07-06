# 设计蓝图包(2026-07)

> 状态: 现行 · 类型: 设计 · 更新: 2026-07-06
> 📖 人话: ② 象限全部待办的设计定稿(只设计,未实施)。作者 2026-07-06 全权委托 Claude 设计;裁决型条目(模块生死/等级可见性)作者保留否决权,否决即当场修订本文。实施时按章节引用,每章可独立开工。

---

## §1 Stage F 三件套

### 1.1 坐标契约

三个坐标空间,职责一次定死:

| 空间 | 定义 | 谁持有 |
|---|---|---|
| **screen** | CSS 像素,画布元素左上为原点 | DOM 事件、檐口层 |
| **world** | pixi-viewport 世界坐标(px) | **store 的唯一真相**:卡片/装置坐标一律存 world |
| **cell** | 网格坐标(GRID_CELL_W/H) | 仅 AABB/吸附计算的中间态,**永不持久化** |

规则:

1. **store 存 world 坐标(number, px)**,不存 cell——自由摆放是记忆宫殿需求,吸附只是辅助;吸附发生在**写入时**(落子瞬间换算),不在渲染时;
2. 换算函数全项目唯一来源:`src/pixi/coords.ts`——`toWorld(screenPt)` / `toScreen(worldPt)` / `snapToGrid(worldPt)`。DOM 侧(关口桥)需要换算时 import 同一模块,禁止第二处实现;
3. Pixi 只读渲染 store 坐标;拖拽中的位移是 Pixi 局部暂存,pointerup 落定即回写 store(单向数据流);
4. 持久化分工:store 为运行时真相,Dexie `canvasPositions` 为持久化影子,字段 `{senseUid, x, y, zIndex?, regionId?}`;相机位置(canvasView)与卡片坐标互不相干;
5. **玩家摆放的位置是神圣数据**(ADR-007):系统唯一允许写位置的时机 = 玩家拖拽落定、新卡诞生初始摆放、风化卡唤醒回原位。

### 1.2 跨界拖入桥(ADR-010 律三·关口一)

统一走 Pointer Events(**不用** HTML5 Drag&Drop API:惯性差、样式受限、无触屏),天然兼容触屏。

```
DOM 侧 pointerdown(可拖元素) → setPointerCapture → 生成 DOM 幽灵(跟随光标,pointer-events:none)
  → pointermove 检测是否进入画布 rect
      → 进入:隐藏 DOM 幽灵,发 BRIDGE_DRAG_ENTER{type,id} → Pixi 显示落点预览
        (幽灵 Sprite + 网格高亮 + AABB 冲突检测,冲突处标红)
      → 离开:反向切换(同一时刻只有一个视觉体)
  → pointerup 在画布内:toWorld(光标) → 校验(AABB) → store action(placeDevice/placeCard)
                                                   → Pixi 从 store 渲染(桥不直接改场景)
  → pointerup 在画布外 / ESC:幽灵飞回原位(取消动画)
```

已知使用方:Dock 装置拖入(Summoner/合成阵)、检视态卡片拖回画布。桥是唯一合法跨界通道,新用途登记进 ADR-010。

### 1.3 搜索透镜(ADR-011 无仓库的必要配套)

- **呼出**:快捷键 `/`(或 Ctrl+F)+ 檐口小放大镜图标;
- **索引**:本地内存 Map(标准化词形 → senseUid),启动时从 store 构建,SENSE_CREATED 增量维护;v1 只索引**词形**(全语言 shells),不索引释义;
- **匹配**:前缀 + 模糊(Levenshtein ≤ 2)——拼错也能找到,结果里显示正确拼写。**搜索框本身就是拼写检索练习**,这是隐形学习的白送机会;
- **呈现**:匹配卡在画布上发光、其余压暗 20%;檐口下方浮出结果列表(DOM,屏幕固定,合法);Enter/点击 → 相机 GSAP 飞行至卡片 + pulse;多匹配 Enter 循环;
- **范围**:v1 只查画布活卡;风化档案的检索归 Library 词汇总览(将来);
- **退出**:ESC 复原一切。透镜是视图不是模式(ADR-011)。

## §2 记忆模型实施设计(ADR-007 落地)+ 数据迁移立法

### 2.1 Schema 与迁移(顺手回答 ATLAS 缺口"数据迁移系统")

**迁移立法(从此适用于一切 schema 变更)**:

1. Dexie:每次表结构变更 = `db.version(N+1).stores({...}).upgrade(tx=>...)`,**永不修改历史 version 定义**;
2. Zustand persist:启用自带 `version` + `migrate`,同样只增不改;
3. `ExportImportService` 的 `schemaVersion` 同步 bump,import 时复用同一条 migrate 链;
4. 迁移函数写成**纯函数**放 utils,`node --test` 可测(CI 不能开浏览器)。

本次变更:`CardInventoryRecord` 增 `stability:number`(单位≈天)、`lastRetrievalAt:number`;存量卡初始化 `stability=3, lastRetrievalAt=迁移时刻`——温和起步,不惩罚老玩家。

**⚠️ 双真相排查(实施前必做)**:屈折方案遗留的 `UserSenseProgress.schema.ts` 含 SRS 概念字段——与本记忆模型只能有一个真相源。定稿:**stability/lastRetrievalAt 为准**,UserSenseProgress 中重叠字段废弃或做只读映射,处置结果记回 [InflectionSystem.md](InflectionSystem.md) §八。

### 2.2 计算与更新

- `retention(stability, lastRetrievalAt, now) → R∈[0,1]`,纯函数,惰性求值,无定时器;
- 更新:成功 `S′ = S × (1 + k·q·(1−R))`,k 初值 1.0;失败(F)`S′ = S × 0.7`;
- 质量 q:魔典评级 A/S 系=1.0、B=0.7、C=0.4;Echo 回放命中=1.0;合成使用=0.2 且**每卡每日封顶一次**(记 `lastGainDate`);被动曝光=0(红线);
- **合成出已持有的词 = 检索事件 q=0.5**——原 `restoreOnDuplicate`(恢复耐久)语义升格为"重逢即复习",主题完美衔接;
- 全部参数进 `balance.ts`,DevConsole cheat 页加 Memory 区可调(铁律一精神:参数不写死)。

### 2.3 风化与渲染接口

- R < 0.05 连续 7 天 → 风化态:置 dormant 标记、从画布 despawn(**位置字段保留**,唤醒回原位)、入档案;
- 渲染接口(Stage F/K 消费):卡片视觉接收 `memoryState: { r, stage: 'fresh'|'fading'|'weathered' }`,由 Totem 渲染器调制动画强度(ADR-009 §4);
- 新颖度经济:`SynthesisResult.cached === true` → 不发奖励,实施点在 useSynthesis 结果处理;
- `DurabilitySystem` 退役映射:`consumeOnSynthesis` → 删除;`restoreOnDuplicate` → 改发记忆检索事件。

## §3 ADR-008 实施包(Persona 关系系统)

### 3.1 Resonance 统一(修复最后一个存活偏差)

- 里程碑逻辑并入 `store.updateResonance`:跨越阈值 → `messageBus.send('RESONANCE_MILESTONE', {personaId, milestone})`;
- 阈值曲线(取代旧"每 500"等距):**500 / 1500 / 3500 / 7000**(间距递增,XP 轨道惯例),对应 personaStory 阶段推进映射表;
- `PersonaModule.resonance` 字段与其里程碑逻辑删除,模块只订阅消息做副作用;`personaResonance` 确认在 partialize 白名单(铁律六收尾问句)。

### 3.2 关系记忆("Persona 记得你")

- store 新增 `personaMemory: Record<PersonaType, PersonaMemoryEvent[]>`,环形缓冲,每 Persona 上限 20 条,进 partialize;
- 事件类型:`FIRST_MEET`、`FIRST_S_PLUS_PLUS{word}`、`COMEBACK{afterFCount}`(连 F 后翻盘)、`MILESTONE{n}`、`FAVORITE_WORD{word}`(周期计算);
- 写入点:claimGrimoireReward(成绩类)、evaluate 结果处理(翻盘检测);
- 注入:generate-grimoire body 增 `personaMemory: string[]`(前端渲染成英文短句),**最多 3 条**(token 预算),选择策略 = 最近 1 条 + 随机 2 条(允许重提旧事,角色显得长情);后端插入 ROLE 段 "Shared history with this player: …"。

### 3.3 Story Triggers 前端接线(地基已埋,见 GDD §9.3)

evaluate 返回 `triggeredCondition` → `personaStoryCounters[personaId][triggerId]++`(store,持久化)→ 阈值表(前端配置)→ 触发 personaStory 阶段事件/结局 tag。与 3.1 的里程碑双轨并行:里程碑管"关系深度",trigger 管"剧情分支"。

### 3.4 Persona ↔ preset 绑定

配置映射 `PersonaType → presetName`(依赖 Stage E 封版的三个 preset);PixiPersonaBridge 监听 activePersona → `BackgroundSystem.applyPreset()`。玩家手动锁定主题时(uiTheme 显式选择)绑定失效(ADR-008 主从可覆盖)。

第二意见机制维持占位(GDD §4.7),不在本包。

## §4 四个无名者的裁决(2026-07-06 作者修正后定稿)

### 4.1 Inflection 屈折 —— 活;既有方案为真相源

[docs/InflectionSystem.md](InflectionSystem.md) 是**完整的现行方案**(双轨:不规则变形 AI 生成存 `key_forms` trait + 静态字典,规则变形前端 InflectionEngine 实时算;英语引擎已完整实现;另含 wordFamily 词族结构)。裁决与其一致:**屈折形不是独立卡片,是 Sense 的数据面**。

剩余工作即该文档"待集成"三项:① SensePrompt 增加 traits/wordFamily 生成指令;② 形变表 UI(归 Stage H 检视态);③ `UserSenseProgress` 存储层——**⚠️ 该 schema 含 SRS 概念,与记忆模型(ADR-007/本文 §2)是潜在双真相,实施 §2 时必须合并设计:二者只能有一个记忆真相源**(建议:stability/lastRetrievalAt 为准,UserSenseProgress 中重叠字段废弃或映射)。

### 4.2 Construction 构式 —— 冻结(作者确认)

模块与 store 挂钩原样保留,零投入。**解冻条件**:记忆模型上线且留存数据证明词层循环成立后,以"句法炼金"大版本重启(魔典 script archetype 为入口试验田)。屈折方案 §九的"量词/敬语/动词体"等排除项届时一并归入。

### 4.3 Item 道具 —— 活,转正为核心系统(作者定义,框架如下)

作者定义:**道具是给玩家的奖励;道具是玩家修改底层数据的接口;道具能创造新卡片**。据此立设计框架:

**三大品类**:

| 品类 | 作用对象 | 例 |
|---|---|---|
| **资源类** | 底层数值 | 体力药剂(+60)、经验结晶(+XP)——奖励发放的通用载体 |
| **词术类** | 卡片(可生成新卡) | **词性转化**(用于 V 卡 → 后端生成对应 N 词卡);记忆琥珀(冻结一张卡的衰减 7 天)、醒神香(唤醒风化卡)——原"记忆道具"席位并入此类 |
| **仪式类** | 游戏流程 | 延时沙漏(魔典 +30min)、**第二意见券**(请另一位 Persona 重判——GDD §4.7 的落地形态!)、Echo 加次券 |

**交互语法**(严格遵守 ADR-011"拖拽=动词"):道具使用 = **从道具袋拖到目标上**——药剂拖到坩埚、词性道具拖到卡片、沙漏拖到魔典。无菜单、无"使用"按钮。

**词性转化管线**:对卡施用 → 先查 `wordFamily.derivations`(屈折方案已有此结构!有现成派生词则直接生成卡)→ 无则调后端 `derive-sense {senseUid, targetPos}`(新 Edge Function,遵守 ADR-012 契约)→ 新卡诞生在原卡旁。道具本身即成本,不再扣体力。

**获取渠道**:魔典高评级掉落(S 系)、**Persona 里程碑赠礼**(关系记忆的物质化:"GARDENER 送你一颗琥珀",与 §3 打通)、成就。

**归属**:ItemModule + inventory slice **保留并转正**(撤销原清除名单项);道具袋挂檐口(见 §6 修订);品类明细与数值表待经济总账专项,本框架先行。

### 4.4 等级/XP —— 活,转正为 Progression 系统,**向玩家展示**(作者定案)

- 等级是**游戏难度爬升的唯一指标**(驱动 targetLevel/CEFR),按语言分轨;
- **展示设计**:檐口 Persona 龛位下方一枚**星等徽记**(当前学习语言的等级数字,常态只显数字);hover 展开 XP 进度与各语言分轨详情;**升级时刻做微仪式**(Centerpiece 呼应 + Persona 祝贺 + 徽记进阶动画)——升级是可庆祝事件,不是静默数字;
- **等级决定的其它内容**(作者预留,现成候选):GDD §4.6 的 Persona 等级解锁(CHILD Lv.5 / GARDENER Lv.7 / ALCHEMIST Lv.40)本来就是第一个实例;后续候选:装置解锁、道具品类解锁、魔典 archetype 解锁——待作者定;
- LevelDistributionSampler/XPRegistry 保留;XP 曲线纳入经济总账单一视图;收集统计放 Library。

## §5 部署护栏双件套(公开部署 checklist 的设计稿)

### 5.1 服务端配额

- **层 1(一石二鸟)**:所有 Edge Functions `verify_jwt = true` + 前端 **Supabase 匿名登录**(`signInAnonymously`,每设备一个 uid,零注册摩擦)——同时为云存档/Sedimentation/firstDiscoverer 铺好身份地基,回答了"账户系统时机"的一半;
- **层 2**:`quotas` 表 `{user_id, day, synth_count, grimoire_count, visual_count}`,Edge Function 开头原子自增 + 上限检查;上限 = 体力经济理论最大消耗 × 1.5(正常玩家永远撞不到,只拦脚本);
- **层 3(可选后续)**:每 uid 分钟级速率桶。v1 用层 1+2;
- 失败语义:429 → 前端以 Persona 口吻呈现("今天炼得够多了,让炉子歇歇")。

### 5.2 内容安全

- 输入侧:玩家无自由文本输入(词都来自卡片选择)——攻击面天然极小,保持这个性质,**任何新功能引入自由文本输入都需安全评审**;
- 输出侧:Gemini safety settings 显式配置(BLOCK_MEDIUM_AND_ABOVE)+ responseSchema 强制 + 字段长度上限;
- Totem(ADR-009 后为纯数据):渲染器解析 SVG 时**白名单标签**,禁 `<script>/<foreignObject>/href`——写进 Totem 渲染器规格。

## §6 檐口具象设计(四角布局,中央永远留给世界)

| 位置 | 元素 | 设计 |
|---|---|---|
| 左下 | **体力 = 坩埚炉火** | 火焰高度/亮度 = 体力比例;消耗时一缕火苗被吸入目标装置(动画连接消费与来源);耗尽时炉膛只剩余烬,hover 显示"X 分钟后可再次召唤";数字默认不显示(hover 才见 137/300);恢复时偶尔迸一颗火星 |
| 右上 | **Persona 龛位** | 小画框,Persona 剪影呼吸式微动(复用 Totem 动画清单);说话时画框亮起、台词气泡由此展开(通知人格化的锚点);AI 调用进行中她低头翻书/转身(等待演出的一部分);点击 = 打开 Persona 面板(切换/Resonance/故事阶段——点击=阅读,合法) |
| 右上·龛位下方 | **等级星等徽记**(§4.4) | 常态只显当前学习语言的等级数字;hover 展开 XP 进度与语言分轨;升级时徽记进阶动画 + Centerpiece 呼应 + Persona 祝贺 |
| 左上 | **Library 入口 = 书堆** | 有未领取奖励时透出微光 |
| 左下·坩埚旁 | **道具袋**(§4.3) | 小袋/小匣,点击展开道具栏(点击=阅读,合法);道具**拖出**到目标使用(拖拽=动词);获得新道具时袋口微动 |
| 右下 | **设置 = 极小齿轮** | 无状态,永远安静 |

全部 DOM 屏幕固定层;单元素尺寸预算 ≤ 96px;檐口上没有任务列表/常驻进度条(等级徽记常态只显数字,进度 hover 才见——庆祝成长但不制造焦虑)。

## §7 新手引导叙事脚本(v1 · CHILD 开场)

**载体设计**:store 增 `onboardingStage`;CHILD 新手期台词**全部预写本地**,不调 AI——**前十分钟零 AI 依赖**,第一印象不被延迟破坏。无遮罩、无箭头、无"下一步"按钮;每步触发条件 = 玩家真实行为;什么都不做也能玩(提示轮换不堆积)。

| # | 触发 | 事件 |
|---|---|---|
| 0 | 首次进入 | 画布仅有 Centerpiece + 3 张初始卡 + 合成阵。CHILD 现身龛位:"你也能看见这些词吗?……试试把两个放进那个圈。" |
| 1 | 玩家拖两卡入阵 | 首次合成。**设计关键:3 张初始卡的全部组合预生成入库——首次合成零延迟、必定成功**(10 秒等待从第二次才开始;预缓存首合成豁免"cached 无奖励"规则) |
| 2 | 新词诞生 | 爆闪 + 发音。CHILD:"它以前不存在的!再来!" |
| 3 | 第二次合成后 | Summoner 浮现(装置引入即事件)。CHILD:"把一个词给它,它会讲故事。"→ 首本魔典(长等待,CHILD 提示可以先玩别的) |
| 4 | 首次评判返回 | 评语即教程。若有 F:CHILD 兴奋而非遗憾——"哦!它不喜欢这个——为什么呢?"(正反馈优先) |
| 5 | 首本 RESOLVED | 归档指引 → Library 微光 → 领奖 → "书还记得一些词"(Echo 介绍) |

初始三卡选择标准:可组合性最强、视觉反差大、CEFR=A1(如 fire / water / tree 一类),由 INITIAL_SENSES 审计后定。

## §8 Golden Sample 方案(简)

`scripts/golden/`:每 Persona × 每上线语言 3 个固定种子词;脚本顺序调 generate-grimoire + evaluate-grimoire(固定填词集),输出 markdown 快照入库。模型/prompt 任何变更后重跑,人工 diff 审阅。与模型迁移(OpenRouter/GA 版)配套:**先建基线再切模型**,否则漂移无从归因。

## §9 实施次序建议(全部就绪后)

```
Stage E 封版(作者) ──┐
ADR-012 四小活 ──────┼─→ Stage F(§1 三件套 + 记忆渲染接口)
§2 记忆模型(数据层,可并行) ─┘
§3 Persona 包(数据层,可并行)
§5/§8 随部署临近逐项启用;§6/§7 归 Stage G/N 实施
```
