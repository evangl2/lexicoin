# Dynamic Text Feature Analysis: Tiered & Math-First Strategy

## 1. 概述 (Overview)

`TieredText` (替换了旧版的 `DynamicText`) 是 Lexicoin 项目中用于处理 Flavor Text 响应式排版的核心组件。

它彻底摒弃了传统的“二分查找”和“高频 DOM 测量”方案，转而采用 **“数学预测优先 + 被动环境检测”** 的策略。这种改变旨在解决复杂动画（如 Spring 动画）过程中 DOM 尺寸不稳定导致文字大小计算错误的问题。

**核心理念：**
1.  **预测 (80%)**: 利用公式 `(Length / Width) => Tier` 瞬间得出最佳字号，无延迟。
2.  **兜底 (20%)**: 仅在预测失败（如特殊宽字符溢出）时，才触发 DOM 检测并进行降级。

主要涉及文件：
- `src/utils/textTierUtils.ts`: 视觉长度计算与层级定义。
- `src/app/hooks/useTieredAutoType.ts`: 核心预测与检测 Hook。
- `src/app/components/ui/TieredText.tsx`: 渲染组件。

---

## 2. 核心算法 (Core Algorithms)

### 2.1 视觉长度计算 (Visual Length Calculation)
为了让预测模型精准，必须先算出文字的“视觉权重”，而非简单的 `.length`。

我们实现了全球化的长度加权 (`getVisualLength`)：
- **宽字符 (1.8)**: CJK (中日韩)、全角符号、**Emoji** (支持代理对)。
- **标准字符 (1.0)**: Latin, Cyrillic, Greek, Arabic, Hebrew, Devanagari。
- **窄字符 (0.5)**: `i`, `l`, `1`, `|`, `!`, `,`, `.`, 空格等。
- **零宽字符 (0.0)**: 组合变音符 (Combining Diacritics)，零宽连接符。

### 2.2 层级预测 (Tier Prediction)
系统预设了 5 个基于视觉密度的排版层级。预测函数 `predictTier` 根据 `有效长度 = 视觉长度 / (容器宽度 / 基准300px)` 来命中层级。

| 层级 (Tier) | 适用长度 (Effective Len) | 字号 (px) | 行高 | 字间距 | 字重 | 场景 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Headline** | < 15 | 24 | 1.2 | 0.02em | 600 | 短语/标题 |
| **Statement** | 15 - 45 | 18 | 1.35 | 0.01em | 500 | 短句 |
| **Body** | 45 - 90 | 15 | 1.5 | 0em | 400 | 标准段落 |
| **Dense** | 90 - 140 | 13 | 1.55 | -0.01em | 400 | 长描述 |
| **Micro** | > 140 | 11 | 1.6 | 0em | 500 | 极长文本 |

---

## 3. Hook 机制：useTieredAutoType

### 3.1 瞬间渲染 (Instant Render)
Hook 首次运行时，直接调用 `predictTier` 并返回结果。这意味着在组件挂载的第一帧，文字就已经有了非常接近最终效果的样式。这点对于配合 `framer-motion` 动画至关重要，因为它避免了样式突变。

### 3.2 被动检测 (Passive Detection)
在 `useLayoutEffect` 中，我们做一次低成本检查：
- **溢出降级 (Downgrade)**: 如果 `scrollHeight > clientHeight * 1.05`，说明预测偏乐观（可能全是宽体大写字母）。此时触发降级。
    - **多级跳跃**: 如果溢出比例巨大 (e.g. > 1.5倍)，算法会直接跳过中间层级，一步到位降 2-3 级。
- **空置升级 (Upgrade)**: 引入 **滞后回差 (Hysteresis)**，只有当空间极度富余 (e.g. `usage < 45%`) 时，才尝试升级。这防止了在两个层级间反复横跳的震荡。

### 3.3 容器感知 (Resize Observer)
Hook 内部使用 `ResizeObserver` 监听容器宽度。当宽度变化超过阈值（如 5px）时，会更新 `containerWidth` 状态，从而自动触发新的数学预测。

---

## 4. 组件：TieredText

`TieredText` 是一个轻量级封装，替代了旧的 `DynamicText`。

### Props
```typescript
interface TieredTextProps {
    text: string;
    className?: string; // 额外的容器样式
    style?: React.CSSProperties; // 额外的文本样式 (fontFamily 等)
    gradient?: string; // 渐变色
    shadow?: string; // 文字阴影
}
```

### 特性
- **零布局抖动**: 由于第一帧即准确，用户不会看到文字从小变大或从大变小的过程。
- **高性能**: 95% 的情况下只有一次渲染。
- **动画友好**: 配合 `AnimatePresence` 使用时，不会因为父容器正在折叠/展开而计算出错误的 0 尺寸。

---

## 5. 最佳实践 (Best Practices)

1.  **容器宽度稳定**: 虽然支持动态缩放，但为了预测准确，父容器最好有一个相对确定的宽度（可以是百分比）。
2.  **避免极端窄容器**: 在极窄容器 (<150px) 中，单词换行会导致垂直高度迅速膨胀，可能导致预测算法低估高度。
3.  **字体加载**: 视觉长度算法假设的是标准字体。如果使用极其特殊的艺术字体（特别宽或特别窄），可能需要调整 `textTierUtils` 中的阈值。

---

## 6. 开发指南 (Integration Guide)

### 6.1 基础用法

最简单的用法是直接替换 `DynamicText`，传入文本即可。
注意：**父容器必须有明确的宽度**（可以是 `flex-1`, `w-full`, 或固定像素），否则预测算法无法工作。

```tsx
import { TieredText } from '@/app/components/ui/TieredText';

// 父容器
<div className="w-full h-32 flex items-center justify-center p-4">
    <TieredText 
        text="A wizard is never late, nor is he early." 
        className="font-serif italic" // 额外的容器样式
        style={{ color: '#F0D082' }}  // 额外的文本样式
    />
</div>
```

### 6.2 进阶特效 (渐变与阴影)

支持传入 Design System 中的 Token。

```tsx
<TieredText 
    text="Expelliarmus!"
    gradient="linear-gradient(to bottom, #FFD700, #B8860B)" // 金色渐变
    shadow="0 2px 4px rgba(0,0,0,0.5)"
/>
```

### 6.3 预计算 (Pre-calculation)

如果你需要在渲染组件之前就知道文字的大小（例如用于服务端渲染 SSR 或布局预判），可以直接调用 Utility 函数。

```typescript
import { predictTier, getVisualLength } from '@/utils/textTierUtils';

const text = "你好，世界";
const containerWidth = 300; // 假设容器宽度

// 1. 获取视觉长度 (CJK=1.8, Latin=1.0)
const len = getVisualLength(text); // output: ~9.0

// 2. 获取预测层级
const tier = predictTier(text, containerWidth); 

console.log(tier.fontSize); // e.g. 24
console.log(tier.id);       // e.g. "headline"
```

### 6.4 调试 (Debugging)

如果遇到文字大小不符合预期，请检查：
1.  **容器宽度**：`TieredText` 内部会打印 `ResizeObserver` 捕获的宽度。如果宽度为 0，文字会显示最小号。
2.  **字符类型**：检查文本中是否包含未被 `getVisualLength` 正确权重的特殊字符。
