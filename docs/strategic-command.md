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
- `react-dnd` / `react-dnd-html5-backend` **仍在 package.json dependencies**,且仍被 7 个孤儿文件 import。roadmap 声称"彻底移除"——未兑现。
- `src/tests/` 有 4 个 `node:test` 测试文件,但 package.json **没有 test script**,无人运行,等同于死代码。
- docs 根目录约 28 份 React UI 时代的存量文档,大部分失实。

### 1.4 基础设施

- Git 远程:GitHub `evangl2/lexicoin`,备份链路存在。
- 玩家数据持久化在本地 IndexedDB(Dexie),Supabase 主要承担 AI Edge Function 代理。**本地浏览器数据是单点**——清浏览器数据即丢档(是否需要云存档/导出,是产品决策,挂起待议)。
- `supabase/functions/lib/` 与 `src/core/services/` 存在强制性代码重复(Deno 约束),改一处必须同步另一处。

## 2. 接下来的工作安排(次序,无时间节点)

> 原则:每个 Stage 单独开规划对话;每步先定"完成标准(DoD)"再动手。

1. **收口当前工作**:matcap/材质未提交改动 commit(含 ADR-006、INDEX 同步,新文件登记)。挂着 1000+ 行不提交是纯粹的风险敞口。
2. **Stage E 封版**:与作者商定 DoD——例如"N 个 persona preset 导出齐、调试面板功能冻结、roadmap 状态更新"。到线即封,后续微调只动 preset JSON 不动代码。
3. **GDD 偏差重新盘点**(短任务):对 §1.2 末尾的"疑似残留"逐项实勘,产出一份**新清单**替换 2026-04 的旧清单,然后按价值排序消化。不要按旧清单直接开工。
4. **Stage F:卡片 Sprite**——关键路径,游戏"重新可玩"的第一步。设计要点提前锁定:
   - 坐标真相源唯一:**store 持有逻辑坐标,Pixi 只读渲染**,不允许 Pixi 侧持有第二份可变位置状态(拖拽中的临时位移除外,落定即回写);
   - 剔除与 LOD 从第一天就进设计(多语言词库卡片量级可达千张),不要等 Stage L 再补;
   - 占位色块先行,真实视觉留给 Stage K。
5. **Stage G–J:交互链**(hover / 文字层 / 检视 / 拖拽 / 落点)。每段接入时核对文字分层铁律(Pixi Text vs DOM 覆盖层)。
6. **Stage K–M:视觉阶段**——兔子洞重灾区(见预警 §3.1),严格执行"先滑块面板、后调效果"。
7. **Stage N:UI 回归**:Dock/Library/DeckRepository 重新接入。旧组件**只当参考实现,不直接复活**——它们携带 react-dnd 和旧坐标语义。
8. **Stage O:清尸**:删除 90 个断链组件、从 package.json 移除 react-dnd 系依赖、处置死测试(修活或删除)、批量归档失实存量文档。

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

### 3.6 无测试防护网

数据层(store/pipeline)正被 Pixi 重构持续消费,却没有任何可运行的回归测试。渲染不必测,但**纯逻辑层值得最低限度防护**:加一条 `"test": "node --test src/tests/"` 类 script,把 4 个死测试修活,新增 store 关键 action(体力、魔典生命周期、持久化白名单)的测试。成本低,在大规模接入期(Stage F–N)回报高。

### 3.7 上游 AI 模型漂移

生成/评审质量与 Gemini 模型及 prompt 深度耦合(`activeModelId` 可配置是好设计)。上游模型下线或静默升级会让评分尺度漂移而无人察觉。**建议:留一组 golden sample(固定种子词 + 期望输出特征),模型变更后人工跑一遍对比。**

### 3.8 WGSL-only 是记账中的债务

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

进度数据只存本地 IndexedDB。开发期可接受,但**上到真实用户前必须有答案**:导出存档按钮(最低成本)或 Supabase 云同步(完整方案)。此为产品决策,记账于此以防遗忘。

### 4.4 性能预算前置

多语言词库意味着卡片实体可能上千。Pixi 的性能特性决定:**culling、纹理复用、LOD 必须是 Stage F 的设计输入,而不是 Stage L 的优化补丁**。事后补 culling 通常意味着重写场景图组织。

### 4.5 文档减负:一次性归档优于逐份核对

28 份 React UI 时代存量文档,逐份"读前核对状态"的成本已超过其剩余价值。建议专门做一次处置:数据层类(约 10 份)核对后保留,其余整批移入 archive 并在 INDEX 除名。文档越少,"现行"二字越可信。

### 4.6 协作模式本身是资产

"AI 写管线 + 人拖滑块 + preset JSON 沉淀"已被 Centerpiece 系统验证有效。它的产物(preset JSON、调试面板)是**可复用的美术资产与工具**,不是临时脚手架——Stage K 卡片视觉、Stage M 设备视觉应直接复用同一套面板/preset 基建,而不是另起炉灶。

### 4.7 提交纪律

本项目单人开发,git 是唯一的时间机器。经验规则:**一个工作包一个 commit,当天工作当天收口**;超过 500 行未提交改动即视为红灯。commit message 用内容摘要而非日期(近期 `20260703` 式消息在回溯时几乎无信息量)。
