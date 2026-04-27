# Lexicoin · PixiJS Canvas 迁移方案

**目标：** 将画布上的所有交互迁移至 PixiJS v8，采用双态架构（画布态 = 纯 PixiJS，检视态 = DOM）。  
**原则：** 旧系统全程保活，每阶段可独立用 `npm run dev` 验证，步骤之间无循环依赖。

---

## 架构总览

PixiJS 是 Lexicoin 全部**高视觉 / 高交互 / 低文字**区域的渲染平台：Canvas 世界（Phase 0-11）、Dock、Library、DeckRepository 卡片网格（各自独立后续 Phase 迁入）。DOM 层仅负责富文本内容（InspectOverlay、ConfigMenu、NotificationSystem、DevConsole）。

```
┌─ PixiJS Canvas Layer (position:fixed inset-0 z-0) ─────┐
│  Camera (pixi-viewport) · 背景 · 卡片 Sprite · 设备   │
│  GSAP 动画 · 拖拽 · 碰撞检测 · 粒子特效               │
│  未来：Dock · Library · DeckRepository 卡片网格        │
└────────────────────────────────────────────────────────┘
              ↕ uid 连结（通过 Zustand Store）
┌─ DOM Overlay（position:fixed, z-index > 0）────────────┐
│  InspectOverlay · LexiCardChrome · 富文本              │
│  ConfigMenu · NotificationSystem · DevConsole          │
│  Dock / HUD（暂留 DOM，后续 Phase 迁入 PixiJS）        │
└────────────────────────────────────────────────────────┘
```

---

## Phase 0 · 基础设施 + Feature Flag

**做什么：** 安装 PixiJS v8 + GSAP，建立 `usePixiCanvas` feature flag，在 GameShell 层插入全屏 PixiJS canvas，旧 SceneManager 区域 `display:none` 隐藏不卸载。PixiJS 应用实例完成初始化，渲染 Persona `bgVoid` 背景色。

**关键决定：**
- Feature flag `usePixiCanvas` 默认 **true**（PixiJS 为默认体验）；DevConsole Cheat tab 提供切换开关
- 旧系统（SceneManager + Canvas.tsx）保持挂载，`usePixiCanvas=true` 时 `display:none`，`false` 时恢复显示，**始终不卸载**
- PixiJS Application 在 **GameShell 层**挂载；`<canvas>` 为 `position:fixed inset-0 z-index:0`；Dock / HUD 等 DOM 元素凭现有 z-index 自然浮于上方
- PixiJS Application 配置：`preference:'webgl'`，`antialias`（玩家选项，从 `featureFlags.antialiasEnabled` 读取，切换需 reinit 重建 renderer），`resolution:Math.min(devicePixelRatio,2)`，`autoDensity:true`，`powerPreference:'high-performance'`，`backgroundAlpha:0`，`preserveDrawingBuffer:false`，`hello:false`
- 建立 `src/pixi/` 目录；集成 PixiJS Stats（dev-only）

**验证：** 默认打开看到 PixiJS 背景色；DevConsole 切 flag=false → 旧系统完全正常；切回 → PixiJS 恢复。

**旧系统状态：** 挂载但隐藏，flag=false 时完整显示。

---

## Phase 1 · Camera 系统（pixi-viewport）

**做什么：** 集成 `pixi-viewport`，实现 pan（平移）、zoom（缩放）、边界 clamp。将现有 `Canvas.tsx` 里的 zoom 惯性算法（离散鼠标轮 vs. 连续触控板检测）移植到 pixi-viewport 的 wheel 插件上。

**关键决定：**
- `pixi-viewport` 作为 PixiJS Stage 的根容器，所有游戏对象挂在其下
- Camera 真相唯一来源为 pixi-viewport；React 侧读取坐标在事件触发时调用 `viewport.toScreen()` 一次性读取，不维护 MotionValue 镜像
- Camera 边界参数来自现有 `WORLD_W / WORLD_H` 和 `CANVAS_OVERSCROLL` 配置；初始位置为世界中心 `(WORLD_W/2, WORLD_H/2)`
- Zoom 惯性用 pixi-viewport `decelerate` 插件替代原 rAF 循环；保留离散 / 连续轮检测移植（影响触控板手感）
- 建立 `usePixiApp()` React hook：**模块单例**实现（`src/pixi/core/app.ts` 导出 `getPixiApp()`，hook 为薄封装）；PixiJS 内部模块直接 `import { getPixiApp }` 无需经过 React

**验证：** PixiJS 画布可以用鼠标拖拽平移、滚轮缩放，边界正确 clamp，触控板连续缩放流畅。

**旧系统状态：** 不受影响。

---

## Phase 2 · Persona Bridge + 画布背景层

**做什么：** 将 Persona 数据（颜色、纹理 URL、几何 token）从 React Context 导出为纯 JS 模块级响应式状态，使 PixiJS 代码可以在 React 之外读取。将现有背景元素（TransmutationCircle、CornerGears、ScriptNoise、SacredGeometry 等）迁移为 PixiJS Sprite，由 GSAP 驱动旋转/视差动画。

**关键决定：**
- Persona bridge：新建 `pixiPersonaStore`（纯 JS 模块），React 侧监听 Persona 变化并同步写入；PixiJS 侧直接 import 读取
- 背景 Sprite 的纹理来自现有 SVG data URI，通过 `PIXI.Assets.load()` 加载
- GSAP Ticker 替代 MotionValue 驱动背景旋转（`rotateSlow` / `rotateReverse`）

**验证：** PixiJS 画布有完整的背景动画（齿轮旋转、符文背景视差），平移时视差正确偏移，缩放时不出现背景撕裂。

**旧系统状态：** 不受影响。旧 DOM 背景仍由 MotionValue 驱动。

---

## Phase 3 · 卡片 Sprite（占位色块，位置正确）

**做什么：** 从 Zustand Store 读取所有画布卡片数据，为每张卡片创建 PixiJS `Container`，位置对应卡片的世界坐标（x, y）。卡片渲染为带圆角的彩色矩形（占位），尺寸与真实卡片一致。实现视口裁剪：只为视口内的卡片创建 Container，离开视口时销毁。

**关键决定：**
- 卡片 Container 的 `name` 属性存储 `uid`，用于后续事件处理
- 视口裁剪直接利用 `pixi-viewport` 的 `cull()` 支持，替代现有 `useViewportCulling`
- Variant Stack：同一 Anchor 的变体卡以 Sprite 叠放（z-offset），最上层为 Anchor

**验证：** PixiJS 画布显示正确数量的色块，位置与旧系统卡片位置对应，平移/缩放时色块随 camera 移动，边缘卡片超出视口后正确被 cull。

**旧系统状态：** 不受影响。

---

## Phase 4 · Hover 交互

**做什么：** 为卡片 Container 启用 `interactive = true`，实现 `pointerover / pointerout` 事件。Hover 时用 GSAP spring 驱动 scale 放大（1.08x），Hover 结束回弹。Hover 期间显示 PixiJS HTMLText 展示卡片单词（支持 RTL 和渐变色）。

**关键决定：**
- GSAP 的 `elastic` 或自定义 spring ease 替代 Framer Motion `useSpring`
- HTMLText 字号按 `word.length` 分 3 档预设，不做 DOM 测量
- Hover 时卡片 `zIndex` 属性提升，离开后恢复

**验证：** 鼠标悬停在色块上，有弹性缩放动画，显示卡片单词文字（含中文/阿拉伯文字测试）。

**旧系统状态：** 不受影响。

---

## Phase 5 · DOM 检视态（Inspect Overlay）

**做什么：** 点击 PixiJS 卡片时，获取卡片屏幕坐标，通过 Zustand 写入 `inspectedCardUid` + 原始屏幕位置。新建全局 React 组件 `<InspectOverlay>`，监听此状态，用 Framer Motion 从卡片原始位置动画展开到屏幕浮层（画布仍可见于背后）。浮层内渲染现有 `LexiCardChrome` + 全部富文本内容（不修改这些组件）。点击浮层外部关闭。

**关键决定：**
- `InspectOverlay` 是新建组件，不修改现有 `Card.tsx` / `LexiCardChrome.tsx`
- 展开动画：从 `(originX, originY, scale=0.3)` 到屏幕中心 `(centerX, centerY, scale=1)`
- 卡片翻转（isFlipped）在检视态内用现有 CSS 3D 翻转，不需要 PixiJS 处理
- 关闭时 PixiJS 卡片 Sprite 淡入恢复

**验证：** 点击 PixiJS 色块 → 浮层从色块位置展开，显示完整卡片内容，可翻转，点击外部关闭，画布可见于背后并可平移。

**旧系统状态：** 不受影响。

---

## Phase 6 · 卡片拖拽（PixiJS Pointer Events）

**做什么：** 实现 `pointerdown / pointermove / pointerup` 拖拽，拖拽期间禁用 pixi-viewport 的 pan。拖拽时卡片跟随指针，scale 略微放大并降低 opacity。拖拽结束时将新坐标写回 Zustand（触发 Dexie 持久化）。废弃 `DragLayer.tsx`（不再需要单独的 drag preview）。

**关键决定：**
- 拖拽开始时临时暂停 viewport drag 插件，拖拽结束恢复
- 拖拽坐标转换：屏幕坐标 → `viewport.toWorld()` → 卡片世界坐标
- `react-dnd` 卡片拖拽部分在此阶段废弃

**验证：** 可以拖拽 PixiJS 色块，放手后停在新位置，刷新页面后位置持久化。拖拽时画布不会同时平移。

**旧系统状态：** 不受影响（旧系统 flag=false 时仍用 react-dnd）。

---

## Phase 7 · 落点检测（Grid Snap + 设备碰撞）

**做什么：** 拖拽结束时执行两步检测：① 与设备 AABB 碰撞检测（卡片落在设备上 → 进入设备）；② 若无碰撞，执行现有 `snapPosition` 螺旋搜索算法吸附到最近空格，GSAP spring 动画弹入目标位置。设备碰撞命中时，卡片从画布消失（location 改为 `device`）。

**关键决定：**
- `snapPosition` 纯 JS 逻辑不变，调用方改为 PixiJS drag end
- 设备在此阶段以占位矩形存在（Phase 10 再做真实样式），但有正确的 AABB
- 落点弹入动画：GSAP `elastic.out` easing 替代现有 `SNAP_SPRING`

**验证：** 拖拽卡片到空白区域 → 吸附到最近格子，弹性动画；拖拽到设备矩形上 → 卡片消失（进入设备）。

**旧系统状态：** 不受影响。

---

## Phase 8 · 真实卡片视觉（SVG Texture + HTMLText）

**做什么：** 将 `DynamicVisual` 的静态 snapshot 转换为 PixiJS Texture（SVG filter 效果在此步骤烘焙进像素）。将占位色块替换为真实卡片外框纹理（按 Persona 预生成）+ 卡片视觉 Sprite 叠加。建立纹理缓存（按 SVG code hash LRU 缓存）。

**关键决定：**
- 卡片外框（Chrome）按 Persona 预烘焙为静态纹理，共享同一 Texture 实例
- 视觉 Sprite 使用 SVG snapshot → Texture 管线；检视态打开时 PixiJS 侧 Sprite 隐藏，DOM 动画组件激活
- HTMLText 单词标签叠加在卡片 Sprite 上方

**验证：** PixiJS 画布显示真实卡片外观。Chrome DevTools Layers 面板中卡片 compositor layer 数量大幅减少。

**旧系统状态：** 不受影响。

---

## Phase 9 · 画布动画（GSAP + Cell Division + 粒子）

**做什么：** 用 GSAP 实现所有画布态动画：Merge 卡片聚合、Split / Cell Division（新卡片从锚点弹出，随机速度 + 摩擦衰减）、卡片进场/退场。PixiJS `ParticleContainer` 实现 Synthesis Ejection 粒子爆炸。

**关键决定：**
- GSAP Timeline 管理 Cell Division 多卡同时弹出序列
- 粒子爆炸在 Synthesis 完成时从合成设备位置触发
- `groupFeedback` 从 Zustand 订阅，PixiJS 侧执行对应动画序列

**验证：** 切换学习语言 → Cell Division 分裂动画；合成完成 → 粒子爆炸；卡片合并有聚合动画。

**旧系统状态：** 不受影响。

---

## Phase 10 · 设备双态（SynthesisCircle / Grimoire 重新设计）

**做什么：** 为设备实现双态架构：画布态为 PixiJS Sprite（显示当前状态：空/有卡/合成中），卡片拖入靠 Phase 7 的 AABB 检测；检视态为点击后弹出的 DOM 浮层（重新设计 UI）。设备拖拽复用 Phase 6 的拖拽系统。废弃现有 `SynthesisCircle.tsx` / `Grimoire.tsx`。

**关键决定：**
- 设备检视态 UI 为新建组件，在此 Phase 的子对话中完成 UI 设计决策
- 合成触发在检视态 DOM 浮层内执行，结果（新卡片）通过 Zustand 写回并触发 Phase 9 动画
- Grimoire 新 UI 设计在此阶段子对话中确定

**验证：** 画布有设备 Sprite，拖卡片进去卡片消失，点击设备打开检视浮层，可触发合成，合成完成后新卡弹出到画布。

**旧系统状态：** 不受影响（flag=false 仍跑旧 SynthesisCircle）。

---

## Phase 11 · 清理旧系统

**做什么：** 将 `usePixiCanvas` flag 默认值改为 `true`，完整回归测试。确认无问题后删除旧 Canvas 代码路径：旧版 `Canvas.tsx`、`CanvasContent.tsx`、`Card.tsx`（画布部分）、`DragLayer.tsx`、`useCardDrag`、`useViewportCulling`、`react-dnd` 依赖。移除 feature flag。

**关键决定：**
- `LexiCardChrome` / `CardWCSlots` / `MemoizedCardVisual` 等检视态组件**保留不删**
- Dexie schema 和 Zustand persist 格式不变（数据兼容）
- 删除顺序：最外层组件先删，再删子组件，最后删 hook

**验证：** `npm run build` 无报错，所有功能正常，`grep -r "react-dnd"` 结果为空。

---

## 依赖关系总览

```
Phase 0 (基础)
  → Phase 1 (Camera)
       → Phase 2 (背景层)           ← 可与 Phase 3 并行
       → Phase 3 (卡片 Sprite)
            → Phase 4 (Hover)
                 → Phase 5 (检视态)
                 → Phase 6 (拖拽)
                      → Phase 7 (落点检测)
                           → Phase 8 (真实视觉)  ← 可与 Phase 9 并行
                           → Phase 9 (动画)
                                → Phase 10 (设备)
                                      → Phase 11 (清理)
```

---

## 不在本方案范围内

- 每个 Phase 的具体 API 调用和文件结构（在各 Phase 的子对话中完成）
- Grimoire 新 UI 的交互设计（Phase 10 子对话决定）
- 多义项选择（SelectionOverlay）的去留（Phase 5 子对话决定）
- RTL / Variable Font 的具体实现细节（Phase 4/8 子对话决定）
