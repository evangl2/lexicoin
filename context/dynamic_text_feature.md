# Dynamic Text Feature Analysis

## 1. 概述 (Overview)

`DynamicText` 是 Lexicoin 项目中用于处理响应式文本排版的核心组件。它旨在解决多语言环境下的文本自适应问题，确保无论文本长短（如简短的英文单词或长段的日语说明），都能在容器内完美展示，且不发生溢出或截断。

该功能主要由以下三个部分组成：
1.  **`useTextFit` Hook**: 负责核心的尺寸计算和溢出检测。
2.  **`typographyUtils`**: 负责统一的排版样式计算（行高、字重、字间距）。
3.  **`DynamicText` Component**: 负责组件的渲染和视觉表现。

## 2. 核心架构 (Core Architecture)

### 2.1 排版一致性 (Typography Synchronization)

为了解决“测量时文本大小合适，但渲染时因样式变化导致溢出”的问题，我们引入了**排版计算一致性**机制。

*   **`src/utils/typographyUtils.ts`**:
    *   该工具函数 `calculateTypographyStyle(scriptType, fontSize)` 集中管理所有的排版逻辑。
    *   它根据 `fontSize` 动态计算 `lineHeight`（行高）、`letterSpacing`（字间距）和 `fontWeight`（字重）。
    *   **关键点**：小字号通常需要更大的行高（如 1.6）以保证可读性，而大字号行高较小（如 1.2）。

### 2.2 测量机制 (`useTextFit.ts`)

`useTextFit` 使用**二分查找算法**在 `minFontSize` 和 `maxFontSize` 之间寻找最佳字号。

*   **`resolveStyle` 回调**:
    *   Hook 接受一个 `resolveStyle` 回调函数。
    *   每次尝试一个字号时，Hook 会调用此回调，获取该字号下的确切样式（行高、字间距等），应用到测试元素上，然后再进行溢出检测。
    *   这确保了“测量状态”和最终的“渲染状态”完全一致。

*   **安全缓冲 (Safety Buffer)**:
    *   为了防止浏览器渲染引擎的亚像素误差或字体自身的基线偏移（Ascender/Descender）导致视觉截断，我们在检测时引入了 **3px 的视觉安全缓冲**。
    *   逻辑：`if (textRect.height > (container.clientHeight - 3)) return false;`
    *   这意味着文本内容必须比容器高度至少小 3px 才算“合适”。

### 2.3 组件实现 (`DynamicText.tsx`)

`DynamicText` 组件负责将上述逻辑串联起来：
1.  根据文本内容自动检测脚本类型（`Latin`, `CJK`, `RTL`）。
2.  定义 `resolveTypography` 函数，将其传递给 `useTextFit`。
3.  获取计算出的最佳 `fontSize`。
4.  再次调用 `typographyUtils` 生成最终渲染样式。
5.  应用样式并渲染。

## 3. 布局注意事项 (Layout Best Practices)

在父组件中使用 `DynamicText` 时，需注意以下布局规则以避免截断：

1.  **避免垂直因通过 Auto Margin 强制居中**:
    *   不要在 `DynamicText` 的 `className` 中使用 `my-auto`。
    *   如果父容器是 `flex-col`，且设置了 `overflow: hidden`，`my-auto` 可能会导致文本块在垂直方向上被强制居中，从而使得顶部和底部的安全空间失效，导致 Ascender/Descender 被切断。
    *   **推荐**：让 Flex 容器控制对齐（如 `justify-center`），或者允许文本块自然填充。

2.  **容器约束**:
    *   父容器必须有明确的高度或 `max-height`，否则自动缩放将无法正常工作（因为没有边界）。

## 4. 文件结构 (File Structure)

*   `src/app/components/ui/DynamicText.tsx`: 组件入口。
*   `src/app/hooks/useTextFit.ts`: 自适应核心 Hook。
*   `src/utils/typographyUtils.ts`: 排版样式计算工具。
*   `src/utils/scriptUtils.ts`: 脚本语言检测工具。
