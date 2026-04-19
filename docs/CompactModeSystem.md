# Compact Mode System

**Version:** 1.0 (2026-02-14)
**Status:** Implemented

## 1. 概述 (Overview)

`CompactMode` 是 Lexicoin 卡片不仅用于 Canvas 上的大尺寸展示，也用于 Repository (Dock) 中的缩略展示系统。该系统旨在提供三种不同密度的视觉模式，以适应用户在不同阶段（浏览、筛选、拖拽）的需求。

核心组件：`src/app/components/ui/CompactCardVisual.tsx`
集成位置：`src/app/components/ui/DeckRepository.tsx`

---

## 2. 模式定义 (Modes)

系统支持以下三种 `CompactMode`：

### 2.1 Repository Mode (`'repository'`)
- **定位**：标准卡片的微缩版 (Miniature)。
- **尺寸**：125px x 175px
- **用途**：默认的浏览视图，提供最完整的信息概览。
- **视觉元素**：
  - **背景**：完整保留 Persona 背景与纹理。
  - **核心词汇**：使用 `TieredText` 动态排版，居中显示。
  - **插图**：背景水印形式的 Dynamic Visual。
  - **难度标签**：右上角 ScrapLabel。
  - **耐久度**：底部条形展示 (DurabilityBar)。
  - **本体论 (Ontology)**：左下角微型标签。

### 2.2 Icon Mode (`'icon'`)
- **定位**：纯视觉图标。
- **尺寸**：80px x 80px
- **用途**：快速视觉扫描，适合熟练用户通过图像记忆查找卡片。
- **视觉元素**：
  - **插图**：全尺寸 Dynamic Visual，色彩鲜艳。
  - **耐久度**：底部浮层条。
  - **无文字**：不显示单词或难度。

### 2.3 Word Mode (`'word'`)
- **定位**：紧凑文本条。
- **尺寸**：140px x 40px (High Density)
- **用途**：列表式浏览，最大化屏幕空间利用率。
- **视觉元素**：
  - **核心词汇**：使用 `TieredText` 居中显示，最大化可读性。
  - **耐久度**：**绝对底部**，全宽 (100%)，无间隙。
  - **极简风格**：去除边框装饰和背景纹理，仅保留文字与功能性 UI。

---

## 3. 关键技术实现 (Key Implementation Details)

### 3.1 动态文本 (Dynamic Text Integration)
为了解决在小尺寸容器中显示长单词的问题（如 "Internationalization" 或多字中文），我们集成了 `TieredText` 组件。

- **算法**：基于 `(Length / Width)` 的数学预测优先算法 (`useTieredAutoType`)。
- **优势**：0 延迟渲染，无布局抖动 (Layout Shift)。
- **应用范围**：`Repository` 和 `Word` 模式。

### 3.2 活跃变体同步 (Active Variant Persistence)
Repository 必须总是显示卡片当前选中的 "面" (Persona/Sense)，而不是默认值。

- **数据流 (Data Flow)**:
  1. `App.tsx`: 通过 `useCardGrouping` 计算出包含所有变体的 `mergedVariants`。
  2. `Dock.tsx`: 接收并将 `mergedVariants` 传递给 Repository。
  3. `DeckRepository.tsx`: 将对应 UID 的变体列表传递给内部子组件 `RepoCard`（定义于同文件中）。
  4. `RepoCard`（内部组件）: 使用 `useCardVariants` Hook，结合全局 `useGameStore` 中的 `activeVariants` 状态，解析出当前应该渲染的 `currentCardData`。

### 3.3 严格样式复用 (Strict Token Design)
所有视觉元素严格遵循 Design System，不硬编码 SVG 或颜色。

- **Visuals**: 从 `item.cardData.visual` 读取。
- **Colors/Fonts**: 从 `Persona.tokens` 读取。
- **Components**: 复用 `Persona.visuals` 中的子组件 (Background, ScrapLabel, DurabilityBar)。

---

## 4. 交互与行为 (Interaction & Behavior)

- **拖拽 (Drag & Drop)**: 无论当前视图是什么模式，拖拽出的 `DragPreview` 始终通过 `DragPreviewCard.tsx` 渲染，并智能适配尺寸。
- **悬停 (Hover)**:
  - Repository/Word: 显示辉光或边框高亮。
  - Word Mode: 耐久度条在 hover 时增加不透明度。
- **点击 (Click)**: (TODO) 可能会触发详情预览或定位到 Canvas。

---

## 5. 文件结构 (File Structure)

```
src/app/components/ui/
├── card/
│   ├── CompactCardVisual.tsx   // 核心渲染组件 (Stateless)
│   └── DragPreviewCard.tsx     // 拖拽时的替身组件
└── shell/
    └── DeckRepository.tsx      // 容器组件，管理 List 渲染与模式切换
                                // RepoCard（处理 Drag 与 Active Variant）定义于此文件内部，非独立文件
```
