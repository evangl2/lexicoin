# Lexicoin · Phase 2 实施计划
# Persona Bridge + 画布背景层

本文件是 Phase 2 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 决策速查

| 项 | 决策 |
|---|---|
| Persona Bridge 架构 | 纯 JS 模块 + 事件系统 |
| 背景旋转驱动 | 时间驱动（GSAP），不再绑定 camera 位置 |
| Animation Gate | 移除 |
| Blend mode 保真度 | 尽力匹配，ADD ≈ plus-lighter |
| 渐变/SacredGeometry | PixiJS 技术重做，不还原 CSS |
| ScriptNoise | TilingSprite + viewport 位置视差 |
| MetalTexture | **整层删除** |
| TransmutationCircle | **整层删除** |
| Cyberpunk | 简易 PixiJS 占位（验证热拔插） |
| GridSystem | Phase 2，Figma 风格点阵网格 |
| 世界边界 | 明显视觉提示（"悬崖感"） |
| 背景动画 | 全部为占位符，代码注释说明 |
| Persona 切换过渡 | 瞬间切换 |
| GPU 预算 | 低（优先性能） |

---

## 前置步骤：InnerMechanics 确认

**在实施前执行：**
```bash
grep -r "InnerMechanics" src/ --include="*.tsx" --include="*.ts"
```
- 若无实际使用 → 跳过，Phase 2 不处理
- 若有实现 → 补充到本计划的背景层列表

---

## 架构概览

```
Persona 切换（React → Zustand uiTheme）
    ↓
PixiPersonaBridge（零渲染 React 组件，监听 PersonaContext）
    ↓
persona-bridge.ts（纯 JS 模块，setPersonaData → emitChange）
    ↓
BackgroundSystem.onPersonaChange()
    ↓
destroy 旧背景 → new DefaultBackground() 或 new CyberpunkBackground()
    ↓
background.init(stage, viewport, personaData)
    ├── screenContainer（addChildAt(0)，在 viewport 之下）
    │   ├── VoidLayer          # 屏幕空间，固定
    │   ├── ScriptNoiseLayer   # 屏幕空间，viewport 位置视差
    │   ├── GeometryLayer      # 屏幕空间，呼吸动画（占位）
    │   ├── RotatingCornerLayer # 屏幕空间，GSAP 旋转（占位）
    │   ├── EdgeLayer          # 屏幕空间，静态
    │   └── VignetteLayer      # 屏幕空间，固定
    └── worldContainer（addChildAt(0)，在 viewport 内最底层）
        ├── GridLayer          # 世界空间，缩放驱动透明度
        └── WorldEdgeLayer     # 世界空间，边界轮廓
```

---

## 文件结构（新增）

```
src/pixi/
├── persona-bridge.ts               # Persona 数据桥（纯 JS 模块）
├── utils/
│   └── colors.ts                   # hexToNumber 等颜色工具
├── backgrounds/
│   ├── IBackground.ts              # 背景接口定义
│   ├── DefaultBackground.ts        # 默认 Persona 背景（炼金术）
│   └── CyberpunkBackground.ts      # Cyberpunk 背景（占位，热拔插测试）
└── systems/
    └── BackgroundSystem.ts         # 背景场景管理器

src/app/components/ui/canvas/
└── PixiPersonaBridge.tsx           # 零渲染 React 桥接组件
```

**修改已有文件：**
- `src/pixi/core/app.ts` — init 中加入 BackgroundSystem
- `src/pixi/core/resize.ts` — resize 中通知 BackgroundSystem
- `src/app/App.tsx` — GameShell 中加入 `<PixiPersonaBridge />`

---

## 一、persona-bridge.ts

```typescript
// src/pixi/persona-bridge.ts
// 纯 JS 模块，不 import React。PixiJS 侧直接 import 读取。
// React 侧由 PixiPersonaBridge 组件写入。

export interface PixiPersonaData {
  theme: string          // 'default' | 'cyberpunk' | ...
  bgVoid: number         // 0x0a0502，用于 VoidLayer 和 PixiApp 背景色
  primary: number        // 0xD4AF37，用于几何装饰色
  scriptTexture: string  // SVG data URI，ScriptNoise 纹理
  // 未来如需更多字段按需添加
}

type ChangeListener = (data: PixiPersonaData) => void

let _current: PixiPersonaData | null = null
const _listeners = new Set<ChangeListener>()

export function getPersonaData(): PixiPersonaData | null {
  return _current
}

export function setPersonaData(data: PixiPersonaData): void {
  _current = data
  _listeners.forEach(fn => fn(data))
}

export function onPersonaChange(fn: ChangeListener): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)  // 返回 unsubscribe
}
```

**`PixiPersonaData` 字段来源（从 CanvasPersona 提取）：**
- `theme` ← `activeSkin`（Zustand `uiTheme`）
- `bgVoid` ← `canvas.palette.colors.bgVoid`，CSS hex → number
- `primary` ← `canvas.palette.colors.primary`，CSS hex → number
- `scriptTexture` ← `canvas.assets?.textures?.script ?? ''`

---

## 二、utils/colors.ts

```typescript
// src/pixi/utils/colors.ts
export function hexToNumber(cssHex: string): number {
  return parseInt(cssHex.replace('#', ''), 16)
}
```

---

## 三、PixiPersonaBridge.tsx（React 侧）

```typescript
// src/app/components/ui/canvas/PixiPersonaBridge.tsx
// 零渲染组件。放在 GameShell 里 PixiRoot 旁边。
// 监听 PersonaContext，变化时写入 persona-bridge.ts。

import { useEffect } from 'react'
import { useCanvasPersona } from '@/app/context/PersonaContext'
import { useGameStore } from '@store/index'
import { setPersonaData } from '@/pixi/persona-bridge'
import { hexToNumber } from '@/pixi/utils/colors'

export function PixiPersonaBridge() {
  const canvas = useCanvasPersona()
  const theme = useGameStore(s => s.uiTheme)

  useEffect(() => {
    setPersonaData({
      theme,
      bgVoid: hexToNumber(canvas.palette.colors.bgVoid),
      primary: hexToNumber(canvas.palette.colors.primary),
      scriptTexture: canvas.assets?.textures?.script ?? '',
    })
  }, [canvas, theme])

  return null
}
```

**在 `src/app/App.tsx` 的 GameShell return 中加入：**
```tsx
<PixiPersonaBridge />   {/* 在 <PixiRoot /> 旁边 */}
<PixiRoot />
```

> `PixiPersonaBridge` 必须在 PersonaProvider 和 PixiRoot 两者的内部，渲染顺序在 PixiRoot 之前（确保 PixiJS 初始化时已有 persona 数据）。但因为 initPixiApp 是异步的，实际上先后顺序影响不大——BackgroundSystem 在 init 时读一次 `getPersonaData()`，之后靠 `onPersonaChange` 响应。

---

## 四、IBackground.ts

```typescript
// src/pixi/backgrounds/IBackground.ts
import type { Container } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import type { PixiPersonaData } from '../persona-bridge'

export interface IBackground {
  /**
   * 初始化背景。
   * 屏幕空间容器自行 addChildAt(stage, 0)（在 viewport 之前）
   * 世界空间容器自行 addChildAt(viewport, 0)（在卡片之前）
   */
  init(stage: Container, viewport: Viewport, persona: PixiPersonaData): void

  /** 销毁所有容器、动画、事件监听 */
  destroy(): void

  /** 窗口 resize 时调用；屏幕空间层需要重绘 */
  onResize(screenW: number, screenH: number): void
}
```

---

## 五、BackgroundSystem.ts

```typescript
// src/pixi/systems/BackgroundSystem.ts
import type { Container } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { getPersonaData, onPersonaChange, type PixiPersonaData } from '../persona-bridge'
import { DefaultBackground } from '../backgrounds/DefaultBackground'
import { CyberpunkBackground } from '../backgrounds/CyberpunkBackground'
import type { IBackground } from '../backgrounds/IBackground'

let _stage: Container | null = null
let _viewport: Viewport | null = null
let _current: IBackground | null = null
let _unsubscribe: (() => void) | null = null

function resolveBackground(theme: string): new () => IBackground {
  switch (theme) {
    case 'cyberpunk': return CyberpunkBackground
    default: return DefaultBackground
  }
}

function switchTo(persona: PixiPersonaData): void {
  _current?.destroy()
  const Ctor = resolveBackground(persona.theme)
  _current = new Ctor()
  _current.init(_stage!, _viewport!, persona)
}

export function initBackground(stage: Container, viewport: Viewport): void {
  _stage = stage
  _viewport = viewport

  // 初始化：读当前 persona（可能 PixiPersonaBridge 已写入）
  const initial = getPersonaData()
  if (initial) switchTo(initial)

  // 订阅后续 Persona 切换
  _unsubscribe = onPersonaChange(switchTo)
}

export function destroyBackground(): void {
  _unsubscribe?.()
  _unsubscribe = null
  _current?.destroy()
  _current = null
  _stage = null
  _viewport = null
}

export function resizeBackground(w: number, h: number): void {
  _current?.onResize(w, h)
}
```

**在 `src/pixi/core/app.ts` 中加入：**
```typescript
import { initBackground, destroyBackground } from '../systems/BackgroundSystem'
import { initCamera } from '../systems/CameraSystem'

// initPixiApp 末尾：
initCamera(app)
initBackground(app.stage, getViewport()!)   // Phase 2 追加

// destroyPixiApp 中：
destroyBackground()    // Phase 2 追加（在 destroyCamera 之前）
destroyCamera()
```

**在 `src/pixi/core/resize.ts` 中加入：**
```typescript
import { resizeBackground } from '../systems/BackgroundSystem'
// handler 中追加：
resizeBackground(window.innerWidth, window.innerHeight)
```

---

## 六、DefaultBackground.ts

**PLACEHOLDER 说明：所有图层均为视觉占位符，未定稿美术风格（神秘炼金术实验室）。实际美术替换时保持接口不变，替换内部实现。**

### 层结构

| 层 | 空间 | 实现 | 混合模式 |
|---|---|---|---|
| VoidLayer | 屏幕 | Graphics 纯色矩形（bgVoid 色） | NORMAL |
| ScriptNoiseLayer | 屏幕 | TilingSprite（script SVG 纹理）+ viewport 视差 | COLOR_DODGE |
| GeometryLayer | 屏幕 | Graphics 六边形轮廓，GSAP alpha 呼吸 | SCREEN |
| RotatingCornerLayer | 屏幕 | 4 角 Graphics 多边形，GSAP 持续旋转 | ADD |
| EdgeLayer | 屏幕 | 4 边 TilingSprite（script 纹理），静态 | ADD |
| VignetteLayer | 屏幕 | 离屏 Canvas 径向渐变 → Sprite | NORMAL |
| GridLayer | 世界 | TilingSprite 点阵（两级），缩放驱动 alpha | NORMAL |
| WorldEdgeLayer | 世界 | Graphics 矩形轮廓（世界边界） | NORMAL |

### 关键实现细节

#### VoidLayer
```typescript
// 纯色矩形覆盖全屏，颜色来自 persona.bgVoid
// 注意：resize 时需要重绘（改变 width/height 或重新 rect()）
const void_ = new Graphics()
void_.rect(0, 0, screenW, screenH).fill(persona.bgVoid)
// TODO 美术：将来替换为分层渐变，中心稍暖（炼金炉光感），边缘深黑
```

#### ScriptNoiseLayer
```typescript
// TilingSprite 覆盖全屏，tileScale 按需调整密度
// 视差：监听 viewport 'moved' 事件
const texture = await Assets.load(persona.scriptTexture)
const script = new TilingSprite({ texture, width: screenW, height: screenH })
script.blendMode = 'color-dodge'  // PIXI v8 字符串 API
script.alpha = 0.15

viewport.on('moved', () => {
  script.tilePosition.x = viewport.x * 0.05
  script.tilePosition.y = viewport.y * 0.05
})
// TODO 美术：将来替换为定制的文字纹理（当前语言相关字符）
```

#### GeometryLayer（占位 → 六边形呼吸）
```typescript
// PixiJS Graphics 画一个简单六边形轮廓，居中屏幕
// GSAP 驱动 alpha 0.05 ↔ 0.15，周期 6s，sine.inOut
// TODO 美术：占位几何图形。将来替换为 Persona 专属炼金几何装饰
gsap.to(geometry, { alpha: 0.15, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' })
```

#### RotatingCornerLayer（占位 → 角落旋转）
```typescript
// 4 角各放一个 Graphics 多边形（八边形或齿轮形简化）
// 位置：距各角 (padding, padding)，随 resize 重定位
// GSAP 旋转：两个顺时针（左上+右下），两个逆时针（右上+左下）
// 速度：完整一圈约 25-40s（极慢，环境感）
// 混合：ADD，低 alpha（0.12）
// TODO 美术：占位几何形状。将来替换为 Persona 专属角落装饰
// NOTE 游戏设计建议：角落旋转元素可在未来与体力值联动（体力低时减速）
const corners = [TL, TR, BL, BR]
gsap.to([TL, BR], { rotation: '+=6.283', duration: 30, repeat: -1, ease: 'none' })
gsap.to([TR, BL], { rotation: '-=6.283', duration: 35, repeat: -1, ease: 'none' })
```

#### EdgeLayer
```typescript
// 4 边 TilingSprite，各覆盖一条边（上/下/左/右），静态
// 宽度约 120px（边缘装饰带），纹理同 ScriptNoise
// 混合：ADD，alpha 0.08
// TODO 美术：占位文字纹理。将来替换为 Persona 专属边缘符文
```

#### VignetteLayer
```typescript
// 离屏 Canvas 2D 生成径向渐变：中心透明 → 边缘深色
// 尺寸固定 1024×1024，stretch 到全屏（渐变形状不受影响）
// resize 时：调整 sprite 的 width/height，不需要重生成纹理
const oc = document.createElement('canvas')
oc.width = oc.height = 1024
const ctx = oc.getContext('2d')!
const grad = ctx.createRadialGradient(512, 512, 0, 512, 512, 512)
grad.addColorStop(0.45, 'rgba(0,0,0,0)')
grad.addColorStop(1, `rgba(${r},${g},${b},0.88)`)  // bgVoid 色分量
ctx.fillStyle = grad
ctx.fillRect(0, 0, 1024, 1024)
const vignetteTexture = Texture.from(oc)
```

#### GridLayer（世界空间）
```typescript
// 两级点阵（Figma 风格）
// 细格（280×380，与 GRID_CELL_W/H 对齐）：小白点 r=1.5px
// 粗格（每 4×3 格 = 1120×1140）：较大点 r=2.5px 或十字标记
// 两个 TilingSprite 叠加，覆盖整个世界（WORLD_W × WORLD_H）
// 缩放驱动：viewport 'zoomed' 事件 → 更新 alpha

viewport.on('zoomed', () => {
  const s = viewport.scale.x
  fineGrid.alpha = Math.max(0, Math.min(0.25, (s - 0.2) / 0.3 * 0.25))
  coarseGrid.alpha = Math.max(0, Math.min(0.35, (s - 0.08) / 0.12 * 0.35))
})

// 点阵纹理生成（离屏 Canvas）：
// fineGridTexture: 280×380 canvas，中心画 r=1.5 白点
// coarseGridTexture: 1120×1140 canvas，中心画 r=2.5 点 + 可选十字
// alpha 颜色来自 persona.primary（非常淡）

// TODO 游戏设计建议：拖拽卡片时可临时提升 fineGrid.alpha（像磁场线）
```

#### WorldEdgeLayer（世界空间）
```typescript
// 世界边界轮廓线，在 viewport 坐标系内
// 用 Graphics.rect(0, 0, WORLD_W, WORLD_H).stroke({ color, width: 3 })
// 颜色比 bgVoid 略亮（让玩家感知到边界）
// 可选：在边界内侧 40px 加一圈半透明渐变阴影（内发光反向）
// 目的：Q3 "悬崖感"——玩家缩放看到边缘时清楚知道世界在这里结束
const edgeColor = lighten(persona.bgVoid, 0.12)  // 工具函数：稍微提亮
edge.rect(0, 0, WORLD_W, WORLD_H).stroke({ color: edgeColor, width: 3, alpha: 0.6 })
```

### DefaultBackground 骨架

```typescript
// src/pixi/backgrounds/DefaultBackground.ts
import { Container, Graphics, TilingSprite, Sprite, Texture, Assets } from 'pixi.js'
import { gsap } from 'gsap'
import type { Viewport } from 'pixi-viewport'
import type { IBackground } from './IBackground'
import type { PixiPersonaData } from '../persona-bridge'
import { WORLD_W, WORLD_H } from '@/config/canvas'

export class DefaultBackground implements IBackground {
  private screenContainer = new Container()
  private worldContainer = new Container()
  private gsapCtx: gsap.Context | null = null
  private viewportMoveCleanup: (() => void) | null = null
  private viewportZoomCleanup: (() => void) | null = null

  async init(stage: Container, viewport: Viewport, persona: PixiPersonaData) {
    // 屏幕空间容器：插入在 viewport 之前（z-index 最低）
    stage.addChildAt(this.screenContainer, 0)
    // 世界空间容器：插入在 viewport 内最底层
    viewport.addChildAt(this.worldContainer, 0)

    this.gsapCtx = gsap.context(() => {
      this.buildVoidLayer(persona)
      this.buildScriptNoiseLayer(persona, viewport)
      this.buildGeometryLayer(persona)
      this.buildRotatingCornerLayer()
      this.buildEdgeLayer(persona)
      this.buildVignetteLayer(persona)
    })

    this.buildGridLayer(persona, viewport)
    this.buildWorldEdgeLayer(persona)
  }

  destroy() {
    this.gsapCtx?.revert()
    this.viewportMoveCleanup?.()
    this.viewportZoomCleanup?.()
    this.screenContainer.destroy({ children: true })
    this.worldContainer.destroy({ children: true })
  }

  onResize(w: number, h: number) {
    // 重绘所有屏幕空间层（见各层 resize 说明）
  }

  private buildVoidLayer(persona: PixiPersonaData) { /* ... */ }
  private buildScriptNoiseLayer(persona: PixiPersonaData, viewport: Viewport) { /* ... */ }
  private buildGeometryLayer(persona: PixiPersonaData) { /* ... */ }
  private buildRotatingCornerLayer() { /* ... */ }
  private buildEdgeLayer(persona: PixiPersonaData) { /* ... */ }
  private buildVignetteLayer(persona: PixiPersonaData) { /* ... */ }
  private buildGridLayer(persona: PixiPersonaData, viewport: Viewport) { /* ... */ }
  private buildWorldEdgeLayer(persona: PixiPersonaData) { /* ... */ }
}
```

> `gsap.context()` 用于管理所有 GSAP 动画的生命周期，`ctx.revert()` 时自动清理全部动画。

---

## 七、CyberpunkBackground.ts

**目的：验证 Persona 热拔插机制，不做完整 Cyberpunk 视觉设计。**

```typescript
// src/pixi/backgrounds/CyberpunkBackground.ts
// PLACEHOLDER：Cyberpunk 背景的最简实现。
// 目的：测试 BackgroundSystem 的 Persona 切换（热拔插）是否正确工作。
// 实际 Cyberpunk 背景在后续独立 Phase 中重新设计。

export class CyberpunkBackground implements IBackground {
  private screenContainer = new Container()
  private worldContainer = new Container()
  private gsapCtx: gsap.Context | null = null

  init(stage: Container, viewport: Viewport, persona: PixiPersonaData) {
    stage.addChildAt(this.screenContainer, 0)
    viewport.addChildAt(this.worldContainer, 0)

    // 深蓝黑背景 + 青绿色调
    const CYBER_VOID = 0x000808
    const CYBER_PRIMARY = 0x00FF88

    // VoidLayer: 深蓝黑
    const bg = new Graphics().rect(0, 0, window.innerWidth, window.innerHeight).fill(CYBER_VOID)
    this.screenContainer.addChild(bg)

    // 极简扫描线：repeating horizontal lines，低 alpha
    const scanLines = new Graphics()
    for (let y = 0; y < window.innerHeight; y += 4) {
      scanLines.moveTo(0, y).lineTo(window.innerWidth, y)
    }
    scanLines.stroke({ color: CYBER_PRIMARY, alpha: 0.03, width: 1 })
    this.screenContainer.addChild(scanLines)

    // 角落：小矩形框（HUD 感）+ 极慢呼吸
    this.gsapCtx = gsap.context(() => {
      [/* 4 corner rects */].forEach(rect => {
        gsap.to(rect, { alpha: 0.6, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      })
    })

    // Grid: 简单青绿色点阵
    this.buildGridLayer(CYBER_PRIMARY, viewport)
  }

  destroy() {
    this.gsapCtx?.revert()
    this.screenContainer.destroy({ children: true })
    this.worldContainer.destroy({ children: true })
  }

  onResize(w: number, h: number) { /* 重绘背景和扫描线 */ }
  private buildGridLayer(color: number, viewport: Viewport) { /* 同 DefaultBackground */ }
}
```

---

## 八、修改文件汇总

| 文件 | 修改内容 |
|---|---|
| `src/pixi/core/app.ts` | `initPixiApp` 末尾加 `initBackground()`；`destroyPixiApp` 加 `destroyBackground()` |
| `src/pixi/core/resize.ts` | `handler` 中加 `resizeBackground(w, h)` |
| `src/app/App.tsx` | GameShell return 中加 `<PixiPersonaBridge />` |

---

## 九、执行顺序

1. `grep -r "InnerMechanics"` 确认状态
2. 新建 `src/pixi/utils/colors.ts`
3. 新建 `src/pixi/persona-bridge.ts`
4. 新建 `src/pixi/backgrounds/IBackground.ts`
5. 新建 `src/pixi/systems/BackgroundSystem.ts`（先写接口，build/destroy 留空）
6. 新建 `src/app/components/ui/canvas/PixiPersonaBridge.tsx`
7. 修改 `src/app/App.tsx`（加 PixiPersonaBridge）
8. **验证 Persona Bridge**：Console 打印 `getPersonaData()`，切换 Persona 确认数据更新
9. 实现 `DefaultBackground.ts`（层序：Void → ScriptNoise → Geometry → Corners → Edge → Vignette → Grid → WorldEdge）
10. 修改 `src/pixi/core/app.ts` 和 `resize.ts`（接入 BackgroundSystem）
11. **验证 Default 背景**
12. 实现 `CyberpunkBackground.ts`
13. **验证热拔插**

---

## 十、验证清单

### Persona Bridge
- [ ] `PixiPersonaBridge` 挂载后，`console.log(getPersonaData())` 输出正确 persona 数据
- [ ] DevConsole 切换 Persona（default ↔ cyberpunk）→ `onPersonaChange` 回调触发，数据更新
- [ ] persona-bridge.ts 中无任何 React import

### Default 背景
- [ ] PixiJS 画布显示暗色背景（bgVoid 色）
- [ ] ScriptNoise 层可见（极轻微文字纹理叠加），平移画布时纹理有轻微视差偏移
- [ ] 几何层可见（极低透明度六边形），alpha 缓慢呼吸
- [ ] 4 角旋转装饰：两个顺时针、两个逆时针，速度极慢（25-35s 一圈）
- [ ] Vignette：屏幕四边有暗色渐变压角
- [ ] 网格：zoomed in（scale > 0.3）时细点阵可见；zoomed out 时不可见或极淡
- [ ] 世界边界：缩放到全局视角时，9600×6000 世界范围有可见的矩形轮廓
- [ ] 旧系统（flag=false）完全不受影响

### 热拔插
- [ ] DevConsole 切换 Persona → 背景**立即**切换（无闪烁或残留）
- [ ] Cyberpunk 背景：深蓝黑背景 + 扫描线 + 青绿色点阵
- [ ] 连续多次切换（default → cyberpunk → default）：无内存泄漏（GSAP 动画被正确清理）
- [ ] 切换后旋转动画正常运行（不出现 GSAP 孤儿 tween）

### resize
- [ ] 窗口缩放：所有屏幕空间层正确覆盖新尺寸，无黑边或溢出

---

## 十一、参考文件

| 文件 | 用途 |
|---|---|
| `src/app/context/PersonaContext.tsx` | `useCanvasPersona()` hook |
| `src/app/types/persona.types.ts` | `CanvasPersona` 类型，`CanvasSlots` |
| `src/app/components/persona/default/Canvas.persona.default.tsx` | script SVG data URI 等纹理资源 |
| `src/app/components/persona/default/index.ts` | `assets.textures` 字段路径 |
| `src/config/canvas.ts` | `WORLD_W`, `WORLD_H`, `GRID_VIS` |
| `src/app/hooks/useGridSnap.ts` | `GRID_CELL_W = 280`, `GRID_CELL_H = 380` |
| `src/config/visual.ts` | `CANVAS_PARALLAX_FACTOR = 0.015`（历史参考） |
| `src/app/components/ui/canvas/Canvas.tsx` L337-352 | 原旋转/视差驱动逻辑（历史参考，不还原） |
