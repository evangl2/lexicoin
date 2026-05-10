# Lexicoin Alchemical Centerpiece PBR Workflow (v2.0)

本文件定义了 Lexicoin 炼金阵中心资产的 PBR（物理渲染）标准化制作流。所有资产必须遵循此流程，以确保 WebGPU 渲染器的视觉一致性与物理正确性。

---

## 一、AI 生成阶段 (Generation Pipeline)

核心原则：**渲染图驱动几何，普通图驱动材质。**

### 步骤详解

#### 第 1 步：生成渲染图 (Render Image)
一切资产的起点。
- **要求：** 正交前视图，高对比度，无背景。
- **作用：** 它是后续所有贴图的尺寸和对齐基准。

#### 第 2 步：生成普通图 (Base Color)
- **方法：** 以渲染图为参考，使用 AI 去除方向光和阴影。
- **推荐 Prompt (2048*2048)：**
  > A high-resolution, perfectly flat, purely diffuse (Albedo) texture map. [Subject based on input], head-on orthogonal perspective. No shadows, highlights, or reflections. Clear details, flat non-three-dimensional color fields. 2048*2048.

#### 第 3 步：生成几何数据 (Lotus @ ComfyUI)
- **输入：** 渲染图 (Render Image)。
- **输出：** **Height Map** (深度/高度)、**Normal Map** (法线)。

#### 第 4 步：生成材质数据 (Nano Banana 2)
- **输入：** 渲染图 + 普通图。
- **输出：** **Roughness Map** (1024*1024)。
- **推荐 Prompt：**
  > Analyze Base Color and Reference Render. Darker = smooth/shiny, Lighter = matte/textured. Maintain exact layout. No baked lighting. Linear physical roughness data. 1024*1024.

#### 第 5 步：提取细节数据 (Detail Maps)
- **方法：** 在 Photoshop 中从普通图/渲染图中通过抠图提取细节。支持最多两张遮罩（Detail 1, Detail 2）。

---

## 二、功能贴图规格表

| 贴图类型 | 推荐来源 | 技术目的 |
| :--- | :--- | :--- |
| **Height Map** | Lotus (ComfyUI) | 从渲染图中提取，决定视差位移。 |
| **Normal Map** | Lotus (ComfyUI) | 必须与 Height Map 保持物理特征同步。 |
| **Roughness** | Nano Banana 2 | 控制反光扩散（黑=滑，白=磨）。 |
| **Detail 1/2** | Photoshop 提取 | 自发光/装饰细节遮罩。 |

---

## 三、Photoshop 预处理流程（优化版）

请严格按照以下三个阶段操作，以确保空间一致性和数据正确性。

### 阶段 A：Base Color 处理（标准 sRGB 模式）
1.  **导入对齐**：将所有素材导入文档。以 Base Color 为基准，执行 `Ctrl+T` 像素级对齐。
2.  **分辨率标准化**：统一裁切/缩放为 **2 的幂次方**（颜色推荐 2048，数据图后续缩放至 1024）。
3.  **抠图（Cutout）**：
    - `选择 -> 选择主体`。
    - **（选做优化）**：扩展选区 10px，执行 `Shift+F5` 内容识别填充背景，消除 Mipmap 渗色。
    - 添加图层蒙版，使背景透明。
4.  **提取细节**：
    - 使用 `色彩范围` 提取发光符文。
    - 独立存放为黑白层（黑背景，白细节）。
    - 技巧：执行 `收缩 1px` 以去除边缘伪影。

### 阶段 B：功能数据校正（线性模式 Gamma 1.0 + 16位）
**在此阶段开始前，请在 `编辑 -> 颜色设置` 中将 RGB 伽马设为 1.0，并确保图像模式为 16位。**

1.  **Height (R)**：执行 `色阶 (Ctrl+L)`。
    - 观察直方图，将黑/白滑块拉到像素边缘，确保高度信息覆盖 0-255 全量程。
2.  **Roughness (G)**：执行 `色阶` 校准。
    - 检查金属反光处（应接近 0，纯黑）和磨砂处（应接近 230-255，浅灰/白）。
3.  **Normal**：
    - 检查绿通道：确保凹凸的上半部是浅色的（Y-up）。

### 阶段 C：通道打包（Texture Packing - HRD1D2）
1.  **缩放数据图**：将校正后的数据图统一缩放到 **1024x1024**。
2.  **执行打包**：
    - 打开“通道”面板。
    - **红色通道** <- 粘贴 **Height Map**。
    - **绿色通道** <- 粘贴 **Roughness Map**。
    - **蓝色通道** <- 粘贴 **Detail Map 1**。
    - **新建 Alpha 通道** <- 粘贴 **Detail Map 2**。
3.  **最终验证**：隐藏 RGB，单独检查 Alpha 通道是否有数据。

---

## 四、导出规范与分辨率策略

| 贴图 | 分辨率 | 导出格式 | 注意事项 |
| :--- | :--- | :--- | :--- |
| **Base Color** | 2048 | `PNG-24` | **必须**嵌入 sRGB。背景透明。 |
| **打包图 (HRD1D2)** | 1024 | `PNG-32` | **不得**转为 sRGB。必须保留透明度（A 通道）。 |
| **Normal Map** | 1024 | `PNG-24` | **不得**转为 sRGB。 |

---

## 五、技术陷阱清单
1.  **Gamma 1.0 误区**：严禁在 Gamma 1.0 模式下调 Base Color 的颜色。
2.  **数据丢失**：如果导出 PNG 时未勾选“Alpha”，Detail 2 数据将丢失。
3.  **法线翻转**：若法线表现奇怪，优先检查绿通道是否需要反相（Ctrl+I）。
