# Lexicoin · PixiJS 迁移背景与决策上下文

本文件记录了这次迁移的**原因、考量过程和重要决策**，帮助执行迁移的 AI 模型理解"为什么这样做"，从而在具体实现中做出符合项目意图的判断。

技术方案详见 `pixi_migration_plan.md`，技术参考（代码结构、数据格式等）详见 `CONTEXT.md`。

---

## 一、为什么要迁移

### 核心性能瓶颈

Lexicoin 是一个卡牌游戏，画布上存在大量卡片，且未来还会有更多 Device（合成炉、词典等）和特效。当前基于 React + DOM 的架构在以下几个方面遭遇了渲染性能的根本限制：

**1. GPU Compositor Layer 爆炸**  
每张带有 `will-change: transform` 的卡片都会被浏览器提升为独立的 GPU compositor layer。50 张卡 = 50 个 layer，占用大量 GPU 内存并导致合成开销线性增长。

**2. SVG Filter 运行时开销**  
每张卡片的视觉插图（AI 生成的 SVG）使用了大量 `feDropShadow`、`feGaussianBlur` 等 SVG filter。这些 filter 不是 GPU 直接合成的，而是浏览器 SVG 渲染引擎在每次 repaint 时重新计算——50 张可见卡片 × 每帧 = 大量 CPU/GPU 混合开销。

**3. 背景层动画的持续重绘**  
TransmutationCircle、CornerGears、ScriptNoise 等背景元素使用 CSS `mix-blend-mode` + Framer Motion MotionValue 驱动，每帧都触发 compositor 重合成。

**4. 未来规模化后的系统性瓶颈**  
卡片数量增长、Device 增多、特效（粒子、合成爆炸等）增加后，DOM 渲染的上限会被快速触及。DOM 不擅长批量渲染同类对象（每个卡片是独立 DOM 树），而 GPU 最擅长的恰恰是大批量同构对象的合批渲染（draw call batching）。

### 为什么不整体重写

最初考虑过更激进的方案（Unity、全 PixiJS 等），但被否定，核心原因是：

**富文本是 Lexicoin 最重要的功能，不可脱离浏览器原生排版引擎。**

游戏涉及多语言词汇学习，卡片需要：
- CJK（中日韩）文字的自动断行、行高、字符密度处理
- RTL（阿拉伯语、希伯来语）的 direction 和 BiDi 算法
- 可变字体（`font-variation-settings`）按 Persona 变化
- 自适应字号（`useTieredAutoType` 依赖 `getBoundingClientRect()` 测量 DOM 容器）
- 可滚动的释义列表（原生 `overflow: auto`）
- 用户可选中/复制文字

上述所有能力都是浏览器 DOM 文字排版引擎的原生能力，在 PixiJS 或 Unity WebGL 中完全实现的成本是不可接受的，而且效果也会明显更差。

---

## 二、核心架构决策：双态分离

### 为什么不用 DOM Overlay Bridge

最初评估了"DOM Overlay Bridge"方案：PixiJS 处理卡片位置，DOM 元素覆盖在 canvas 上跟随坐标移动（每帧执行矩阵同步）。

**这个方案被否定**，原因：
- 每帧 O(n) 次 `viewport.toScreen()` 矩阵计算 + DOM style 写入，性能收益被部分抵消
- 卡片仍然是 DOM 节点，compositor layer 数量没有减少
- 两套系统深度耦合，调试复杂，任何坐标偏差都会造成视觉错位

### 双态分离的逻辑

**关键洞察：** 玩家在画布上看卡片时（小尺寸、密集摆放），关注的是视觉标识和空间位置，不需要读完整的释义；只有主动点击检视时，才需要完整的富文本内容。

这和卡牌游戏的普遍设计一致：棋盘上的卡牌是简化形态，点击/悬停后才展示详情。

**结果：**
- 画布态：纯 PixiJS，卡片是 Sprite，没有 DOM 节点，画布交互完全在 WebGL 层
- 检视态：用户主动点击后，弹出 DOM 浮层，复用所有现有富文本组件，完全不改这些组件

两态通过 `uid` 和 Zustand Store 连结，物理上完全解耦。

---

## 三、SVG 动画视觉的处理决策

### 问题背景

每张卡片有一个 AI 生成的 SVG 动画组件（React + Framer Motion），展示词义的视觉隐喻（如"土"元素的分层板块构造动画）。这些组件使用了 `feDropShadow`、`clipPath`、`mix-blend-mode` 等重量级特效，且有 Framer Motion 无限循环动画。

### 现有的 Snapshot 机制（已是正确思路）

`DynamicVisual.tsx` 已实现一个重要优化：
- `isActive=false` 时：捕获 SVG 的静态 innerHTML（snapshot），用 `dangerouslySetInnerHTML` 渲染，**零 Framer Motion 节点**
- `isActive=true` 时（卡片被悬停/展开）：挂载完整动画组件

这个 snapshot 机制在概念上已经是正确的，但存在一个遗漏：**snapshot 的 HTML 里仍保留了 `filter="url(#...)"` 等属性**，导致即使是"静态"状态，浏览器仍需在每次 repaint 时重算 SVG filter。

### PixiJS 迁移对这个问题的根本解决

SVG snapshot → PixiJS Texture 转换过程中：
1. 剥离 `filter`、`mix-blend-mode`、`will-change` 属性（静态不需要）
2. SVG 光栅化为位图，**filter 效果在此刻一次性烘焙进像素**
3. 上传为 GPU 纹理

结果：50 张卡片的 SVG filter 从"每帧重算 50 次"变为"一次性光栅化，之后永远是 50 个 GPU sprite 批量渲染"。这是迁移对 SVG 视觉性能的核心贡献。

### 动态动画的处理

SVG 里的 Framer Motion 动画是 React/JS 驱动的，无法在 PixiJS 纹理中保留。

**结论：** 不尝试在 PixiJS 内实现 SVG 动画。卡片处于检视态（DOM）时，动画组件正常运行；画布态时，显示静态纹理。这完全符合 UX：玩家在画布上看的是概览，悬停/点击才触发视觉动画。

---

## 四、文字渲染决策

### 为什么画布态放弃 TieredText 的自适应字号

`TieredText` / `useTieredAutoType` 使用 `getBoundingClientRect()` 测量容器尺寸来动态选择字号。这依赖 DOM，PixiJS Sprite 没有 DOM 容器，无法直接使用。

**放弃理由：** 画布上的卡片尺寸固定，3-4 档预设字号（按词长分档）完全够用。TieredText 的精密自适应是为检视态的大尺寸卡片设计的，画布态的小尺寸卡片不需要这个精度。

### 为什么选 HTMLText 而不是 PIXI.Text

`PIXI.Text` 底层用 Canvas 2D，无法设置 CSS `direction: rtl`（API 不暴露），也不支持 `font-variation-settings`（可变字体）。

`HTMLText`（PixiJS 内置）通过 SVG foreignObject + HTML/CSS 渲染，走浏览器完整的文字排版引擎，支持所有 CSS 属性。代价是比 `PIXI.Text` 慢 3-5 倍，但卡片单词几乎不变化，纹理缓存后开销极小。

**等级、数字等简单标签** 仍用 `PIXI.Text`（这些是 ASCII，无 RTL/可变字体需求，更快）。

---

## 五、动画库决策

### Canvas 层：GSAP 替代 Framer Motion

Framer Motion 设计为 React 生态的动画库，在 PixiJS（React 之外）使用需要绕过大量 React 抽象，且其 spring 计算在非 React 环境性能有损耗。

GSAP：
- 原生支持任意 JS 对象的属性动画（PixiJS Container/Sprite 的属性）
- 比 Framer Motion 在非 DOM 环境性能更优
- 有 spring/elastic easing，视觉效果与 Framer Motion spring 相当或更好
- 有 Timeline，适合 Cell Division 这类多对象协调动画序列

### DOM 层：保留 Framer Motion

检视态的展开/关闭动画、卡片翻转等 DOM 动画继续用 Framer Motion，它在 DOM 环境里仍然是最佳选择。

---

## 六、设备（Device）决策

### 现状

`SynthesisCircle.tsx` 和 `Grimoire.tsx` 目前是功能半成品，UI 设计粗糙，存在已知的 react-dnd 和状态同步问题。

### 决策

在迁移中不试图"保留并移植"这两个组件，而是**借这次迁移的机会重新设计**。

- 画布态：简洁的 PixiJS Sprite 展示设备当前状态（空/有卡/处理中）
- 检视态：点击打开 DOM 浮层，完整交互（槽位、合成触发、弹出）在此完成
- 卡片拖入设备：PixiJS AABB 碰撞检测，不需要打开检视态

具体的新 UI 设计在 Phase 10 的子对话中完成。

---

## 七、关键约束总结

这些约束在整个迁移过程中必须严格遵守，任何 Phase 都不例外：

1. **Feature flag 保活旧系统**：`usePixiCanvas=false` 时，所有功能必须和迁移前完全一致。旧系统是生产代码，直到 Phase 11 才删除。

2. **不修改富文本组件**：`LexiCardChrome`、`CardWCSlots`、`TieredText`、`DynamicText`、`FlavorCarousel` 这些组件是已验证正确的，不应该因为迁移而引入任何改动。检视态直接复用这些组件。

3. **不修改 Dexie schema**：卡片和设备的持久化数据格式不变，只是从 React 侧写入变为从 PixiJS 事件触发写入。玩家数据必须零损失。

4. **PixiJS 代码与 React 代码物理隔离**：所有 PixiJS 代码放在 `src/pixi/`，PixiJS 模块不 import React。通信通过 Zustand Store 和纯 JS 模块（`persona-bridge.ts`）进行。

5. **每个 Phase 独立可验证**：每个 Phase 结束时，必须能用 `npm run dev` 直观验证该 Phase 的交付内容，且旧系统（flag=false）完全正常。
