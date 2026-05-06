# Lexicoin AABB (Axis-Aligned Bounding Box) 技术说明文档

在 Lexicoin 项目的渲染重构中，AABB 系统被定义为物理空间与逻辑网格之间的 **逻辑参考基准 (Logical Reference System)**。该系统采用 **中心归一化坐标系 (Center-Normalized Grid)**，实现了逻辑层与表现层的解耦。

---

## 1. 核心架构：中心归一化坐标系

AABB 系统以 **世界几何中心点**（Centerpiece 所在位置）为逻辑原点 `(0, 0)`。

*   **逻辑索引规范**：
    *   以中心点为界，右下方向的起始单元格索引为 `[0, 0]`。
    *   左上方向的起始单元格索引为 `[-1, -1]`。
*   **坐标转换公式**：
    `col = Math.floor((worldX - worldCenterX) / CELL_W)`

---

## 2. 核心设计原则

### A. 逻辑不变性 (Logical Invariance)
系统通过相对索引确保了在 `updateSize`（动态调整世界尺寸）过程中，物体的逻辑位置保持恒定：
*   **索引稳定性**：物体相对于几何中心的逻辑坐标不随画布边界的扩展而改变。
*   **低开销维护**：占用表 (Occupancy Table) 无需在世界尺寸变动时执行重刷操作。

### B. 单一数据源 (Source of Truth)
系统采用 **“逻辑驱动表现”** 的设计模式：
1.  **数据层定义**：实体的物理位置由其持有的 `[col, row]` 逻辑索引决定。
2.  **物理投影计算**：当渲染容器发生位移或缩放时，系统根据逻辑索引重新计算并更新其实体在世界空间中的坐标。

---

## 3. 静态区域预留规范 (Static Area Reservation)

为确保核心组件的视觉表现不受干扰，系统对特定区域执行了静态预留：

### A. Centerpiece 区域预留
*   **预留范围**：**`[-1, -1]` 至 `[0, 0]`**（共计 2x2 网格区域）。
*   **执行机制**：在 `CenterpieceDecal` 初始化阶段，通过 `aabbSystem.reserveCells(-1, -1, 2, 2)` 完成。
*   **约束逻辑**：卡牌放置系统在执行合法性校验时，必须排除上述预留索引。

### B. 相对索引参考表
| 方位描述 | 逻辑索引 [Col, Row] | 备注 |
| :--- | :--- | :--- |
| **几何中心右下** | `[0, 0]` | Centerpiece 占用区域 |
| **几何中心左上** | `[-1, -1]` | Centerpiece 占用区域 |
| **右侧相邻格** | `[1, 0]` | 可用放置区域 |
| **上方相邻格** | `[0, -2]` | 可用放置区域 |

---

## 4. 实体绑定机制 (Entity Binding)

卡牌及交互对象通过逻辑网格进行定位管理：

1.  **坐标绑定**：对象在初始化或放置时分配逻辑坐标 `gridPos`。
2.  **动态同步**：在世界坐标系变动后，实体通过调用 `aabbSystem.getCellCenter(this.gridPos, ...)` 刷新其 Transform 属性。
3.  **状态校验**：交互过程中，系统调用 `aabbSystem.isCellOccupied(col, row)` 实时判断目标区域的可用性。

---

## 5. 开发建议与注意事项

## 5. 核心特点与优势 (续)

### C. 275x385 金色比例
*   **卡牌适配**：该比例严格遵循了标准实体卡牌的纵横比。
*   **Shader 同步**：背景的“点阵网格”与“炼金阵”在 Shader 内部也硬编码了这一比例，确保视觉对齐。

---

## 3. 工作流与使用规范

### 核心方法调用
1.  **查询位置**：`aabbSystem.getGridPos(x, y, worldW, worldH)` 获取相对中心的逻辑索引。
2.  **物理投影**：`aabbSystem.getCellCenter(col, row, worldW, worldH)` 将逻辑索引转回当前的物理世界坐标。
3.  **吸附对齐**：`aabbSystem.snapToGrid(x, y, worldW, worldH)` 实现自动吸附。
4.  **占用管理**：使用 `reserveCells(col, row, w, h)` 锁定逻辑区域。

---

## 4. 专项避坑 (Pro-Tips)

*   **世界尺寸参数**：由于网格是相对于中心的，调用 AABB 方法时 **必须传入当前的 worldWidth 和 worldHeight**，否则无法正确定位中心偏移。
*   **负索引处理**：系统完全支持负索引，逻辑上没有边界限制，仅受限于物理世界大小。
*   **销毁清理**：在切换场景或销毁资产时，务必调用 `aabbSystem.clearOccupancy()` 或对应对象的卸载逻辑，避免产生“幽灵碰撞”。

---
*Created by Antigravity AI for Lexicoin Development Team.*
