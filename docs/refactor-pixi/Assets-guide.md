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

### C. 艺术家驱动的 GGX PBR
*   **坑位**：标准物理守恒的 GGX 会导致 2D 资产在凸起处显得暗淡。
*   **对策**：采用 **Artist-Driven** 模式。
    *   **保留**：GGX 的 $D$ 项（法线分布函数），以获得高级的高光拖尾。
    *   **剔除**：分母中的能量守恒因子 ($4 \cdot N \cdot L \cdot N \cdot V$) 和 $\pi$ 归一化项。
    *   **结果**：高光极度闪耀且质感丝滑，同时不会因为物理规则被压暗。

---

## 3. 标准 4 通道 KTX2 材质制作流水线 (2026 Pipeline)

如果你要制作一个新的类似资产，请遵循以下标准贴图与 UBO 规范：

### Step 1: 贴图资产规格 (4-Channel KTX2 Textures)

| 贴图文件名 | 通道 | 属性定义 | 线性/sRGB 空间 |
|---|---|---|---|
| `*-1.ktx2` | **RGBA** | Diffuse + Alpha 剪裁掩码 | **sRGB** |
| `*-1-normal.ktx2` | **RGB** | 切线空间法线 (OpenGL Y+) | **Linear** |
| `*-1-hrbc.ktx2` | **RGBA** | **R**: Height (视差高度)<br>**G**: Roughness (粗糙度度)<br>**B**: Baked AO (烘焙光圈遮蔽)<br>**A**: Curvature (表面曲率) | **Linear** |
| `*-mask.ktx2` | **RGBA** | **R**: Mask Channel 1 (第一层符文)<br>**G**: Mask Channel 2 (第二层符文)<br>**B**: Mask Channel 3 (第三层符文)<br>**A**: Thickness (透光厚度，用于 SSS) | **Linear** |

### Step 2: 内存对齐规范 (WGSL Alignment Rules)

WGSL Uniform 结构体需要严格遵守 WebGPU 的 16 字节对齐规则（`vec4` 占用 16 字节，`vec2` 占用 8 字节，`f32` 占用 4 字节）。
在声明 `UniformGroup` 对应的 WGSL 结构体时，应采取 **扁平化结构，按大小排序降序排列**，并在尾部填补占位 Padding：

```wgsl
struct MaskUniforms {
  // 16-byte aligned parameters (Grouped first)
  maskR_colorAndType: vec4<f32>, // rgb=color, a=effectType (0=Emissive, 1=ColorTint, 2=Rim, 3=SSS)
  maskG_colorAndType: vec4<f32>,
  maskB_colorAndType: vec4<f32>,
  uNoiseCfg:          vec4<f32>, // x=scale, y=contrast, z=speedX, w=speedY
  uNoiseCfg2:         vec4<f32>, // x=scale2, y=blendMode
  
  // 8-byte aligned parameters (Grouped second)
  maskR_strengthAndNoise: vec2<f32>, // x=strength, y=noiseCoupling
  maskG_strengthAndNoise: vec2<f32>,
  maskB_strengthAndNoise: vec2<f32>,
  
  // 4-byte aligned parameters (Grouped last)
  uTime: f32,
  uPad1: f32, // Padding to reach 112 bytes total (multiple of 16)
}
```

### Step 3: PBR 渲染管线节点公式 (PBR Shader Nodes)

1.  **高度 AO (Height AO) 与裂缝遮蔽 (Cavity)**：
    *   `let ao = mix(1.0, hrbc.b, light.uSurface.w);` — 使用 `hrbc.b` (Baked AO) 代替高度图进行柔和阴影遮蔽。
    *   `let cavity = mix(1.0, hrbc.r, light.uSystem.w);` — 使用高度高度差 `hrbc.r` 驱动紧密裂缝的局部遮蔽。
2.  **曲率高光增强 (Curvature Edge Rim)**：
    *   `let edgeHighlight = hrbc.a * light.uRimColor.rgb * light.uRim.x * specMask;`
    *   `let rim_term = light.uRimColor.rgb * rim + edgeHighlight;`
3.  **次表面散射 (SSS Subsurface Scattering)**：
    *   `let thickness = mask.a;` — 从 Mask Map 的 A 通道直读厚度。
    *   `let sssAmount = (1.0 - thickness) * channel.uSSSStrength;`
    *   `let n_dot_l_final = max((n_dot_l_raw + sssAmount) / (1.0 + sssAmount), 0.0);`
    *   `let sss_term = channel.uSSSColor.rgb * sssAmount * n_dot_l_final * light.uSurface.x;`

### Step 4: 动态掩码路由特效 (Universal Mask Routing)

在 `maskShader` (片段着色器) 中，对 Mask 贴图的 R、G、B 分别计算其对应的 `effectType`。每层通道的效果为：
$$\text{Effect} = \text{BaseEffect} \times \text{lerp}(1.0, \text{noise}(uv, t), \text{noiseCoupling})$$
将不同类型（Emissive, ColorTint, Rim, SSS）的效果相加后输出，产生高度灵动的魔法炼金符文流动效果。

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
*   **对策**：使用 `Promise.all([Assets.load(...)])` 确保所有贴图（Diffuse, Normal, Specular, Rune, Noise）全部加载完毕再初始化 Mesh。任何一个贴图丢失都会导致整个 `CenterpieceDecal` 初始化静默失败或在控制台报 `texture.source` 为空的错误。

---


---
*Created by Antigravity AI for Lexicoin Development Team.*
