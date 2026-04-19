# 卡片 Web Component 化重构 — WBS

> **文档类型**：Work Breakdown Structure（任务拆分与阶段验收）
> **状态**：Draft（待评审）
> **配套文档**：[prd.md](./prd.md) · [tdd.md](./tdd.md)
> **最后更新**：2026-04-19

> **阅读须知**：本文档假设你已读过 [prd.md](./prd.md) 和 [tdd.md](./tdd.md)。本文档仅定义**阶段拆分、任务清单、验收条件、回滚方案**，不重复说明设计理由。

---

## 阶段总览

| Phase | 名称 | 目标 | 独立可 merge | 独立可回滚 |
|-------|------|------|:------------:|:----------:|
| 0 | Infrastructure | Feature flag 基础设施 + 基线测量 + 样式翻译表 | ✅ | ✅ |
| 1 | FRONT face WC | `<lexi-card-chrome-default>` 覆盖正面 | ✅ | ✅ |
| 2 | BACK face + 交互 | 背面、flip、expand、drag | ✅ | ✅ |
| 3 | Cyberpunk Persona | 第二个 persona WC 落地 | ✅ | ✅ |
| 4 | 清理 | 删除旧路径、移除 flag | ✅ | ⚠️（不可回滚到旧路径） |

---

## 通用约束（所有 Phase 适用）

- **禁止改动 Non-Goals 所列文件**（见 [prd.md §5](./prd.md#5-non-goalsexplicit-declaration)）
- **禁止**修改既有 CSS 变量名
- **禁止**修改 `cardData` / `CardEntity` 数据结构
- 每个 Phase 完成后必须更新本文档对应 Phase 的 **"Actual Result"** 小节记录实际数据
- 任何偏离 TDD 的设计决策必须**先更新 TDD，再执行**（不得隐式偏离）
- 遇到 TDD §11 的 Open Questions 未解决时，不得进入该问题涉及的 Phase

---

## Phase 0 — Infrastructure

### 目标

为后续阶段准备基础设施，**不引入任何 Web Component 代码**。本阶段完成后，系统行为与之前完全一致。

### 前置条件

- 已读完 PRD 与 TDD 全文
- 已解决 TDD §11 全部 Open Questions 并将答案写入 TDD 对应位置

### 任务清单

#### 0.1 基线测量

- [ ] 在 `useWCCards=false`（当前即旧路径）状态下测量以下指标并填入 [prd.md §4.1](./prd.md#41-可量化指标) 的"基线"列：
  - 单张卡片 React fiber 节点数
  - 单张卡片真实 DOM 节点数
  - 1000 张卡片画布满帧率（缩小 LOD）
  - Persona 切换延迟（60 可见卡）
  - 卡片进入视口 mount 耗时
- [ ] 测量数据记录方式：在本 Phase 的 "Actual Result" 小节贴测量截图或表格

#### 0.2 Feature Flag 基础设施

- [ ] 新建 `src/core/store/slices/featureFlags.ts`
- [ ] 在 store 根 type 中挂入 `featureFlags` slice
- [ ] 默认值：`useWCCards: false`
- [ ] 不持久化到 Dexie / localStorage（遵守 TDD §8.4）
- [ ] 提供 action `setFeatureFlag(key, value)`

#### 0.3 DevConsole toggle

- [ ] 在 `src/app/components/system/DevConsole` 下增加一个 UI toggle，绑定 `featureFlags.useWCCards`
- [ ] UI 位置：加入现有 DevConsole，不新开面板
- [ ] 触发时显示当前 flag 值（便于观察）

#### 0.4 样式翻译对照表

- [ ] 逐行扫描 `CardVisual.tsx`，列出**所有** Tailwind class 与内联 style
- [ ] 在 `docs/refactor/card-web-component/_tailwind-mapping.md` 中产出对照表：
  - 每行：`Tailwind class | 等价原生 CSS`
  - 覆盖所有正反面元素
- [ ] 该对照表将在 Phase 1 作为 `base.css` 与 `default.css` 的写作依据
- [ ] 同步对 `CompactCardVisual.tsx` 做同样工作（供 LOD 切换用）

#### 0.5 浏览器兼容确认

- [ ] 查 `package.json` 或询问 user 确认 browserslist
- [ ] 确认 `adoptedStyleSheets` 在目标浏览器全部支持；若否，记录降级方案到 TDD §10 Risk Matrix

### 验收条件

- [ ] `pnpm tsc --noEmit` 通过
- [ ] App 启动、所有交互与此前行为完全一致
- [ ] DevConsole 的 toggle 可见且可点击（不影响任何行为 —— 因为消费点尚未接入）
- [ ] 基线数据表填写完整
- [ ] 样式翻译对照表已产出

### 回滚方案

删除 Phase 0 引入的三个文件（slice + DevConsole 增量 + 样式表），revert store 根类型变更。无数据迁移风险。

### Actual Result

> - 基线数据表（已实测，记录于 PRD §4.1）：
>   - React fiber 节点数：**27**（含 `_c*` Framer 内部节点、memo、forwardRef 包装）
>   - 真实 DOM 节点数：**225**（`$0.querySelectorAll('*').length`，远超原估算 ~25-30）
>   - FPS / Persona 延迟 / mount 耗时：待用户测量
> - 样式翻译对照表路径：`docs/refactor/card-web-component/_tailwind-mapping.md`（已产出，含正反面全量 class）
> - Browserslist 目标：项目未配置，默认 Vite esnext；`adoptedStyleSheets` 无需 polyfill（Safari 16.4+）
> - 完成日期：2026-04-20
> - OQ 答案：全部记录于 TDD §11

---

## Phase 1 — FRONT face Web Component

### 目标

落地 `<lexi-card-chrome-default>` custom element，**仅**接管 Default Persona 的卡片**正面**静态 chrome。背面、拖拽、翻转、展开**保留旧实现**。由 `useWCCards` flag 控制切换。

### 前置条件

- Phase 0 全部完成并通过验收
- 样式翻译对照表已产出

### 任务清单

#### 1.1 目录骨架

- [ ] 新建 `src/app/components/ui/card/web/`：
  ```
  web/
  ├── styles/
  │   ├── base.css          ← 骨架样式（所有 persona 共享）
  │   └── default.css       ← Default persona 视觉样式
  ├── templates/
  │   └── default.template.html  ← Default persona 的 shadow 模板
  ├── LexiCardChromeBase.ts      ← 基类 custom element
  ├── LexiCardChromeDefault.ts   ← Default persona 子类
  ├── registry.ts                ← ensurePersonaRegistered()
  ├── styleLoader.ts             ← adoptedStyleSheets 构造逻辑
  ├── types.ts                   ← TS 类型声明
  └── LexiCardChrome.tsx         ← React 桥接组件
  ```

#### 1.2 样式层

- [ ] 按翻译对照表写出 `base.css`（骨架、slot 占位、布局）
- [ ] 按翻译对照表写出 `default.css`（颜色、渐变、纹理引用、装饰层）
- [ ] **禁止**在 CSS 内出现 Tailwind class 名；全部原生 CSS
- [ ] **必须**通过 `var(--card-*)` 引用现有 CSS 变量，不得硬编码颜色

#### 1.3 Shadow 模板

- [ ] 按 [TDD §4.2](./tdd.md#42-shadow-dom-template-layout) 写出正面模板 HTML
- [ ] 背面部分在 Phase 1 **暂时占位**：保留 `<div part="back-face"></div>` 空壳
- [ ] 所有 slot 命名严格遵循 [TDD §4.3 Slot Inventory](./tdd.md#43-slot-inventory权威合约)

#### 1.4 基类与 Default 子类

- [ ] `LexiCardChromeBase` 定义：
  - `connectedCallback`: attach shadow、设置 `adoptedStyleSheets`、克隆 template
  - `static get observedAttributes()`: 返回 [TDD §4.4](./tdd.md#44-attribute-contract) 列出的 attribute 名
  - `attributeChangedCallback`: 对 `layout-mode` 等少数需 JS 响应的 attribute 做处理；其余纯 CSS 响应不需要额外逻辑
- [ ] `LexiCardChromeDefault` 注册为 `lexi-card-chrome-default`
- [ ] `registry.ts` 提供幂等 `ensurePersonaRegistered('default')`

#### 1.5 React 桥接

- [ ] `LexiCardChrome.tsx` 按 [TDD §4.6](./tdd.md#46-react-bridge-component) 的 API 签名实现
- [ ] 桥接组件**只**处理 Default persona，Cyberpunk 分支暂时抛 `Error('Not implemented yet')`
- [ ] 内部在 render 前同步调用 `ensurePersonaRegistered('default')`

#### 1.6 Card.tsx 接入点

- [ ] 在 `Card.tsx` 内增加分支：
  ```
  const useWC = useGameStore(s => s.featureFlags.useWCCards);
  // ...
  return useWC ? <NewPath .../> : <OldPath .../>;
  ```
- [ ] **新路径实现范围**：仅正面，调用 `<LexiCardChrome persona="default" .../>`
- [ ] **新路径与旧路径共享**：motion.div wrapper、变量订阅、MotionValue、drag handlers
- [ ] 背面在新路径下**暂时**走 shadow 内占位空壳（flip 到背面时显示空白，这是 Phase 1 可接受的已知缺陷）

#### 1.7 Persona Context 适配

- [ ] 不改 `PersonaContext` API
- [ ] 新路径从 context 读 `personaId` 字符串，传给 `<LexiCardChrome persona={personaId} />`
- [ ] 其余 `visuals.*` 组件在新路径中不再使用（改为 shadow template 烘焙）

### 验收条件

- [ ] `pnpm tsc --noEmit` 通过
- [ ] `useWCCards=false`：系统行为与 Phase 0 完全一致（未触发新路径）
- [ ] `useWCCards=true`：
  - [ ] 卡片正面视觉与旧路径**像素级等价**（并排截图对比）
  - [ ] 单张卡片 React fiber 节点数从基线降到 ≤ 3
  - [ ] 单张卡片 light DOM 节点数 ≤ 5（shadow 内部节点不计）
  - [ ] Chrome DevTools 可以展开 `#shadow-root`
  - [ ] 正面 hover 光晕动画正常
  - [ ] 卡片位置跟随 Framer Motion 正常
  - [ ] 所有可见卡片的 `adoptedStyleSheets` 数组内是**同一份** `CSSStyleSheet` 对象引用（通过控制台 `document.querySelectorAll('lexi-card-chrome-default')[0].shadowRoot.adoptedStyleSheets[0] === document.querySelectorAll('lexi-card-chrome-default')[1].shadowRoot.adoptedStyleSheets[0]` 返回 `true`）
- [ ] 以下回归项（[prd.md §4.2](./prd.md#42-回归零容忍项)的子集，Phase 1 范围内可测的）全部通过：
  - [ ] 卡片从 Dock 拖到 Canvas
  - [ ] 卡片在 Canvas 上拖动
  - [ ] 卡片 hover 发光
  - [ ] TTS 朗读可触发（正面可触发的部分）
  - [ ] 视口裁剪正常
  - [ ] Compact LOD 切换后视觉降级正确

### 回滚方案

`useWCCards` flag 永久设为 `false`，保留代码但不启用。如需彻底回滚，删除 `src/app/components/ui/card/web/` 整个目录 + 回退 `Card.tsx` 的分支逻辑。

### Actual Result

> 执行者在完成后填写：
>
> - 新路径 DOM 节点数实测：
> - 像素对比截图链接：
> - 发现的偏离 TDD 的决策（应该已先回改 TDD）：
> - 完成日期：

---

## Phase 2 — BACK face + 交互

### 目标

完成 `<lexi-card-chrome-default>` 的背面模板，接管 flip / expand / drop-target 等交互，**仍然只处理 Default persona**。

### 前置条件

- Phase 1 已 merge 且线上稳定（至少一周无回归报告，或项目主导者确认）

### 任务清单

#### 2.1 背面 shadow 模板

- [ ] 将 Phase 1 的占位背面替换为完整 slot 结构（见 [TDD §4.2](./tdd.md#42-shadow-dom-template-layout)）
- [ ] 背面 Corners / BackTopDecoration 等装饰层按 [TDD §4.8](./tdd.md#48-与旧-persona-visuals-组件的关系) 规则烘焙到模板

#### 2.2 背面样式

- [ ] 在 `default.css` 补全背面专属样式：definition box、flavor box、ontology badge、背面渐变等
- [ ] 滚动条样式（`--card-color-scrollbar-thumb`）必须还原

#### 2.3 Flip 驱动

- [ ] `Card.tsx` 内现有 MotionValue 订阅（flipScaleX / frontOpacity / backOpacity）改为对 host 元素上的 shadow 内 `part` 写入
  - 方式 A：通过 CSS custom property（如 `--flip-scale-x`）+ shadow CSS 内部响应（**推荐**）
  - 方式 B：通过 `shadowRoot.querySelector('[part=flip-wrapper]').style.transform = ...`
  - 选择由执行者决定，在本节记录实际选择
- [ ] `is-flipped` attribute 同步设置（驱动 backfaceVisibility）

#### 2.4 Expand 状态

- [ ] `is-expanded` attribute 在 React 侧 state 变化时同步
- [ ] shadow 内部 CSS 响应（缩放、zIndex 提升等）
- [ ] SelectionOverlay 的显隐由 React 侧控制（不进入 shadow，继续作为 light DOM 组件 portal 到 body 或 parent）

#### 2.5 Drop target（作为被放入对象）

- [ ] React DnD 的 `drop` ref 指向 host 元素
- [ ] `is-over` attribute 同步
- [ ] shadow 内部虚线光晕边框由 CSS 响应 `:host([is-over])`

#### 2.6 FlavorCarousel slot 注入

- [ ] `FlavorCarousel` 组件继续在 React 侧渲染，作为 `<div slot="flavor">` 注入
- [ ] 验证 FlavorCarousel 内部 onClick / wheel / tts 触发正常（事件冒泡跨 shadow 边界正常）

#### 2.7 Definition 滚轮阻止

- [ ] 背面 definition-box 的 `onWheel={e => e.stopPropagation()}` 在 slot 内容的外层 React 节点上绑定
- [ ] 验证滚动不触发画布缩放

#### 2.8 LOD Compact 切换

- [ ] 移除 React 侧"切换到 `CompactCardVisual` 组件"的逻辑（在新路径下）
- [ ] 改为 `layout-mode` attribute 切换
- [ ] shadow CSS 通过 `:host([layout-mode="compact"])` 响应显隐
- [ ] 验证 hysteresis 仍生效（`LOD_ENTER=0.32`、`LOD_EXIT=0.38`）

### 验收条件

- [ ] `pnpm tsc --noEmit` 通过
- [ ] `useWCCards=true` 下 [prd.md §4.2](./prd.md#42-回归零容忍项) 全部回归项通过（除 Persona 切换 —— 留待 Phase 3）
- [ ] 像素级对比：正反面视觉等价
- [ ] 性能指标：
  - [ ] 1000 张卡片画布满帧率 ≥ 55 FPS
  - [ ] 卡片进入视口 mount 耗时 ≤ 2 ms
- [ ] Persona 切换仍走旧路径（因为 Cyberpunk WC 尚未落地，flag 控制只在 default persona 时启用；Phase 2 需在 `LexiCardChrome` 内对非 default persona fallback 到旧路径或保持错误抛出 —— 由执行者记录选择）

### 回滚方案

`useWCCards=false` 即彻底退回旧路径。

### Actual Result

> 执行者在完成后填写：
>
> - Flip 驱动方式（A 还是 B）：
> - 1000 卡 FPS 实测：
> - Mount 耗时实测：
> - 发现的偏离 TDD 的决策：
> - 完成日期：

---

## Phase 3 — Cyberpunk Persona

### 目标

落地 `<lexi-card-chrome-cyberpunk>`，完成 Persona family，Persona 运行时切换走新路径。

### 前置条件

- Phase 2 已 merge 且稳定

### 任务清单

#### 3.1 Cyberpunk 资源产出

- [ ] 按 Default 的流程产出 `cyberpunk.css` 与 `cyberpunk.template.html`
- [ ] 翻译对照表对 Cyberpunk 版本同样执行一遍（在 `_tailwind-mapping.md` 增补）

#### 3.2 子类注册

- [ ] 新建 `LexiCardChromeCyberpunk.ts`
- [ ] `registry.ts` 的 `ensurePersonaRegistered` 支持 `'cyberpunk'`
- [ ] `LexiCardChrome.tsx` 的桥接组件解除 Cyberpunk 的"Not implemented"错误

#### 3.3 Persona 切换路径

- [ ] `LexiCardChrome` 在 `persona` prop 变化时重新渲染为不同标签
- [ ] 验证：切换期间 Framer Motion 不断联（因为 ref 指向 wrapper motion.div）
- [ ] 验证：卡片位置无跳变、无闪烁
- [ ] 验证：expanded/flipped 状态在切换前后保持

#### 3.4 Persona 切换延迟测量

- [ ] 在 `Card.tsx` 新路径的 render 首尾打 `performance.mark`
- [ ] 在 60 可见卡场景下触发 Persona 切换
- [ ] 记录 total 延迟（首卡 start mark → 末卡 end mark）
- [ ] 目标 ≤ 50 ms

### 验收条件

- [ ] `pnpm tsc --noEmit` 通过
- [ ] `useWCCards=true` 下 [prd.md §4.2](./prd.md#42-回归零容忍项) **全部** 回归项通过（含 Persona 切换）
- [ ] Default ↔ Cyberpunk 切换视觉正确，两 persona 视觉互不污染
- [ ] Persona 切换延迟 ≤ 50 ms
- [ ] 两种 persona 下 `adoptedStyleSheets` 正确区分（Default 卡片 shadow 的 `adoptedStyleSheets[1]` 与 Cyberpunk 卡片 shadow 的 `adoptedStyleSheets[1]` 是不同对象）

### 回滚方案

`useWCCards=false` 退回旧路径。

### Actual Result

> 执行者在完成后填写：
>
> - Persona 切换延迟实测：
> - 发现的偏离 TDD 的决策：
> - 完成日期：

---

## Phase 4 — 清理

### 目标

确认新路径稳定后，**删除旧路径代码** + **移除 feature flag**。

### 前置条件

- Phase 3 已 merge
- 新路径在线上稳定至少两周（或项目主导者明确确认）
- [prd.md §4.1](./prd.md#41-可量化指标) 所有量化指标达成
- [prd.md §4.2](./prd.md#42-回归零容忍项) 所有回归项通过

### 任务清单

#### 4.1 删除旧路径

- [ ] `Card.tsx` 移除 `useWC` 分支，保留新路径
- [ ] 删除 `CardVisual.tsx`（旧）
- [ ] 删除 `CompactCardVisual.tsx`（旧）
- [ ] 删除 Persona `visuals.*` 中仅被旧路径使用的组件
- [ ] 删除 `CardPersonaVarsInjector` 中仅被旧路径使用的变量（若有）—— 先核查 shadow 内是否也用到同名变量
- [ ] `DragPreviewCard.tsx` 评估：若复用旧 CardVisual，需要同步迁移；否则可保持独立

#### 4.2 移除 Feature Flag

- [ ] 删除 `featureFlags.useWCCards` 字段
- [ ] 删除 DevConsole 的 toggle UI
- [ ] **保留** `featureFlags` slice 基础设施（为后续 flag 复用）
- [ ] 删除 `Card.tsx` 里的 `useGameStore(s => s.featureFlags.useWCCards)` 消费点

#### 4.3 文档归档

- [ ] 将本三份文档的 `状态` 字段改为 `Completed`
- [ ] 在 [docs/performance-optimizations.md](../../performance-optimizations.md) 追加本次优化的总结（一段话 + 指标对比）
- [ ] 在 [docs/refactor/backlog.md](../backlog.md) 中勾掉对应条目（若有）
- [ ] 更新 [docs/persona-system.md](../../persona-system.md)：记录 Persona 新的 WC 基础实现方式

#### 4.4 最终确认

- [ ] `pnpm tsc --noEmit` 通过
- [ ] 全量回归：[prd.md §4.2](./prd.md#42-回归零容忍项) 再次逐项过
- [ ] 生产构建体积对比（`pnpm build`），确认无异常膨胀

### 验收条件

- [ ] 旧路径代码全部删除
- [ ] `featureFlags.useWCCards` 完全移除
- [ ] 所有文档状态更新
- [ ] 全量回归通过

### 回滚方案

> ⚠️ **Phase 4 后无法简单回滚**：旧路径代码已删除。若发现严重问题，必须通过 `git revert` 回退该 merge commit，并重新开启 flag。因此 Phase 4 前必须**充分验证**新路径稳定性。

### Actual Result

> 执行者在完成后填写：
>
> - 删除的文件列表：
> - 构建体积对比：
> - 完成日期：

---

## Cross-phase Notes

### 测量工具约定

所有性能指标使用同一数据集（建议：1000 张预置卡片的开发环境 seed）。基线与对照在同一会话中测量，避免浏览器状态差异。

### 文档更新原则

- 若执行中发现 TDD 某项设计不可行，**先停下来更新 TDD**，说明新方案与原因；**然后**再执行。
- 不允许"代码已经这样写了所以文档这样说"的反向文档同步。
- 每个 Phase 的 "Actual Result" 是对执行者的强制要求，下一个 Phase 开始前必须填写前一阶段的实际数据。

### 进度跟踪

执行者在每次 session 开始/结束时，在项目的 `docs/refactor/sessions/` 下建立本次 session 的日志（沿用项目现有 session 记录习惯），记录：
- 本次 session 属于哪个 Phase
- 完成的任务项
- 遇到的问题与决策
- 下次继续的入口
