# Lexicoin · Phase 5 实施计划
# DOM 检视态（Inspect Overlay）

本文件是 Phase 5 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 决策速查

| 项 | 决策 |
|---|---|
| Overlay 形态 | 从 PixiJS 卡片屏幕位置展开为全尺寸卡片（~72% 屏高，保持 250:350 比例） |
| PixiJS 卡片 | 保持可见，InspectOverlay 浮在上方（B） |
| 关闭方式 | 点击 Backdrop + ESC 键（A） |
| Variant 导航 | 底部圆点 + 左右箭头，计数显示 N/Total（D1） |
| React 组件策略 | 新建 `InspectOverlay.tsx`，直接用 `LexiCardChrome`，不复用 `Card.tsx`（E1） |
| 坐标来源 | 点击时 `viewport.toScreen()` → Zustand `inspectedCard`（F1） |
| 点击 vs 拖拽 | pointerdown/up + 8px 阈值判断（与 Phase 6 共用逻辑，此处提前埋入） |
| SelectionOverlay | 重新设计为 Variant 导航（同 word 不同 sense 的 Stack 切换） |
| **数据来源** | **InspectOverlay 直接查 Dexie（不依赖 useCardManager / useCardGrouping）** |

---

## 关键设计说明：SelectionOverlay 重新设计

旧系统的 `SelectionOverlay` 用于"同一张合并卡的多义项选择"。  
新系统采用 **Variant Stack** 模式：同 word 不同 sense 的卡片 stack 在画布上，  
Anchor 卡代表整个 Stack。进入检视态后，通过**圆点 + 箭头导航**在各 sense 之间切换。  
这比旧 SelectionOverlay 更直观，且与 Stack 的画布视觉一致。

---

## 文件结构（新增）

```
src/app/components/ui/canvas/
└── InspectOverlay.tsx        # 检视态浮层（React + Framer Motion）
```

**修改已有文件：**
- `src/core/store/`（以实际 store 分层为准）— 追加 `inspectedCard` 状态 + action
- `src/pixi/systems/CardSystem.ts` — 追加点击分发（pointerdown/up + dispatchInspect）
- `src/app/App.tsx` — 加入 `<InspectOverlay />`

---

## 一、Zustand Store 扩展

在现有 store（以实际分层文件为准）中追加：

```typescript
// 新增字段
inspectedCard: null as {
  uid: string
  screenX: number    // 卡片左上角屏幕 X（含缩放）
  screenY: number    // 卡片左上角屏幕 Y（含缩放）
  screenW: number    // 卡片屏幕宽度
  screenH: number    // 卡片屏幕高度
} | null,

// 新增 action
setInspectedCard: (
  card: { uid: string; screenX: number; screenY: number; screenW: number; screenH: number } | null
) => set({ inspectedCard: card }),
```

---

## 二、CardSystem.ts 点击分发（Phase 5 追加）

在 `buildCardContainer` 内，hover 事件之后，追加 click 检测。  
**注意**：此处提前兼容 Phase 6 的拖拽判断——`_dragStarted` 由 Phase 6 的 Stage-level  
pointermove 设置，Phase 5 的 pointerup 读取它来决定是否触发 inspect。

```typescript
// Phase 5 在 buildCardContainer 内追加 ────────────────────

// 局部变量（闭包，每个 container 独立）
let _pointerDownX = 0
let _pointerDownY = 0
// _dragStarted 在 Phase 6 的 Stage-level 事件中设置；
// Phase 5 只读取。Phase 5 单独运行时永远为 false，点击始终触发 inspect。
let _dragStarted = false   // Phase 6 会在 stage pointermove 中置为 true

container.on('pointerdown', (e) => {
  e.stopPropagation()       // 阻止 viewport 接收 pointerdown（防止画布跟随平移）
  _pointerDownX = e.global.x
  _pointerDownY = e.global.y
  _dragStarted = false      // 重置（Phase 6 会在 pointermove 里重新判断）
})

container.on('pointerup', (e) => {
  if (_dragStarted) return  // Phase 6：已进入拖拽，不触发 inspect

  const dx = e.global.x - _pointerDownX
  const dy = e.global.y - _pointerDownY
  if (Math.hypot(dx, dy) < 8) {
    // 确认为点击：分发到 InspectOverlay
    dispatchInspect(meta)
  }
})
// ────────────────────────────────────────────────────────
```

```typescript
// dispatchInspect：计算屏幕坐标，写入 Zustand
function dispatchInspect(meta: CardMeta): void {
  if (!_viewport) return

  const screenPos = _viewport.toScreen(meta.baseX, meta.baseY)
  const screenW = CARD_W * _viewport.scale.x
  const screenH = CARD_H * _viewport.scale.y

  // 注意：toScreen 返回卡片中心的屏幕坐标，转为左上角坐标
  useGameStore.getState().setInspectedCard({
    uid: meta.uid,
    screenX: screenPos.x - screenW / 2,
    screenY: screenPos.y - screenH / 2,
    screenW,
    screenH,
  })
}
```

**注意**：`useGameStore` 的直接调用（非 hook 调用）在 PixiJS 模块内是合法的，  
参考 Zustand 文档中 `getState()` 在非 React 环境下的用法。

---

## 三、InspectOverlay.tsx

```tsx
// src/app/components/ui/canvas/InspectOverlay.tsx
//
// Phase 5：新建组件，直接使用 LexiCardChrome，不复用 Card.tsx（E1 决策）。
// 数据来源：直接查询 Dexie（不依赖 useCardManager / useCardGrouping）。
// 游戏状态（位置、location）由 CardSystem 管理；React 只负责显示富文本内容。
//
import { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@store/index'
import { db } from '@core/storage/db'
import { usePersona } from '@/app/context/PersonaContext'
import { LexiCardChrome } from '@/app/components/ui/card/web/LexiCardChrome'
import { getCardWCSlots } from '@/app/components/ui/card/CardWCSlots'
import type { Language } from '@schemas/schemas/SenseEntity.schema'

// 目标卡片尺寸（屏幕空间，保持 250:350 比例）
const CARD_RATIO = 250 / 350

function getTargetSize() {
  const h = Math.min(window.innerHeight * 0.72, 600)
  const w = h * CARD_RATIO
  return { w, h }
}

export function InspectOverlay() {
  const inspectedCard    = useGameStore(s => s.inspectedCard)
  const setInspectedCard = useGameStore(s => s.setInspectedCard)
  const learningLang     = useGameStore(s => s.learningLang) as Language
  const systemLang       = useGameStore(s => s.systemLang)   as Language
  const { activeSkin: uiTheme, card: CardPersona } = usePersona()

  // 本地状态
  const [activeSenseIndex, setActiveSenseIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const wcHostRef = useRef<HTMLElement | null>(null)

  // Dexie から直接 sense 列表を読む（useCardManager 不依赖）
  const [allSenses, setAllSenses] = useState<any[]>([])

  useEffect(() => {
    setActiveSenseIndex(0)
    setIsFlipped(false)
    if (!inspectedCard) { setAllSenses([]); return }

    const load = async () => {
      // Anchor card
      const anchor = await db.cards.get(inspectedCard.uid)
      if (!anchor) return

      // Variants：同 word、同语言的其他卡片
      // 注：以实际 db.cards 查询 API 和 CardRecord 字段名为准
      const anchorWord = anchor.displayData?.[learningLang]?.word
      if (!anchorWord) { setAllSenses([anchor]); return }

      const sameWord = await db.cards
        .filter(c =>
          c.uid !== anchor.uid &&
          c.displayData?.[learningLang]?.word === anchorWord
        )
        .toArray()

      // Anchor 在前，按 frequency 降序排列
      const sorted = [anchor, ...sameWord].sort(
        (a, b) => ((b as any).frequency ?? 0) - ((a as any).frequency ?? 0)
      )
      setAllSenses(sorted)
    }

    load()
  }, [inspectedCard?.uid, learningLang])

  // ESC 关闭
  useEffect(() => {
    if (!inspectedCard) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectedCard(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inspectedCard, setInspectedCard])

  const activeCard = allSenses[activeSenseIndex]
  const hasVariants = allSenses.length > 1

  // 目标尺寸和位置
  const { w: targetW, h: targetH } = getTargetSize()
  const targetX = (window.innerWidth - targetW) / 2
  const targetY = (window.innerHeight - targetH) / 2

  // 安全检查
  if (!inspectedCard || !activeCard) return null

  const learningData = activeCard.displayData[learningLang]!
  const systemData   = activeCard.displayData[systemLang]!

  // Slots：简化版（仅展示，无拖拽/canvas physics）
  // 注：getCardWCSlots 签名较长，以实际 CardWCSlots.tsx 导出为准
  const slots = useMemo(() => getCardWCSlots({
    learningData,
    systemData,
    currentCardData: activeCard,
    learningLanguage: learningLang,
    systemLanguage: systemLang,
    isExpanded: true,
    isFlipped,
    isOverlayOpen: false,
    selectionItems: [],
    selectedDefId: activeCard.uid,
    handleDefinitionClick: () => {},
    handleSelectDefinition: () => {},
    wcFlavorContainerRef: { current: null },
    wcCurrentFlavorContents: learningData.flavorContents ?? [],
    wcFlavorIndex: 0,
    wcFlavorDirection: 0,
    setWcFlavorIndex: () => {},
    setWcFlavorDirection: () => {},
    onFlavorNavigate: () => {},
    onFlavorContentClick: () => {},
    onFlavorIndicatorClick: () => {},
    isActive: true,
    visualFeedback: null,
    // 无 parallax（检视态固定，无物理倾斜）
    bgParallaxX: { get: () => 0 } as any,
    bgParallaxY: { get: () => 0 } as any,
    fgParallaxX: { get: () => 0 } as any,
    fgParallaxY: { get: () => 0 } as any,
    backFaceMounted: isFlipped,
    WcScrapLabel: CardPersona.visuals.ScrapLabel as any,
    title: learningData.word ?? '',
    CardPersona,
  }), [
    activeCard, learningData, systemData, isFlipped,
    CardPersona, learningLang, systemLang,
  ])

  const handleSenseChange = (index: number) => {
    setActiveSenseIndex(Math.max(0, Math.min(index, allSenses.length - 1)))
    setIsFlipped(false)   // 切换 sense 时重置翻面
  }

  return (
    <AnimatePresence>
      {inspectedCard && (
        <>
          {/* Backdrop：点击关闭 */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setInspectedCard(null)}
          />

          {/* 卡片展开动画 */}
          <motion.div
            className="fixed z-50 overflow-hidden select-none"
            style={{ borderRadius: CardPersona.tokens.layout.radius }}
            initial={{
              left: inspectedCard.screenX,
              top: inspectedCard.screenY,
              width: inspectedCard.screenW,
              height: inspectedCard.screenH,
              opacity: 0,
            }}
            animate={{
              left: targetX,
              top: targetY,
              width: targetW,
              height: targetH,
              opacity: 1,
            }}
            exit={{
              left: inspectedCard.screenX,
              top: inspectedCard.screenY,
              width: inspectedCard.screenW,
              height: inspectedCard.screenH,
              opacity: 0,
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
            // 右键翻面（与旧系统一致）
            onContextMenu={(e) => {
              e.preventDefault()
              setIsFlipped(f => !f)
            }}
          >
            <LexiCardChrome
              persona={uiTheme as 'default' | 'cyberpunk'}
              isActive={true}
              isExpanded={true}
              isFlipped={isFlipped}
              isOver={false}
              visualFeedback={null}
              hostRef={wcHostRef}
              slots={slots}
            />

            {/* Variant 导航（有多个 sense 时显示）*/}
            {hasVariants && (
              <VariantNavBar
                total={allSenses.length}
                activeIndex={activeSenseIndex}
                onChange={handleSenseChange}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Variant 导航 Bar ────────────────────────────────────────────────────────

interface VariantNavBarProps {
  total: number
  activeIndex: number
  onChange: (index: number) => void
}

function VariantNavBar({ total, activeIndex, onChange }: VariantNavBarProps) {
  return (
    // pointer-events-none 在容器上，子元素单独 pointer-events-auto
    // 防止遮住 LexiCardChrome 的下半部分
    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 pointer-events-none">
      {/* 左箭头 */}
      <button
        className="pointer-events-auto text-white/60 hover:text-white px-1 text-xl
                   transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        onClick={() => onChange(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="上一义项"
      >
        ‹
      </button>

      {/* 圆点 */}
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          className={`pointer-events-auto rounded-full transition-all duration-200
            ${i === activeIndex
              ? 'w-2 h-2 bg-white scale-125'
              : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
            }`}
          onClick={() => onChange(i)}
          aria-label={`义项 ${i + 1}`}
        />
      ))}

      {/* 右箭头 */}
      <button
        className="pointer-events-auto text-white/60 hover:text-white px-1 text-xl
                   transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        onClick={() => onChange(activeIndex + 1)}
        disabled={activeIndex === total - 1}
        aria-label="下一义项"
      >
        ›
      </button>

      {/* 计数 */}
      <span className="pointer-events-none text-[10px] text-white/40 tabular-nums ml-1">
        {activeIndex + 1}/{total}
      </span>
    </div>
  )
}
```

---

## 四、App.tsx 修改

```tsx
// 追加 import
import { InspectOverlay } from '@/app/components/ui/canvas/InspectOverlay'

// JSX 中，与 NotificationSystem 同级（DOM overlay 层，z-index 正确压在 PixiJS canvas 上方）：
<InspectOverlay />
```

---

## 五、执行顺序

1. 修改 Zustand Store：追加 `inspectedCard` 字段 + `setInspectedCard` action
2. 修改 `CardSystem.ts`：追加 `pointerdown/pointerup` + `dispatchInspect()`  
   ⚠️ 注意：`_dragStarted` 变量在 Phase 5 阶段永远是 `false`，Phase 6 追加 Stage 事件后才会真正工作
3. 新建 `InspectOverlay.tsx`
4. 修改 `App.tsx`：加入 `<InspectOverlay />`
5. **验证**（见清单）

---

## 六、验证清单

### 基础点击 → 展开
- [ ] 点击 PixiJS 色块 → InspectOverlay 从色块位置以弹性动画展开
- [ ] 展开落点为屏幕中央，尺寸约 72% 屏高
- [ ] PixiJS 画布在 Overlay 打开时仍然可见（半透明 backdrop 后方）

### 内容显示
- [ ] LexiCardChrome 显示当前 sense 的单词、定义
- [ ] 右键 → 翻转到背面（`onContextMenu` 触发 `setIsFlipped`）
- [ ] 翻面后显示背面内容

### 关闭
- [ ] 点击 Backdrop 关闭，Overlay 收缩回卡片原位（exit 动画）
- [ ] ESC 键关闭
- [ ] 关闭后 PixiJS 画布可正常平移/缩放

### Variant 导航
- [ ] 有多个 sense（variantCount > 0）的卡片：底部显示圆点 + 箭头 + 计数
- [ ] 点击圆点/箭头切换 sense，LexiCardChrome 内容更新
- [ ] 切换 sense 时 isFlipped 重置为正面
- [ ] 单 sense 卡片：无 VariantNavBar
- [ ] 第一个 sense 时左箭头 disabled；最后一个 sense 时右箭头 disabled

### 点击 vs 拖拽（Phase 5 阶段）
- [ ] 短距离点击（< 8px）：触发 inspect
- [ ] 较长移动后松手：不触发 inspect（为 Phase 6 的拖拽预留）

---

## 七、参考文件

| 文件 | 用途 |
|---|---|
| `src/app/components/ui/card/Card.tsx` | 旧系统 click/expand 逻辑参考（不复用） |
| `src/app/components/ui/card/CardWCSlots.tsx` | `getCardWCSlots` 真实签名（以此为准） |
| `src/app/components/ui/card/web/LexiCardChrome.tsx` | 渲染入口，props 定义 |
| `src/app/hooks/useCardGrouping.ts` | `mergedVariants` 结构确认 |
| `src/core/store/` | Zustand store 扩展位置 |
