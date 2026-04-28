# Lexicoin · Phase 7 实施计划
# Snap 动画 + DeviceSystem（PixiJS/Dexie）

本文件是 Phase 7 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 决策速查

| 项 | 决策 |
|---|---|
| Snap 动画引擎 | GSAP `back.out(1.7)` duration:0.35s（替换旧 react-spring） |
| Snap 位置源 | `getOccupiedItems()` 从 CardSystem `_metas` 实时读取 |
| DeviceSystem 架构 | 全 PixiJS/Dexie，无 React 侧桥接 |
| synthesis-circle 格子 | 3×3 = 840×1140 world units（含视觉边距，视觉略小于 AABB） |
| grimoire-summoner 格子 | 2×2 = 560×760 world units（含视觉边距，视觉略小于 AABB） |
| 设备悬停反馈 | GlowFilter（pixi-filters），拖拽中靠近设备时高亮 |
| 卡片入槽动画 | 飞入槽位中心：GSAP `power2.out` duration:0.4s（H2） |
| slot 优先级 | synthesis-circle: slot1→slot2（按序填充）；summoner: 仅 seed slot |
| Adjacency Resonance | 仅写入代码注释（游戏性设计预留，Phase N 实现） |
| DeviceSystem 初始化 | `initDeviceSystem(viewport)` 在 PixiCanvas 挂载后立即调用（与 initCardSystem 同级） |

---

## 架构说明

DeviceSystem 与 CardSystem 架构平行：
- 设备数据从 Dexie `db.devices`（或静态配置）加载，不经 React
- `useGameStore.getState()` / `useGameStore.subscribe()` 直接用于非 React 侧订阅
- 设备 AABB（碰撞盒）与卡片的交互由 **CardSystem 的 `onStagePointerUp` 中调用 DeviceSystem** 判断
- React 侧无需感知设备状态；设备内卡片信息存于 Dexie `location` 字段

**格子单位**：
- 1 格 = 1 张卡片的 world 尺寸 = CARD_W × CARD_H = 280 × 380 world units
- synthesis-circle AABB = 840 × 1140；grimoire-summoner AABB = 560 × 760

---

## 文件结构

```
src/pixi/systems/
├── CardSystem.ts          # Phase 7：追加 snap 动画 + tryEnterDevice 调用
└── DeviceSystem.ts        # Phase 7：新建
```

---

## 一、DeviceSystem.ts（新建）

### 1.1 类型与常量

```typescript
// src/pixi/systems/DeviceSystem.ts

import { Container, Graphics } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import gsap from 'gsap'
import { db } from '@core/storage/db'
import type { Viewport } from 'pixi-viewport'

// 设备格子大小（world units）= CARD_W/H 的整数倍
const CELL_W = 280   // = CARD_W
const CELL_H = 380   // = CARD_H

// 设备规格
const DEVICE_SPECS = {
  'synthesis-circle': {
    cols: 3,
    rows: 3,
    slots: [
      { id: 'slot1', col: 0, row: 1 },  // 左侧中心格（输入1）
      { id: 'slot2', col: 2, row: 1 },  // 右侧中心格（输入2）
    ],
  },
  'grimoire-summoner': {
    cols: 2,
    rows: 2,
    slots: [
      { id: 'seed', col: 0, row: 0 },   // 左上格（种子槽）
    ],
  },
} as const

type DeviceType = keyof typeof DEVICE_SPECS

interface SlotDef {
  id: string
  col: number
  row: number
}

interface DeviceMeta {
  uid: string
  type: DeviceType
  /** 设备左上角 world 坐标 */
  worldX: number
  worldY: number
  container: Container
  glow: GlowFilter
  /** AABB：world 坐标范围 */
  aabb: { x: number; y: number; w: number; h: number }
  /** 各槽位 world 中心坐标（用于飞入动画目标点）*/
  slotCenters: Record<string, { x: number; y: number }>
  /** 各槽位当前占用的 card uid（null = 空） */
  slotOccupants: Record<string, string | null>
}

let _viewport: Viewport | null = null
const _deviceMetas = new Map<string, DeviceMeta>()
```

### 1.2 初始化与渲染

```typescript
/**
 * 从 Dexie 加载设备列表，在 PixiJS worldContainer 上渲染占位图形。
 * 在 initCardSystem 之后调用（共用同一 viewport）。
 *
 * 注：以 db.devices 实际表结构为准（deviceType, worldX, worldY 字段名）。
 */
export async function initDeviceSystem(viewport: Viewport): Promise<void> {
  _viewport = viewport

  const devices = await db.devices.toArray()
  for (const device of devices) {
    await buildDeviceContainer(device)
  }
}

async function buildDeviceContainer(device: any): Promise<void> {
  const spec = DEVICE_SPECS[device.deviceType as DeviceType]
  if (!spec) return

  const aabbW = spec.cols * CELL_W
  const aabbH = spec.rows * CELL_H

  // 视觉略小于 AABB（8px 四边内缩）
  const VISUAL_INSET = 8
  const visW = aabbW - VISUAL_INSET * 2
  const visH = aabbH - VISUAL_INSET * 2

  // GlowFilter（默认暗，拖拽靠近时增强）
  const glow = new GlowFilter({
    distance: 20,
    outerStrength: 0,
    innerStrength: 0,
    color: 0x88ffcc,
    alpha: 0.8,
  })

  // 设备视觉（Phase 7：简单圆角矩形占位，Phase 8+ 换 Sprite）
  const g = new Graphics()
  g.roundRect(VISUAL_INSET, VISUAL_INSET, visW, visH, 16)
  g.fill({ color: 0x1a2a3a, alpha: 0.7 })
  g.stroke({ color: 0x44667f, width: 1.5 })
  g.filters = [glow]

  const container = new Container()
  container.addChild(g)
  container.position.set(device.worldX, device.worldY)
  container.eventMode = 'none'  // 设备自身不接收 pointer，AABB 由 CardSystem 判断

  // 计算各槽位 world 中心
  const slotCenters: Record<string, { x: number; y: number }> = {}
  for (const slot of spec.slots) {
    slotCenters[slot.id] = {
      x: device.worldX + (slot.col + 0.5) * CELL_W,
      y: device.worldY + (slot.row + 0.5) * CELL_H,
    }
  }

  // 初始化槽位占用状态（从 Dexie 恢复）
  const slotOccupants: Record<string, string | null> = {}
  for (const slot of spec.slots) {
    slotOccupants[slot.id] = null
  }
  // 恢复：查找 location=`device:${device.uid}:slotN` 的卡片
  const occupants = await db.cards
    .filter(c => typeof c.location === 'string' && c.location.startsWith(`device:${device.uid}:`))
    .toArray()
  for (const c of occupants) {
    const slotId = (c.location as string).split(':')[2]
    if (slotId) slotOccupants[slotId] = c.uid
  }

  const meta: DeviceMeta = {
    uid: device.uid,
    type: device.deviceType,
    worldX: device.worldX,
    worldY: device.worldY,
    container,
    glow,
    aabb: { x: device.worldX, y: device.worldY, w: aabbW, h: aabbH },
    slotCenters,
    slotOccupants,
  }

  _deviceMetas.set(device.uid, meta)
  _viewport!.addChild(container)   // 加入 viewport worldContainer
}

export function destroyDeviceSystem(): void {
  for (const meta of _deviceMetas.values()) {
    meta.container.destroy({ children: true })
  }
  _deviceMetas.clear()
  _viewport = null
}
```

### 1.3 设备高亮（拖拽中 Hover）

由 CardSystem 在每帧 `onStagePointerMove` 中调用，传入当前拖拽卡片的 world 中心坐标。

```typescript
/**
 * 根据被拖拽卡片的 world 中心，更新所有设备的 GlowFilter 强度。
 * 靠近 AABB 内时发光；远离时熄灭。
 * @param cardWorldX  被拖拽卡片 world 中心 X
 * @param cardWorldY  被拖拽卡片 world 中心 Y
 */
export function updateDeviceHover(cardWorldX: number, cardWorldY: number): void {
  for (const meta of _deviceMetas.values()) {
    const { x, y, w, h } = meta.aabb
    const inside =
      cardWorldX >= x && cardWorldX <= x + w &&
      cardWorldY >= y && cardWorldY <= y + h

    const target = inside ? 2.5 : 0
    gsap.to(meta.glow, { outerStrength: target, duration: 0.2, overwrite: true })
  }
}

/**
 * 拖拽结束后重置所有设备 glow。
 */
export function clearDeviceHover(): void {
  for (const meta of _deviceMetas.values()) {
    gsap.to(meta.glow, { outerStrength: 0, duration: 0.3 })
  }
}
```

### 1.4 卡片入槽（AABB 判断 + 飞入动画）

由 CardSystem 在 `onStagePointerUp` 中调用（在 snap 之前优先判断）。

```typescript
interface EnterDeviceResult {
  entered: boolean
  /** 飞入的目标 world 坐标（卡片中心，用于更新 meta.baseX/Y） */
  targetX?: number
  targetY?: number
  /** 用于 Dexie 写回 location 字段 */
  location?: string
}

/**
 * 判断卡片是否落入某设备槽位。若是，执行飞入动画并更新 Dexie。
 * 返回 { entered: true } 时，CardSystem 跳过常规 snap 流程。
 *
 * @param cardUid       卡片 uid
 * @param cardWorldX    松手时卡片 world 中心 X（= meta.baseX）
 * @param cardWorldY    松手时卡片 world 中心 Y（= meta.baseY）
 * @param cardContainer 卡片的 PixiJS Container（执行飞入动画）
 * @param onComplete    飞入完成回调（用于 CardSystem 更新 meta.baseX/Y）
 */
export async function tryEnterDevice(
  cardUid: string,
  cardWorldX: number,
  cardWorldY: number,
  cardContainer: Container,
  onComplete: (targetX: number, targetY: number) => void,
): Promise<EnterDeviceResult> {
  for (const meta of _deviceMetas.values()) {
    const { x, y, w, h } = meta.aabb
    if (cardWorldX < x || cardWorldX > x + w || cardWorldY < y || cardWorldY > y + h) continue

    // 卡片在此设备 AABB 内 —— 找第一个空槽
    const spec = DEVICE_SPECS[meta.type]
    for (const slotDef of spec.slots) {
      const occupant = meta.slotOccupants[slotDef.id]
      if (occupant !== null) continue  // 槽已被占用

      // 找到可用槽：执行飞入动画
      const target = meta.slotCenters[slotDef.id]!
      const location = `device:${meta.uid}:${slotDef.id}`

      // 飞入动画：GSAP power2.out
      gsap.to(cardContainer.position, {
        x: target.x,
        y: target.y,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => onComplete(target.x, target.y),
      })

      // 更新占用状态（乐观更新）
      meta.slotOccupants[slotDef.id] = cardUid

      // 写 Dexie（异步，不阻塞动画）
      db.cards.update(cardUid, { location }).catch(console.error)

      return { entered: true, targetX: target.x, targetY: target.y, location }
    }

    // 所有槽已满：落回原位（不进入设备）
    return { entered: false }
  }

  return { entered: false }
}

/**
 * 从 Dexie 中查出某设备某槽的卡片并驱逐（归还画布）。
 * DeviceSystem 内部调用，CardSystem 不直接涉及。
 */
export async function evictFromSlot(deviceUid: string, slotId: string): Promise<void> {
  const meta = _deviceMetas.get(deviceUid)
  if (!meta) return
  const cardUid = meta.slotOccupants[slotId]
  if (!cardUid) return

  meta.slotOccupants[slotId] = null
  // 归还画布：location 清空，由 CardSystem.refreshCards() 重新同步到 PixiJS
  await db.cards.update(cardUid, { location: 'canvas' })
}

/*
 * ─── Adjacency Resonance（邻接共鸣）设计预留 ──────────────────────────────
 *
 * 设计构想（Phase N 实现）：
 *   当同一设备内两张相邻槽位的卡片词根/词缀存在特定语言学关联时，
 *   触发"共鸣"视觉效果（两张卡片之间连线发光，设备整体脉冲）。
 *
 * 触发条件：
 *   - synthesis-circle: slot1 与 slot2 均有卡片，且满足关联规则
 *   - 关联规则由语言学数据库（Dexie adjacencyRules 或 Supabase 查询）提供
 *
 * 实现位置：
 *   DeviceSystem.checkAdjacencyResonance(deviceUid: string): void
 *   在 tryEnterDevice 写入槽位后调用，读取同设备所有槽位的 cardUid，
 *   批量查 Dexie 判断关联，触发 GlowFilter + GSAP 脉冲序列。
 *
 * ─────────────────────────────────────────────────────────────────────────
 */
```

---

## 二、CardSystem.ts Phase 7 追加

### 2.1 Snap 动画（GSAP back.out）

在 Phase 6 的 `onStagePointerUp` 写 Dexie 之前，追加 snap + device 判断：

```typescript
// Phase 6 的 onStagePointerUp 修改版（合并 Phase 7）：

import { tryEnterDevice, updateDeviceHover, clearDeviceHover } from './DeviceSystem'
import { snapPosition } from '../utils/snapPosition'

async function onStagePointerUp(e: FederatedPointerEvent): Promise<void> {
  if (!_activeDrag) return

  const drag = _activeDrag
  _activeDrag = null

  stopEdgePan()
  clearDeviceHover()           // Phase 7：重置设备 glow
  _viewport?.plugins.resume('drag')

  const canvas = getPixiApp()?.canvas
  if (canvas) (canvas as HTMLCanvasElement).style.cursor = 'grab'

  if (!drag.started) return    // 点击：Phase 5 已处理

  // ── 拖拽结束：恢复视觉 ──
  gsap.to(drag.meta.container.scale, { x: 1, y: 1, duration: 0.2 })
  drag.meta.container.alpha = 1
  drag.meta.container.zIndex = 0
  drag.meta.hoverOffset.x = 0
  drag.meta.hoverOffset.y = 0

  // Phase 7 Step 1：判断是否落入设备
  const deviceResult = await tryEnterDevice(
    drag.meta.uid,
    drag.meta.baseX,
    drag.meta.baseY,
    drag.meta.container,
    (targetX, targetY) => {
      // 飞入完成后更新 meta
      drag.meta.baseX = targetX
      drag.meta.baseY = targetY
    },
  )

  if (deviceResult.entered) return  // 已由 DeviceSystem 处理，跳过 snap

  // Phase 7 Step 2：Snap 到最近空格
  // getOccupiedItems() 返回所有其他卡片的 {id, x, y}（旧系统中心原点坐标）
  const currentOldCoord = fromPixiWorld(drag.meta.baseX, drag.meta.baseY)
  const occupied = getOccupiedItems().filter(item => item.id !== drag.meta.uid)
  const snapped = snapPosition(currentOldCoord, CARD_W, CARD_H, occupied)

  // 旧坐标 → pixi world
  const snappedPixi = toPixiWorld(snapped.x, snapped.y)

  // GSAP back.out(1.7) 弹性 snap 动画
  gsap.to(drag.meta.container.position, {
    x: snappedPixi.x,
    y: snappedPixi.y,
    duration: 0.35,
    ease: 'back.out(1.7)',
    onComplete: () => {
      drag.meta.baseX = snappedPixi.x
      drag.meta.baseY = snappedPixi.y
    },
  })

  // 写回 Dexie（用 snap 后坐标）
  await db.cards.update(drag.meta.uid, { x: snapped.x, y: snapped.y })
}
```

**注意**：`toPixiWorld(x, y)` 是 `fromPixiWorld` 的逆函数，需在 `src/pixi/utils/coordinates.ts` 中补充（若尚不存在）：

```typescript
// src/pixi/utils/coordinates.ts 追加（如果尚无 toPixiWorld）：

// 旧系统坐标（中心原点）→ pixi world 坐标（左上角原点）
export function toPixiWorld(oldX: number, oldY: number): { x: number; y: number } {
  // 以实际坐标转换实现为准（与 fromPixiWorld 互逆）
  return { x: oldX + CANVAS_OFFSET_X, y: oldY + CANVAS_OFFSET_Y }
}
```

### 2.2 设备 Hover 高亮（在 onStagePointerMove 中追加）

```typescript
function onStagePointerMove(e: FederatedPointerEvent): void {
  if (!_activeDrag || !_viewport) return

  // ... 原有 Phase 6 逻辑 ...

  if (_activeDrag.started) {
    const worldPos = _viewport.toWorld(e.global.x, e.global.y)
    // ... 卡片跟手 ...

    // Phase 7：更新设备 hover 高亮
    updateDeviceHover(worldPos.x, worldPos.y)
  }
}
```

---

## 三、initCardSystem / initDeviceSystem 调用顺序

两个 System 需在 PixiCanvas 挂载时按序初始化：

```typescript
// src/pixi/core/PixiCanvas.tsx（或 initPixi.ts）中：

await initCardSystem(viewport)    // Phase 3 已有
await initDeviceSystem(viewport)  // Phase 7 新增（在 CardSystem 之后）
```

销毁顺序相反：

```typescript
destroyDeviceSystem()   // 先销毁 DeviceSystem
destroyCardSystem()     // 再销毁 CardSystem
```

---

## 四、Dexie 数据模型说明

Phase 7 依赖以下 Dexie 表结构（以实际 `db.ts` 定义为准）：

### db.devices 表（设备实体）
```typescript
// 预期字段（以实际 DeviceEntity schema 为准）：
interface DeviceRecord {
  uid: string
  deviceType: 'synthesis-circle' | 'grimoire-summoner'
  worldX: number   // 设备左上角 world X
  worldY: number   // 设备左上角 world Y
}
```

### db.cards 表（location 字段约定）
```typescript
// location 值格式：
// 'canvas'                         — 在画布上（自由）
// 'device:<deviceUid>:<slotId>'   — 在设备槽位内
// 示例：'device:abc123:slot1'
```

---

## 五、执行顺序

1. **新建 `src/pixi/systems/DeviceSystem.ts`**（含 initDeviceSystem、tryEnterDevice、updateDeviceHover、clearDeviceHover、evictFromSlot）
2. **修改 `src/pixi/utils/coordinates.ts`**：补充 `toPixiWorld()` 逆函数（若尚无）
3. **修改 `src/pixi/systems/CardSystem.ts`**：
   - `onStagePointerUp`：追加 `tryEnterDevice` + snap 动画（back.out）
   - `onStagePointerMove`：追加 `updateDeviceHover()`
4. **修改 PixiCanvas 初始化入口**：`initDeviceSystem(viewport)` 在 `initCardSystem` 之后调用
5. **验证**（见清单）

---

## 六、验证清单

### Snap 动画
- [ ] 拖拽卡片松手 → 卡片以 back.out(1.7) 弹性动画 snap 到最近空格（0.35s）
- [ ] Snap 目标位置不与其他卡片重叠（`getOccupiedItems()` 正确排除被拖卡片自身）
- [ ] 刷新页面后卡片在 snap 后坐标（Dexie 写入 snap 后位置）

### 设备 Hover 高亮
- [ ] 拖拽卡片靠近设备 AABB 内：设备边缘发绿色 glow（outerStrength→2.5，0.2s 渐变）
- [ ] 拖拽卡片离开设备 AABB：glow 熄灭
- [ ] 松手后所有设备 glow 重置（clearDeviceHover）

### 卡片入槽
- [ ] 将卡片拖入 synthesis-circle AABB 松手 → 卡片飞入 slot1（power2.out 0.4s）
- [ ] slot1 已有卡片时，再拖入一张 → 飞入 slot2
- [ ] slot1 + slot2 均满时再拖入 → 不进入设备，走 snap 流程
- [ ] 将卡片拖入 grimoire-summoner AABB 松手 → 飞入 seed slot
- [ ] 入槽后刷新页面：卡片 location 正确为 `device:<uid>:<slot>`，DeviceSystem 恢复槽位状态

### 与 Phase 5/6 联动
- [ ] 点击画布卡片（非入槽）→ InspectOverlay 正常弹出
- [ ] 拖拽完成后 Edge Pan 立即停止，设备 glow 重置

### 旧系统无影响
- [ ] flag=false：旧 DnD 系统不受 DeviceSystem 影响
- [ ] flag=true 但未初始化 DeviceSystem（db.devices 无数据）：`_deviceMetas` 为空，tryEnterDevice 直接返回 entered:false，snap 正常工作

---

## 七、参考文件

| 文件 | 用途 |
|---|---|
| `src/pixi/systems/CardSystem.ts`（Phase 6 版本）| 修改基础（onStagePointerUp / onStagePointerMove） |
| `src/pixi/utils/coordinates.ts` | `fromPixiWorld()` / `toPixiWorld()` 坐标互转 |
| `src/pixi/utils/snapPosition.ts` | 螺旋搜索 snap 算法（已有，沿用） |
| `src/core/storage/db.ts` | Dexie 实例，`db.cards` / `db.devices` |
| pixi-filters 文档：GlowFilter | `outerStrength`、`color`、`distance` 参数 |
| GSAP 文档：`back.out` / `power2.out` | ease 参数说明 |
