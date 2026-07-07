# Lexicoin · PixiJS v8 重写 Walkthrough

**面向对象：** 接手本项目的 AI 模型或开发者。  
**目的：** 理解各 Stage 做了什么、为什么这么做、现在代码处于什么状态、下一步从哪里接。

---

## 📋 文档维护说明（给 AI 模型看）

**本文档需要随每个 Stage 的完成同步更新。** 每次更新遵循以下规则：

### 何时更新

每完成一个 Stage 并 commit 后，立即更新本文档。不要等多个 Stage 完成后再一起补。

### 如何更新（以 Stage D 完成为例）

**第一步：更新"当前状态"小节**

把"当前状态"里的描述改为最新的，反映新 Stage 完成后浏览器实际看到的内容。例如 Stage D 完成后，应改为"画布可以鼠标拖拽平移、滚轮缩放"。

**第二步：新增该 Stage 的专属小节**

在最后一个已完成 Stage 的小节之后插入新小节，格式固定为：

```markdown
## Stage X · [Stage 名称]

**commit:** `[完整 commit message 第一行]`

### 做了什么

[用 2–5 条说明本 Stage 的核心动作，重点是"决策"而非"步骤"。
 不需要罗列每一行代码，但要说清楚：
 - 创建/修改了哪些关键文件（附路径）
 - 采用了什么架构模式（为什么这样设计）
 - 有哪些有意识的取舍或约定]

### 关键文件

| 文件 | 作用 |
|---|---|
| `src/pixi/systems/XxxSystem.ts` | 一句话说明 |

### 验证状态

- [x] 具体可观察到的行为 1
- [x] 具体可观察到的行为 2
```

**第三步：更新"后续路线图"表格**

把刚完成的 Stage 行标记为已完成（在 Stage 列加 ✅），把"关键文件（待创建）"改为"已创建"。

**第四步：更新"当前代码结构定位指南"**

如果本 Stage 新增了模块文件，在对应区块补充说明。如果本 Stage 的某些旧占位注释（`// Stage X: ...将在此处插入`）被实际代码替换了，更新相关描述。

**第五步：溯源更新 (Back-updating)**

如果本 Stage 的实施过程中，对之前 Stage 已经建立的模块或逻辑进行了重大修改（例如 Stage D 扩展了 Stage B 建立的 `resize.ts`），**必须**同步回到对应的旧 Stage 小节中修正其功能描述。确保文档不仅是历史记录，更是对当前代码状态的准确映射。

### 写作原则

- **写决策，不写步骤。** "选择 pixi-viewport 而非自实现 Camera，因为它对 pixi v8 有官方支持"比"安装了 pixi-viewport"更有价值。
- **写非显而易见的约束。** "PixiJS 系统模块不 import React"这类约定，不写文档就容易被遗忘或误破坏。
- **写临时状态的归宿。** 每个 `// TODO(Stage X)` 或占位实现，都要在对应 Stage 完成时说明它被什么替换了。
- **保持"当前状态"小节永远准确。** 这是模型冷启动时读的第一段，必须反映真实情况。

### 不需要写的内容

- 不需要粘贴完整代码，代码在源文件里，文档只说明意图和结构
- 不需要重复 troubleshooting 文档的内容，遇到问题指向 `troubleshooting-pixi-vite-react.md`
- 不需要解释 PixiJS / Vite / React 的通用知识，只写项目特有的决策

---

## 背景：为什么重写

原项目使用 React + HTML5 Canvas（通过 DOM 组件手动绘制）实现游戏画布。存在以下问题：

- 卡片渲染、拖拽、动画全部在 React 渲染树内，DOM 操作与游戏逻辑深度耦合
- 无法实现高性能粒子、复杂动画、GPU 加速渲染

**决策：** 完全切换到 PixiJS v8（WebGL 渲染）。  
**路径：** 不做双系统并行迁移，而是先**一次性卸载所有旧 UI**，让应用变成空壳，然后从零搭建 PixiJS 画布，再把游戏功能逐步接入。

**关键约束：**
- 所有数据层（Zustand store、Dexie IndexedDB、services、modules、schemas）**完整保留不动**
- 旧 UI 组件文件**保留在磁盘**（不删除），仅切断 import 链路，供后续实现参考
- 直接在 `main` 分支推进，接受重写期间游戏暂时不可玩

---

## 当前状态（Stage D 完成后）

```
浏览器打开 localhost:5173
→ 模块初始化（Dexie、Zustand、services）
→ PixiJS Application 初始化（WebGL 渲染器）
→ 画布支持高性能平移、缩放（pixi-viewport）
→ 实现了高级摄像机物理：前瞻 (Lead the View)、重心偏移 (Peeking)、边缘滚动、弹性回弹与渐进式阻力
→ 右下角 DevConsole：新增 🛠️ Debug 标签页，可动态开关网格、辅助线和 Camera HUD
```

游戏数据已在本地环境中，画布已具备完整的“高级物理”交互能力，等待 Stage E 将 Persona 视觉层接入。

---

## Stage A · 卸载所有旧 UI

**commit:** `refactor(stage-a): unmount all game UI, keep DevConsole as sole entry point`

### 做了什么

**`src/App.tsx`**（根入口）：移除 `NotificationSystem` 挂载，只保留 `CanvasApp + DevConsole`。

**`src/app/App.tsx`**（GameShell）：原 273 行的完整游戏 Shell 压缩为 24 行最小骨架：
- 删除：`DndProvider`、`SceneManager`、`Dock`、`ProgressionHUD`、`LevelUpOverlay`、`GrimoireOverlay`、`DragLayer`
- 删除：所有 game hooks（`useCanvasCamera`、`useCardManager`、`useDeviceManager`、`useCardGrouping`、`useGrimoireExpiry`、`useGameInteractions`）
- 保留：`PersonaProvider`、`AudioProvider`（数据层，DevConsole 的 Persona 切换依赖它们）

**旧 phase 计划文档**：移入 `docs/refactor-pixi/archive/`，不删除，供实现参考。

### 隔离机制

旧代码的隔离**不是靠 feature flag**，而是靠 **import 树物理切断**：

```
main.tsx → App.tsx → app/App.tsx
```

这条链路上没有任何旧组件的 import，Vite/Rollup 按 import 图打包，旧组件永不进入 bundle，永不执行。磁盘上的旧文件是"死代码"——dev server 不加载，build 不打包。

**这意味着：**
- 引入旧组件文件（参考实现）时，只要不 import 它，就不会被执行
- 如果不小心 import 了旧组件，它会立刻报错（缺少 DndProvider context 等），是显式的告警信号

### 验证

- `npm run dev` → 黑屏 + DevConsole 可见
- `initializeModules()` 打印成功
- DevConsole 切 Persona 正常响应

---

## Stage B · PixiJS 基础设施

**commit:** `feat(stage-b): install PixiJS v8 deps + build src/pixi/ infrastructure skeleton`

### 安装的依赖

| 包 | 版本 | 用途 |
|---|---|---|
| `pixi.js` | 8.18.1 | 渲染引擎 |
| `pixi-viewport` | 6.0.3 | Camera 系统（pan/zoom/clamp）|
| `pixi-filters` | 6.1.5 | 视觉滤镜（发光、模糊等）|
| `gsap` | 3.15.0 | 动画驱动 |
| `pixi-stats`（devDep）| 5.1.7 | 性能 overlay |

**注意包名陷阱：**
- `@pixi/stats` → 不存在，正确是 `pixi-stats`
- `@pixi/vite-plugin` → 不存在，用 `vite.config.ts` 手动配置替代

### 建立的目录结构

```
src/pixi/
├── config.ts              # buildPixiConfig() — WebGL renderer 配置工厂
├── src/pixi/core/app.ts             # Application 模块单例（getPixiApp / initPixiApp / destroyPixiApp）
├── src/pixi/core/resize.ts          # window resize → renderer.resize() + viewport.resize() & 边界重算
└── src/pixi/core/stats.ts           # pixi-stats dev overlay（仅 DEV 模式）
├── systems/               # 空目录，Stage D 起填充（CameraSystem 等）
├── bridges/               # 空目录，Stage E 起填充（persona-bridge / card-bridge 等）
└── hooks/
    └── usePixiApp.ts      # React 薄封装，返回 getPixiApp() 结果
```

### Vite 配置修改（关键）

PixiJS v8 + Vite 有已知不兼容，必须在 `vite.config.ts` 加：

```typescript
optimizeDeps: {
    // pixi.js 不预打包，保全内部 shader 动态 import 路径
    exclude: ['pixi.js'],
    // pixi.js 的 CJS 传递依赖单独预打包做 CJS→ESM 转换
    include: ['eventemitter3', 'parse-svg-path', '@pixi/colord',
              '@xmldom/xmldom', 'gifuct-js', 'ismobilejs'],
}
```

不加这段配置，dev server 会出现 shader null crash 或 CJS default export 报错。详见 `troubleshooting-pixi-vite-react.md`。

### featureFlags store

`src/core/store/slices/featureFlags.ts` 新增 `antialiasEnabled: boolean`（默认 true）。  
antialias 切换通过 `localStorage + window.location.reload()` 实现，**不做 canvas 原地 reinit**（会导致 GPU crash，见 troubleshooting）。

### `src/main.tsx` 修改

移除 `<React.StrictMode>`。StrictMode 在 dev 下将 useEffect 执行两遍，与 WebGL 单例初始化根本不兼容（详见 troubleshooting P1-3）。

---

## Stage C · 挂载 PixiRoot

**commit:** `feat(stage-c): mount PixiRoot — first PixiJS v8 frame`  
**fix commit:** `fix(stage-c): resolve all PixiJS v8 + Vite + React init issues + add troubleshooting doc`

### 新建文件：`src/app/components/ui/canvas/PixiRoot.tsx`

PixiJS 的 React 挂载点。负责：
1. 渲染一个 `position:fixed; inset:0; z-index:0` 的 `<canvas>` 元素
2. mount 时异步 `initPixiApp(canvas, antialias)` → 初始化 PixiJS Application
3. mount 后 `initResizeHandler(app)` + `initPixiStats(app)`
4. unmount 时清理 stats + destroy app

```tsx
// 核心逻辑（简化）
useEffect(() => {
    const canvas = canvasRef.current;
    let cancelled = false;
    initPixiApp(canvas, readAntialias()).then(app => {
        if (cancelled) { destroyPixiApp(); return; }
        initResizeHandler(app); // 内部会处理 renderer + viewport 的同步缩放
        initPixiStats(app);
    });
    return () => { cancelled = true; destroyPixiStats(); destroyPixiApp(); };
}, []);
```

### `src/app/App.tsx` 修改

GameShell 挂载 `<PixiRoot />`：

```tsx
function GameShell() {
    return (
        <div className="w-full h-screen bg-black overflow-hidden relative"
             onContextMenu={e => e.preventDefault()}>
            <PixiRoot />
        </div>
    );
}
```

### Application 配置（`src/pixi/config.ts`）

```typescript
{
    width: window.innerWidth,    // 必须显式传，否则默认 800×600
    height: window.innerHeight,
    preference: 'webgl',
    antialias,                   // 从 localStorage 读取
    resolution: Math.min(devicePixelRatio, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
    backgroundAlpha: 0,          // canvas 背景透明，由 Graphics 对象填色
    preserveDrawingBuffer: false,
    hello: false,
}
```

### 占位背景

`initPixiApp` 里在 `app.stage` 上添加了一个深色 (`0x0a0a0f`) 矩形 Graphics，label 为 `'bg-placeholder'`。**这只是临时占位**，Stage E（Persona Bridge）接入后会替换为由 Persona 驱动的动态背景系统。

---

## Stage D · Camera 系统 (Advanced Physics)

**commit:** `feat(stage-d): implement premium camera physics with lead-the-view, peeking, and edge-scrolling`

### 做了什么

采用了 **Layered Physics (分层物理)** 架构，通过 `CameraSystem` 叠加了超越基础平移缩放的沉浸感反馈：

- **基础物理层**：集成 `pixi-viewport` 处理原始坐标变换、滚轮缩放、以及基础的 `clamp` 和 `bounce`。
- **意图感知层 (`CameraSystem.ts`)**：
    - **Lead the View**：基于当前速度向量实时 nudging 相机坐标，使视野带有微妙的“前瞻性”。
    - **Mouse Peeking (重心偏移)**：对内部 `contentLayer` 施加基于光标位置的二次幂偏移（95% 死区,仅边缘 5% 区域触发），实现视角随心动的纵深感。
    - **Progressive Resistance (指数泥沼)**：在越界区域，不再是死板的 hard-stop，而是构建了一个 `Math.pow(ratio, 1.5)` 的阻力模型。拉得越远，阻力呈指数级增长，模拟真实的物理极限。
    - **Edge Scrolling (边缘滚动)**：RTS 风格的自动平移。特别处理了与阻力逻辑的解耦：自动滚动在撞墙时会进行强制位移截断，绝不触发回弹干扰。
- **Dynamic World Adaptation (动态边界适配)**：系统原生支持可变画布大小。`CameraSystem` 暴露了 `updateWorldBounds()` 方法，用于在世界维度改变时重新校准物理插件（`clamp` / `clampZoom`）的约束范围，确保摄像机在任何地图尺度下都表现一致。
- **状态同步 (`CameraBridge.ts`)**：使用节流 (100ms) 将相机视口状态同步至 Zustand Store，供 UI 层（如 HUD）消费。
- **调试系统扩展 (`DebugSystem.ts`)**：支持容器级的显隐控制。通过 `DevConsole` 动态注入，实现零渲染开销的调试开关。

### 关键文件

| 文件 | 作用 |
|---|---|
| `src/pixi/systems/CameraSystem.ts` | 物理引擎核心，处理非线性反馈与意图预测 |
| `src/pixi/systems/DebugSystem.ts` | 调试辅助层（网格、HUD），支持热开关 |
| `src/config/camera.ts` | 物理常量（LEAD_FACTOR, RESISTANCE 等）的统一入口 |
| `src/pixi/bridges/CameraBridge.ts` | 视口状态 -> Store 的桥接同步 |

### 验证状态

- [x] 画布支持鼠标左键平移与滚轮缩放，回弹丝滑
- [x] 拖拽时有明显的前瞻感 (Lead the View)
- [x] 越界时呈现“拉力感”，阻力随距离指数级增加
- [x] 缩放时强制硬限制，不会导致相机意外滑出世界边界
- [x] 支持动态修改世界尺寸，物理限制与辅助线能同步刷新适配
- [x] DevConsole > Debug 页面可正常控制网格、HUD 显隐及测试世界大小切换

---

## 当前代码结构（对模型的快速定位指南）

### React 树

```
src/main.tsx                     # ReactDOM.render，无 StrictMode
└── src/App.tsx                  # initializeModules() → isReady 门控
    ├── src/app/App.tsx          # PersonaProvider > AudioProvider > GameShell
    │   └── GameShell
    │       └── PixiRoot         # ← PixiJS 的唯一挂载点
    └── DevConsole               # 系统调试入口，常驻
```

### PixiJS 模块树（非 React）

```
src/pixi/core/app.ts             # Application 单例，其他 PixiJS 模块通过 getPixiApp() 获取
├── src/pixi/config.ts           # buildPixiConfig()
├── src/pixi/core/resize.ts      # resize handler
├── src/pixi/core/stats.ts       # pixi-stats dev overlay
└── src/pixi/systems/
    ├── CameraSystem.ts          # 相机物理引擎 (Stage D)
    └── DebugSystem.ts           # 调试辅助系统 (Stage D)
```

PixiJS 内部模块**直接 import `getPixiApp()`**，不经过 React（无需 Context/hook 传递）。React 侧通过 `usePixiApp()` hook 访问（内部也是调用 `getPixiApp()`）。

### 数据层（完整保留，未修改）

```
src/core/store/         # Zustand 全局状态（含 persist → IndexedDB）
src/core/services/      # 业务服务（XP、等级、合成等）
src/core/storage/       # Dexie 仓库层
src/modules/            # 功能模块（level、item、persona 等）
src/schemas/            # 数据 schema
src/types/              # 全局类型
```

这些在整个 PixiJS 重写过程中**原则上保持不动**。新 PixiJS 系统直接消费这些数据层。唯一的例外是 Stage D 中为了实现相机状态同步，在 `useGameStore` 中新增了 `cameraFocusTarget` 等相关状态位。

### 旧 UI 组件（磁盘保留，不在 bundle 中）

```
src/app/components/ui/canvas/    # Canvas.tsx, CanvasContent.tsx, DragLayer.tsx（参考实现）
src/app/components/ui/shell/     # SceneManager, Dock, ProgressionHUD 等（参考实现）
src/app/components/ui/card/      # Card, CardVisual, LexiCardChrome 等（Stage H InspectOverlay 时参考）
src/app/components/ui/visual/    # AlchemyVisual, DynamicVisual 等（Stage K 真实视觉时参考）
src/app/hooks/                   # useCardManager, useDeviceManager 等（Stage F/I 接数据时参考）
```

**使用方式：** 阅读参考，提取逻辑，不直接 import 进 PixiJS 系统（避免拉入旧 React 依赖链）。

---

## 后续 Stage 路线图

| Stage | 内容 | 关键文件（待创建）|
|---|---|---|
| **D** ✅ | Camera 系统（pixi-viewport） | `src/pixi/systems/CameraSystem.ts` (已创建) |
| **E** | Persona Bridge + 背景层 | `src/pixi/bridges/persona-bridge.ts`、`src/pixi/systems/BackgroundSystem.ts` |
| **F** | 卡片 Sprite（占位色块、LOD、Variant Stack）| `src/pixi/bridges/card-bridge.ts`、`src/pixi/systems/CardSystem.ts` |
| **G** | Hover 交互 + HTMLText 文字层 | CardSystem 扩展 |
| **H** | InspectOverlay（DOM 检视态）| `src/app/components/ui/canvas/InspectOverlay.tsx` |
| **I** | 拖拽系统（Pointer events + Edge Pan）| CardSystem 扩展 |
| **J** | 落点检测（Grid Snap + 设备碰撞）| `src/pixi/systems/DropSystem.ts` |
| **K** | 真实卡片视觉（SVG → Texture）| `src/pixi/systems/TextureCache.ts` |
| **L** | 画布动画（GSAP + 粒子）| `src/pixi/systems/AnimationSystem.ts` |
| **M** | 设备双态（SynthesisCircle / Grimoire）| `src/pixi/systems/DeviceSystem.ts` |
| **N** | Dock / Library / DeckRepository 重新接入 | 新 React 组件 |
| **O** | 删除磁盘上保留的旧组件文件 | — |

每个 Stage 开始前应在本对话中单独规划，不要直接开始实现。

---

## 开发约定

1. **PixiJS 系统模块不 import React**，通过 `getPixiApp()` + 模块级单例访问渲染器
2. **React Bridge 组件**（如未来的 `PixiPersonaBridge`、`PixiCardBridge`）是零渲染 React 组件，负责订阅 React 状态并写入 JS 模块，不做任何渲染
3. **游戏数据单向流动**：Zustand/Dexie → Bridge → PixiJS 系统，反方向通过回调（不通过 React state）
4. **HMR 注意**：PixiJS 模块级单例在热更新时会残留，在 `app.ts` 加了 `import.meta.hot.dispose` 钩子（待 Stage D 实现时加入）

---

## 相关文档

- `docs/refactor-pixi/roadmap.md` — Stage A–O 完整路线图
- `docs/refactor-pixi/troubleshooting-pixi-vite-react.md` — PixiJS v8 + Vite + React 坑位全集
- `docs/refactor-pixi/archive/` — 旧 feature-flag 迁移方案（phase01–07），含大量已验证的实现决策（坐标系、Persona Bridge 设计、Variant Stack 等），是后续 Stage 的重要参考
