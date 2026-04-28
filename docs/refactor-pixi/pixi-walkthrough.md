# Lexicoin · PixiJS v8 重写 Walkthrough

**面向对象：** 接手本项目的 AI 模型或开发者。  
**目的：** 理解 Stage A–C 做了什么、为什么这么做、现在代码处于什么状态、下一步从哪里接。

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

## 当前状态（Stage C 完成后）

```
浏览器打开 localhost:5173
→ 模块初始化（Dexie、Zustand、services）
→ PixiJS Application 初始化（WebGL 渲染器）
→ 全屏深色背景（#0a0a0f）
→ 右上角 pixi-stats overlay（仅 dev）
→ 右下角 DevConsole（可切 Persona / 查看 store / Cheat）
```

游戏数据已在 IndexedDB 中，但画布上什么都没有——这是预期状态，等待后续 Stage 把内容接进来。

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
├── core/
│   ├── app.ts             # Application 模块单例（getPixiApp / initPixiApp / destroyPixiApp）
│   ├── resize.ts          # window resize → renderer.resize()
│   └── stats.ts           # pixi-stats dev overlay（仅 DEV 模式）
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
        initResizeHandler(app);
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
└── src/pixi/core/stats.ts       # pixi-stats dev overlay
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

这些在整个 PixiJS 重写过程中**不会被修改**。新 PixiJS 系统直接消费这些数据层。

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
| **D** | Camera 系统（pixi-viewport） | `src/pixi/systems/CameraSystem.ts` |
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
