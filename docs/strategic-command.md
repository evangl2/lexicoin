# 战略指挥简报(Strategic Command Briefing)

> 状态: 现行 · 类型: 战略 · 更新: 2026-07-05
> 📖 人话: 项目的"指挥棒"文档——接下来做什么、哪里有坑、后继 AI 如何接班。由 Claude Fable 5 于 2026-07-05 基于**代码实勘**(刻意不信任存量文档)写成。

## 0. 本文档的使用方法(先读这段)

- 本文的事实部分标注了核实日期 **2026-07-05**。距今越久,可信度越低——本项目实测:81 天前的"待修复清单"8 项中 6 项已失实。
- **元规则:任何清单(包括本文)在动手前必须先对代码重新实勘。** 文档和 AI 记忆只负责指路,代码是唯一真相源。
- 本文的"工作安排"是**次序**不是排期,刻意不设时间节点;"预警"部分长期有效,失效需显式划掉。
- 修订本文属于方向性变更,应经项目作者确认。

## 1. 战场态势(2026-07-05 实勘)

### 1.1 渲染层:Stage E 尾声,Stage F 未动

- 入口链:`src/main.tsx → src/App.tsx`(挂 DevConsole)`→ src/app/App.tsx`(仅挂 `PixiPersonaBridge` + `PixiRoot`)。旧 React 游戏 UI 已从运行时切断,符合 roadmap 隔离原则。
- `src/pixi/` 共 20 个文件:core(app/resize/stats)、systems(World/Background/Camera/AABB/Debug)、backgrounds(Centerpiece 材质系统 + matcap)、bridges(Camera/Persona)。**没有任何卡片渲染代码**——游戏当前"不可玩",只有背景。
- Centerpiece 材质系统已迭代到 ADR-006 v4(matcap/tonemap/线性工作流),工作区尚有 1000+ 行未提交改动。

### 1.2 数据层:比旧清单记载的健康得多

以下项经代码核实**已修复**(旧记忆/文档若与此矛盾,以此为准;若代码又变,以代码为准):

| 项 | 现状证据 |
|---|---|
| 体力退费 `regenerateStamina` | `createProgressionSlice.ts` 已定义 |
| 体力自然恢复 | 时间戳法已实现:`store/index.ts` `recoverStamina` + `moduleInit.ts` 登录补算 + 5 分钟 interval |
| `activeGrimoires` 持久化 | `store/index.ts` partialize 白名单已含 |
| S++/S+ 评级 | `evaluate-grimoire/index.ts` schema 已是 8 级 |
| Persona 阵容 | 已改为 CHILD/GARDENER/ALCHEMIST,且身份解析移到后端字典(`supabase/functions/_shared/personas/`),前端只传 personaId——旧的"传参 Bug"整个架构性消除 |
| evalBias | 已接入 evaluate-grimoire prompt |
| `activeSkin → uiTheme` 重命名 | 已完成 |
| summonerStatus | `useGrimoireSummoning.ts` 已调用 `setSummonerStatus` |

**仍未核实、动手前需重新盘点的疑似残留**(源自 2026-04 GDD 审查,本次未逐一验证):评分算法与 GDD §7.3 的映射、fCount 多槽计数、归档与领奖流程拆分、魔典过期路径(倒计时 UI / 到期弹回 / 实时检查)、Resonance 双轨与里程碑归属。

### 1.3 死资产盘点

- `src/app/components/` 共 **90 个文件**,除 DevConsole 外基本断链(等 Stage N 参考、Stage O 清除)。
- `react-dnd` / `react-dnd-html5-backend` **仍在 package.json dependencies**,且仍被 7 个孤儿文件 import。roadmap 声称"彻底移除"——未兑现(roadmap 已于 2026-07-05 修正表述)。
- `src/tests/` 有 4 个 `node:test` 测试文件,但 package.json **没有 test script**,无人运行,等同于死代码。
- docs 根目录约 28 份 React UI 时代的存量文档,大部分失实。
- 2026-07-06 前后端盘点追加:
  - **APIClient 幽灵**(`src/core/infra/APIClient.ts` + `src/types/api.ts` 全套请求类型 + `api_security.test.ts`)——为一个**从未建成的传统后端**(localhost:3000,排行榜/用户同步/分析上报)写的完整客户端,除自身与死测试外零引用。Stage O 清除;
  - `RealtimeService` 是**空壳存根**(Realtime 已禁用,visual 走轮询),文件头注释已如实声明,但外围文档曾误信其存在——引用它前先看实现;
- 2026-07-05 存在性审计追加:
  - `docs/prompts/*.txt` — INDEX 原称"运行时依赖",实际 **src 零引用**(运行时 prompt 在 Edge Functions 内),历史底稿,归档候选;
  - `src/types/index.ts` 的 `ModelId` 类型 — 僵尸类型:枚举的三个模型(gemini-2.0/1.5 系)**全部已退役**,且 config slice 实际用 `string` + `DEFAULT_MODEL_ID`,该类型仅剩 2 处自引用;
  - ~~`npm run lint` — 从未能跑~~ **已修复(2026-07-05)**:新增 `eslint.config.js`(flat config,typescript-eslint + react-hooks + react-refresh),`npm run lint` 现在真正可运行;修复过程顺手抓到一个**真实运行时 bug**——`WorldSystem.updateSize()` 用 `require()` 拿 `cameraSystem` 后又调用 `.getInstance()`,但 `cameraSystem` 导出的已经是单例实例而非类,该方法一旦被调用会直接 `TypeError`(此前从未被任何代码调用过,是个埋伏雷,已改为静态 import + 直接调用);当前遗留 **145 条历史未用变量/导入警告**(未清,记为已知 baseline,`package.json` 已去掉 `--max-warnings 0` 使脚本先可用;后续清理时机自定);
  - 好消息:`npx tsc --noEmit` **零错误通过**(2026-07-05),"usePhysics 有大量 TS 错误"的旧记忆已失实,build 链健康。

### 1.4 基础设施

- Git 远程:GitHub `evangl2/lexicoin`,备份链路存在。
- 玩家数据持久化在本地 IndexedDB(Dexie),Supabase 主要承担 AI Edge Function 代理。**本地浏览器数据是单点**——清浏览器数据即丢档(是否需要云存档/导出,是产品决策,挂起待议)。
- `supabase/functions/lib/` 与 `src/core/services/` 存在强制性代码重复(Deno 约束),改一处必须同步另一处。

## 2. 接下来的工作安排(次序,无时间节点)

> 原则:每个 Stage 单独开规划对话;每步先定"完成标准(DoD)"再动手。

1. **收口当前工作**:matcap/材质未提交改动 commit(含 ADR-006、INDEX 同步,新文件登记)。挂着 1000+ 行不提交是纯粹的风险敞口。
2. **Stage E 封版**:与作者商定 DoD——例如"N 个 persona preset 导出齐、调试面板功能冻结、roadmap 状态更新"。到线即封,后续微调只动 preset JSON 不动代码。
3. **GDD 偏差重新盘点**(短任务):对 §1.2 末尾的"疑似残留"逐项实勘,产出一份**新清单**替换 2026-04 的旧清单,然后按价值排序消化。不要按旧清单直接开工。
4. **记忆模型与新颖度经济**([ADR-007](decisions/ADR-007-memory-model-and-review.md),2026-07-05 定案):纯数据层工作,可与渲染重构并行——卡片 schema 增 stability/lastRetrievalAt 两字段、检索事件挂钩、合成奖励接 cached 判断、DurabilitySystem 退役、评语预算倒挂进 prompt 规格;Echo 回放与 Persona 关系记忆([ADR-008](decisions/ADR-008-persona-direction.md))随 Stage N 前后接入。
5. **Stage F:卡片 Sprite**——关键路径,游戏"重新可玩"的第一步。设计要点提前锁定:
   - 坐标真相源唯一:**store 持有逻辑坐标,Pixi 只读渲染**,不允许 Pixi 侧持有第二份可变位置状态(拖拽中的临时位移除外,落定即回写);
   - **玩家摆放的位置是神圣数据**(ADR-007 画布设计律:位置属于玩家,外观属于系统;记忆状态走卡片外观与透镜视图,永不自动移动卡片);
   - 剔除与 LOD 从第一天就进设计(多语言词库卡片量级可达千张),不要等 Stage L 再补;
   - 占位色块先行,真实视觉留给 Stage K。
6. **Stage G–J:交互链**(hover / 文字层 / 检视 / 拖拽 / 落点)。每段接入时核对文字分层铁律(Pixi Text vs DOM 覆盖层)。
7. **Stage K–M:视觉阶段**——兔子洞重灾区(见预警 §3.1),严格执行"先滑块面板、后调效果";卡片视觉需承载记忆褪色映射(ADR-007)。
8. **Stage N:UI 回归**:Dock/Library/DeckRepository 重新接入(含 Echo 回放,见 ADR-007)。旧组件**只当参考实现,不直接复活**——它们携带 react-dnd 和旧坐标语义。
9. **Stage O:清尸**:删除 90 个断链组件、从 package.json 移除 react-dnd 系依赖、处置死测试(修活或删除)、批量归档失实存量文档。

## 3. 前瞻性预警(坑雷图)

### 3.1 视觉兔子洞(已付出三个月学费)

Stage E 原定"Persona Bridge + 背景层",实际演化出材质模型家族四个版本。视觉打磨天然无终点。**对策:任何视觉 Stage 先写 DoD;Stage K(卡片视觉)、L(动画粒子)、M(设备双态)是下三个高危点。** 铁律一(AI 写管线、人拖滑块)是防线,不是效率损失。

### 3.2 "双份真相"是本项目反复踩的同一个坑

历史四案:高度/法线两次推理(ADR-005)、Resonance 内存/store 双轨、summonerStatus local state vs store、GrimoireBackend 死代码 vs Edge Function。**现役两个高危区:**

- `supabase/functions/lib` ↔ `src/core/services` 强制重复——改 prompt/服务逻辑必须两处同步,建议每次改动时 grep 确认另一份;
- **Pixi 桥接层将成为新的双真相高发区**:store 状态 vs Pixi 显示对象。规则:数据单向流动(store → Pixi),Pixi 事件只发 intent 回 store,不自持业务状态。

新系统设计时先回答一个问题:"这份数据的真相源是哪一份?第二份是否只是推导物?"

### 3.3 清单腐烂速度 > 更新速度

本次实勘证明 81 天前的偏差清单大面积失实。**任何 TODO/偏差/坑清单,使用前必须重新核实**;修复完成后当场删除或标记对应清单条目,不要留"半真"状态。

### 3.4 Stage F 的坐标系陷阱

三套坐标并存:screen(DOM 事件)、world(pixi-viewport)、store 逻辑坐标。旧 React 实现的坐标语义与 viewport 不一致。进入 Stage F 时**先写一页坐标契约**(哪个系统持哪套、换算函数放哪),再写第一个 Sprite。`docs/refactor-pixi/Coordinate-Systems.md` 可作起点,但按元规则先核对其是否仍与代码一致。

### 3.5 隔离原则正在松动

roadmap 说 react-dnd"彻底移除、误引用立刻 throw",实际依赖还在、孤儿文件还在 import——误引用不会报错而是**静默工作**,隔离靠的只是"没人 import",这比声称的防线弱。Stage O 前若有余力,可先把 react-dnd 从 dependencies 挪除(孤儿文件会 TS 报错,正好充当警报)。

### 3.6 无测试防护网,也无 CI 门槛

数据层(store/pipeline)正被 Pixi 重构持续消费,却没有任何可运行的回归测试。渲染不必测,但**纯逻辑层值得最低限度防护**:加一条 `"test": "node --test src/tests/"` 类 script,把 4 个死测试修活,新增 store 关键 action(体力、魔典生命周期、持久化白名单)的测试。成本低,在大规模接入期(Stage F–N)回报高。

更基础的缺口(2026-07-05 盘点):仓库没有 `.github`,没有任何自动化——**连 `tsc --noEmit` 都不挡提交**。测试已死 + 无 CI 等于完全裸奔。最低成本方案:一个只跑 type-check 的 GitHub Action,半小时能上线,建议排在测试修活之前(门槛先立起来,内容后补)。

### 3.7 上游 AI 模型漂移

生成/评审质量与 Gemini 模型及 prompt 深度耦合(`activeModelId` 可配置是好设计)。上游模型下线或静默升级会让评分尺度漂移而无人察觉。**建议:留一组 golden sample(固定种子词 + 期望输出特征),模型变更后人工跑一遍对比。**

2026-07-05 实锤:前后端默认模型都是 **`gemini-3.1-flash-lite-preview`**(`src/config/constants.ts:15`、`_shared/callAI.ts:57`)——**preview 版模型没有稳定性承诺,Google 可随时下线或变更行为**。整个产品的 AI 质量地基建在一个预览版上,应尽早迁到 GA 版模型,或至少把"默认模型是 preview"作为已知风险显式记账。

**重大修正(B6 决策后盘点)**:作者原打算"迁移到 OpenRouter + 设计应用内选模型系统"——盘点发现**两者都已经实现**,不是设计任务,是"重新接线"任务:
- `_shared/callAI.ts` 早已按 `gemini-` 前缀做双路由(Gemini SDK / OpenRouter REST 二选一),`AI_MODELS`(`src/config/constants.ts`)已列出 4 个 Gemini 模型 + 4 个标 `[OR]` 的 OpenRouter 免费模型;
- 应用内选模型的 UI 也已存在(`ConfigMenu.tsx` 的下拉选择器,读 `AI_MODELS`,调 `setActiveModelId`)——但 ConfigMenu 属于断链的旧 UI,玩家摸不到。**已于本次会话重新接入 DevConsole**(唯一现挂载面板)的 System 分页,恢复为可用功能;
- 新发现的双份真相:`generate-visual` 单独用了 `synthesize-sense/utils/callAI.ts`(与 `_shared/callAI.ts` 几乎相同但独立维护的副本),其余四个 Edge Function 都用 `_shared` 版本。两份目前功能等价,但没有机制保证不会走岔——建议让 `generate-visual` 改 import `_shared/callAI.ts`,删除本地副本;
- **preview 模型风险依然存在**且与 provider 无关:即使继续用 Gemini,`gemini-3.1-flash-lite-preview` 仍是 preview;golden sample(ADR-008)在切换任何模型/provider 前都应该建好。

### 3.8 Totem 管线(原"GenUI")与 Pixi 的冲突 —— ✅ 已决断,待实施

卡片视觉不是静态资产:AI 为每个新 Sense 生成 **TSX 组件**,前端用 sucrase 运行时编译执行(`DynamicVisual.tsx` / `VisualRegistry` / `generate-visual`)——与 Pixi 画布不兼容,且"运行 AI 生成的代码"是未设防的安全面。

**2026-07-05 作者定案([ADR-009](decisions/ADR-009-totem-asset-contract.md))**:系统更名 **Totem 管线**;合同改为"分层 SVG + 动画清单 JSON",Pixi/GSAP 解释执行;动画词汇表 v1 覆盖现行产物 100%(唯一损失是路径变形,个案走序列帧);存量 TSX 批量重新生成迁移;sucrase/dynamicComponentLoader 随迁移退役。实施主体在 Stage K,Stage F 的卡片数据结构按"视觉 = 纹理组 + 清单"设计。剩余风险仅在执行,不再在方向。

### 3.9 服务端没有任何成本护栏(真实资金风险)

体力系统是**纯客户端约束**,服务端不校验配额;`generate-visual` 还显式 `verify_jwt = false`(supabase/config.toml)。任何持有 anon key 的人都能绕过游戏直接刷 Edge Functions,烧的是真实的 Gemini 账单。开发期风险可接受,但**公开部署前必须补服务端限流**(per-user/per-IP 配额,或至少给所有函数开 verify_jwt + 服务端体力校验)。

### 3.10 挤占效应:这些东西的"存在"本身在压制其它可能(2026-07-05 审计)

不是 bug,而是**既成事实的引力**——每一项的存在都让某个更好的可能性难以出生:

- **调试面板的成熟度引力**:Centerpiece 面板是全项目最好的工具,于是背景成了被打磨最多的部分——工具在哪,精力就流向哪(工具律)。对策:Stage K/M 复用同一套面板基建,把引力导向关键路径,而不是等关键路径自己长出工具;
- **Totem 旧合同的 TSX 范式**曾压制贴图范式:"卡片视觉=React 组件"这个既成事实,是铁律二第 0 层(烘焙贴图)从未成为卡片视觉方案的原因——已由 ADR-009 决断破除(§3.8),留此条作为"既成事实压制正统方案"的标本;
- **旧 React UI 的"参考存在"**压制重新设计:Stage N 最大的风险不是忘记这 90 个文件,而是照抄它们——旧交互范式会借"参考"之名渗回新架构;
- **纯客户端体力**制造"成本已被控制"的幻觉,压制真正的服务端配额(§3.9)不被感到紧迫;
- **MessageBus 与 Zustand 双通道并存**:每个新功能都要选一次通道,summonerStatus 曾选错(local state)。双机制存在一天,"哪条是正道"就模糊一天。建议立一条约定:**状态归 store,跨模块通知归 MessageBus,任何业务事实不允许只活在消息里**;
- **本地无身份架构的迁移债在复利**:每个新的 local-only 功能都在加高未来账户系统的迁移成本;Sedimentation(firstDiscoverer)在身份存在之前物理上不可能;
- **partialize 白名单模式**保证"新状态默认不持久"这类 bug 会再发生(activeGrimoires 曾是受害者)。对策:新增 store 字段时,收尾清单默认问一句"进白名单吗"。

### 3.11 WGSL-only 是记账中的债务

每新增一个自研 shader/材质特性,移动端适配(GLSL 双后端)的债 +1。这是 ADR-004 的有意决策,不必现在还,但**做视觉决策时要意识到债务在涨**——matcap 与材质模型家族将来都要过移植关。

## 4. 其它有价值的方面

### 4.1 后继 AI 接班协议

给下一个接手本项目的 AI(无论型号)的最短路径:

1. 读 CLAUDE.md 五条铁律——它们是三个月实践淘出来的,**精神比条文重要**:视觉靠滑块不靠盲改数字;贴图优先于 shader;真相源唯一;长文本走 DOM;文档与代码同 commit。
2. 从入口链读代码:`main.tsx → App.tsx → app/App.tsx → PixiRoot → src/pixi/`,再看 `src/core/store/index.ts` 的 slice 组合与 partialize 白名单——一小时内可建立准确心智模型。
3. **不信任何清单**(含本文档的事实部分),动手前实勘。
4. 用户负责视觉验收,AI 不启动 preview、不自评"效果不错"。
5. 不得擅自推翻 ADR;修改 GDD 属设计决策,必须经作者确认。

### 4.2 依赖冻结策略

重构期(Stage F–N)**冻结所有大版本升级**:pixi.js 锁 8.x、react 锁 18.x、zustand 锁 5.x。渲染层重写与框架升级叠加会让 bug 无法归因。升级窗口放在 Stage O 之后。唯一的减法例外:react-dnd 系应尽早移除(见 §3.5)。

### 4.3 玩家数据安全

进度数据只存本地 IndexedDB。开发期可接受,但**上到真实用户前必须有答案**。修正(2026-07-05 盘点):全量导出/导入服务**已经存在**(`ExportImportService.ts`,含 Dexie 全表 + player state),缺的只是 UI 入口——原入口在断链的 ConfigMenu 里。最低成本方案从"写一个导出功能"降级为"Stage N 时给它一个新按钮";云同步仍是完整方案。

### 4.4 性能预算前置

多语言词库意味着卡片实体可能上千。Pixi 的性能特性决定:**culling、纹理复用、LOD 必须是 Stage F 的设计输入,而不是 Stage L 的优化补丁**。事后补 culling 通常意味着重写场景图组织。

### 4.5 文档减负:一次性归档优于逐份核对

28 份 React UI 时代存量文档,逐份"读前核对状态"的成本已超过其剩余价值。建议专门做一次处置:数据层类(约 10 份)核对后保留,其余整批移入 archive 并在 INDEX 除名。文档越少,"现行"二字越可信。

### 4.6 协作模式本身是资产

"AI 写管线 + 人拖滑块 + preset JSON 沉淀"已被 Centerpiece 系统验证有效。它的产物(preset JSON、调试面板)是**可复用的美术资产与工具**,不是临时脚手架——Stage K 卡片视觉、Stage M 设备视觉应直接复用同一套面板/preset 基建,而不是另起炉灶。

### 4.7 提交纪律

本项目单人开发,git 是唯一的时间机器。经验规则:**一个工作包一个 commit,当天工作当天收口**;超过 500 行未提交改动即视为红灯。commit message 用内容摘要而非日期(近期 `20260703` 式消息在回溯时几乎无信息量)。
