# 高阶炼金材质与 Shader 资产制作指南 

本指南总结了 **Alchemical Centerpiece** 从传统的 Sprite+Filter 架构迁移到高性能 WebGPU Mesh+Shader 架构的全过程。旨在为后续类似资产（如祭坛、能量核心等）的制作提供一套可复制的 **Pipeline**。

---

## 1. 核心架构决策：Mesh vs Sprite

### 为什么弃用 Sprite + Filter？
*   **坐标漂移 (Coordinate Drift)**：PixiJS 的 Filter 在处理缩放 (Zoom) 和平移 (Peeking) 时，容易出现离屏缓冲区对齐误差，导致 Y 轴坐标随时间产生位移。
*   **WebGPU 兼容性**：在 WebGPU 模式下，直接操作 Mesh 顶点和片段着色器能获得最纯粹的硬件加速，避免过多的离屏渲染开销。

### 正确决策：Mesh + WebGPU Shader
使用 `PlaneGeometry` 构建 Mesh，将变换矩阵、相机参数、光照数据通过 `UniformGroup` 传入 Shader，实现像素级的坐标锁定。

### C. 原点选择：画布中心 (Canvas Center)
*   **决策**：必须以 **画布中心** (`worldSize * 0.5`) 作为坐标原点进行 Mesh 顶点的偏移计算，而不是左上角。
*   **原因**：这能确保在缩放和 Peeking 过程中，中心位置的数学计算最简便且最符合直觉，避免复杂的坐标平移。

---

## 2. 技术决策与排错 (Troubleshooting)

### A. 坐标对齐系统 (Coordinate Sync)
*   **坑位**：直接使用 Pixi 的内置矩阵往往无法处理自定义 Viewport 的 contentLayer 偏移（如 Peeking）。
*   **对策**：在 Shader 中手动实现 NDC (Normalized Device Coordinate) 转换。
    *   **公式**：`screenOffset = (worldPos - cam.uViewPos) * cam.uZoom`
    *   **NDC**：`ndcPos = screenOffset / (resolution * 0.5)`
*   **关键点**：容器 (Container) 的中心点必须在每一帧（或在 worldSize 改变时）与世界几何中心严格同步，否则光照方向计算会出错。

### B. 光照模型：方向光 (Directional Light)
*   **决策**：鼠标不代表“光源位置”，而是控制“光的射入方向”。
*   **映射逻辑**：以容器中心为基准，计算鼠标在世界空间中的偏移量，除以一个固定系数（如 `1000`）来获得平滑的角度分量。
*   **Y轴反转错误**：PixiJS 的 Y 轴向下，而标准法线贴图（OpenGL）的 Y 轴向上。
    *   **修正**：计算方向矢量时，必须对 `dy` 取反 (`ly = -dy`)，否则光照效果会产生垂直方向的逻辑错误（即鼠标向上移动时光照反而向下倾斜）。

### C. GGX PBR 实现(2026-07-03 修正)
*   ~~早期文档记载"剔除能量守恒分母"的 Artist-Driven 模式~~——**此描述与代码不符,已修正**:实际代码(v3 与 v4)均为完整 Cook-Torrance($D \cdot F \cdot G \ / \ 4 \cdot N{\cdot}V \cdot N{\cdot}L$),"艺术家驱动"体现在 specStrength/fresnelPower/曲率增强等滑块上,而非删改公式。
*   **v4 管线**(现默认,见 [ADR-006](../../docs/decisions/ADR-006-material-model-family.md)):光照计算全部在**线性空间**进行(diffuse 采样后反预乘 + sRGB 解码),末端经曝光 → 色调映射(None/Reinhard/ACES 可选)→ 编码回 sRGB。此前 v3 在 gamma 空间直接做光照数学,是"中间调发闷、高光糊成死白"的根因。
*   v4 新增 **matcap 环境反射**(uEnvMap,默认程序生成棚光,persona 可提供 AI 生成的 matcap 球贴图)与**资材调理参数**(normalFlipX/Y、normalBiasX/Y、heightInvert),用于吸收推理贴图的系统性误差。

---

## 3. 标准制作流水线 (Pipeline)

如果你要制作一个新的类似资产，请遵循以下步骤：

### Step 1: 资产准备 (Assets)
*   `Diffuse`: 基础颜色贴图。
*   `Normal`: 法线贴图（建议 OpenGL Y+ 格式，可在 Shader 中修正 Y 轴）。
*   `HRBA Map`: 高级材质数据贴图（R=Height, G=Roughness, B=Metalness, A=SSS Thickness）。
*   `Mask Map`: 三路 Universal Mask 掩码贴图（R, G, B 分别映射到独立的动画/发光/染色/边缘光/次表面路由）。
*   `Noise`: 噪声图（如 Melt Noise），用于驱动能量流动与发光干涉。

### Step 2: 基础设施架设 (Infrastructure)
1.  创建一个 `Container`。
2.  初始化 `Geometry` (通常为 Plane)。
3.  创建四个 `UniformGroup`：`camera` (坐标同步), `light` (材质与光照), `hrbaConfig` (材质控制) 与 `maskConfig` (三路路由与噪声)。

### Step 3: 材质层 (Material Layer)
1.  编写 WebGPU Shader。
2.  解码法线：`N = normalize(raw * 2.0 - 1.0)`。
3.  应用 **GGX NDF** 计算高光，并混合高度图。
4.  基于法线导数实时计算曲率高光：`curvature = clamp(length(fwidth(N.xyz)) * 2.0, 0.0, 1.0)`。
5.  应用 **Fresnel Schlick** 计算边缘反射与遮蔽。

### Step 4: 特效层 (VFX Layer)
1.  使用 **Additive (叠加)** 混合模式。
2.  引入双层噪声干涉流动：`noise(uv + uTime * speed)`。
3.  实现 **呼吸与闪烁 (Flicker)**，通过 runtime 参数 `maskAnimMode` 驱动。
4.  配合 `BlurFilter` 产生发光扩散感。

---

## 4. 专项避坑与排错 (Detailed Pro-Tips)

1.  **WebGPU 绑定错误**：如果 Shader 报 `No bind group set at group index 0`，是因为顶点着色器使用了相机 Uniform，但在资源绑定时漏掉了。每一个 Shader 都必须显式绑定 `cam: this._cameraUniforms`。
2.  **TypeScript 类型**：在 Pixi v8 中，自定义 Shader 的 Mesh 属性应声明为 `Mesh<Geometry, Shader>`。否则会报 `MeshGeometry` 缺少属性的类型错误。
3.  **世界尺寸变动 Bug**：在修改 `worldSize` 后，如果未同步容器位置，光照和 Mesh 可能会丢失或偏移。
    *   **对策**：在 `update` 循环中进行 **Dirty Check**（监测 `viewport.worldWidth/Height`），只有当变动时才调用 `container.position.set`。不要每帧同步，以节省性能。
4.  **Shader 性能优化 - `discard` 关键字**：在符文 Shader 中，如果 `runeAlpha` 极小，必须使用 `discard;`。这不仅是逻辑需要，更重要的是能显著减轻 WebGPU 的片段着色器压力，防止不必要的 Alpha 混合计算。
5.  **Buffer 资源导入**：Pixi v8 的 `Geometry` 构造函数不再接受普通数组，必须传入 `new Buffer(...)`。记得从 `pixi.js` 显式导入 `Buffer` 类，否则会报运行时错误。

---

## 5. 致命错误手册 (Fatal Errors & Gotchas)

### A. 模板字符串转义陷阱 (The Backtick Bug)
*   **现象**：编译报 `Expected ";" but found "..."`。
*   **原因**：在批量编辑或脚本写入时，Shader 的反引号 `` ` `` 被错误地转义成了 `\` `。
*   **教训**：WGSL Shader 通常定义在模板字符串中。如果反引号前出现了多余的反斜杠，编译器会将后续所有的 TypeScript 代码视为 Shader 字符串的一部分，导致整个文件语法失效。**必须确保所有 Shader 结尾的 `\`;` 被清理为 `;`**。

### B. WebGPU 资源绑定完整性
*   **现象**：`No bind group set at group index 0`。
*   **原因**：顶点着色器 (`VERT_WGSL`) 和片段着色器 (`FRAG_WGSL`) 往往共用某些 Bind Group。即使你在片段着色器中只用了噪声图，如果顶点着色器声明了 `cam` 资源，你的 `Shader.from` 资源池里就**必须包含相机资源**，否则整个渲染通道 (Render Pass) 会被 WebGPU 标记为无效并停止渲染。

### C. 资源加载竞态
*   **对策**：使用 `Promise.all([Assets.load(...)])` 确保所有贴图（Diffuse, Normal, HRBA, Mask, Noise）全部加载完毕再初始化 Mesh。任何一个贴图丢失都会导致整个 `CenterpieceDecal` 初始化静默失败或在控制台报 `texture.source` 为空的错误。

---

## 6. PBR v3.3 (PNG-HRBA & Universal Mask 路由) 规范说明

在 **v3.3** 版本中，我们将光照材质管线升级为更加标准、可控的 **HRBA 材质流** 与 **Universal Mask 路由系统**。

### A. HRBA 材质流定义
为了在 2D 贴图内压缩更多的 PBR 材质信息，我们定义了以下通道规格：
*   **R (Red)**: **Height (高度)**。用于驱动 3D 浮雕视差位移与环境光遮蔽 (AO)。
*   **G (Green)**: **Roughness (粗糙度)**。
*   **B (Blue)**: **Metalness (金属度)**。当 `hrbaMetalnessEnabled` 为开启时生效。
*   **A (Alpha)**: **Thickness (厚度)**。当 `hrbaSssEnabled` 开启时驱动次表面散射的透光量。

#### 核心推导公式：
1.  **动态 Curvature (曲率) 实时推导**：
    $$\text{curvature} = \text{clamp}(\text{length}(\text{fwidth}(N.\text{xyz})) \times 2.0, 0.0, 1.0)$$
    用于在法线变化剧烈的边缘实时推导高光增强因子。
2.  **Height-Derived Thickness (高度推导厚度)**：
    $$\text{thickness} = \text{sssEnabled} \ ? \ \text{hrba}.\text{a} \ : \ \text{height}$$
    当 SSS 开启时使用独立的 Alpha 厚度通道；未开启时，以高度图 (R 通道) 作为默认厚度。

### B. 三路 Universal Mask 路由机制
Mask 贴图的 R、G、B 三个通道为物理上完全独立的控制通道。在运行时，它们能被**路由 (Route)** 到五种视觉效果类型：
1.  `0 (None)`: 无效果。
2.  `1 (Emissive)`: 动态自发光。在发光/核心 Mesh 的 `MASK_EMISSIVE_WGSL` Pass 中进行三通道独立叠加与噪声调制。
3.  `2 (ColorTint)`: 漫反射染色。将通道颜色混合到 PBR 主材质的 `diffuseColor` 中。
4.  `3 (Rim)`: 边缘光增强。将通道颜色与强度叠加到 Rim Light 计算中。
5.  `4 (SSS)`: 次表面散射。叠加通道强度至 `sss_strength`，参与次表面透光计算。

---
*Created by Antigravity AI for Lexicoin Development Team.*
