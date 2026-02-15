# 仓库系统 (Repository System) 技术文档

**当前版本**: 2.0 (Dual-Domain Architecture)
**最后更新**: 2026-02-14

## 1. 架构概览 (Architecture Overview)

仓库系统实现了 Lexicoin 的“双域架构”：**活跃域 (Canvas)** 与 **非活跃域 (Repository)**。该系统通过统一的数据流管理卡片的生命周期，并处理复杂的跨域交互。版本 2.0 引入了侧边栏导航、多种视图模式以及与道具系统的集成。

### 核心设计原则
*   **单一事实来源 (SSOT)**: 所有的卡片数据（无论在画布还是仓库）均由 `useCardManager` 统一管理。
*   **零冲突物理**: 仅在 `location === 'canvas'` 的卡片参与物理碰撞模拟。
*   **平滑过渡**: 跨域移动（存入/取出）伴随着状态感知型动画。
*   **模态视图**: 提供多种紧凑视图以适应不同的检索需求。

---

## 2. UI 结构与布局 (UI Structure)

### 2.1 主容器 (`DeckRepository.tsx`)
仓库 UI 采用 **Flexbox + Grid** 的混合布局，分为左右两个区域：

1.  **侧边栏 (Sidebar)**:
    *   **导航**: 提供 "WORDS" (词语) 和 "PROPS" (道具) 两个 Tab 切换。


2.  **内容区域 (Content Area)**:
    *   **头部 (Header)**: 包含当前 Tab 标题、视图切换按钮 (Cards/Icons/List) 以及排序控件。
    *   **滚动区 (Scroll Area)**: 水平滚动的容器，支持鼠标滚轮垂直滚动转换为水平滚动。

### 2.2 视图模式 (View Modes)
为了适应不同数量级的卡片管理，系统提供了三种视图模式，通过 `cardMode` 状态管理：

| 模式 | 标识 | 描述 | 布局特性 | 尺寸 |
| :--- | :--- | :--- | :--- | :--- |
| **Cards** | `repository` | 标准微缩卡片，展示完整信息（视觉、单词、等级、耐久）。 | 单行水平排列 | 125x175px |
| **Icons** | `icon` | 仅展示视觉图像和耐久度，适合快速浏览视觉。 | **双行** Grid (`grid-rows-[auto_auto]`)，紧凑排列 | 80x80px |
| **List** | `word` | 仅展示单词和简略信息，适合大量文本检索。 | **三行** Grid (`grid-rows-[auto_auto_auto]`)，紧凑排列 | 140x40px |

### 2.3 自动交互 (Auto-Interaction)
*   **自动关闭**: 仓库不再设有关闭按钮。当用户点击画布空白处 (`canvas-wrapper` onPointerDown) 或聚焦某个卡片 (`handleCardFocus`) 时，仓库会自动折叠。
*   **拖拽支持**: `RepoCard` 和 `RepoProp` 均实现了 `Draggable`，支持直接从仓库拖拽至画布。

---

## 3. 数据结构与状态管理

### 3.1 扩展的卡片模型 (`useCardManager.ts`)
`CardItem` 接口增加了 `location` 字段，标识卡片所属域。

```typescript
export interface CardItem {
    cardData: CardEntity;
    mx: MotionValue<number>;  // Canvas 坐标 X
    my: MotionValue<number>;  // Canvas 坐标 Y
    scale: MotionValue<number>; // 全局 UI 缩放
    location: 'canvas' | 'repository'; 
}
```

### 3.2 数据流向
*   **Words**: `items` (CardItem[]) 从 `useCardManager` -> `Dock` -> `DeckRepository`.
*   **Props**: `propItems` (PropItem[]) 从 `Dock` -> `DeckRepository`.
*   **Variants**: `mergedVariants` 从 `App` -> `Dock` -> `DeckRepository`，用于在仓库中正确显示变体卡片的状态。

---

## 4. 跨域交互流程 (Cross-Domain Flow)

### 4.1 存入流程 (Canvas → Repository)
1.  **物理检测**: 拖拽过程中，系统将卡片坐标转换为屏幕坐标，检测是否进入 Dock 触发区。
2.  **状态变更**: 触发 `onStore(uid)`。
    *   更新 `items` 状态，将 `location` 设为 `repository`。
    *   更新 IndexedDB 中的位置记录。
3.  **视觉反馈**: 卡片缩小并飞入 Dock，随后从画布渲染树中移除。

### 4.2 提取流程 (Repository → Canvas)
1.  **拖拽启动**: 用户从仓库列表中拖拽 `RepoCard`。
2.  **放置检测**: `React-DnD` 监听 Drop 事件。
3.  **动量重置**: 调用 `retrieveCard(uid, x, y)`。
    *   **关键**: 必须创建新的 `MotionValue` 实例，以重置旧的运动惯性，防止视觉跳变。
    *   状态更新为 `location: 'canvas'`。

---

## 5. 渲染与性能 (Rendering & Performance)

### 5.1 微型视觉组件 (`CompactCardVisual.tsx`)
针对不同视图模式的渲染优化：
*   **Props**:
    *   `mode='repository'`: 渲染完整微缩图，包含背景、水印、层级标签。
    *   `mode='icon'`: 移除背景和文字，仅渲染 SVG 视觉核心 (`DynamicVisual`)。
    *   `mode='word'`: 移除大部分视觉元素，仅保留 `TieredText` 和耐久度条。

### 5.2 布局性能
*   **CSS Grid**: Icon 和 List 模式使用 CSS Grid (`grid-flow-col`) 实现高效的多行流式布局，避免了复杂的 JavaScript 计算。
*   **Virtualization (潜在)**: 目前使用原生滚动，若卡片数量超过 500+，建议引入虚拟滚动 (Virtual Scroller)。

---

*文档更新于 2026-02-14 | 适配 Repository 2.0 特性*
