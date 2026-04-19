# 卡片 Web Component 化重构 — TDD

> **文档类型**：Technical Design Document
> **状态**：Draft（待评审）
> **配套文档**：[prd.md](./prd.md) · [wbs.md](./wbs.md)
> **最后更新**：2026-04-19

> **阅读须知**：本文档假设你已读过 [prd.md](./prd.md)。术语以 PRD §9 为准。本文档定义**怎么做**，不讨论**为什么做**（那是 PRD）与**什么时候做**（那是 WBS）。

---

## 1. Overview

本重构引入 Web Component 架构承载画布卡片的视觉模板，通过 Shadow DOM + `<slot>` + `adoptedStyleSheets` 实现"单模板 + 多实例"的 DOM 共享。每个 Persona 对应一个独立的 custom element 标签。

关键架构变化：
- **结构层**：从 `<Card><CardVisual>...<div>x50</div></CardVisual></Card>` 变为 `<lexi-card-chrome-{persona}><span slot="word">...</span>...</lexi-card-chrome-{persona}>`
- **样式层**：从 Tailwind class + 全局 CSS 变量变为 `adoptedStyleSheets` 共享的 scoped 样式 + 通过 shadow 边界穿透的 CSS 变量
- **Persona 切换**：从"同一套 DOM 换 CSS 变量"变为"换一个 custom element 标签"
- **动画层**：Framer Motion MotionValue 继续挂在 React 侧的 `motion.div` 上（host element），shadow 内部保持纯静态模板

---

## 2. Reference Documents

执行前必须阅读：
- [prd.md](./prd.md) — 目标与约束
- [docs/persona-system.md](../../persona-system.md) — Persona 现有架构
- [docs/file-structure-2026-03.md](../../file-structure-2026-03.md) — 文件布局约定

执行中可能需要查阅：
- `src/app/components/ui/card/Card.tsx` — 现有 Card 实现
- `src/app/components/ui/card/CardVisual.tsx` — 现有视觉层
- `src/app/components/ui/card/CompactCardVisual.tsx` — Compact LOD 视觉层
- `src/app/components/persona/default/Card.persona.default.tsx` — Default Persona 视觉定义
- `src/app/components/persona/CardPersonaVarsInjector.tsx` — 当前 CSS 变量注入机制
- `src/app/context/PersonaContext.tsx` — Persona Context

---

## 3. Current Architecture Audit

> **目的**：让执行者不看现有代码也能理解改动边界。所有后续改动方案建立在本节基础上。

### 3.1 文件地图

```
src/app/
├── components/ui/card/
│   ├── Card.tsx              ← motion.div wrapper + 交互 + 生命周期（保留，重构 body）
│   ├── CardVisual.tsx        ← 正反面静态结构（核心重构目标）
│   ├── CompactCardVisual.tsx ← Compact LOD 版本（同步重构）
│   └── DragPreviewCard.tsx   ← 拖拽预览（Phase 4 前保持原样）
├── components/persona/
│   ├── default/
│   │   ├── Card.persona.default.tsx  ← 定义 Default Persona 的 visuals 对象
│   │   └── visuals/card/*.tsx        ← 具体装饰组件（Background / Corners / Divider 等）
│   └── cyberpunk/
│       └── （镜像 default 结构）
└── context/
    └── PersonaContext.tsx    ← Persona Context Provider
```

### 3.2 数据流

```
CardEntity (store)
  └→ InnerApp.tsx 从 store 取 items
     └→ <Card cardData={...} x=MotionValue y=MotionValue ... />
        ├→ useCardVariants(cardData, variants) → currentCardData
        ├→ motion.div [position wrapper, Framer Motion MotionValues]
        │   └→ scale wrapper (hover/expand 缩放)
        │       └→ <CardVisual {...currentCardData展开 + persona + 回调}>
        │          ├→ FRONT face: <Persona.visuals.Background/> + 边框层 + Header + CardVisual内容 + Text
        │          └→ BACK face: 边框层 + Definition Box + Flavor Box + Ontology Badge
```

### 3.3 关键 DOM 手动写入点（绕过 React）

新路径必须保留这些点的等价语义。

| 位置 | 作用 | 新路径对应处理 |
|------|------|---------------|
| `CardVisual.tsx:218` | `flipEl.style.transform = scaleX(v)` | host 元素上同样方式挂 MotionValue |
| `CardVisual.tsx:219` | `frontEl.style.opacity = v` + pointerEvents 切换 | 同上 |
| `CardVisual.tsx:220` | `backEl.style.opacity = v` + pointerEvents 切换 | 同上 |
| `Card.tsx`（滚轮阻止） | `useWheelStopPropagation` 贴 DOM | shadow 内部元素需重新绑定 |

### 3.4 现有 CSS 变量（必须全部延续）

现有 `CardPersonaVarsInjector.tsx` 注入的变量（不完整列表，以实际代码为准）：
- 颜色族：`--card-color-bg-front`, `--card-color-bg-back`, `--card-color-border-outer`, `--card-color-border-inner`, `--card-color-gold-metallic`, `--card-color-gold-bright`, `--card-color-text-primary`, `--card-color-def-box-bg`, `--card-color-flavor-box-bg`, `--card-color-border-subtle`, `--card-color-scrollbar-thumb`
- 渐变族：`--card-gradient-gold-metallic`, `--card-gradient-gold-text`, `--card-gradient-back-sheen`, `--card-gradient-def-box-overlay`
- 纹理：`--card-texture-noise`, `--card-texture-back-pattern`
- 字体：`--card-font-label`, `--card-font-body`
- 其他：`--card-radius`, `--card-shadow-def-box`, `--card-shadow-flavor-box`

**CSS 自定义属性穿越 shadow 边界**（标准行为），因此现有注入机制可不改，新路径 shadow 内部直接 `var(--card-*)`。

### 3.5 Persona System 现状

- `useCanvasPersona()` / `useCardPersona()` 从 context 取当前 persona 对象
- Persona 对象结构：`{ visuals: { Background, Corners, Divider, ScrapLabel, TextureOverlay?, BackTopDecoration? }, physics: {...}, tokens: {...} }`
- `visuals.*` 是 React 组件（无 props 或少量 props）

### 3.6 视口裁剪与相关 ref

- `useViewportCulling` 基于 `mx.get() / my.get()` 决定哪些卡进入 `visibleCanvasItems`
- `expandedIdsRef`（Set of UIDs）：expanded/flipped 的卡免于裁剪
- `isZoomingRef` / `isPanningRef`：缩放/平移时暂停部分 hook 工作
- `cardFocusRegistry`：全局 `pointerdown` listener，dispatch 到已注册的卡（每张 expanded 卡会注册一个）

---

## 4. Target Architecture

### 4.1 Custom Element Family

每个 Persona 一个独立 custom element 标签：

- `<lexi-card-chrome-default>`
- `<lexi-card-chrome-cyberpunk>`
- （未来每套新皮肤 = 新标签）

**Why**（来自 PRD Q1=A 决策）：
- Shadow template 与 CSS 完全隔离，不同 Persona 互不污染
- Persona 切换 = 切换标签，浏览器自动销毁旧 shadow、构建新 shadow，无需 React 重渲染
- 未来某个 Persona 可内部用 Canvas 而其他 Persona 保持 DOM —— 路径独立

**统一基类**：所有 persona WC 继承自同一个 `LexiCardChromeBase extends HTMLElement`，共享：
- Slot 名单（合约）
- Attribute 名单与 reflection
- `adoptedStyleSheets` 的基础表（仅注入共享 reset / 布局骨架）
- 生命周期骨架

每个子类覆盖：
- `static get template(): HTMLTemplateElement` — 该 persona 的 shadow 模板
- `static get personaStyleSheet(): CSSStyleSheet` — 该 persona 的独有样式

### 4.2 Shadow DOM Template Layout

每个 persona 模板结构等价于现有 `CardVisual.tsx` 的正反面 JSX，语义映射如下：

```
#shadow-root
├── <div part="flip-wrapper">
│   ├── <div part="front-face">
│   │   ├── [Persona 装饰层：Background / TextureOverlay / Corners / Divider]
│   │   ├── <div part="header"><slot name="level"></slot></div>
│   │   ├── <div part="visual"><slot name="visual"></slot></div>
│   │   ├── <div part="text">
│   │   │   ├── <slot name="word"></slot>
│   │   │   ├── <slot name="pronunciation"></slot>
│   │   │   └── <slot name="system-word"></slot>
│   │   └── <div part="feedback-overlay"></div>
│   └── <div part="back-face">
│       ├── [Persona 装饰层：背面专属]
│       ├── <slot name="ontology"></slot>
│       ├── <div part="back-header">
│       │   ├── <slot name="word-back"></slot>
│       │   └── <slot name="pos"></slot>
│       ├── <div part="definition-box"><slot name="definition"></slot></div>
│       └── <div part="flavor-box"><slot name="flavor"></slot></div>
```

**`part=` 命名**：使用 CSS Shadow Parts（`::part()`）允许 light DOM 侧在极少数情况下透视调样式（通常不需要，保留作为逃生舱）。

### 4.3 Slot Inventory（权威合约）

| Slot 名 | 语义 | 数据来源 | 必填 | 备注 |
|---------|------|----------|------|------|
| `level` | 等级徽章 | `learningData.level` | 是 | 预期包含 Persona.visuals.ScrapLabel 的渲染结果 |
| `visual` | 核心图像区 | `cardData.visual.payload` | 是 | 由 `CardVisual` 子组件渲染后塞入 |
| `word` | 正面主词 | `learningData.word` | 是 | 纯文本 span |
| `pronunciation` | 发音 | `learningData.pronunciation` | 否 | 可为空字符串 |
| `system-word` | 系统语译词 | `systemData.word` | 是 | 双语展示用 |
| `ontology` | 语种本体 | `senseInfo.ontology` | 是 | 背面顶部 badge |
| `word-back` | 背面主词 | `learningData.word` | 是 | 与 `word` 内容相同但独立实例（shadow slot 不能复用） |
| `pos` | 词性 | `learningData.pos` | 是 | 背面展示 |
| `definition` | 定义 | `systemData.definition` 或 `definitionOverride` | 是 | 可滚动 |
| `flavor` | 例句轮播 | `FlavorCarousel` 组件输出 | 是 | 由 React 渲染后 slot 进去 |

**Why slot 而非 attribute**：slot 支持任意 React 节点（含 FlavorCarousel 这种带交互的子组件），而 attribute 仅支持字符串。

### 4.4 Attribute Contract

以下 attribute 由 React 侧控制，驱动 host 元素级别的视觉状态（通过内部 CSS 选择器如 `:host([is-active]) [part=flip-wrapper]` 响应）：

| Attribute | 值 | 作用 |
|-----------|-----|------|
| `is-active` | boolean-ish（存在即真） | 激活态：启用 backfaceVisibility、启用 glare |
| `is-expanded` | boolean-ish | 展开态 |
| `is-flipped` | boolean-ish | 翻转态 |
| `is-over` | boolean-ish | 作为 drop 目标 hover 时 |
| `visual-feedback` | `merge` / `split` / 空 | 合并/分裂反馈动画 |
| `layout-mode` | `default` / `compact` | LOD 切换（仅结构切换，具体样式由 CSS 响应） |

**禁止**用 attribute 传递文本内容（用 slot）或 MotionValue（不可序列化，且 attribute 变更会触发 attributeChangedCallback，频繁变化会性能下降）。

### 4.5 CSS Strategy: `adoptedStyleSheets`（核心）

> **来自 PRD Q2=C 决策**。本节是本重构最容易出错的部分，执行者务必逐条阅读。

#### 策略

1. **单例 CSSStyleSheet 构造**：app 启动时构造两组样式表对象：
   - `baseSheet: CSSStyleSheet` — 所有 persona 共享的骨架（reset、布局、slot 占位尺寸）
   - `personaSheet[personaId]: CSSStyleSheet` — 每个 persona 独有的视觉样式

2. **所有实例共享引用**：每个 shadow root 在 `connectedCallback` 里执行：
   ```
   this.shadowRoot.adoptedStyleSheets = [baseSheet, personaSheet[this.personaId]];
   ```
   注意**是赋值数组引用**，不是 clone —— 浏览器会让多个 shadow root 共享同一份 stylesheet 对象，内存只占一份。

3. **样式源头**：新建 `src/app/components/ui/card/web/styles/` 目录：
   ```
   base.css       ← 骨架样式（所有 persona 共享）
   default.css    ← Default persona 视觉样式
   cyberpunk.css  ← Cyberpunk persona 视觉样式
   ```
   这些 `.css` 文件在构建期通过 Vite `?inline` 导入为字符串，运行时喂给 `CSSStyleSheet.replaceSync()`。

#### Why 不是 `<style>` 注入

- `<style>` 每个 shadow root 要有一份副本，内存随卡片数线性增长
- `<style>` 解析在每次 shadow 创建时触发
- `adoptedStyleSheets` 是共享引用，浏览器只解析一次

#### Tailwind 处理

Shadow 内部**不使用** Tailwind utility class（class 不穿越 shadow 边界，且会让样式散落多处）。
现有 CardVisual 中用到的 Tailwind class（如 `absolute inset-0 flex flex-col`）一次性**翻译为等价原生 CSS**，写入 `base.css`。翻译对照表由执行者在 Phase 0 产出（见 [wbs.md Phase 0](./wbs.md#phase-0)）。

### 4.6 React Bridge Component

新建 `src/app/components/ui/card/web/LexiCardChrome.tsx`，作为 React 侧的桥接组件：

- **职责**：
  1. 根据当前 Persona 选择正确的 custom element 标签
  2. 以 React children 形式接收各个 slot 的内容（JSX），内部用 `<span slot="word">{...}</span>` 等包装
  3. 将 React ref 指向 host 元素（供 Framer Motion 使用）
  4. 将 boolean state 转为 attribute（通过 `useEffect` + `setAttribute` / `removeAttribute`）

- **API**（伪签名，不作为代码模板）：
  ```
  interface LexiCardChromeProps {
    persona: 'default' | 'cyberpunk';
    isActive: boolean;
    isExpanded: boolean;
    isFlipped: boolean;
    isOver: boolean;
    layoutMode: 'default' | 'compact';
    visualFeedback: 'merge' | 'split' | null;
    slots: {
      level: ReactNode;
      visual: ReactNode;
      word: ReactNode;
      pronunciation: ReactNode;
      systemWord: ReactNode;
      ontology: ReactNode;
      wordBack: ReactNode;
      pos: ReactNode;
      definition: ReactNode;
      flavor: ReactNode;
    };
    hostRef?: Ref<HTMLElement>;
  }
  ```

- **非职责**：不处理 MotionValue、不处理拖拽、不处理生命周期副作用 —— 这些继续在上层 `Card.tsx` 内。

### 4.7 Persona Registration

新建 `src/app/components/ui/card/web/registry.ts`：

- **导出单个 `ensurePersonaRegistered(personaId: string): void`**：
  - 幂等：重复调用不重复 `customElements.define`
  - 按需注册：仅在某个 persona 首次被 mount 时触发
  - 内部构造好 `personaSheet[personaId]` 与该 persona 的 template 单例

- **调用时机**：`LexiCardChrome.tsx` 在 render 前 synchronously 调一次 `ensurePersonaRegistered(props.persona)`。因为 `customElements.define` 同步可用（浏览器保证），不会出现 race。

### 4.8 与旧 Persona Visuals 组件的关系

Persona 对象里原有的 React 组件（`visuals.Background` 等）在新架构下有两种处理方式：

| 组件类型 | 处理方式 |
|---------|---------|
| **纯静态装饰**（Background / Corners / Divider 等不依赖 props 的） | 渲染结果"烘焙"成 HTML 字符串写入 persona 的 shadow template，**不再作为 React 组件**使用 |
| **依赖 props 的装饰**（如 ScrapLabel 依赖 level） | 继续在 React 侧渲染，通过 slot 注入 |
| **动态依赖视觉数据**（如 `MemoizedCardVisual` 使用 `visual.payload`） | 继续在 React 侧渲染，通过 slot 注入 |

"烘焙"的具体做法由执行者决定，**推荐**：
- 写纯 HTML/CSS 源码到 `default.template.html`（Vite `?raw` import 为字符串），构建期引入
- 不推荐 `renderToStaticMarkup`，因为会把 React 依赖链保留在运行时包里

---

## 5. Integration Points

### 5.1 Framer Motion

- MotionValue（`x`, `y`, `scale` 等）继续挂在**包裹 `<lexi-card-chrome-*>` 的 `<motion.div>`** 上（host 的父级），**不直接**挂在 custom element 上。
- Flip scaleX、前/后脸 opacity 的 MotionValue 订阅在 `Card.tsx` 层完成，通过 `setAttribute('is-flipped', ...)` 与 `shadowRoot.querySelector('[part=flip-wrapper]').style.transform = ...` 同时驱动。
  - **Why**：attribute 变化驱动离散态（如 backfaceVisibility），style 直写驱动连续值（scaleX）。二者分工与现有 `CardVisual.tsx:218` 一致。
- 备选：如需在 shadow 内部触发动画，通过 `::part()` 选择器 + CSS 变量（如 `--flip-scale-x`）代替直接 style 写入。

### 5.2 React DnD

- React DnD 通过 `connectDragSource(ref)` / `connectDropTarget(ref)` 绑定到 DOM。
- Shadow DOM **不影响** React DnD 的 ref 绑定：ref 仍然指向 custom element（light DOM 侧），DnD 的 native HTML5 drag events 正常在 light DOM 冒泡。
- **风险**：若某些 drop 计算依赖事件 target 在具体 shadow 内部元素上，需通过 `event.composedPath()` 穿越 shadow 边界取。见 [§6 Gotchas](#6-known-gotchas)。

### 5.3 useViewportCulling

- 不受影响。culling 逻辑基于 `mx.get() / my.get()`，与 DOM 结构无关。
- `expandedIdsRef` 继续由 `Card.tsx` 在 isExpanded/isFlipped 变化时更新。

### 5.4 cardFocusRegistry（全局 pointerdown）

- 全局 listener 在 `window` 上，`event.target` 在遇到 shadow DOM 时会被浏览器 **retarget** 到 host 元素。
- 这意味着：**无需改动 `cardFocusRegistry`**，shadow 内的任何点击都会让 `event.target === <lexi-card-chrome-*>`，后续"点击是否在卡片内"判断仍成立。
- 若需判断点击落在 shadow 内的具体 `part`，用 `event.composedPath()` 而非 `event.target`。

### 5.5 TTS / Audio

- TTS 触发由 `CardVisual` 当前通过 React onClick 发起。新架构下：
  - flavor click → React 侧组件（作为 slot 塞入）继续绑定 `onClick`，事件穿越 shadow 边界冒泡正常
  - **无改动**

### 5.6 LOD System

- 现有逻辑：`canvasScale < 0.32` 时 React 侧切换渲染 `CompactCardVisual` 组件。
- 新架构：`Card.tsx` 内部同一个 `<lexi-card-chrome-*>` 实例，通过 `layout-mode` attribute 切换 `default` / `compact`。不再实例化不同组件。
- shadow 内部通过 `:host([layout-mode="compact"]) [part=...]` 选择器控制显隐。

### 5.7 SelectionOverlay / Variants

- SelectionOverlay 是 expanded 状态下的独立 UI，本次重构不改其实现。
- Variants 切换（`useCardVariants`）的 `setActiveUid` 上层保持不变，只影响 slot 内容。

---

## 6. Known Gotchas

> **强制阅读**：执行者在每个 Phase 开始前必须重读本节。以下陷阱已在规划阶段识别，踩入会导致不可观测的 bug。

### 6.1 Tailwind class 不穿越 shadow 边界

- shadow 内部写 `class="absolute inset-0"` **不生效**（Tailwind CSS 在 light DOM）
- **对策**：shadow 内部样式全部用原生 CSS（见 §4.5），不写 Tailwind class
- 但 **slot 插入内容（如 `<span slot="word" class="text-3xl">`）**中的 Tailwind 仍然生效，因为 slot 内容在 light DOM 上解析样式

### 6.2 Shadow DOM 事件 retargeting

- 冒泡到 shadow 边界外的事件，`event.target` 被重写为 host 元素
- 需要识别内部元素时用 `event.composedPath()[0]`
- 不要依赖 `event.target.closest('.some-class')` 来判断 shadow 内状态

### 6.3 CSS 变量可穿透，但 `@font-face` 不继承

- `var(--card-*)` 穿透 shadow 边界（继承行为，标准支持）
- **但** `@font-face` 声明在 document 级注册，shadow root 内可直接 `font-family: ...` 引用，无需重复声明
- 若发现字体未生效，首先检查 document 级别是否已加载

### 6.4 `adoptedStyleSheets` 在旧 Safari 的支持

- Safari 16.4+ 支持 `adoptedStyleSheets`（2023 年 3 月发布）
- 本项目目标浏览器矩阵若含更老 Safari，需要 polyfill 或降级到 `<style>` 注入
- **执行者在 Phase 0 须确认目标浏览器矩阵**（查 `package.json` 的 `browserslist` 或询问 user）

### 6.5 Framer Motion ref 必须指向 host

- Framer Motion 通过 ref 读取元素 computed style / getBoundingClientRect
- Host 元素是常规 HTMLElement，行为正常
- 绝**不要**让 Framer Motion ref 指向 shadow 内节点（跨边界的 DOM 访问可行但不同框架的封装可能断掉）

### 6.6 attribute 的 boolean 语义

- HTML attribute 没有原生 boolean：`<el is-active="false">` 其中 `is-active` **存在**即为 truthy
- 对策：使用"存在/不存在"而非 true/false 字符串
  - 真 → `el.setAttribute('is-active', '')`
  - 假 → `el.removeAttribute('is-active')`
- CSS 选择器 `:host([is-active])` 只判断存在，与值无关

### 6.7 初始化竞态

- `customElements.define` 必须在元素出现在 DOM **之前** 调用
- 对策：`LexiCardChrome.tsx` 在 render 前同步调用 `ensurePersonaRegistered`（`customElements.define` 是同步的）
- 若违反，该标签会先作为 `HTMLUnknownElement` 渲染，后续升级（upgrade）时行为可能错乱

### 6.8 slot 内容不在 shadow 内部 DOM

- 通过 slot 注入的节点仍在 light DOM，shadow 仅是"展示位置"
- 这意味着：在 DevTools Elements 面板，slot 内容出现在 custom element 标签下（light DOM），不在 `#shadow-root` 内
- 调试技巧：勾选 DevTools 的"Show user agent shadow DOM"及 shadow tree 展开

### 6.9 Persona 切换 = 节点替换

- 当 `persona` prop 变化时，`LexiCardChrome` 必须 unmount 旧标签并 mount 新标签（React key 变化或返回不同 JSX）
- 切换期间卡片会经历一次 DOM 销毁 → 重建，需验证：
  - MotionValue 订阅不丢失（因为 ref 指向 wrapper `motion.div`，不跟随 custom element 销毁）
  - expanded/flipped 状态在 React 侧，不因 DOM 替换丢失
  - 交互无闪烁

### 6.10 `::slotted` 选择器的能力上限

- shadow 内部对 slot 填充内容的样式控制能力**有限**：只能选择 slot 直接子节点（`::slotted(*)`），不能选孙节点
- 对策：slot 填充内容需预先封装为单个根元素（如 `<span class="word-text">`），避免嵌套选择

### 6.11 Feature flag 切换的边界状态

- 当 `useWCCards` toggle 时，所有可见卡片要从旧路径切换到新路径（或反之）
- 在切换瞬间可能出现 DOM 与 React state 的短暂错配
- 对策：toggle 时强制 `visibleCanvasItems` 重新遍历（例如通过 key 拼接 flag 值：`key={uid + (useWC ? '-wc' : '')}`）

---

## 7. TypeScript Integration

### 7.1 Custom Element 类型声明

新建 `src/app/components/ui/card/web/types.ts`：

- 声明 `declare global { interface HTMLElementTagNameMap { 'lexi-card-chrome-default': LexiCardChromeBase; 'lexi-card-chrome-cyberpunk': LexiCardChromeBase; } }`
- 扩展 `JSX.IntrinsicElements` 让 React 认识这两个标签（React 19 原生支持，但 TS 类型需手动声明以获得 attribute 智能补全）

### 7.2 Attribute 命名

TypeScript / React 侧使用 camelCase（`isActive`），DOM 侧使用 kebab-case（`is-active`）。桥接组件 `LexiCardChrome.tsx` 负责转换。

---

## 8. Feature Flag

### 8.1 Store 结构

在 Zustand store 新增 `featureFlags` slice：

```
state.featureFlags: {
  useWCCards: boolean;  // 默认 false（初始），Phase 1 起 dev 环境默认 true
}

actions:
  setFeatureFlag(key, value)
```

位置：`src/core/store/slices/featureFlags.ts`（新文件，参照现有 slice 结构）。

### 8.2 DevConsole 接入

`src/app/components/system/DevConsole` 添加一个 toggle UI，绑定 `featureFlags.useWCCards`，支持运行时切换。

### 8.3 消费点

唯一消费点在 `Card.tsx`：
```
const useWC = useGameStore(s => s.featureFlags.useWCCards);
return useWC ? <NewCardPath .../> : <OldCardPath .../>;
```

其他任何位置**不得**读取此 flag。避免扩散。

### 8.4 持久化

`featureFlags` **不**写入 Dexie / localStorage —— 每次会话默认初始值。避免用户意外持久化到"坏状态"且无法恢复。

---

## 9. Testing Strategy

### 9.1 无自动化测试新增（本项目暂无测试基础设施）

所有验收走**人工 + DevTools 检查**，具体项见 [wbs.md](./wbs.md) 各阶段 checklist。

### 9.2 核心验证手段

- **DOM 节点数**：Chrome DevTools Elements 面板展开卡片，人工计数
- **React fiber 数**：React DevTools Components 面板
- **渲染性能**：Chrome Performance 面板录制 10 秒平移 / 缩放
- **Persona 切换**：`performance.mark` 打点（在 `Card.tsx` render 首尾），DevTools Performance 面板读取
- **回归**：PRD §4.2 checklist 逐项人工过

### 9.3 对比方法

每次验收同时测试 `useWCCards=true` 与 `useWCCards=false`，**在同一数据集上**录制数据。不同数据集之间的数据不作为基线。

---

## 10. Risk Matrix

| 风险 | 可能性 | 影响 | 缓解 |
|------|-------|------|------|
| Safari 旧版 `adoptedStyleSheets` 不支持 | 中 | 高 | Phase 0 确认 browserslist，必要时降级到 `<style>` 注入 |
| Shadow DOM 事件 retargeting 导致 drop 目标判断错误 | 中 | 中 | §6.2 对策 + Phase 2 拖拽测试 |
| Tailwind → 原生 CSS 翻译遗漏导致视觉漂移 | 中 | 中 | Phase 1 落地前产出完整翻译对照表 |
| Framer Motion 在 host 元素行为异常 | 低 | 高 | Phase 1 早期做烟雾测试，1 张卡验证 |
| Persona 切换时出现白屏闪烁 | 低 | 中 | §6.9 对策；必要时加 CSS transition 平滑 |
| 背面 lazy mount（现有逻辑 `backFaceMounted`）在 slot 模型下失效 | 中 | 低 | 背面 slot 可用 CSS `display: none` 延迟渲染 |
| Compact LOD 切换时 attribute 频繁变化性能下降 | 低 | 中 | §4.4：attribute 仅在阈值穿越时设置，与现有 LOD hysteresis 对齐 |
| `adoptedStyleSheets` 在 HMR 场景下样式不更新 | 中 | 低（仅开发） | Vite HMR 配置特殊处理，或 dev 模式降级为 `<style>` |

---

## 11. Open Questions

以下问题在 Phase 0 前由执行者确认并记录答案到本节：

- **OQ1** — `package.json` 的 `browserslist` 目标是什么？关系到 `adoptedStyleSheets` 需不需要 polyfill。
- **OQ2** — 项目当前是否已有 `featureFlags` slice？若有，沿用；若无，按 §8.1 新建。
- **OQ3** — Persona 的 `visuals.*` 组件里是否存在使用 `useState` / `useEffect` 的动态组件？若有，不能烘焙为 HTML 字符串，需保留为 slot 填充。
- **OQ4** — HMR 在 `adoptedStyleSheets` 下是否会导致样式不更新？需实测。

---

## Appendix A — `adoptedStyleSheets` 最小正确模式

> 仅此一个代码片段，因 §6 多项陷阱在此集中且极易出错。其他实现细节不再给模板。

```ts
// web/styles/loader.ts
import baseCSS from './base.css?inline';
import defaultCSS from './default.css?inline';

const baseSheet = new CSSStyleSheet();
baseSheet.replaceSync(baseCSS);

const personaSheets: Record<string, CSSStyleSheet> = {};

function getPersonaSheet(personaId: string): CSSStyleSheet {
  if (!personaSheets[personaId]) {
    const sheet = new CSSStyleSheet();
    const css = personaId === 'default' ? defaultCSS : /* ... */ '';
    sheet.replaceSync(css);
    personaSheets[personaId] = sheet;
  }
  return personaSheets[personaId];
}

// 在 custom element 的 connectedCallback 里：
this.shadowRoot!.adoptedStyleSheets = [baseSheet, getPersonaSheet(personaId)];
// ↑ 赋值数组引用，多个实例共享同一份 CSSStyleSheet 对象
```

关键点：
- `CSSStyleSheet` 构造 + `replaceSync` 是现代 API，**不要**用 `new CSSStyleSheet()` + `document.adoptedStyleSheets.push(...)`（后者是非标准方式）
- `.replaceSync()` 同步，`.replace()` 返回 Promise，本场景用前者
- `?inline` 是 Vite 的 CSS-as-string 导入语法
