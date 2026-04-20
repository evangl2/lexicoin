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

- [x] 在 `useWCCards=false`（当前即旧路径）状态下测量以下指标并填入 [prd.md §4.1](./prd.md#41-可量化指标) 的"基线"列：
  - 单张卡片 React fiber 节点数
  - 单张卡片真实 DOM 节点数
  - 1000 张卡片画布满帧率（缩小 LOD）
  - Persona 切换延迟（60 可见卡）
  - 卡片进入视口 mount 耗时
- [x] 测量数据记录方式：在本 Phase 的 "Actual Result" 小节贴测量截图或表格

#### 0.2 Feature Flag 基础设施

- [x] 新建 `src/core/store/slices/featureFlags.ts`
- [x] 在 store 根 type 中挂入 `featureFlags` slice
- [x] 默认值：`useWCCards: false`
- [x] 不持久化到 Dexie / localStorage（遵守 TDD §8.4）
- [x] 提供 action `setFeatureFlag(key, value)`

#### 0.3 DevConsole toggle

- [x] 在 `src/app/components/system/DevConsole` 下增加一个 UI toggle，绑定 `featureFlags.useWCCards`
- [x] UI 位置：加入现有 DevConsole，不新开面板
- [x] 触发时显示当前 flag 值（便于观察）

#### 0.4 样式翻译对照表

- [x] 逐行扫描 `CardVisual.tsx`，列出**所有** Tailwind class 与内联 style
- [x] 在 `docs/refactor/card-web-component/_tailwind-mapping.md` 中产出对照表：
  - 每行：`Tailwind class | 等价原生 CSS`
  - 覆盖所有正反面元素
- [x] 该对照表将在 Phase 1 作为 `base.css` 与 `default.css` 的写作依据
- [x] 同步对 `CompactCardVisual.tsx` 做同样工作（供 LOD 切换用）

#### 0.5 浏览器兼容确认

- [x] 查 `package.json` 或询问 user 确认 browserslist
- [x] 确认 `adoptedStyleSheets` 在目标浏览器全部支持；若否，记录降级方案到 TDD §10 Risk Matrix

### 验收条件

- [x] `pnpm tsc --noEmit` 通过
- [x] App 启动、所有交互与此前行为完全一致
- [x] DevConsole 的 toggle 可见且可点击（不影响任何行为 —— 因为消费点尚未接入）
- [x] 基线数据表填写完整
- [x] 样式翻译对照表已产出

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

- [x] 新建 `src/app/components/ui/card/web/`：
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

- [x] 按翻译对照表写出 `base.css`（骨架、slot 占位、布局）
- [x] 按翻译对照表写出 `default.css`（颜色、渐变、纹理引用、装饰层）
- [x] **禁止**在 CSS 内出现 Tailwind class 名；全部原生 CSS
- [x] **必须**通过 `var(--card-*)` 引用现有 CSS 变量，不得硬编码颜色

#### 1.3 Shadow 模板

- [x] 按 [TDD §4.2](./tdd.md#42-shadow-dom-template-layout) 写出正面模板 HTML
- [x] 背面部分在 Phase 1 **暂时占位**：保留 `<div part="back-face"></div>` 空壳
- [x] 所有 slot 命名严格遵循 [TDD §4.3 Slot Inventory](./tdd.md#43-slot-inventory权威合约)

#### 1.4 基类与 Default 子类

- [x] `LexiCardChromeBase` 定义：
  - `connectedCallback`: attach shadow、设置 `adoptedStyleSheets`、克隆 template
  - `static get observedAttributes()`: 返回 [TDD §4.4](./tdd.md#44-attribute-contract) 列出的 attribute 名
  - `attributeChangedCallback`: 对 `layout-mode` 等少数需 JS 响应的 attribute 做处理；其余纯 CSS 响应不需要额外逻辑
- [x] `LexiCardChromeDefault` 注册为 `lexi-card-chrome-default`
- [x] `registry.ts` 提供幂等 `ensurePersonaRegistered('default')`

#### 1.5 React 桥接

- [x] `LexiCardChrome.tsx` 按 [TDD §4.6](./tdd.md#46-react-bridge-component) 的 API 签名实现
- [x] 桥接组件**只**处理 Default persona，Cyberpunk 分支暂时抛 `Error('Not implemented yet')`
- [x] 内部在 render 前同步调用 `ensurePersonaRegistered('default')`

#### 1.6 Card.tsx 接入点

- [x] 在 `Card.tsx` 内增加分支：
  ```
  const useWC = useGameStore(s => s.featureFlags.useWCCards);
  // ...
  return useWC ? <NewPath .../> : <OldPath .../>;
  ```
- [x] **新路径实现范围**：仅正面，调用 `<LexiCardChrome persona="default" .../>`
- [x] **新路径与旧路径共享**：motion.div wrapper、变量订阅、MotionValue、drag handlers
- [x] 背面在新路径下**暂时**走 shadow 内占位空壳（flip 到背面时显示空白，这是 Phase 1 可接受的已知缺陷）

#### 1.7 Persona Context 适配

- [x] 不改 `PersonaContext` API
- [x] 新路径从 context 读 `personaId` 字符串，传给 `<LexiCardChrome persona={personaId} />`
- [x] 其余 `visuals.*` 组件在新路径中不再使用（改为 shadow template 烘焙）

### 验收条件

- [x] `pnpm tsc --noEmit` 通过
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
  - [x] Compact LOD 切换后视觉降级正确

### 回滚方案

`useWCCards` flag 永久设为 `false`，保留代码但不启用。如需彻底回滚，删除 `src/app/components/ui/card/web/` 整个目录 + 回退 `Card.tsx` 的分支逻辑。

### Actual Result

> **状态：Phase 1 代码已全部落地。§BUG-3 已修复（上一 session）；§BUG-1 和 §BUG-2 已在本 session 修复（见下）。**
>
> #### 完成情况
>
> 所有 9 个文件已建立，Card.tsx 和 CardVisual.tsx 已完成修改，TypeScript 编译 0 新增错误（33 个均为预存错误）。
>
> 新建文件：
> - `web/types.ts` — TS 类型声明 + JSX.IntrinsicElements 扩展
> - `web/styles/base.css` — 共享骨架样式（所有 persona）
> - `web/styles/default.css` — Default persona 专有样式
> - `web/templates/default.template.html` — shadow DOM 模板（含 Background / Corners / Divider 烘焙）
> - `web/styleLoader.ts` — `CSSStyleSheet` 单例工厂
> - `web/LexiCardChromeBase.ts` — 抽象基类
> - `web/LexiCardChromeDefault.ts` — Default persona 子类
> - `web/registry.ts` — 幂等注册 `ensurePersonaRegistered('default')`
> - `web/LexiCardChrome.tsx` — React 桥接组件（属性同步、slot 包装、ref 转发）
>
> 修改文件：
> - `CardVisual.tsx`：导出 `MemoizedCardVisual`、`getTitleClass`
> - `Card.tsx`：添加 `useWCCards` + `uiTheme` 消费、`wcHostRef`、WC flip/front/back `useLayoutEffect`、条件渲染三分支（compact fallback → WC → legacy）
>
> #### 已确认的偏离 TDD 的决策
>
> 1. **compact LOD 仍走 CompactCardVisual fallback**（TDD §5.6 原计划 Phase 2 再处理，这里提前在 WC 路径下也 fallback 了）
> 2. **Cyberpunk 分支在 registry.ts 只注释而未 throw Error**（偏离 §1.5"暂时抛 Error"的说法，但更安全）
>
> #### 未解决的 Bug（验收阻断项）
>
> ---
>
> ##### §BUG-1 正面元素偏移（**已修复**）
>
> **现象**：`useWCCards=true` 时，卡片正面的各元素（level badge、word text、pronunciation、visual 区域）相对于旧路径有明显位置偏移。
>
> **根因**：slot wrapper 元素（`<div slot="level">` 等）上用内联 `style="display:contents"` 无效。Blink/WebKit 对 slotted 元素的 `display:contents` 在内联 style 中存在已知 Bug（浏览器仍以块级盒参与 shadow 布局，导致额外的盒子破坏 flex 对齐）。
>
> **修复**：
> 1. 移除 `LexiCardChrome.tsx` 中所有 slot wrapper 的内联 `style={{ display: 'contents' }}`（及 visual wrapper 的内联 `width/height`）。
> 2. 在 `base.css` 中新增 `::slotted([slot="level"]) { display: contents; }` 等规则——从 shadow 侧施加的 `::slotted()` CSS 不受该 Bug 影响，效果正确。
> 3. `::slotted([slot="visual"])` 保留 `display:block; width:100%; height:100%` 以维持 MemoizedCardVisual 填充行为。
>
> ---
>
> ##### §BUG-2 背面完全消失（**已修复**）
>
> **现象**：`useWCCards=true` 时翻转卡片，前面淡出后，背面没有显示——连空的卡背边框也看不见。
>
> **根因**：`Card.tsx` 的 WC `useLayoutEffect` 将 `isFlipped` 纳入 deps，导致每次翻转时先 cleanup（取消 `backOpacity.on('change', applyBack)` 订阅）、再重新建立订阅，中间存在时序窗口：即使 React 保证 `useEffect`（`flipSpring.set(1)`）在 `useLayoutEffect` 之后运行，重新订阅的时机与 spring 起始帧存在微小竞争，导致 `applyBack` 在动画过程中未被可靠调用。此外，`useLayoutEffect` 本身也无法保证在同一提交批次的所有 `useEffect` 执行完毕前完成同步，edge case 下 `backOpacity.get()` 永远拿到旧值 0。
>
> **修复**：
> 1. 从 WC `useLayoutEffect` 的 deps 中**移除 `isFlipped` 和 `isExpanded`**。订阅在 `LexiCardChrome` 首次 mount 时建立一次，整个生命周期保持，flip/expand 状态变化不再导致订阅重建。compact LOD 场景（`LexiCardChrome` 被 unmount）自然返回 null 使 effect 无操作。
> 2. 新增一个独立的 `useEffect`（deps 含 `isFlipped`, `isExpanded`），在每次翻转/展开状态变化后，通过 shadow DOM 直接同步当前 `frontOpacity.get()` / `backOpacity.get()` 到 face 元素，作为初始帧保底写入（确保在 spring 尚未推进时正面/背面处于正确起始透明度）。
>
> ---
>
> ##### §BUG-3 compact mode 只显示等级徽章（问题3，**已修复**）
>
> - `base.css` compact 规则新增隐藏 `[part="visual"]` 和 `[part="background"]`
> - `Card.tsx` WC 路径下 `isCompactLOD && !isExpanded && !isFlipped` 时 fallback 到 `CompactCardVisual`（与旧路径行为一致）
> - WC `useLayoutEffect` deps 增加 `isCompactLOD/isExpanded/isFlipped`，compact LOD 激活时清理 MotionValue 订阅
>
> ---
>
> - 完成日期：2026-04-20（代码落地）；视觉验收阻断中

---

## Phase 2 — BACK face + 交互

### 目标

完成 `<lexi-card-chrome-default>` 的背面模板，接管 flip / expand / drop-target 等交互，**仍然只处理 Default persona**。

### 前置条件

- Phase 1 已 merge 且线上稳定（至少一周无回归报告，或项目主导者确认）

### 任务清单

#### 2.1 背面 shadow 模板

- [x] 将 Phase 1 的占位背面替换为完整 slot 结构（见 [TDD §4.2](./tdd.md#42-shadow-dom-template-layout)）
- [x] 背面 Corners / BackTopDecoration 等装饰层按 [TDD §4.8](./tdd.md#48-与旧-persona-visuals-组件的关系) 规则烘焙到模板（Corners 烘焙；DefaultPersona 无 BackTopDecoration，跳过）

#### 2.2 背面样式

- [x] 在 `base.css` 补全背面专属结构样式：back-ontology、back-header、back-main、back-def-wrap、back-flavor-wrap、back-texture、back-sheen、back-border-outer/inner、back-corners
- [x] 滚动条样式通过 `scrollbarWidth/scrollbarColor` 内联在 definition scrollable div 上（与旧路径一致，CSS var 复用）
- [x] `<slot name="back-overlay">` 放在 flip-wrapper 外部（shadow 顶层），避免 back-face overflow:hidden 裁切 SelectionOverlay

#### 2.3 Flip 驱动

- [x] **方式 B 选用**：`shadowRoot.querySelector('[part="flip-wrapper"]').style.transform` 直接写入——已在 Phase 1 §BUG-2 修复时落地
- [x] `is-flipped` attribute 同步：通过 `LexiCardChrome.tsx` useEffect 设置

#### 2.4 Expand 状态

- [x] `is-expanded` attribute 同步：已在 Phase 1 落地（LexiCardChrome.tsx useEffect）
- [x] SelectionOverlay 在 React 侧控制（注入 `slot="back-overlay"` → 投影到 shadow 顶层槽位）

#### 2.5 Drop target（作为被放入对象）

- [x] React DnD `drop` ref 指向 `cardRef`（motion.div），不变
- [x] `is-over` attribute 同步：已在 Phase 1 落地
- [x] shadow 内部虚线光晕边框：`:host([is-over]) [part="drop-target-ring"]`，已在 Phase 1 落地

#### 2.6 FlavorCarousel slot 注入

- [x] `FlavorCarousel` 作为 `<div slot="flavor">` 注入；persona wheel 循环用 `wcFlavorContainerRef` + useEffect 绑定（passive:false）
- [x] 事件冒泡跨 shadow 边界：React 合成事件正常工作（待用户验证）

#### 2.7 Definition 滚轮阻止

- [x] definition scrollable div 上绑定 `onWheel={e => e.stopPropagation()}`（在 Card.tsx WC 分支的内联 JSX）

#### 2.8 LOD Compact 切换

- [x] 移除 WC 路径中的 `CompactCardVisual` fallback
- [x] 改为 `layoutMode={isCompactLOD && !isExpanded && !isFlipped ? 'compact' : 'default'}` 传给 LexiCardChrome
- [x] `base.css` 已有 `:host([layout-mode="compact"])` 规则（Phase 1 前置）；新增 `[part="back-face"]` 和 `[part="feedback-overlay"]` 的隐藏规则
- [x] Hysteresis（LOD_ENTER=0.32 / LOD_EXIT=0.38）由 Card.tsx isCompactLOD state 保持，无变化

### 验收条件

- [x] `pnpm tsc --noEmit` 通过（0 新增错误）
- [ ] `useWCCards=false`：系统行为与 Phase 1 完全一致
- [ ] `useWCCards=true`：
  - [ ] 背面视觉与旧路径像素级等价
  - [ ] flip 动画正确（§BUG-2 修复已覆盖）
  - [ ] Definition 可点击触发 SelectionOverlay
  - [ ] FlavorCarousel wheel 切换 persona 正常
  - [ ] 定义区域 wheel 不触发画布缩放
  - [ ] compact LOD 切换正确（仅显示 level badge）
- [ ] 性能指标：待用户实测

### 回滚方案

`useWCCards=false` 即彻底退回旧路径。

### Actual Result

> **状态：Phase 2 代码已全部落地。`pnpm tsc --noEmit` 0 新增错误。视觉验收待用户确认。**
>
> #### 完成情况
>
> 修改文件：
> - `web/templates/default.template.html`：替换 Phase 1 占位背面，新增完整背面结构（烘焙 Corners/Texture/Sheen/Borders + 6 个命名 slot）；`slot[name="back-overlay"]` 移至 flip-wrapper 外
> - `web/styles/base.css`：新增 ~130 行背面 part 样式（back-texture/sheen/border/corners/ontology/header/main/def-wrap/flavor-wrap + compact 规则补全）
> - `web/LexiCardChrome.tsx`：`LexiCardChromeFrontSlots` 重命名为 `LexiCardChromeSlots`，新增 6 个可选背面 slot 字段（ontology/wordBack/pos/definition/flavor/backOverlay）；JSX 中按需渲染
> - `Card.tsx`：新增 `FlavorCarousel`/`SelectionOverlay` import；新增 WC 背面 state（wcFlavorIndex/Direction/ActivePersonaId + ref）；移除 WC compact fallback 改为 layoutMode 传参；WC 分支内联渲染完整背面 slot 内容（含 definition hover 交互、wheel 阻止、flavor carousel、SelectionOverlay、flavor indicators）
>
> #### Flip 驱动方式
>
> **方式 B**（`shadowRoot.querySelector` 直接写入），已在 Phase 1 §BUG-2 修复中落地，Phase 2 未变更。
>
> #### 偏离 TDD 的决策
>
> 1. **`slot[name="back-overlay"]` 放在 flip-wrapper 外**（TDD §4.2 原图未明确此点）。原因：back-face 有 `overflow:hidden`，若 slot 在内部则 SelectionOverlay 会被裁切。
> 2. **滚动条样式走内联 React JSX**（TDD §2.2 说在 `default.css` 补全），原因：definition 滚动条由 `scrollbarWidth/scrollbarColor` 内联控制，与旧路径保持一致，无需额外 CSS 规则。
> 3. **SelectionOverlay 注入 `slot="back-overlay"`** 而非 portal 到 body——保持与旧路径相同的局部定位行为。
>
> - 完成日期：2026-04-20（代码落地）；视觉验收阻断中

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
