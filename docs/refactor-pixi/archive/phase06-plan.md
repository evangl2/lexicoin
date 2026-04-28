# Lexicoin · Phase 6 实施计划
# 卡片拖拽（PixiJS Pointer Events）

本文件是 Phase 6 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 决策速查

| 项 | 决策 |
|---|---|
| 拖拽触发阈值 | 移动距离 ≥ 8px（A） |
| 残影 | 无，卡片直接跟手（A） |
| 边缘自动平移（Edge Pan）| 实现（G1），屏幕边缘 80px 区域触发，速度渐变 |
| viewport 平移暂停 | `viewport.plugins.pause('drag')`，拖拽结束 resume |
| 位置写回 | 拖拽结束：`fromPixiWorld()` → `db.cards.update(uid, {x, y})` 直接写 Dexie |
| DragLayer.tsx | 标注 deprecated（Phase 11 删除），`usePixiCanvas=true` 时不渲染 |
| react-dnd | 旧 Card.tsx 路径（flag=false）保留；PixiJS 路径（flag=true）时 Card 被 hidden，react-dnd 自然不触发 |

---

## 架构说明

拖拽逻辑**集成在 CardSystem.ts** 内，不单独新建文件，原因：
- 拖拽直接操作 `_metas`（共用 baseX/Y、hoverOffset 等）
- Stage-level 事件监听在 `initCardSystem` 中统一注册/注销

拖拽结束后**直接写入 Dexie**（`db.cards.update`），与 CardSystem 加载数据的路径一致，
无需经过 React 侧桥接（card-bridge.ts / PixiCardBridge.tsx 均不涉及）。

---

## 文件结构

**修改已有文件：**
- `src/pixi/systems/CardSystem.ts` — 追加 DragState + Stage 事件 + Edge Pan Ticker + Dexie 写回
- `src/app/components/ui/canvas/DragLayer.tsx` — 顶部加 deprecated 注释

---

## 一、CardSystem.ts 拖拽扩展（Phase 6）

### 1.1 常量与全局拖拽状态

```typescript
// 追加 import
import { db } from '@core/storage/db'
import { fromPixiWorld } from '../utils/coordinates'
import { getPixiApp } from '../core/app'
import type { FederatedPointerEvent } from 'pixi.js'

// 拖拽常量
const DRAG_THRESHOLD   = 8    // px，超过此距离才判定为拖拽（否则是点击）
const EDGE_PAN_ZONE    = 80   // px，距屏幕边缘多少 px 内触发 edge pan
const EDGE_PAN_MAX_SPD = 6    // screen px / frame，edge pan 最大速度

/** 当前活跃拖拽的状态（null = 无拖拽） */
interface DragState {
  meta: CardMeta
  pointerId: number
  startScreenX: number
  startScreenY: number
  started: boolean         // 是否已超过阈值（进入真正的拖拽）
  currentScreenX: number   // 实时指针屏幕坐标（Edge Pan ticker 读取）
  currentScreenY: number
}

let _activeDrag: DragState | null = null
let _edgePanTickerFn: (() => void) | null = null
```

### 1.2 Edge Pan（Ticker 驱动）

```typescript
/** 根据指针位置计算边缘平移速度（screen px/frame，正数向右/下，负数向左/上）*/
function calcEdgePanSpeed(pos: number, size: number): number {
  if (pos < EDGE_PAN_ZONE) {
    return -EDGE_PAN_MAX_SPD * (1 - pos / EDGE_PAN_ZONE)
  }
  if (pos > size - EDGE_PAN_ZONE) {
    return EDGE_PAN_MAX_SPD * ((pos - (size - EDGE_PAN_ZONE)) / EDGE_PAN_ZONE)
  }
  return 0
}

function startEdgePan(): void {
  const app = getPixiApp()
  if (!app || _edgePanTickerFn) return

  _edgePanTickerFn = () => {
    if (!_activeDrag?.started || !_viewport) return

    const { currentScreenX: px, currentScreenY: py } = _activeDrag
    const W = window.innerWidth
    const H = window.innerHeight

    const speedX = calcEdgePanSpeed(px, W)
    const speedY = calcEdgePanSpeed(py, H)

    if (speedX === 0 && speedY === 0) return

    // screen px → world units（÷ viewport scale）
    _viewport.moveCenter(
      _viewport.center.x + speedX / _viewport.scale.x,
      _viewport.center.y + speedY / _viewport.scale.y,
    )

    // 同步更新拖拽卡片位置（保持卡片在指针正下方）
    const worldPos = _viewport.toWorld(px, py)
    _activeDrag.meta.container.position.set(worldPos.x, worldPos.y)
    _activeDrag.meta.baseX = worldPos.x
    _activeDrag.meta.baseY = worldPos.y
  }

  app.ticker.add(_edgePanTickerFn)
}

function stopEdgePan(): void {
  const app = getPixiApp()
  if (!app || !_edgePanTickerFn) return
  app.ticker.remove(_edgePanTickerFn)
  _edgePanTickerFn = null
}
```

### 1.3 Stage-level 事件（在 initCardSystem 注册）

```typescript
function onStagePointerMove(e: FederatedPointerEvent): void {
  if (!_activeDrag || !_viewport) return

  _activeDrag.currentScreenX = e.global.x
  _activeDrag.currentScreenY = e.global.y

  const dx = e.global.x - _activeDrag.startScreenX
  const dy = e.global.y - _activeDrag.startScreenY

  if (!_activeDrag.started && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
    // ── 正式进入拖拽模式 ──
    _activeDrag.started = true

    // 视觉反馈：轻微放大 + 半透明
    gsap.to(_activeDrag.meta.container.scale, { x: 1.05, y: 1.05, duration: 0.15 })
    _activeDrag.meta.container.alpha = 0.85
    _activeDrag.meta.container.zIndex = 100

    // 光标变为 grabbing
    const canvas = getPixiApp()?.canvas
    if (canvas) (canvas as HTMLCanvasElement).style.cursor = 'grabbing'

    // 启动 Edge Pan ticker
    startEdgePan()
  }

  if (_activeDrag.started) {
    // 卡片跟手（屏幕坐标 → pixi 世界坐标）
    const worldPos = _viewport.toWorld(e.global.x, e.global.y)
    _activeDrag.meta.container.position.set(worldPos.x, worldPos.y)
    _activeDrag.meta.baseX = worldPos.x
    _activeDrag.meta.baseY = worldPos.y
  }
}

async function onStagePointerUp(e: FederatedPointerEvent): Promise<void> {
  if (!_activeDrag) return

  const drag = _activeDrag
  _activeDrag = null

  stopEdgePan()
  _viewport?.plugins.resume('drag')

  // 恢复光标
  const canvas = getPixiApp()?.canvas
  if (canvas) (canvas as HTMLCanvasElement).style.cursor = 'grab'

  if (!drag.started) {
    // 未超过阈值：是点击，Phase 5 的 container.on('pointerup') 已处理 inspect
    return
  }

  // ── 拖拽结束：恢复视觉 ──
  gsap.to(drag.meta.container.scale, { x: 1, y: 1, duration: 0.2 })
  drag.meta.container.alpha = 1
  drag.meta.container.zIndex = 0
  drag.meta.hoverOffset.x = 0
  drag.meta.hoverOffset.y = 0

  // 写回位置：pixi 世界坐标 → 旧系统中心原点坐标 → 直接写 Dexie
  const oldCoord = fromPixiWorld(drag.meta.baseX, drag.meta.baseY)
  await db.cards.update(drag.meta.uid, { x: oldCoord.x, y: oldCoord.y })
}
```

### 1.4 buildCardContainer 内的 pointerdown 扩展（合并 Phase 5 + Phase 6）

Phase 5 已在 `buildCardContainer` 内注册了 `pointerdown/pointerup`。  
Phase 6 **合并进同一个 `pointerdown`** 处理函数，共用 `_activeDrag` 变量：

```typescript
// 将 Phase 5 的 pointerdown 替换为合并版本：

container.on('pointerdown', (e) => {
  e.stopPropagation()    // 阻止 viewport 接收（防止画布同时平移）

  // Phase 5：记录 click 起点
  _pointerDownX = e.global.x
  _pointerDownY = e.global.y

  // Phase 6：初始化拖拽状态
  _activeDrag = {
    meta,
    pointerId: e.pointerId,
    startScreenX: e.global.x,
    startScreenY: e.global.y,
    started: false,
    currentScreenX: e.global.x,
    currentScreenY: e.global.y,
  }

  // 立即 pause viewport drag（belt-and-suspenders，stopPropagation 已阻止大多数情况）
  _viewport?.plugins.pause('drag')
})

// Phase 5 pointerup 保持不变：
// container.on('pointerup', ...) 检查 _activeDrag?.started，未拖拽则触发 inspect
```

**`_activeDrag` 的作用**：
- Phase 5 的 `container.on('pointerup')` 读取 `_activeDrag?.started` 决定是否触发 inspect
- Phase 6 的 `onStagePointerMove` 读取 `_activeDrag` 判断是否进入拖拽并更新位置
- Phase 6 的 `onStagePointerUp` 清空 `_activeDrag` 并直接写 Dexie

因此两个 Phase 的逻辑自然协作，不需要额外的 flag 变量。

### 1.5 initCardSystem 扩展（注册 Stage 事件）

```typescript
export function initCardSystem(viewport: Viewport): void {
  _viewport = viewport

  // ... 原有初始化 ...

  // Phase 6：Stage 级拖拽监听
  const stage = getPixiApp()!.stage
  stage.eventMode = 'static'  // Stage 需要 static 才能全局接收 pointer 事件
  stage.on('pointermove', onStagePointerMove)
  stage.on('pointerup', onStagePointerUp)
  stage.on('pointerupoutside', onStagePointerUp)  // 指针移出窗口时也触发结束
}
```

### 1.6 destroyCardSystem 扩展（注销 Stage 事件）

```typescript
export function destroyCardSystem(): void {
  // ... 原有清理 ...

  // Phase 6 清理
  stopEdgePan()
  _activeDrag = null

  const stage = getPixiApp()?.stage
  stage?.off('pointermove', onStagePointerMove)
  stage?.off('pointerup', onStagePointerUp)
  stage?.off('pointerupoutside', onStagePointerUp)
}
```

---

## 二、DragLayer.tsx deprecated 标注

```typescript
// src/app/components/ui/canvas/DragLayer.tsx 顶部追加注释：

// DEPRECATED: Phase 6 完成后，usePixiCanvas=true 路径的卡片拖拽
// 已由 CardSystem.ts 的 PixiJS pointer events 接管。
// 此组件仅在 usePixiCanvas=false（旧系统路径）时仍有效。
// Phase 11 清理旧系统时删除此文件。
```

---

## 三、完整交互流程（三 Phase 联动说明）

```
pointerdown（container）
  ├── stopPropagation()
  ├── 记录 click 起点（Phase 5）
  ├── 初始化 _activeDrag（Phase 6）
  └── pause viewport drag

pointermove（Stage，全局）
  ├── 更新 _activeDrag.currentScreenX/Y
  ├── 计算移动距离
  ├── ≥ 8px：_activeDrag.started = true，进入拖拽模式
  │         视觉反馈 + cursor='grabbing' + startEdgePan()
  └── started=true：卡片跟手（screen → world coords）

pointerup（container）
  ├── _activeDrag.started=false → 触发 inspect（Phase 5）
  └── _activeDrag.started=true → 忽略（Stage pointerup 处理）

pointerup（Stage，全局）
  ├── stopEdgePan()
  ├── resume viewport drag
  ├── started=false → 不处理（container pointerup 已处理）
  └── started=true → 恢复视觉 + fromPixiWorld() + db.cards.update()（直接写 Dexie）
```

---

## 四、执行顺序

1. 修改 `src/pixi/systems/CardSystem.ts`：
   - 追加 import（db、fromPixiWorld、getPixiApp、FederatedPointerEvent）
   - 追加常量、DragState 类型、`_activeDrag`、`_edgePanTickerFn`
   - 追加 `calcEdgePanSpeed`、`startEdgePan`、`stopEdgePan`
   - 追加 `onStagePointerMove`、`onStagePointerUp`
   - 合并 `buildCardContainer` 内的 `pointerdown`（Phase 5 + Phase 6）
   - 更新 `initCardSystem`、`destroyCardSystem`
2. 在 `src/app/components/ui/canvas/DragLayer.tsx` 顶部加 deprecated 注释
3. **验证**（见清单）

---

## 五、验证清单

### 基础拖拽
- [ ] 点击并移动 ≥ 8px → 进入拖拽（卡片跟手，轻微放大 scale=1.05，alpha=0.85）
- [ ] 拖拽中画布不跟着平移（viewport drag 已 pause）
- [ ] 松手后卡片停在新位置，视觉恢复（scale=1, alpha=1）
- [ ] 拖拽期间 cursor='grabbing'；松手后恢复 'grab'

### 点击 vs 拖拽区分
- [ ] 移动 < 8px 松手 → 触发 InspectOverlay（Phase 5，不进入拖拽）
- [ ] 移动 ≥ 8px 松手 → 不触发 InspectOverlay，卡片停在新位置

### 持久化
- [ ] 拖拽结束后刷新页面：卡片出现在新位置（Dexie 写回生效）
- [ ] 旧系统（flag=false）位置不受影响（两套系统坐标独立）

### Edge Pan
- [ ] 将卡片拖至屏幕右侧 80px 内：画布向右平移，卡片保持在指针下方
- [ ] 左/右/上/下四个边缘均可触发
- [ ] 速度随靠近边缘而增大（渐变，非突变）
- [ ] 松手后 Edge Pan 立即停止

### 与 Phase 5 联动
- [ ] 快速点击 → InspectOverlay 展开（无拖拽介入）
- [ ] 拖拽完成后再点击 → 仍可正常打开 InspectOverlay

### 旧系统
- [ ] flag=false：react-dnd 拖拽完全正常
- [ ] flag=true：旧卡片 hidden，react-dnd 不触发

---

## 六、参考文件

| 文件 | 用途 |
|---|---|
| `src/app/hooks/useCardDrag.ts` | 旧系统拖拽逻辑（历史参考，不复用） |
| `src/pixi/systems/CardSystem.ts`（Phase 4/5 版本）| 修改基础 |
| `src/pixi/utils/coordinates.ts` | `fromPixiWorld()` 坐标逆转换 |
| `src/core/storage/db.ts` | Dexie db 实例，`db.cards.update()` |
| pixi-viewport 文档：plugins.pause/resume | `viewport.plugins.pause('drag')` API |
