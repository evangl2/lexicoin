# Lexicoin · Phase 4 实施计划
# Hover 交互 + 卡片文字层（HTMLText）

本文件是 Phase 4 的完整实施指南。  
决策背景见 `refactor-pixi-context.md`，总体规划见 `pixi_migration_plan.md`。

---

## 决策速查

| 项 | 决策 |
|---|---|
| HTMLText 时机 | Phase 4 永久加入卡片（始终显示），不是 hover-only |
| 显示内容 | 单词（word）+ 词性（pos），仅 nearLOD 显示，farLOD 无文字 |
| Hover 效果 | 微微左上浮动（-4px X，-6px Y）+ Persona 边缘炼金发光 |
| farLOD Hover | 只发光，无位移 |
| 发光实现 | GlowFilter（`pixi-filters` 包） |
| 发光动画 | 入场渐显 → 持续呼吸脉动（GSAP yoyo，神秘感），注释说明占位 |
| Persona 扩展架构 | `ICardHoverEffect` 接口（与 `IBackground` 模式一致） |
| Cyberpunk 效果 | 青色简易占位（验证热拔插机制） |
| zIndex 管理 | `worldContainer.sortableChildren = true`，hover 时 zIndex=1 |
| 光标 | 画布默认 `grab`，hover 卡片时 `pointer`（PixiJS 自动），拖拽时 Phase 6 处理 |
| CardMeta | 将 `_containers Map` 升级为 `_metas Map<string, CardMeta>`，携带位置/offset/effect |

---

## 新增依赖

```bash
npm install pixi-filters
```

`pixi-filters` v6+ 兼容 PixiJS v8，提供 `GlowFilter`。约 30KB gzip。

---

## 文件结构（新增）

```
src/pixi/
├── hover/
│   ├── ICardHoverEffect.ts        # 接口定义
│   ├── AlchemistHoverEffect.ts    # Default/Alchemist 炼金发光效果
│   └── CyberpunkHoverEffect.ts   # Cyberpunk 占位效果
└── utils/
    └── text.ts                   # RTL 检测 + 字号分档
```

**修改已有文件：**
- `src/pixi/systems/CardSystem.ts` — `_metas` 替换 `_containers`，加 HTMLText + hover 事件
- `src/pixi/core/app.ts` — 初始化时 `worldContainer.sortableChildren = true`

---

## 一、ICardHoverEffect.ts

```typescript
// src/pixi/hover/ICardHoverEffect.ts
import type { Container } from 'pixi.js'

export interface ICardHoverEffect {
  /**
   * 鼠标进入时调用。
   * nearLOD=false（远景）时：只做发光，无位移（位移由 CardSystem 外部判断）。
   */
  enter(container: Container): void
  /** 鼠标离开时调用 */
  exit(container: Container): void
  /** 销毁时调用（filter、tween 全部清理） */
  destroy(): void
}
```

---

## 二、AlchemistHoverEffect.ts

```typescript
// src/pixi/hover/AlchemistHoverEffect.ts
//
// TODO Phase 8+：光效颜色、强度、质感根据 Alchemist 美术最终方向调整。
// 当前为占位参数：Persona primary 色调，柔和外发光，神秘呼吸脉动。
// 建议未来：研究符文流光、金属边缘折射等方向。
//
import type { Container } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import gsap from 'gsap'
import type { ICardHoverEffect } from './ICardHoverEffect'

export class AlchemistHoverEffect implements ICardHoverEffect {
  private filter: GlowFilter
  private breathingTween: gsap.core.Tween | null = null
  private enterTween: gsap.core.Tween | null = null
  private exitTween: gsap.core.Tween | null = null

  constructor(glowColor: number) {
    this.filter = new GlowFilter({
      color: glowColor,      // Persona primary 色（由 CardSystem 传入）
      outerStrength: 0,
      innerStrength: 0,
      distance: 18,          // 发光扩散距离（px）
      quality: 0.3,          // 性能：不需要高质量采样
    })
  }

  enter(container: Container): void {
    this.exitTween?.kill()
    this.breathingTween?.kill()

    container.filters = [this.filter]

    // 渐显到基准强度，到达后开始呼吸脉动
    this.enterTween = gsap.to(this.filter, {
      outerStrength: 2.5,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        this.breathingTween = gsap.to(this.filter, {
          outerStrength: 3.8,
          duration: 1.4,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        })
      },
    })
  }

  exit(container: Container): void {
    this.enterTween?.kill()
    this.breathingTween?.kill()

    this.exitTween = gsap.to(this.filter, {
      outerStrength: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        // 移除 filter 避免不必要的 GPU pass
        if (container.filters?.includes(this.filter)) {
          container.filters = []
        }
      },
    })
  }

  destroy(): void {
    this.enterTween?.kill()
    this.breathingTween?.kill()
    this.exitTween?.kill()
    this.filter.destroy()
  }
}
```

---

## 三、CyberpunkHoverEffect.ts

```typescript
// src/pixi/hover/CyberpunkHoverEffect.ts
//
// TODO：Cyberpunk hover 最终效果未定。当前为青色占位，用于验证 Persona 热拔插。
// 建议未来：扫描线边缘 + 数字噪声闪烁。
//
import type { Container } from 'pixi.js'
import { GlowFilter } from 'pixi-filters'
import gsap from 'gsap'
import type { ICardHoverEffect } from './ICardHoverEffect'

export class CyberpunkHoverEffect implements ICardHoverEffect {
  private filter: GlowFilter
  private tween: gsap.core.Tween | null = null

  constructor() {
    this.filter = new GlowFilter({
      color: 0x00FF88,  // Cyberpunk 青色
      outerStrength: 0,
      distance: 12,
      quality: 0.3,
    })
  }

  enter(container: Container): void {
    this.tween?.kill()
    container.filters = [this.filter]
    this.tween = gsap.to(this.filter, { outerStrength: 3, duration: 0.2 })
  }

  exit(container: Container): void {
    this.tween?.kill()
    this.tween = gsap.to(this.filter, {
      outerStrength: 0,
      duration: 0.15,
      onComplete: () => { container.filters = [] },
    })
  }

  destroy(): void {
    this.tween?.kill()
    this.filter.destroy()
  }
}
```

---

## 四、utils/text.ts

```typescript
// src/pixi/utils/text.ts
// RTL 语言检测 + 卡片文字字号分档

/** 已知 RTL 语言 code（ISO 639-1）*/
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'dv'])

/** 根据 lang code 判断是否为从右到左语言 */
export function isRTL(lang: string): boolean {
  return RTL_LANGS.has(lang.split('-')[0])
}

/**
 * 根据单词长度返回字号（px）。
 * 分三档预设，避免 DOM 测量。Phase 8 可按 Persona 调整。
 */
export function getWordFontSize(wordLength: number): number {
  if (wordLength <= 4)  return 28
  if (wordLength <= 8)  return 22
  if (wordLength <= 12) return 18
  return 14
}
```

---

## 五、CardSystem.ts 修改（Phase 4 扩展）

### 5.1 新增 CardMeta 结构

将原来的 `Map<string, Container>` 替换为 `Map<string, CardMeta>`：

```typescript
// 新增 import
import { HTMLText } from 'pixi.js'
import type { ICardHoverEffect } from '../hover/ICardHoverEffect'
import { AlchemistHoverEffect } from '../hover/AlchemistHoverEffect'
import { CyberpunkHoverEffect } from '../hover/CyberpunkHoverEffect'
import { isRTL, getWordFontSize } from '../utils/text'
import gsap from 'gsap'

/** 每张 Anchor 卡的运行时状态 */
interface CardMeta {
  uid: string
  container: Container
  baseX: number                  // pixi 世界坐标（不含 hover offset，是位置真相）
  baseY: number
  hoverOffset: { x: number; y: number }  // GSAP 操作此对象，container 跟随
  effect: ICardHoverEffect
}

// 将原 const _containers = new Map<string, Container>() 替换为：
const _metas = new Map<string, CardMeta>()
```

### 5.2 HoverEffect 工厂

```typescript
function createHoverEffect(): ICardHoverEffect {
  const persona = getPersonaData()
  if (persona?.theme === 'cyberpunk') return new CyberpunkHoverEffect()
  return new AlchemistHoverEffect(persona?.primary ?? 0xD4AF37)
}
```

### 5.3 buildCardContainer 扩展

在 nearLod Container 的 `mainRect` 之后，追加文字层，并在函数末尾注册交互事件：

```typescript
function buildCardContainer(card: PixiCardData, pixiX: number, pixiY: number): Container {
  const container = new Container()
  container.label = card.uid
  container.position.set(pixiX, pixiY)
  // Phase 3: eventMode = 'none' → Phase 4: 'static'
  container.eventMode = 'static'
  container.cursor = 'pointer'

  const color = _personaColor

  // --- Variant 偏移层（与 Phase 3 相同）---
  const layers = Math.min(card.variantCount, MAX_VISIBLE_LAYERS)
  for (let i = layers; i >= 1; i--) {
    const offset = i * LAYER_OFFSET
    const layer = new Graphics()
    layer.label = `variant-layer-${i}`
    layer.rect(-CARD_W / 2 + offset, -CARD_H / 2 + offset, CARD_W, CARD_H)
      .fill({ color, alpha: 0.35 })
    container.addChild(layer)
  }

  // --- Near LOD ---
  const nearLod = new Container()
  nearLod.label = 'near-lod'

  const mainRect = new Graphics()
  mainRect.label = 'main-rect'
  mainRect.rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H)
    .fill({ color, alpha: 0.70 })
  // Phase 8 TODO: 替换为真实卡片视觉（Alchemist = 金属符文板）
  nearLod.addChild(mainRect)

  // ── HTMLText 文字层（Phase 4 新增，Phase 8 随视觉替换调整位置）──
  if (card.word) {
    const rtl = isRTL(card.lang)
    const wordText = new HTMLText({
      text: rtl
        ? `<span style="direction:rtl;unicode-bidi:embed">${card.word}</span>`
        : card.word,
      style: {
        // HTMLText 使用 HTML 渲染，能访问 CSS @font-face 已加载的字体
        fontFamily: 'var(--font-display, sans-serif)',
        fontSize: getWordFontSize(card.word.length),
        fill: '#FFFFFF',
        align: rtl ? 'right' : 'center',
        wordWrap: true,
        wordWrapWidth: CARD_W - 24,
      },
    })
    wordText.label = 'word-text'
    wordText.anchor.set(0.5, 0.5)
    wordText.position.set(0, -18)   // 卡片中心略偏上
    nearLod.addChild(wordText)
  }

  if (card.pos) {
    const posText = new HTMLText({
      text: card.pos,
      style: {
        fontSize: 11,
        fill: '#FFFFFF80',
        align: 'center',
      },
    })
    posText.label = 'pos-text'
    posText.anchor.set(0.5, 0.5)
    posText.position.set(0, 26)     // 单词下方
    nearLod.addChild(posText)
  }
  // ────────────────────────────────────────────────────────────────

  container.addChild(nearLod)

  // --- Far LOD（无文字，太小无法阅读）---
  const farW = CARD_W * FAR_SCALE
  const farH = CARD_H * FAR_SCALE
  const farLod = new Container()
  farLod.label = 'far-lod'
  farLod.visible = false
  const farRect = new Graphics()
  farRect.label = 'far-rect'
  farRect.rect(-farW / 2, -farH / 2, farW, farH)
    .fill({ color, alpha: 0.56 })
  // Phase 8 TODO: 替换为卡片 SVG 缩略图
  farLod.addChild(farRect)
  container.addChild(farLod)

  // --- ×N 角标（Phase 3 相同）---
  if (card.variantCount > 0) {
    const badge = new Text({
      text: `×${card.variantCount + 1}`,
      style: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' },
    })
    badge.label = 'badge'
    badge.anchor.set(1, 0)
    badge.position.set(CARD_W / 2 - 2, -CARD_H / 2 + 4)
    container.addChild(badge)
  }

  // --- CardMeta + Hover 事件（Phase 4 新增）---
  const meta: CardMeta = {
    uid: card.uid,
    container,
    baseX: pixiX,
    baseY: pixiY,
    hoverOffset: { x: 0, y: 0 },
    effect: createHoverEffect(),
  }
  _metas.set(card.uid, meta)

  container.on('pointerover', () => {
    const nearLOD = _viewport!.scale.x >= LOD_THRESHOLD

    meta.effect.enter(container)
    container.zIndex = 1

    // nearLOD 才做位移（farLOD 只发光，卡片太小看不出位移）
    if (nearLOD) {
      gsap.killTweensOf(meta.hoverOffset)
      gsap.to(meta.hoverOffset, {
        x: -4, y: -6,
        duration: 0.4,
        ease: 'elastic.out(1, 0.5)',
        onUpdate: () =>
          container.position.set(
            meta.baseX + meta.hoverOffset.x,
            meta.baseY + meta.hoverOffset.y
          ),
      })
    }
  })

  container.on('pointerout', () => {
    meta.effect.exit(container)
    container.zIndex = 0

    gsap.killTweensOf(meta.hoverOffset)
    gsap.to(meta.hoverOffset, {
      x: 0, y: 0,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)',
      onUpdate: () =>
        container.position.set(
          meta.baseX + meta.hoverOffset.x,
          meta.baseY + meta.hoverOffset.y
        ),
    })
  })

  return container
}
```

### 5.4 syncCards 更新（使用 _metas）

```typescript
function syncCards(cards: PixiCardData[]): void {
  if (!_viewport) return

  const incomingUids = new Set(cards.map(c => c.uid))

  // 移除已消失的卡片
  for (const [uid, meta] of _metas) {
    if (!incomingUids.has(uid)) {
      meta.effect.destroy()
      meta.container.destroy({ children: true })
      _metas.delete(uid)
    }
  }

  // 新增或更新
  for (const card of cards) {
    const { x, y } = toPixiWorld(card.x, card.y)
    if (_metas.has(card.uid)) {
      const meta = _metas.get(card.uid)!
      meta.container.position.set(x, y)
      meta.baseX = x
      meta.baseY = y
    } else {
      buildCardContainer(card, x, y)
      _viewport.addChild(_metas.get(card.uid)!.container)
    }
  }

  updateCulling()
  updateLOD()
}
```

### 5.5 updateCulling / updateLOD（_metas 适配）

```typescript
// 将原来 _containers.values() 改为 _metas.values()，
// 访问 container 通过 meta.container。
// 其余逻辑不变。
```

### 5.6 destroyCardSystem 更新

```typescript
export function destroyCardSystem(): void {
  _unsubCards?.()
  _unsubPersona?.()
  _viewport?.off('moved', updateCulling)
  _viewport?.off('zoomed', updateLOD)
  _viewport?.off('zoomed', updateCulling)

  _metas.forEach(meta => {
    meta.effect.destroy()
    meta.container.destroy({ children: true })
  })
  _metas.clear()
  _viewport = null
}
```

---

## 六、app.ts 修改

在 `initPixiApp` 中，`worldContainer` 创建后追加：

```typescript
// Phase 4：卡片 zIndex 排序支持
worldContainer.sortableChildren = true
```

同时，在 PixiRoot 挂载后为 canvas 设置初始光标（或在 `initPixiApp` 内）：

```typescript
// 画布默认光标：grab（整体可平移）
app.canvas.style.cursor = 'grab'

// pixi-viewport 平移事件（配合光标）
viewport.on('drag-start', () => { app.canvas.style.cursor = 'grabbing' })
viewport.on('drag-end',   () => { app.canvas.style.cursor = 'grab' })
// 卡片 hover 时 container.cursor='pointer' → PixiJS 自动接管 canvas cursor
// 卡片拖拽时 Phase 6 手动设为 'grabbing'
```

---

## 七、执行顺序

1. `npm install pixi-filters`
2. 新建 `src/pixi/utils/text.ts`
3. 新建 `src/pixi/hover/ICardHoverEffect.ts`
4. 新建 `src/pixi/hover/AlchemistHoverEffect.ts`
5. 新建 `src/pixi/hover/CyberpunkHoverEffect.ts`
6. 修改 `src/pixi/systems/CardSystem.ts`（`_metas`、HTMLText、hover 事件）
7. 修改 `src/pixi/core/app.ts`（`sortableChildren`、光标）
8. **验证**（见清单）

---

## 八、验证清单

### HTMLText
- [ ] nearLOD 下卡片显示单词文字（英文、中文、阿拉伯文各测试一组）
- [ ] RTL 语言（如阿拉伯文）文字方向正确（右对齐，bidi 正确）
- [ ] 词性标注显示（灰色，单词正下方）
- [ ] farLOD（scale < 0.25）下无文字
- [ ] 字号随单词长度正确分档（短词大字，长词小字）

### Hover 动效
- [ ] 鼠标悬停：卡片向左上微移（约 4px X，6px Y，world 单位）
- [ ] 悬停：边缘发光渐显，随后呼吸脉动
- [ ] 离开：位移回弹（elastic.out），发光渐灭
- [ ] farLOD 下 hover：只有发光，无位移
- [ ] 快速连续 hover 多张卡片无动画残留（killTweensOf 生效）
- [ ] hover 时卡片渲染在其他卡片之上（zIndex=1 生效）

### Persona 热拔插
- [ ] DevConsole 切换到 Cyberpunk：hover 变为青色发光
- [ ] 切回 Default/Alchemist：恢复金色呼吸发光
- [ ] 切换期间正在 hover 的卡片不崩溃

### 光标
- [ ] 画布无 hover 时：`grab`
- [ ] 画布平移中：`grabbing`
- [ ] hover 到卡片：`pointer`

---

## 九、参考文件

| 文件 | 用途 |
|---|---|
| `src/pixi/hover/IBackground.ts` | 参考 IBackground 接口模式 |
| `src/pixi/systems/BackgroundSystem.ts` | 参考热拔插模式 |
| `src/pixi/systems/CardSystem.ts`（Phase 3 版本）| 修改基础 |
| `src/pixi/persona-bridge.ts` | `getPersonaData().primary` 获取发光颜色 |
| `pixi-filters` 文档：GlowFilter | `outerStrength`、`color`、`distance` 参数说明 |
