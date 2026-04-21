# 卡片 Web Component 化重构 — PRD

> **文档类型**：Product Requirements Document
> **状态**：Draft（待评审）
> **所属重构**：`docs/refactor/card-web-component/`
> **配套文档**：[tdd.md](./tdd.md) · [wbs.md](./wbs.md)
> **最后更新**：2026-04-19

---

## 1. Summary

本次重构将**画布卡片（Card）**的 UI 承载层从"每张卡一套 React 组件树"迁移到"单一 Web Component 模板 + 每张卡仅为数据槽位"的架构。

核心观察：**所有卡片的 DOM 结构与样式完全相同**，差异仅存在于 6-8 个文本槽位（word / pronunciation / pos / level / definition / flavor / ontology 等）。现有实现让每张卡各自维护一份完整的 React fiber 树与 DOM 子树，造成规模化时的内存与渲染开销。

目标架构采用 **Shadow DOM + `<slot>` + `adoptedStyleSheets`**，让浏览器原生承担"模板共享 + 内容注入"，使每张卡在浏览器眼中只是"一个带 attribute 的 custom element + 几个文本节点"。

本文档定义**为什么做**、**做到什么程度算完成**、**哪些事不在本次范围内**。技术实现细节见 [tdd.md](./tdd.md)，任务拆分与阶段验收见 [wbs.md](./wbs.md)。

---

## 2. Problem Statement

### 2.1 现状量化

| 维度 | 当前数值 | 来源 |
|------|---------|------|
| 每张卡片 React fiber 节点数 | ~50 | `Card.tsx` + `CardVisual.tsx` + Persona visuals |
| 每张卡片真实 DOM 节点数 | ~25-30 | 已 lazy-mount 背面内容后 |
| 单画布可见卡片上限（视口内） | ~60 | `useViewportCulling` 350px margin |
| 单画布总卡片上限（含屏外） | 受限于 Dexie 加载 + 内存 | 未量化 |

### 2.2 当前架构的痛点

1. **DOM 结构重复**：所有卡片的外框、内框、光晕层、装饰层、背面网格层等结构与样式 100% 相同，但每张卡各渲染一份。
2. **React 调和成本线性增长**：卡片进出视口时的 mount/unmount 触发完整 fiber 创建与销毁。
3. **Persona 切换代价高**：Persona 变化时所有可见卡片集体重渲染，切换延迟可感。
4. **CSS 全局变量耦合**：视觉 token 通过全局 `var(--card-*)` 驱动（见 `src/app/components/persona/CardPersonaVarsInjector.tsx`），跨组件隐式依赖，Persona 隔离不彻底。
5. **手动 DOM 写入已存在**：`CardVisual.tsx:218-235` 中 flip / opacity 已绕过 React，用 `ref.current.style.xxx = ...` 直接操作 DOM —— 说明现有架构已经"半脱离 React 渲染"，但未完成体系化。

### 2.3 业务背景

产品路线图上已确认的扩张方向：
- **Persona/Skin 数量**：Default + Cyberpunk → 10+ 套皮肤
- **单画布卡片规模**：500 → 2000+
- **移动端适配**：GPU 预算紧缩
- **视觉复杂度**：新动画、粒子、纹理层持续增加

五个方向都会**线性放大**当前 DOM 重复带来的成本。

---

## 3. Goals

### 3.1 功能目标

- **G1** — 卡片视觉模板变为单点维护（一个 custom element = 一份 shadow template）
- **G2** — 每个 Persona 对应一个独立的 custom element 标签（见 [tdd.md §4.1](./tdd.md#41-custom-element-family)）
- **G3** — Persona 切换不再引发所有可见卡片的 React 重渲染
- **G4** — 样式通过 `adoptedStyleSheets` 共享，不在每个 shadow root 内复制 `<style>` 字符串
- **G5** — 保留现有所有交互：拖拽、hover、flip、expand、TTS、variants 切换、drop 目标、Grimoire 交互

### 3.2 非功能目标

- **N1** — 与 Framer Motion 的 MotionValue 驱动保持兼容（位置、scale、glare 等动画不倒退）
- **N2** — 与 React DevTools + Chrome Shadow DOM 面板均可正常调试
- **N3** — 不破坏现有 a11y（screen reader 可穿越 shadow 边界读取卡片内容）
- **N4** — 切换新旧路径由 runtime feature flag 控制，可在不重新部署的情况下灰度与回滚

---

## 4. Success Criteria

所有以下指标必须在 Phase 4（清理期）前达成；达不到则保留旧路径，不删除。

### 4.1 可量化指标

| 指标 | 基线（旧路径） | 目标（新路径） | 测量方法 |
|------|---------------|---------------|---------|
| 单张卡片 React fiber 节点数 | **27**（含 `_c*` Framer 节点、memo、forwardRef） | ≤ 8（注1） | React DevTools Components 树形视图 |
| 单张卡片真实 DOM 节点数（`$0.querySelectorAll('*').length`） | **225** | ≤ 5（light DOM 侧） | DevTools Elements + Console |
| 1000 张卡片画布满帧率（缩小 LOD） | 待测 | ≥ 55 FPS | Chrome Performance 面板 |
| Persona 切换延迟（60 可见卡） | 待测 | ≤ 50 ms | 自打点 `performance.mark` |
| 卡片进入视口 mount 耗时（单次） | 待测 | ≤ 2 ms | React Profiler flame chart |

> **注**：基线在 Phase 0 开始前由执行者实测填入本表，不得使用估算值。
>
> **注1**：原目标 ≤ 3 假设 slot 内容为纯 DOM 字符串。Phase 1 实际决策保留 `MemoizedCardVisual`（视差+动画）和 `TieredText`（自适应字号）为 React 组件，两者各贡献 2~3 个 fiber（React.memo 固有双节点）。Phase 2 实测为 **7 个节点**（LexiCardChrome + MemoizedCardVisual×2 + _c5/_c11 Framer + DynamicVisual + TieredText），较基线降低 74%，目标修订为 ≤ 8。

### 4.2 回归零容忍项

以下列表中的每一项在 Phase 1/2/3 的验收中必须全部通过，任一失败阻塞该阶段 merge。

- [ ] 卡片拖拽（Canvas → Canvas、Canvas → Dock、Dock → Canvas、Canvas → Device 槽位）
- [ ] 卡片双击合成（合并为 variant）
- [ ] 卡片翻转（正反面）
- [ ] 卡片 hover 发光与 glare
- [ ] 卡片双击展开为 expanded 状态 + `cardFocusRegistry` 外部点击收起
- [ ] TTS 朗读（flavor text + definition）
- [ ] Variant 切换（多义项 selection overlay）
- [ ] 背面 definition / flavor 区域滚动 + 滚轮阻止画布缩放
- [ ] Persona 运行时切换（Default ↔ Cyberpunk）视觉正确
- [ ] 视口裁剪（屏外卡片不渲染）
- [ ] Compact LOD（canvasScale < 0.32）显示简化视觉

详细测试步骤见 [wbs.md §各阶段验收](./wbs.md)。

---

## 5. Non-Goals（显式声明不做）

以下事项**本次重构不触碰**。若在执行中发现其相关问题，应记录到 `docs/refactor/backlog.md` 而非顺手修改。

- **NG1** 不重写 Canvas 渲染层（`Canvas.tsx` 保持原样）
- **NG2** 不重写 Device（SynthesisCircle / GrimoireSummoner）与 Grimoire 的视觉层
- **NG3** 不改动 Zustand store 数据模型 — 卡片数据结构（`CardEntity`）不变
- **NG4** 不改动 `useViewportCulling` / `useCardManager` / `useCardGrouping` 的 API
- **NG5** 不引入新动画效果、不改动现有动画参数
- **NG6** 不做 Canvas/WebGL LOD 渲染（留待后续阶段，WC 内部可后续自行演进）
- **NG7** 不重写 Tailwind 配置；卡片内部 shadow 样式将原生 CSS 化，但 App 其他部分仍用 Tailwind
- **NG8** 不改动 Persona Context 的上层 API（`useCanvasPersona` 等继续可用）

---

## 6. Alternatives Considered

以下方案已在规划阶段评估并排除，**执行者不应在 TDD / WBS 执行中重新开启讨论**。决策背景可追溯至项目对话记录。

| 方案 | 排除原因 |
|------|---------|
| **A. `<template>` + `cloneNode` 手动模板** | 脱离 React DevTools、文本槽位用字符串 selector 维护脆弱、非惯用模式对团队协作不友好 |
| **B. SVG `<symbol>` + `<use>`** | CSS 渐变 / mix-blend-mode / Tailwind 文本排版在 SVG 中表达力受限；重写 Persona 视觉层代价过高 |
| **C. Canvas / WebGL 渲染** | 失去 a11y、CSS、Framer Motion 直接集成；与现有交互模型冲突；重写规模过大 |
| **D. DOM 节点池（recycler）** | 需要绕过 React key 机制，自行管理绑定关系；开发维护复杂度高；不解决 DOM 重复的本质问题 |
| **E. 保持现状 + CSS Containment 优化** | 仅优化重排/重绘，不减少 DOM 节点数，无法解决规模化瓶颈 |

---

## 7. Rollout Strategy（摘要）

分 5 个阶段，每阶段独立可 merge、可回滚。详见 [wbs.md](./wbs.md)。

- **Phase 0 — Infrastructure**：建立 `featureFlags` 基础设施与 DevConsole toggle，实测基线指标
- **Phase 1 — FRONT face WC**：落地 `<lexi-card-chrome-default>`，仅替换正面静态 chrome，flag off 时走旧路径
- **Phase 2 — BACK face + 交互**：扩展到背面、flip、expand、drag
- **Phase 3 — Cyberpunk Persona WC**：`<lexi-card-chrome-cyberpunk>` 落地，Persona 切换机制改造
- **Phase 4 — 清理**：删除旧路径、移除 feature flag、文档归档

---

## 8. Stakeholders & Ownership

- **设计决策**：项目主导者（user）
- **执行**：任意具备本仓库读写权限的 AI 模型或工程师
- **验收**：项目主导者（user）依据 [wbs.md](./wbs.md) 各阶段 checklist 逐项确认

---

## 9. Glossary

> 本表用于统一执行 AI 的术语理解，所有引用以本表定义为准。

| 术语 | 定义 |
|------|------|
| **Card** | 画布上承载单个 Sense（词义）的 UI 单元，当前实现位于 `src/app/components/ui/card/Card.tsx` |
| **CardVisual** | 卡片内部静态视觉层，当前实现位于 `src/app/components/ui/card/CardVisual.tsx` |
| **Persona** | 视觉皮肤系统，当前有 Default / Cyberpunk 两套，见 `docs/persona-system.md` |
| **Chrome** | 本文档专用术语：指卡片的"外壳"——所有非文本的装饰、边框、背景、渐变、纹理层 |
| **Slot** | Web Components `<slot>` 元素，shadow DOM 中的内容注入位点 |
| **Shadow root** | 每个 custom element 实例的私有 DOM 子树 |
| **Light DOM** | 相对 shadow DOM 而言，指 custom element 标签下、暴露给外部的常规 DOM 子树 |
| **adoptedStyleSheets** | DOM 标准 API，用于让多个 shadow root 共享同一份 `CSSStyleSheet` 对象 |
| **Feature flag** | 本重构引入的 runtime 开关 `featureFlags.useWCCards`，控制新旧卡片路径 |
| **旧路径 / 新路径** | 旧路径 = 现有 React Card；新路径 = Web Component Card |

---

## 10. References

### 项目内部
- [docs/file-structure-2026-03.md](../../file-structure-2026-03.md) — 项目文件结构
- [docs/persona-system.md](../../persona-system.md) — Persona 系统设计
- [docs/performance-optimizations.md](../../performance-optimizations.md) — 已有性能优化记录
- [docs/visual-pipeline.md](../../visual-pipeline.md) — 视觉管线
- [docs/refactor/principles.md](../principles.md) — 重构通用原则

### 外部参考
- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN: Shadow DOM slots](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot)
- [MDN: Document.adoptedStyleSheets](https://developer.mozilla.org/en-US/docs/Web/API/Document/adoptedStyleSheets)
- [React 19 Custom Elements Support](https://react.dev/blog/2024/12/05/react-19#support-for-custom-elements)
