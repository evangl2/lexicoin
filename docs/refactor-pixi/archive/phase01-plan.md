# Lexicoin · Phase 0+1 实施计划

本文件是 Phase 0（基础设施）和 Phase 1（Camera 系统）的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体阶段规划见 `pixi_migration_plan.md`。

---

## 依赖安装

```bash
# 生产依赖
npm install pixi.js@^8 gsap@^3.12 pixi-viewport

# 开发依赖
npm install -D @pixi/stats
```

> **重要**：安装前先验证 pixi-viewport 与 pixi.js v8 的兼容性：
> ```bash
> npm info pixi-viewport peerDependencies
> ```
> 若 pixi-viewport 官方包尚未支持 v8，在此处记录处理方案（社区 fork / 临时降级 / 直接实现等）。

---

## 目录结构

安装依赖后，创建以下目录骨架（Phase 0+1 只填充标注的文件，其余空文件占位）：

```
src/pixi/
├── core/
│   ├── app.ts              ← Phase 0：Application 单例
│   ├── resize.ts           ← Phase 0：window resize handler
│   └── stats.ts            ← Phase 0：PixiJS Stats dev overlay
├── systems/
│   └── CameraSystem.ts     ← Phase 1：pixi-viewport camera
├── hooks/
│   └── usePixiApp.ts       ← Phase 1：React hook
└── config.ts               ← Phase 0：Application 配置工厂
```

---

## Phase 0 · 基础设施

### 变更文件清单

| 文件 | 操作 |
|---|---|
| `src/core/store/slices/featureFlags.ts` | 修改：添加 flag |
| `src/pixi/config.ts` | 新建 |
| `src/pixi/core/app.ts` | 新建 |
| `src/pixi/core/resize.ts` | 新建 |
| `src/pixi/core/stats.ts` | 新建 |
| `src/app/components/ui/canvas/PixiRoot.tsx` | 新建 |
| `src/app/App.tsx` | 修改：GameShell 加入 PixiRoot，旧系统 display:none |
| `src/app/components/system/DevConsole.tsx` | 修改：Cheat tab 加 toggle |

---

### `src/core/store/slices/featureFlags.ts`

扩展 `FeatureFlagsState['featureFlags']` 类型，新增两个 flag：

```typescript
featureFlags: {
  usePixiCanvas: boolean    // 默认 true
  antialiasEnabled: boolean // 默认 true，切换需 reinit PixiJS renderer
}
```

默认值在 slice 初始化时设定：
```typescript
featureFlags: {
  usePixiCanvas: true,
  antialiasEnabled: true,
}
```

---

### `src/pixi/config.ts`

```typescript
import type { ApplicationOptions } from 'pixi.js'

export function buildPixiConfig(antialias: boolean): Partial<ApplicationOptions> {
  return {
    preference: 'webgl',
    antialias,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
    backgroundAlpha: 0,
    preserveDrawingBuffer: false,
    hello: false,
  }
}
```

---

### `src/pixi/core/app.ts`

模块级单例，PixiJS 内部模块和 React hook 均通过 `getPixiApp()` 访问。

```typescript
import { Application } from 'pixi.js'
import { buildPixiConfig } from '../config'

let _app: Application | null = null
let _cleanupResize: (() => void) | null = null

export function getPixiApp(): Application | null {
  return _app
}

export async function initPixiApp(
  canvas: HTMLCanvasElement,
  antialias: boolean
): Promise<Application> {
  const app = new Application()
  await app.init({ canvas, ...buildPixiConfig(antialias) })
  _app = app

  // Phase 0 占位背景：等 Phase 2 Persona Bridge 完成后替换为动态 bgVoid 颜色
  const { Graphics } = await import('pixi.js')
  const bg = new Graphics()
  bg.rect(0, 0, app.screen.width, app.screen.height).fill(0x0a0a0f)
  bg.label = 'bg-placeholder'
  app.stage.addChild(bg)

  return app
}

export function destroyPixiApp(): void {
  _cleanupResize?.()
  _cleanupResize = null
  // Phase 1 加入：destroyCamera()
  _app?.destroy(false, { children: true })
  _app = null
}

export async function reinitPixiApp(
  canvas: HTMLCanvasElement,
  antialias: boolean
): Promise<Application> {
  destroyPixiApp()
  return initPixiApp(canvas, antialias)
  // Phase 8 TODO：reinit 后纹理缓存重建（当前无纹理，安全）
}

// Phase 1 时在 initPixiApp 末尾插入：
// import { initCamera } from '../systems/CameraSystem'
// initCamera(app)
```

---

### `src/pixi/core/resize.ts`

```typescript
import { Application } from 'pixi.js'
// Phase 1 加入：import { getViewport } from '../systems/CameraSystem'

export function initResizeHandler(app: Application): () => void {
  const handler = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    // Phase 1：
    // const vp = getViewport()
    // if (vp) {
    //   vp.resize(window.innerWidth, window.innerHeight)
    //   // 重算 min scale（屏幕比例变化后最小缩放值改变）
    //   const { WORLD_W, WORLD_H } = await import('@/config/canvas')
    //   const { ZOOM_MIN_FLOOR, ZOOM_MAX } = await import('@/config/physics')
    //   const minScale = Math.max(ZOOM_MIN_FLOOR, Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H))
    //   vp.clampZoom({ minScale, maxScale: ZOOM_MAX })
    // }
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
```

---

### `src/pixi/core/stats.ts`

```typescript
// dev-only：挂载 @pixi/stats overlay
import type { Application } from 'pixi.js'

let _statsEl: HTMLElement | null = null

export async function initPixiStats(app: Application): Promise<void> {
  if (!import.meta.env.DEV) return
  const { Stats } = await import('@pixi/stats')
  const stats = new Stats(app.renderer)
  stats.domElement.style.cssText = 'position:fixed;top:0;right:0;z-index:9999;'
  document.body.appendChild(stats.domElement)
  _statsEl = stats.domElement
  app.ticker.add(() => stats.update())
}

export function destroyPixiStats(): void {
  _statsEl?.remove()
  _statsEl = null
}
```

---

### `src/app/components/ui/canvas/PixiRoot.tsx`

```typescript
import { useEffect, useRef } from 'react'
import { initPixiApp, destroyPixiApp, reinitPixiApp } from '@/pixi/core/app'
import { initResizeHandler } from '@/pixi/core/resize'
import { initPixiStats, destroyPixiStats } from '@/pixi/core/stats'
import { useGameStore } from '@store/index'

export function PixiRoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const antialiasEnabled = useGameStore(s => s.featureFlags.antialiasEnabled)
  const cleanupResizeRef = useRef<(() => void) | null>(null)

  // 初始化（mount 时）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    initPixiApp(canvas, antialiasEnabled).then(app => {
      if (cancelled) { destroyPixiApp(); return }
      cleanupResizeRef.current = initResizeHandler(app)
      initPixiStats(app)
    })

    return () => {
      cancelled = true
      cleanupResizeRef.current?.()
      cleanupResizeRef.current = null
      destroyPixiStats()
      destroyPixiApp()
    }
  }, [])  // 只在 mount/unmount 时执行

  // antialias 切换（玩家在 DevConsole 改变设置）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // mount 首次执行由上面的 effect 负责，跳过
    const app = (await import('@/pixi/core/app').then(m => m.getPixiApp()))
    if (!app) return
    cleanupResizeRef.current?.()
    destroyPixiStats()
    reinitPixiApp(canvas, antialiasEnabled).then(newApp => {
      cleanupResizeRef.current = initResizeHandler(newApp)
      initPixiStats(newApp)
    })
  }, [antialiasEnabled])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
    />
  )
}
```

> 注：antialias useEffect 里使用动态 import 会有 lint 警告，可以改为顶层 import + ref 跳过首次。实际实现时按项目 lint 规则调整。

---

### `src/app/App.tsx`（GameShell 修改）

在 GameShell 的 return 中，将旧系统内容包裹到 `display:none` 容器，并添加 `PixiRoot`：

```tsx
import { PixiRoot } from '@/app/components/ui/canvas/PixiRoot'

// 在 GameShell 内，读取 flag：
const usePixiCanvas = useGameStore(s => s.featureFlags.usePixiCanvas)

// return 内结构：
return (
  <div className="w-full h-screen bg-black overflow-hidden relative">
    {/* PixiJS 全屏底层，始终挂载 */}
    <PixiRoot />

    {/* 旧系统，隐藏不卸载 */}
    <div style={{ display: usePixiCanvas ? 'none' : undefined, position: 'absolute', inset: 0 }}>
      {/* 原 SceneManager、DragLayer 等旧内容 */}
      <SceneManager ... />
      <DragLayer ... />
    </div>

    {/* DOM overlay 层，两套系统共用，始终可见 */}
    <ProgressionHUD />
    <LevelUpOverlay />
    <GrimoireOverlay />
    <Dock ... />
  </div>
)
```

旧系统的 `display:none` 容器用 `position:absolute inset-0` 保证布局不影响外层。

---

### `src/app/components/system/DevConsole.tsx`（Cheat tab 修改）

在 Cheat tab 末尾追加两个 toggle，使用现有 `setFeatureFlag`：

```tsx
// PixiJS Canvas toggle
<button onClick={() => setFeatureFlag('usePixiCanvas', !featureFlags.usePixiCanvas)}>
  PixiJS Canvas: {featureFlags.usePixiCanvas ? 'ON' : 'OFF'}
</button>

// Antialias toggle（切换后 PixiRoot 会监听并 reinit）
<button onClick={() => setFeatureFlag('antialiasEnabled', !featureFlags.antialiasEnabled)}>
  Antialias: {featureFlags.antialiasEnabled ? 'ON' : 'OFF'}
</button>
```

样式参照 Cheat tab 现有按钮风格。

---

### Phase 0 验证清单

- [ ] `npm run dev` 无 TypeScript 报错，无控制台 runtime 错误
- [ ] 默认打开：PixiJS canvas 填满屏幕，显示 `bgVoid` 深色背景（`0x0a0a0f`）
- [ ] PixiJS Stats overlay 出现在右上角（仅 dev 模式）
- [ ] DevConsole Cheat tab 有 "PixiJS Canvas" toggle
- [ ] 切换 `usePixiCanvas=false`：旧 DOM 系统完整显示，所有功能正常
- [ ] 旧系统验证：卡片显示 / 拖拽 / 背景动画 / Dock 全部正常
- [ ] 切回 `usePixiCanvas=true`：PixiJS canvas 恢复
- [ ] 窗口缩放：PixiJS canvas 正确填满 viewport，无黑边
- [ ] DevConsole Cheat tab 有 "Antialias" toggle，切换后 renderer 重建，视觉有细微变化
- [ ] Dock / HUD / DevConsole 在两种模式下均可见、可操作

---

## Phase 1 · Camera 系统

### 变更文件清单

| 文件 | 操作 |
|---|---|
| `src/pixi/systems/CameraSystem.ts` | 新建 |
| `src/pixi/hooks/usePixiApp.ts` | 新建 |
| `src/pixi/core/app.ts` | 修改：init 末尾加 initCamera |
| `src/pixi/core/resize.ts` | 修改：handler 内加 viewport resize |

---

### `src/pixi/systems/CameraSystem.ts`

```typescript
import { Application } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { WORLD_W, WORLD_H, CANVAS_OVERSCROLL } from '@/config/canvas'
import { ZOOM_MAX, ZOOM_MIN_FLOOR, ZOOM_SENSITIVITY, ZOOM_FRICTION } from '@/config/physics'

let _viewport: Viewport | null = null
let _wheelCleanup: (() => void) | null = null

export function getViewport(): Viewport | null {
  return _viewport
}

export function initCamera(app: Application): Viewport {
  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    events: app.renderer.events,
  })

  app.stage.addChild(viewport)

  // Pan
  viewport.drag({ mouseButtons: 'left' })

  // Inertia（decelerate 替代原 rAF 惯性循环）
  // friction 参数映射：pixi-viewport 的 friction 含义需对照文档确认（可能是每帧保留率，与 ZOOM_FRICTION 一致）
  viewport.decelerate({ friction: ZOOM_FRICTION })

  // Boundary clamp
  // TODO Phase 8: canvas-zooming CSS class equivalent（卡片 3D 降级在缩放期间）
  viewport.clamp({
    left: -CANVAS_OVERSCROLL.X,
    right: WORLD_W + CANVAS_OVERSCROLL.X,
    top: -CANVAS_OVERSCROLL.Y,
    bottom: WORLD_H + CANVAS_OVERSCROLL.Y,
  })

  // Zoom range
  const minScale = calcMinScale()
  viewport.clampZoom({ minScale, maxScale: ZOOM_MAX })

  // 初始位置：世界中心
  viewport.moveCenter(WORLD_W / 2, WORLD_H / 2)

  // 自定义 wheel handler（移植离散/连续轮检测）
  _wheelCleanup = attachWheelHandler(app.canvas as HTMLCanvasElement, viewport)

  _viewport = viewport
  return viewport
}

export function destroyCamera(): void {
  _wheelCleanup?.()
  _wheelCleanup = null
  _viewport?.destroy()
  _viewport = null
}

function calcMinScale(): number {
  return Math.max(
    ZOOM_MIN_FLOOR,
    Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H)
  )
}

function attachWheelHandler(canvas: HTMLCanvasElement, viewport: Viewport): () => void {
  const handler = (e: WheelEvent) => {
    e.preventDefault()

    // 移植自 Canvas.tsx：离散/连续轮检测
    const isDiscreteWheel = e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50

    if (isDiscreteWheel) {
      // 鼠标物理滚轮：一次性缩放，无惯性
      // pixi-viewport zoom API 以鼠标位置为中心
      const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY)
      const pivot = { x: e.clientX, y: e.clientY }
      viewport.zoomPercent(factor - 1, true)  // 确认 API：可能需要 pivot 参数
    } else {
      // 触控板连续滑动：交给 decelerate 插件处理惯性
      // 具体 API 在安装 pixi-viewport 后按文档确认（可能是 decelerate.addVelocity 或类似）
      const decelerate = viewport.plugins.get('decelerate') as any
      decelerate?.addVelocity?.(0, e.deltaY * ZOOM_SENSITIVITY)
    }
  }

  canvas.addEventListener('wheel', handler, { passive: false })
  return () => canvas.removeEventListener('wheel', handler)
}
```

> **实现注意**：`zoomPercent` 和 `decelerate.addVelocity` 的具体 API 名称以实际安装的 pixi-viewport 版本文档为准。上述为意图描述，若 API 不同按文档调整。

---

### `src/pixi/hooks/usePixiApp.ts`

```typescript
import { getPixiApp } from '../core/app'
import type { Application } from 'pixi.js'

export function usePixiApp(): Application | null {
  return getPixiApp()  // 调用方自行判空；mount 前返回 null
}
```

---

### `src/pixi/core/app.ts` 修改（追加 camera 初始化）

在 `initPixiApp` 中，`_app = app` 之后追加：

```typescript
import { initCamera } from '../systems/CameraSystem'
// ...
_app = app
initCamera(app)  // Phase 1 追加
```

在 `destroyPixiApp` 中，`_app.destroy` 之前追加：

```typescript
import { destroyCamera } from '../systems/CameraSystem'
// ...
destroyCamera()  // Phase 1 追加
_app?.destroy(false, { children: true })
```

---

### `src/pixi/core/resize.ts` 修改

解除注释 Phase 1 的 viewport resize 逻辑：

```typescript
import { getViewport } from '../systems/CameraSystem'
import { WORLD_W, WORLD_H } from '@/config/canvas'
import { ZOOM_MIN_FLOOR, ZOOM_MAX } from '@/config/physics'

export function initResizeHandler(app: Application): () => void {
  const handler = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    const vp = getViewport()
    if (vp) {
      vp.resize(window.innerWidth, window.innerHeight)
      const minScale = Math.max(
        ZOOM_MIN_FLOOR,
        Math.max(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H)
      )
      vp.clampZoom({ minScale, maxScale: ZOOM_MAX })
    }
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
```

---

### Phase 1 验证清单

- [ ] 鼠标左键拖拽：bgVoid 背景随 camera 移动（因为 viewport 是 stage 根容器，背景占位 Graphics 在其内）
- [ ] 鼠标物理滚轮：单次跳跃缩放，无拖尾惯性
- [ ] 触控板两指滑动：平滑缩放，放手后有惯性衰减，最终停止
- [ ] 最大缩放不超过 2x（ZOOM_MAX）
- [ ] 最小缩放不小于屏幕/世界比（世界边缘不出现在视口内）
- [ ] 拖拽到边界：有 overscroll 余量，不能无限平移
- [ ] 窗口 resize：camera 正确更新，min scale 重算，无黑边
- [ ] 旧系统（flag=false）：Canvas.tsx 的平移/缩放功能完全正常，Phase 1 代码对其无影响

---

## 参考文件

| 文件 | 用途 |
|---|---|
| `src/config/canvas.ts` | WORLD_W, WORLD_H, CANVAS_OVERSCROLL |
| `src/config/physics.ts` | ZOOM_MAX, ZOOM_MIN_FLOOR, ZOOM_SENSITIVITY, ZOOM_FRICTION |
| `src/app/components/ui/canvas/Canvas.tsx` L158-318 | 原 zoom inertia + 离散/连续检测算法（移植参考） |
| `src/app/hooks/useCanvasCamera.ts` | 原 camera hook（只读参考，不修改）|
| `src/core/store/slices/featureFlags.ts` | feature flag slice |
| `src/app/components/system/DevConsole.tsx` L103+ | Cheat tab 现有按钮风格参考 |
