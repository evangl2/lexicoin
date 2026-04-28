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

**做什么：** 新建纯 JS 模块 `persona-bridge.ts`，React 侧监听 Persona 变化并同步写入，PixiJS 侧直接 import 读取。建立 `BackgroundSystem`（Persona 驱动的背景场景管理器），每个 Persona 有独立的 PixiJS 背景实现；实现画布世界的背景层（全部为**占位符**，美术上未定稿，代码注释说明）和世界网格。

**关键决定：**
- Persona Bridge：纯 JS 模块事件系统（`persona-bridge.ts`），React 侧新增零渲染组件 `PixiPersonaBridge`，监听 PersonaContext 变化写入 bridge；PixiJS 侧订阅 bridge 的 `onPersonaChange` 事件
- 背景架构：`IBackground` 接口 + `BackgroundSystem`；Persona 切换时**立即销毁旧背景、创建新背景**（瞬间切换，无过渡动画，TODO 注释标注未来可扩展）
- 背景动画：**时间驱动**（GSAP 持续旋转），不再与 camera 位置绑定，无 animation gate；所有动画标注为占位符
- 删除：`TransmutationCircle`（在画布后面，无视觉价值）、`MetalTexture`（SVG filter 过重，整层删除）
- ScriptNoise → PixiJS `TilingSprite` + viewport 位置驱动的 tilePosition 视差
- VoidAtmosphere / Vignette / SacredGeometry：PixiJS 技术重新设计（不还原 CSS 原版）
- GridSystem（J2）：世界坐标系内 Figma 风格点阵网格（两级），缩放驱动不透明度；同时渲染世界边界视觉提示（"悬崖感"）
- Cyberpunk Persona：PixiJS 简易占位实现（不同配色），目的是验证 Persona 热拔插机制
- 每个 Persona 提供完全不同的 PixiJS 背景实现

**验证：** PixiJS 画布显示背景层（暗色神秘氛围）；环境旋转动画平滑；ScriptNoise 随平移有轻微视差；Figma 风格网格随缩放淡入；世界边界可见；DevConsole 切换 Persona → 背景立即切换为不同配色实现；切回 → 恢复。

**旧系统状态：** 不受影响。旧 DOM 背景仍由 MotionValue 驱动。

---

## Phase 3 · 卡片 Sprite（占位色块，位置正确）

**做什么：** 新建 `PixiCardBridge`（零渲染 React 组件）读取 `useCardManager` + `useCardGrouping`，写入纯 JS 模块 `card-bridge.ts`；`CardSystem` 订阅 bridge，为每个 Anchor 卡创建 PixiJS `Container`，位置对应卡片世界坐标（坐标系需偏移：旧系统原点在中心，pixi-viewport 原点在左上角）。卡片渲染为**无圆角矩形占位色块**（Persona primary 色），建立两级 LOD 系统和 Variant Stack 视觉。

**关键决定：**
- **数据桥**：`PixiCardBridge` 组件（与 `PixiPersonaBridge` 同模式），不读 Zustand 而读 `useCardManager` + `useCardGrouping` hook
- **Culling**：全部 Container 常驻内存，视口外设 `visible=false`（100-150 张规模无性能压力）；用 `viewport.getVisibleBounds()` + `VIEWPORT_CULL_MARGIN` 判断
- **坐标系转换**：`pixiX = card.x + WORLD_W/2`，`pixiY = card.y + WORLD_H/2`（old-system 原点中心 → pixi 原点左上角）
- **Variant Stack**：每个 Anchor Container 内，变体卡以右下偏移 (+4px/层) 叠在 Anchor 之下，最多显示 2 层偏移（视觉最多 3 层）；有变体时右上角显示 `×N` 角标（N = 含 Anchor 的总层数）
- **LOD**：每个 Container 有 `nearLod`（full 250×350）和 `farLod`（60% 尺寸 150×210）两个子容器；`viewport.scale < 0.25` 时切远景；viewport 'zoomed' 事件驱动
- **颜色**：统一 Persona primary 色（alpha 0.7），Phase 8 真实视觉时替换
- **Container.label** 存储 uid，`eventMode = 'none'`（Phase 4 启用）
- 只处理 `location='canvas'` 的 Anchor 卡，Variant 卡不单独渲染
- 语言切换时 Merge/Split System（Phase 9）负责动画；Phase 3 静默重建 Stack
- Alchemist 卡片最终视觉方向：**金属符文板**（深色金属质感、浮雕边框、符文刻印），Phase 8 实现，此处代码注释说明

**验证：** PixiJS 画布显示正确数量色块；位置与旧系统卡片对应；Variant Stack 有层叠偏移和角标；缩放过 0.25 阈值时色块大小切换；平移到边缘视口外色块不渲染；旧系统（flag=false）完全正常。

**旧系统状态：** 不受影响。

---

## Phase 4 · Hover 交互 + 卡片文字层（HTMLText）

**做什么：** 为卡片 Container 启用 `eventMode='static'`，实现 `pointerover / pointerout` 事件。HTMLText（单词 + 词性）作为**永久**文字层加入 nearLOD Container（Phase 8 替换真实视觉时调整位置）。Hover 时卡片微微左上浮动（GSAP elastic spring），并触发 Persona 专属边缘发光特效（Default/Alchemist = 炼金呼吸发光；Cyberpunk = 青色占位）。

**关键决定：**
- HTMLText 是卡片的**永久组成部分**，始终显示，不是 hover-only；Phase 8 叠加 Sprite 后构成完整卡片
- Hover 动效：位移（-4px X，-6px Y），GSAP `elastic.out(1, 0.5)`，无 scale 放大
- farLOD（scale < 0.25）下：只发光，无位移（卡片太小）
- 发光：`GlowFilter`（新增依赖 `pixi-filters`），GSAP 驱动呼吸脉动
- `ICardHoverEffect` 接口（与 `IBackground` 一致）：每个 Persona 独立实现，代码注释占位
- `_containers Map` 升级为 `_metas Map<string, CardMeta>`（携带 baseX/Y、hoverOffset、effect）
- HTMLText 支持 RTL（`<span dir=rtl>`），字号按 word.length 三档预设
- `worldContainer.sortableChildren = true`，hover 时 zIndex=1

**验证：** nearLOD 下卡片显示单词文字，hover 微微左上浮 + 边缘呼吸发光；farLOD 下 hover 只发光；DevConsole 切换 Persona → 发光颜色/风格立即变化。

**旧系统状态：** 不受影响。

---

## Phase 5 · DOM 检视态（Inspect Overlay）

**做什么：** 点击 PixiJS 卡片时，`viewport.toScreen()` 计算卡片屏幕坐标，写入 Zustand `inspectedCard`。新建 `<InspectOverlay>` React 组件，用 Framer Motion 从卡片原始屏幕矩形展开到屏幕中央（~72% 屏高，保持比例）。浮层内使用 `LexiCardChrome` 渲染卡片内容，支持右键翻面。PixiJS 卡片保持可见（浮层浮于上方）。

**关键决定：**
- `InspectOverlay` 新建组件，直接用 `LexiCardChrome`，不复用 `Card.tsx`（Phase 11 后再评估提取）
- `SelectionOverlay` 重新设计为 **Variant 导航**（同 word 不同 sense 的 Stack 切换），UI 为底部圆点 + 左右箭头 + 计数
- PixiJS 卡片在 Overlay 打开时**保持可见**（backdrop 半透明，画布可见于背后）
- 关闭方式：点击 Backdrop + ESC 键
- 坐标通过 Zustand `inspectedCard: { uid, screenX, screenY, screenW, screenH }` 传递
- 点击检测：`pointerdown/up` + 8px 距离判断（提前兼容 Phase 6 拖拽阈值逻辑）

**验证：** 点击 PixiJS 色块 → 浮层从色块位置展开，显示完整卡片内容，可翻转；Variant Stack → 底部导航可切换 sense；点击 backdrop / ESC 关闭，收缩回原位。

**旧系统状态：** 不受影响。

---

## Phase 6 · 卡片拖拽（PixiJS Pointer Events）

**做什么：** 实现 Stage-level `pointermove / pointerup` 全局拖拽。Container `pointerdown` 合并 Phase 5 click 检测逻辑（共用同一函数，8px 阈值区分点击与拖拽）。拖拽期间 `viewport.plugins.pause('drag')` 防止画布跟随平移。实现 Edge Pan（屏幕边缘 80px 触发，Ticker 驱动）。拖拽结束通过 `card-bridge.ts` 回调写回 `useCardManager` → Dexie 持久化。

**关键决定：**
- 拖拽触发阈值：移动 ≥ 8px（与 Phase 5 click 阈值共用，天然区分）
- 无残影，卡片直接跟手（scale=1.05，alpha=0.85 为视觉提示）
- Edge Pan 实现（G1）：Ticker 驱动，速度随靠近边缘渐增；edge pan 期间同步更新卡片世界坐标
- 位置写回：`card-bridge.ts` 追加 `registerUpdatePosition` 回调桥，PixiJS 侧不 import React
- `DragLayer.tsx` 标注 deprecated（不删除，Phase 11 清理）；`react-dnd` 路径在 flag=true 时因 Card 被 hidden 而自然不触发

**验证：** 拖拽 PixiJS 色块，放手停在新位置，刷新持久化；移动 < 8px 触发 InspectOverlay；拖至边缘时画布 edge pan；旧系统（flag=false）react-dnd 完全正常。

**旧系统状态：** 不受影响（flag=false 时 Card 正常显示，react-dnd 正常工作）。

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
