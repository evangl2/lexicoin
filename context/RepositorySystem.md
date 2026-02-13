# 仓库系统 (Repository System) 技术文档

**当前版本**: 1.1 (Deep Integration)
**最后更新**: 2026-02-13

## 1. 架构概览 (Architecture Overview)

仓库系统实现了 Lexicoin 的“双域架构”：**活跃域 (Canvas)** 与 **非活跃域 (Repository)**。该系统通过统一的数据流管理卡片的生命周期，并处理复杂的跨域交互。

### 核心设计原则
*   **单一事实来源 (SSOT)**: 所有的卡片数据（无论在画布还是仓库）均由 `useCardManager` 统一管理。
*   **零冲突物理**: 仅在 `location === 'canvas'` 的卡片参与物理碰撞模拟。
*   **平滑过渡**: 跨域移动（存入/取出）伴随着状态感知型动画。

---

## 2. 数据结构与状态管理

### 2.1 扩展的卡片模型 (`useCardManager.ts`)
`CardItem` 接口增加了 `location` 字段，用于在内存中标识卡片所属域。

```typescript
export interface CardItem {
    cardData: CardEntity;
    mx: MotionValue<number>;  // 坐标系统 (Canvas Units)
    my: MotionValue<number>;
    scale: MotionValue<number>; // 全局 UI 缩放 (用于吸收动画)
    location: 'canvas' | 'repository'; 
}
```

### 2.2 派生数据流
在 `useCardManager` 中，我们利用 `useMemo` 将原始 `items` 数组拆分为两个响应式列表：
*   `canvasItems`: 传递给 `App.tsx` 进行 2D 物理与混合渲染。
*   `repositoryItems`: 传递给 `Dock.tsx` -> `DeckRepository.tsx` 进行 UI 列表展示。

---

## 3. 跨域交互流程 (Cross-Domain Flow)

### 3.1 存入流程 (Canvas → Repository)
这是一个多阶段处理过程：

1.  **物理检测 (`App.tsx#checkDeckCollision`)**:
    在拖拽过程中，系统将卡片的 `mx/my` (Canvas 坐标) 转换为屏幕空间坐标，判断其中心是否进入 Dock 触发区。
2.  **状态变更 (`storeCard`)**:
    一旦触发，调用 `data.storeCard(uid)`。该操作执行两件事：
    *   **内存同步**: 更新 `items` 状态。
    *   **持久化**: 立即更新 IndexedDB 中的 `canvasPositions` 表。
3.  **视觉反馈**:
    由于 `useCardGrouping` 检测到活跃卡片减少，它会将该卡片放入 `exitingItems` 队列。此时 `App.tsx` 会渲染这些“幽灵卡片”执行缩放至 10% 的飞向 Dock 动画，随后从渲染树中销毁。

### 3.2 提取流程 (Repository → Canvas)
提取操作需要解决“动量重置”问题：

```typescript
// useCardManager.ts 中的提取核心逻辑
const retrieveCard = (uid, x, y) => {
    // 关键点：必须创建新的 MotionValue 实例
    // 否则旧的运动惯性（如从旧位置飞来的速度）会导致严重的视觉变形/抖动
    const newMx = motionValue(x);
    const newMy = motionValue(y);

    return { ...item, mx: newMx, my: newMy, location: 'canvas' };
};
```
*   **拖拽支持**: 使用 `react-dnd` 实现了从仓库面板直接拖拽到画布，通过 `InnerApp` 的 `drop` 监听器计算放下点的 Canvas 坐标坐标。

---

## 4. 语义重组逻辑 (Grouping & Inheritance)

仓库系统深度集成在 `useCardGrouping.ts` 的拆分/合并逻辑中。

### 4.1 继承原则 (Inheritance Rules)
当切换语言触发卡片自动重组时，位置属性遵循以下逻辑：
*   **合并 (Merge)**: 非锚点卡片会被吸收。新组合的“锚点卡片”继承其原始的 `location`。
*   **拆分 (Split)**: 当一个含义复杂的卡片在另一语言中被拆分时，所有产生的“子卡片”自动继承父级卡片的 `location`。
    *   *示例*: 如果 English "Spring" 在仓库中，切换到中文后拆分出的“春天”和“弹簧”都会默认留在仓库中。

### 4.2 语义感知型动画
在 `useCardGrouping` 的 `diff` 阶段：
*   **Canvas -> Repo Merge**: 执行完整的“吸收动画”（飞向 Dock + 缩放）。
*   **Repo -> Repo Merge**: 视为内部整理，不触发画布上的位移效果，直接在 UI 列表内呈现变化。

---

## 5. UI 展现与性能 (Presentation & Performance)

### 5.1 微型视觉组件 (`CompactCardVisual.tsx`)
为了在仓库列表中高效展示，我们定制了轻量化的视觉组件，去除了复杂的视差和多层堆叠，仅保留核心语义标识。

### 5.2 排序算法
`DeckRepository.tsx` 内部维持了排序逻辑。支持：
*   `word`: 字符串归一化后的字母顺序。
*   `pos`: 词性优先级的枚举排序。
*   `level`: A1->C2 的阶梯排序。
*   `durability`: 获取 `senseInfo` 中的实时耐久度。

### 5.3 渲染性能
*   **渲染隔离**: 通过在 `App.tsx` 中分离 `canvasItems` 和 `exitingItems` 的渲染，确保大量存入卡片时，由于内存中卡片总数减少，画布的物理计算压力线性下降。
*   **GPU 加速**: `Card.tsx` 在接收到全局动画 `scale` 参数时，会自动开启 `will-change: transform`。

---
*文档更新于 2026-02-13 | 深度关联 `useCardManager` & `useCardGrouping` 实现逻辑*
