# Lexicoin 坐标系统技术说明文档

本文档定义并说明了 Lexicoin 项目中使用的各级坐标系统及其相互转换关系。理解这些空间映射是处理渲染、交互与布局的核心。

---

## 1. 坐标空间定义 (Coordinate Spaces)

### A. 屏幕空间 (Screen / UI Space)
*   **定义**：浏览器窗口的像素坐标。
*   **原点**：浏览器内容区域左上角 `(0, 0)`。
*   **用途**：原始鼠标事件输入、DOM UI 覆盖层定位。

### B. 世界空间 (World / Viewport Space)
*   **定义**：PixiJS Viewport 内部的全局物理空间。
*   **原点**：Viewport 物理边界的左上角 `(0, 0)`。
*   **特性**：其宽度 (`worldWidth`) 和高度 (`worldHeight`) 随画布动态调整，始终保持为 AABB 单元格的偶数倍。
*   **用途**：物体在渲染树中的绝对定位、全局物理碰撞。

### C. 内容空间 (Content / Center-Relative Space)
*   **定义**：位于 `WorldSystem.contentLayer` 内部的本地空间。
*   **原点**：世界的几何中心点 `(worldWidth * 0.5, worldHeight * 0.5)`。
*   **特性**：相对于世界中心对齐。卡牌、Centerpiece 等游戏实体均在此空间下。
*   **用途**：实现“居中对齐”视觉效果，简化相对位置计算。

### D. 逻辑网格空间 (Logical AABB Grid Space)
*   **定义**：离散化的整数索引空间。
*   **单元格尺寸**：275 x 385 像素。
*   **原点**：内容空间的原点（即世界中心），索引为 `[0, 0]` 的格子位于中心右下方。
*   **用途**：卡牌布局、占用管理、逻辑归属判定。

### E. 标准化设备坐标 (NDC Space - WebGPU)
*   **定义**：GPU 内部的标准化坐标。
*   **范围**：`x: [-1, 1]`, `y: [-1, 1]`（注意：在 WebGPU 中，Y 轴向上为正）。
*   **用途**：WGSL 着色器顶点的最终投影。

---

## 2. 坐标转换流程 (Transformation Flow)

### 流程一：交互输入转换
当发生点击事件时，坐标流向如下：
`Screen (Pointer Event)` → `World (viewport.toWorld)` → `Grid (aabbSystem.getGridPos)`

### 流程二：布局投影转换
当卡牌根据逻辑位置渲染时，坐标流向如下：
`Grid [col, row]` → `World (aabbSystem.getCellCenter)` → `NDC (Vertex Shader Projection)`

---

## 3. 关键转换公式 (Core Formulas)

| 转换目标 | 公式 / 方法 |
| :--- | :--- |
| **World → Content** | `LocalPos = WorldPos - (WorldSize * 0.5)` |
| **Content → Grid** | `Index = floor(LocalPos / CellSize)` |
| **Grid → World** | `WorldPos = (WorldSize * 0.5) + (Index + 0.5) * CellSize` |
| **World → NDC (X)** | `ndcX = (worldX / worldWidth) * 2.0 - 1.0` |

---

## 4. 架构规范与注意事项

1.  **原点漂移补偿**：
    由于世界尺寸是动态的，每当 `worldWidth` 或 `worldHeight` 改变时，**世界空间** 到 **内容空间** 的偏移量会随之改变。所有在 **内容空间** 持有 `(0,0)` 坐标的实体（如 Centerpiece）会自动保持在几何中心，但其对应的 **世界空间** 绝对坐标会发生偏移。

2.  **Y 轴反转风险**：
    *   **PixiJS/Browser**：Y 轴向下为正。
    *   **GPU Normal Maps**：通常 Y 轴向上为正。
    *   **处理规范**：在计算光照方向（Light Direction）或采样法线贴图时，必须对 Y 分量执行取反操作。

3.  **单点数据源原则**：
    在编写游戏逻辑时，应始终以 **逻辑网格空间 (Grid Space)** 的索引作为位置的唯一事实来源，**世界空间** 坐标仅作为渲染时的投影结果。

---
*Created by Antigravity AI for Lexicoin Development Team.*
