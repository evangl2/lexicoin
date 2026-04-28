# Lexicoin · Phase 3 实施计划
# 卡片 Sprite（占位色块，位置正确）

本文件是 Phase 3 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 架构原则（Phase 7 确立，在此记录）

**游戏状态不经 React。** 卡片位置、location、Variant 分组由 `CardSystem` 直接管理，数据来源是 Dexie，持久化也直接写 Dexie。React 只负责富文本显示（InspectOverlay 按需查 Dexie）。

因此：
- **`card-bridge.ts` 不创建**（React 数据中转桥不需要）
- **`PixiCardBridge.tsx` 不创建**（React 中间层不需要）
- **`CardSystem.ts` 直接 `import { db }` 加载 Dexie**
- 语言变化通过 `useGameStore.subscribe()`（非 React hook）监听

---

## 决策速查

| 项 | 决策 |
|---|---|
| 数据源 | CardSystem 直接从 Dexie 加载，无 React 中间层 |
| Variant 分组 | 纯 JS 函数 `computeVariantGroups()`，无 useCardGrouping |
| 语言切换监听 | `useGameStore.subscribe(s => s.learningLang, ...)` 从 PixiJS 侧直接订阅 |
| Culling | 全部常驻内存，visible 切换（非销毁重建） |
| Variant Stack 偏移 | 右下斜向 +4px/层，最多 2 层偏移 |
| Variant 角标 | 显示 ×N（N = 含 Anchor 的总 sense 数） |
| 占位色 | Persona primary 色（统一，Phase 8 替换） |
| LOD 阈值 | viewport.scale 0.25，远景为 60% 尺寸色块 |
| 圆角 | 无（纯矩形占位） |
| Persona 差异 | Phase 3 无差异，Phase 8 实现 |
| Alchemist 最终视觉方向 | 金属符文板（Phase 8，代码注释记录） |

---

## 关键技术事实

### 坐标系转换（必读）

旧系统世界坐标原点在**世界中心**，pixi-viewport 原点在**左上角**：

```
旧系统：card.x ∈ [-4800, 4800]，card.y ∈ [-3000, 3000]
pixi  ：world x ∈ [0, 9600]，world y ∈ [0, 6000]

转换：pixiX = card.x + WORLD_W / 2   (+ 4800)
      pixiY = card.y + WORLD_H / 2   (+ 3000)
```

所有位置相关代码必须使用此转换，否则卡片会出现在错误位置。

### 卡片尺寸

世界单位：`250 × 350`（与 Dexie CardRecord 中 width=250, height=350 一致）

### Variant Stack 逻辑

- 同语言下 `displayData[lang].word` 相同的卡片组成 Stack
- `frequency` 最高者为 Anchor，其余为 Variant
- Variant 在数据库里共享 Anchor 的 x, y, location
- 只渲染 Anchor Container（Variant 不单独渲染）
- Anchor Container 内部绘制最多 2 层偏移色块模拟"叠放感"

### Culling 参数

```typescript
VIEWPORT_CULL_MARGIN = 2500  // px（原系统值，保持一致）
// 转换为世界坐标边距：margin_world = 2500 / viewport.scale.x
```

---

## 文件结构（新增）

```
src/pixi/
├── utils/
│   └── coordinates.ts            # 世界坐标系转换工具（不变）
└── systems/
    └── CardSystem.ts             # 卡片 Sprite 管理器（直接加载 Dexie）
```

**无需新建：**
- ~~`src/pixi/card-bridge.ts`~~ — 不创建，CardSystem 直接管理
- ~~`src/app/components/ui/canvas/PixiCardBridge.tsx`~~ — 不创建

**修改已有文件：**
- `src/pixi/core/app.ts` — 加入 CardSystem 初始化（async）
- `src/app/App.tsx` — 无需添加任何桥接组件

---

## 一、coordinates.ts

```typescript
// src/pixi/utils/coordinates.ts
// 世界坐标系转换：旧系统（中心原点）↔ pixi-viewport（左上角原点）
import { WORLD_W, WORLD_H } from '@/config/canvas'

/** 旧系统世界坐标 → pixi-viewport 世界坐标 */
export function toPixiWorld(x: number, y: number): { x: number; y: number } {
  return { x: x + WORLD_W / 2, y: y + WORLD_H / 2 }
}

/** pixi-viewport 世界坐标 → 旧系统世界坐标 */
export function fromPixiWorld(x: number, y: number): { x: number; y: number } {
  return { x: x - WORLD_W / 2, y: y - WORLD_H / 2 }
}
```

---

## 二、CardSystem 内部数据结构

CardSystem 不再依赖 bridge，直接维护内部 `CardState`：

```typescript
// 内部类型，不导出（不是 bridge 接口）
interface CardState {
  uid: string
  x: number             // 旧系统世界坐标（存入/读出 Dexie 的格式）
  y: number
  location: string      // 'canvas' | 'device' | 'repository'
  word: string          // 当前学习语言的词（Phase 4 HTMLText 用）
  pos: string           // 词性
  lang: string          // 当前学习语言 code
  variantUids: string[] // 该 Stack 中 Variant 的 uid 列表
}
```

---

## 三、computeVariantGroups（纯 JS，无 React）

```typescript
// 内部函数，在 CardSystem.ts 中定义
// 替代 useCardGrouping hook——相同逻辑，无 React 依赖

function computeVariantGroups(
  cards: CardState[]
): Map<string, string[]> {
  // key: lang::word → 该 word 的所有 card
  const wordGroups = new Map<string, CardState[]>()

  for (const card of cards) {
    if (!card.word) continue
    const key = `${card.lang}::${card.word}`
    if (!wordGroups.has(key)) wordGroups.set(key, [])
    wordGroups.get(key)!.push(card)
  }

  // anchorUid → variantUids[]
  const variantMap = new Map<string, string[]>()

  for (const [, group] of wordGroups) {
    if (group.length <= 1) continue
    // Anchor = frequency 最高的卡片（以 Dexie CardRecord.frequency 字段为准）
    // 如果字段名不同，以实际 schema 为准
    const sorted = [...group].sort((a, b) => {
      // TODO: 确认 Dexie CardRecord 中 frequency 字段名
      const fa = (a as any).frequency ?? 0
      const fb = (b as any).frequency ?? 0
      return fb - fa
    })
    const [anchor, ...variants] = sorted
    variantMap.set(anchor!.uid, variants.map(v => v.uid))
  }

  return variantMap
}
```

---

## 四、CardSystem.ts

### Container 内部结构（与原 Phase 3 设计一致）

```
Container  (label = anchorUid, position = pixi 世界坐标)
├── Graphics  "variant-layer-2"  (偏移 +8px,+8px，alpha 0.35)
├── Graphics  "variant-layer-1"  (偏移 +4px,+4px，alpha 0.35)
├── Container "near-lod"   (scale ≥ 0.25 时可见)
│   └── Graphics "main-rect"    (250×350，alpha 0.7，Persona primary 色)
├── Container "far-lod"    (scale < 0.25 时可见)
│   └── Graphics "far-rect"     (150×210，alpha 0.56)
└── Text      "badge"      (×N，右上角，仅 variantCount > 0 时存在)
```

### 完整实现

```typescript
// src/pixi/systems/CardSystem.ts
import { Container, Graphics, Text } from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { db } from '@core/storage/db'
import { useGameStore } from '@store/index'
import { getPersonaData, onPersonaChange } from '../persona-bridge'
import { toPixiWorld, fromPixiWorld } from '../utils/coordinates'
import { VIEWPORT_CULL_MARGIN } from '@/config/physics'
import type { Language } from '@schemas/schemas/SenseEntity.schema'

const CARD_W = 250
const CARD_H = 350
const FAR_SCALE = 0.6
const LOD_THRESHOLD = 0.25
const LAYER_OFFSET = 4
const MAX_VISIBLE_LAYERS = 2

// Phase 4 会将此接口扩展为 CardMeta（加入 hoverOffset、effect 等）
interface CardMeta {
  uid: string
  container: Container
  baseX: number    // pixi 世界坐标（不含 hover offset）
  baseY: number
}

let _viewport: Viewport | null = null
const _metas = new Map<string, CardMeta>()
const _cards = new Map<string, CardState>()   // uid → 最新 CardState（内部真相）
let _personaColor = 0xD4AF37
let _unsubPersona: (() => void) | null = null
let _unsubLang: (() => void) | null = null

// ── 初始化 ──────────────────────────────────────────────────────────────────

export async function initCardSystem(viewport: Viewport): Promise<void> {
  _viewport = viewport

  const persona = getPersonaData()
  if (persona) _personaColor = persona.primary

  // 首次加载
  await loadAndSync()

  // 监听学习语言变化（Zustand subscribe，非 React hook，可在任意 JS 模块使用）
  _unsubLang = useGameStore.subscribe(
    s => s.learningLang,
    () => loadAndSync()
  )

  // 监听 Persona 变化
  // Phase 3：不重建视觉（占位阶段），仅记录颜色
  // Phase 8 TODO：Persona 切换时重建卡片视觉（Alchemist 金属符文板 / Cyberpunk 等）
  _unsubPersona = onPersonaChange(p => { _personaColor = p.primary })

  viewport.on('moved', updateCulling)
  viewport.on('zoomed', updateLOD)
  viewport.on('zoomed', updateCulling)
}

export function destroyCardSystem(): void {
  _unsubLang?.()
  _unsubPersona?.()
  _viewport?.off('moved', updateCulling)
  _viewport?.off('zoomed', updateLOD)
  _viewport?.off('zoomed', updateCulling)

  _metas.forEach(meta => meta.container.destroy({ children: true }))
  _metas.clear()
  _cards.clear()
  _viewport = null
}

// ── 数据加载（直接 Dexie）───────────────────────────────────────────────────

async function loadAndSync(): Promise<void> {
  if (!_viewport) return

  const learningLang = useGameStore.getState().learningLang as Language

  // 从 Dexie 加载所有 canvas 上的卡片
  // 注意：以实际 db.cards API 和 CardRecord 字段名为准
  const records = await db.cards.toArray()
  const canvasRecords = records.filter(r => r.location === 'canvas')

  // 转为内部 CardState
  const canvasCards: CardState[] = canvasRecords.map(r => ({
    uid: r.uid,
    x: r.x,
    y: r.y,
    location: r.location,
    word: r.displayData?.[learningLang]?.word ?? '',
    pos: r.displayData?.[learningLang]?.pos ?? '',
    lang: learningLang,
    variantUids: [],
  }))

  // 计算 Variant 分组
  const variantGroups = computeVariantGroups(canvasCards)
  const variantUidSet = new Set<string>()

  for (const [anchorUid, variantUids] of variantGroups) {
    for (const vid of variantUids) variantUidSet.add(vid)
    const anchor = canvasCards.find(c => c.uid === anchorUid)
    if (anchor) anchor.variantUids = variantUids
  }

  // 更新内部状态
  _cards.clear()
  for (const c of canvasCards) _cards.set(c.uid, c)

  // 只渲染 Anchor（非 Variant）
  const anchors = canvasCards.filter(c => !variantUidSet.has(c.uid))
  syncContainers(anchors)
}

// ── 容器同步 ─────────────────────────────────────────────────────────────────

function syncContainers(anchors: CardState[]): void {
  if (!_viewport) return

  const incomingUids = new Set(anchors.map(c => c.uid))

  // 移除消失的卡片
  for (const [uid, meta] of _metas) {
    if (!incomingUids.has(uid)) {
      meta.container.destroy({ children: true })
      _metas.delete(uid)
    }
  }

  // 新增或更新
  for (const card of anchors) {
    const { x, y } = toPixiWorld(card.x, card.y)
    if (_metas.has(card.uid)) {
      const meta = _metas.get(card.uid)!
      meta.container.position.set(x, y)
      meta.baseX = x
      meta.baseY = y
    } else {
      const container = buildCardContainer(card, x, y)
      _viewport.addChild(container)
    }
  }

  updateCulling()
  updateLOD()
}

// ── 容器构建 ─────────────────────────────────────────────────────────────────

function buildCardContainer(card: CardState, pixiX: number, pixiY: number): Container {
  const container = new Container()
  container.label = card.uid
  container.position.set(pixiX, pixiY)
  container.eventMode = 'none'  // Phase 4 改为 'static'

  const color = _personaColor

  // Variant 偏移层
  const layers = Math.min(card.variantUids.length, MAX_VISIBLE_LAYERS)
  for (let i = layers; i >= 1; i--) {
    const offset = i * LAYER_OFFSET
    const layer = new Graphics()
    layer.label = `variant-layer-${i}`
    layer.rect(-CARD_W / 2 + offset, -CARD_H / 2 + offset, CARD_W, CARD_H)
      .fill({ color, alpha: 0.35 })
    container.addChild(layer)
  }

  // Near LOD
  const nearLod = new Container()
  nearLod.label = 'near-lod'
  const mainRect = new Graphics()
  mainRect.label = 'main-rect'
  mainRect.rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H)
    .fill({ color, alpha: 0.70 })
  // Phase 8 TODO：替换为真实卡片视觉
  // Phase 8 TODO：Alchemist 方向 = 金属符文板（深色金属质感、浮雕边框、刻印符文）
  nearLod.addChild(mainRect)
  container.addChild(nearLod)

  // Far LOD
  const farW = CARD_W * FAR_SCALE
  const farH = CARD_H * FAR_SCALE
  const farLod = new Container()
  farLod.label = 'far-lod'
  farLod.visible = false
  const farRect = new Graphics()
  farRect.label = 'far-rect'
  farRect.rect(-farW / 2, -farH / 2, farW, farH)
    .fill({ color, alpha: 0.56 })
  // Phase 8 TODO：替换为卡片 SVG 缩略图
  farLod.addChild(farRect)
  container.addChild(farLod)

  // ×N 角标
  if (card.variantUids.length > 0) {
    const badge = new Text({
      text: `×${card.variantUids.length + 1}`,
      style: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' },
    })
    badge.label = 'badge'
    badge.anchor.set(1, 0)
    badge.position.set(CARD_W / 2 - 2, -CARD_H / 2 + 4)
    container.addChild(badge)
  }

  const meta: CardMeta = { uid: card.uid, container, baseX: pixiX, baseY: pixiY }
  _metas.set(card.uid, meta)

  return container
}

// ── Culling / LOD ────────────────────────────────────────────────────────────

function updateCulling(): void {
  if (!_viewport) return
  const bounds = _viewport.getVisibleBounds()
  const margin = VIEWPORT_CULL_MARGIN / _viewport.scale.x
  const halfW = CARD_W / 2
  const halfH = CARD_H / 2

  for (const meta of _metas.values()) {
    const { x, y } = meta.container.position
    meta.container.visible =
      x + halfW > bounds.left - margin &&
      x - halfW < bounds.right + margin &&
      y + halfH > bounds.top - margin &&
      y - halfH < bounds.bottom + margin
  }
}

function updateLOD(): void {
  if (!_viewport) return
  const isNear = _viewport.scale.x >= LOD_THRESHOLD

  for (const meta of _metas.values()) {
    if (!meta.container.visible) continue
    const nearLod = meta.container.getChildByLabel('near-lod') as Container | null
    const farLod  = meta.container.getChildByLabel('far-lod')  as Container | null
    if (nearLod) nearLod.visible = isNear
    if (farLod)  farLod.visible  = !isNear
  }
}

// ── 外部接口（供其他 Phase 使用）────────────────────────────────────────────

/**
 * 返回当前所有 canvas 卡片的旧系统坐标列表。
 * Phase 7 snapPosition 使用，数据来自 _metas（最新）。
 */
export function getOccupiedItems(): Array<{ id: string; x: number; y: number }> {
  return Array.from(_metas.values()).map(meta => {
    const old = fromPixiWorld(meta.baseX, meta.baseY)
    return { id: meta.uid, x: old.x, y: old.y }
  })
}

/**
 * 重新从 Dexie 加载并同步（语言切换 / 外部写入后调用）。
 * Phase 7 DeviceSystem 在卡片 location 变化后调用此函数刷新。
 */
export async function refreshCards(): Promise<void> {
  await loadAndSync()
}
```

### app.ts 修改

```typescript
// initPixiApp 改为 async，末尾追加：
import { initCardSystem, destroyCardSystem } from '../systems/CardSystem'

// 注意：在 initBackground 之后（背景在卡片之下）
await initCardSystem(getViewport()!)   // Phase 3 追加（async）

// destroyPixiApp 中追加（在 destroyBackground 之前）：
destroyCardSystem()
```

---

## 五、App.tsx 修改

```tsx
// Phase 3 无需在 App.tsx 新增任何组件。
// PixiPersonaBridge 已在 Phase 2 加入，保持不变。
// 不添加 PixiCardBridge（已废弃设计）。

// App.tsx 保持：
<PixiPersonaBridge />
<PixiRoot />
```

---

## 六、场景层级顺序（Phase 3 之后）

```
app.stage
├── [index 0] screenContainer        ← Phase 2 背景（固定，不随 viewport 移动）
└── [index 1] viewport（pixi-viewport）
    ├── [index 0] worldContainer     ← Phase 2 GridLayer + WorldEdgeLayer
    └── [index 1+] Card Containers  ← Phase 3 卡片（每个 Anchor 一个 Container）
```

---

## 七、执行顺序

1. 新建 `src/pixi/utils/coordinates.ts`
2. 新建 `src/pixi/systems/CardSystem.ts`（含 `computeVariantGroups`、Dexie 加载）
3. 修改 `src/pixi/core/app.ts`（initPixiApp 改 async，追加 initCardSystem / destroyCardSystem）
4. **验证 Dexie 加载**：`console.log` 确认卡片数量和坐标正确
5. **验证 Phase 3**（见验证清单）

---

## 八、验证清单

### 数据加载验证
- [ ] Console 输出 CardSystem 加载的卡片数量，与旧系统画布卡片一致
- [ ] 卡片 `x, y`（旧系统坐标）来自 Dexie，范围 ∈ [-4800,4800] × [-3000,3000]
- [ ] Variant 分组正确（同 word 的卡片合并为 Stack，Anchor = frequency 最高）

### 卡片位置验证
- [ ] PixiJS 色块位置与旧系统 DOM 卡片对应（flag 切换前后对比）
- [ ] 平移画布：色块随 viewport 移动，背景固定
- [ ] 缩放画布：色块随缩放变大/变小

### Variant Stack 验证
- [ ] 有 Variant 的卡片：可见 2-3 层错位色块（右下斜向叠加）
- [ ] 有 Variant 的卡片：右上角有 `×N` 角标
- [ ] 独立卡：单层色块，无角标

### LOD 验证
- [ ] 缩放到 scale < 0.25：色块变小（60% 尺寸）
- [ ] 缩放到 scale ≥ 0.25：色块恢复正常尺寸
- [ ] 切换瞬间无卡顿

### Culling 验证
- [ ] 平移到边缘：视口外色块 visible=false
- [ ] 平移回来：色块重新出现
- [ ] `_metas.size === N`（全部常驻内存）

### 语言切换验证
- [ ] 切换学习语言：CardSystem 重新加载，Variant Stack 重新计算
- [ ] 旧系统（flag=false）完全正常

---

## 九、参考文件

| 文件 | 用途 |
|---|---|
| `src/types/CardEntity.ts` | CardEntity 完整字段（displayData 结构） |
| `src/core/storage/db.ts` | db.cards API 和 CardRecord 字段名（务必对照） |
| `src/config/canvas.ts` | WORLD_W=9600, WORLD_H=6000 |
| `src/config/physics.ts` | VIEWPORT_CULL_MARGIN=2500 |
| `src/pixi/persona-bridge.ts` | getPersonaData() 获取 primary 颜色 |
| `src/pixi/systems/BackgroundSystem.ts` | 参考系统初始化模式 |
