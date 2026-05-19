# Lexicoin Alchemical Centerpiece PBR Workflow (v3.0)

本文件定义 Lexicoin Decal 资产的 PBR 标准化制作流程（v3.0）。
新版本引入了 **4 张 KTX2 贴图**的完整管线，涵盖 Blender 烘焙阶段，以实现更真实的 WebGPU 渲染效果。

---

## 一、贴图规格总览

| 贴图文件 | 通道 | 分辨率 | 色彩空间 |
| :--- | :--- | :--- | :--- |
| `*-diffuse.ktx2` | R=Red, G=Green, B=Blue, A=Alpha(轮廓) | **2048×2048** | **sRGB** |
| `*-normal.ktx2` | R=切线X, G=切线Y | 1024×1024 | **Linear** |
| `*-hrbc.ktx2` | R=Height, G=Roughness, B=BakedAO, A=Curvature | 1024×1024 | **Linear** |
| `*-mask.ktx2` | R=Mask1, G=Mask2, B=Mask3, A=Thickness | 1024×1024 | **Linear** |

---

## 二、制作阶段总览

```
[AI 生成]  →  渲染图 → Base Color
                     ↓             ↓
              Lotus(ComfyUI)   Nano Banana 2
             Height + Normal    Roughness
                     ↓
[Blender Bake] → BakedAO + Thickness + Curvature
                     ↓
[Photoshop]  → 通道打包 → HRBC Map / Mask Map
                     ↓
[toktx CLI]  → 导出 KTX2
```

---

## 三、AI 生成阶段

### 步骤 1：生成渲染图 (Render Image)
- 正交前视图，高对比度，黑色/透明背景
- 所有后续贴图的对齐基准图

### 步骤 2：生成 Base Color (Diffuse)
以渲染图为参考，用 AI 去除方向光和阴影，生成平铺漫反射色。

**推荐 Prompt（2048×2048）：**
> A high-resolution, perfectly flat, purely diffuse (Albedo) texture map. [Subject], head-on orthogonal perspective. No shadows, highlights, or reflections. Clear details, flat non-three-dimensional color fields. 2048×2048.

### 步骤 3：生成 Height Map + Normal Map（Lotus @ ComfyUI）
- **输入**：渲染图
- **输出**：Height Map（灰度，凸起=白）、Normal Map（OpenGL Y-Up）

### 步骤 4：生成 Roughness Map（Nano Banana 2）
- **输入**：渲染图 + Base Color
- **输出**：Roughness Map（1024×1024，黑=光滑/镜面，白=粗糙/磨砂）
- **校准**：Nano Banana 输出经过校准，**直接可用，无需 Photoshop 再次处理**

**推荐 Prompt：**
> Analyze Base Color and Reference Render. Darker = smooth/shiny, Lighter = matte/textured. Maintain exact layout. No baked lighting. Linear physical roughness data. 1024×1024.

---

## 四、Blender 烘焙阶段

> 前提：需要从渲染图重建一个简单的正向正交 3D 模型（或使用生成模型），作为 Bake 的几何体来源。渲染引擎：**Cycles**。

### 4.1 烘焙通用设置
```
Render → Render Engine: Cycles
Render → Bake → Bake Type: [见各步骤]
Render → Bake → Output → Target: Image Textures
分辨率：新建 1024×1024 Image（Color Space: Non-Color / Linear）
```

### 4.2 Baked AO（BakedAO.png）

| 设置项 | 值 |
| :--- | :--- |
| Bake Type | `Ambient Occlusion` |
| 采样数 | 128（效果与速度平衡） |
| 输出含义 | 白=无遮蔽（开放区域），黑=强遮蔽（深缝/接触阴影） |

**步骤：**
1. 选中物体，进入 Bake 面板
2. Bake Type 选 `Ambient Occlusion`
3. 点击 Bake，保存图像为 `baked-ao.png`

### 4.3 Thickness（Thickness.png）

| 设置项 | 值 |
| :--- | :--- |
| Bake Type | `Emit`（配合 Thickness 节点） |
| Max Ray Distance | **0.1 ~ 0.3**（根据实际模型尺寸调整，太大薄区域会被判定为厚） |
| 输出含义 | 白=厚（光线难以穿透），黑=薄（高 SSS 透光） |

**节点设置：**
```
[Geometry Node] → Thickness(0.1) → [Emission Shader] → [Material Output]
```

**步骤：**
1. 创建新材质，连接 `Geometry → Thickness → Emission → Material Output`
2. Bake Type 选 `Emit`
3. 烘焙，保存为 `thickness.png`
4. **检查**：花瓣/叶片边缘应接近黑色（薄），中心茎部应接近白色（厚）

### 4.4 Curvature（Curvature.png）

| 设置项 | 值 |
| :--- | :--- |
| Bake Type | `Emit`（配合 Pointiness 节点） |
| 输出含义 | 白=凸出棱边（高曲率），灰=平坦区，黑=凹入沟槽（低曲率/负曲率） |

**节点设置：**
```
[Geometry Node] → Pointiness → [Color Ramp（调整对比度）] → [Emission] → [Material Output]
```

**步骤：**
1. 创建新材质，连接 `Geometry → Pointiness → ColorRamp → Emission → Material Output`
2. ColorRamp 调整：压缩对比度，避免全白/全黑
3. Bake Type 选 `Emit`
4. 烘焙，保存为 `curvature.png`

---

## 五、Photoshop 通道打包流程

> 所有数据图（非 Diffuse）请在 **Gamma 1.0（线性）模式、16 位** 下操作。

### 5.1 Base Color 预处理（sRGB，16位）
1. 导入 Base Color，以渲染图为基准对齐
2. 统一裁切为 **2048×2048**
3. `选择 → 选择主体` 抠图，扩展选区 10px，内容识别填充背景，消除 Mipmap 渗色
4. 添加图层蒙版使背景透明
5. 导出为 `*-diffuse.png`（PNG-32，保留透明度，**嵌入 sRGB**）

### 5.2 打包 HRBC Map（1024×1024，Linear）

| 通道 | 来源文件 |
| :--- | :--- |
| **Red（R）** | `height.png`（Lotus 输出，灰度） |
| **Green（G）** | `roughness.png`（Nano Banana 输出，校准后） |
| **Blue（B）** | `baked-ao.png`（Blender Bake 输出） |
| **Alpha（A）** | `curvature.png`（Blender Pointiness 输出） |

**操作步骤：**
1. 新建 1024×1024 文档，Gamma 1.0，16位
2. 打开"通道"面板
3. 分别粘贴各灰度图到对应通道
4. Alpha 通道选 `新建通道` → 粘贴 Curvature 数据
5. 最终验证：逐通道检查数值范围，无全黑/全白异常
6. 导出为 `*-hrbc.png`（PNG-32，**不转 sRGB，保留 Alpha**）

### 5.3 打包 Mask Map（1024×1024，Linear）

| 通道 | 来源 | 说明 |
| :--- | :--- | :--- |
| **Red（R）** | Photoshop 手绘 / Nano Banana | 自定义区域 1（白色=选中） |
| **Green（G）** | Photoshop 手绘 / Nano Banana | 自定义区域 2 |
| **Blue（B）** | Photoshop 手绘 / Nano Banana | 自定义区域 3 |
| **Alpha（A）** | `thickness.png`（Blender Bake） | SSS 厚度（白=厚，黑=薄） |

**Mask 区域绘制建议：**
- 按材质特征划分区域（例：R=发光刻痕，G=金属嵌件，B=表面有机区）
- 区域之间可以有柔和羽化（`高斯模糊 2-4px`），避免硬边在视差下产生断裂感
- Nano Banana 生成 Mask 时，Prompt 指定区域类型和对比度

**操作步骤：**
1. 新建 1024×1024 文档，Gamma 1.0，16位
2. 分别绘制/粘贴三个 Mask 区域到 R/G/B 通道
3. Alpha 通道 → 粘贴 `thickness.png`
4. 导出为 `*-mask.png`（PNG-32，**不转 sRGB，保留 Alpha**）

---

## 六、KTX2 导出（最终格式）

Photoshop 不直接导出 KTX2，需通过命令行工具 **`toktx`**（KhronosGroup 官方工具）转换。

### 安装 toktx
```bash
# Windows（通过 scoop 或直接下载 KTX-Software release）
scoop install ktx-software
# 或直接下载：https://github.com/KhronosGroup/KTX-Software/releases
```

### 转换命令

```bash
# Diffuse（sRGB → UASTC，保留高质量色彩）
toktx --encode uastc --uastc_quality 3 --zcmp 18 --genmipmap ^
  alchemist-centerpiece-1.ktx2 diffuse.png

# Normal Map（Linear，UASTC，禁止 sRGB 编码）
toktx --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --linear ^
  alchemist-centerpiece-1-normal.ktx2 normal.png

# HRBC Map（Linear，数据精度优先）
toktx --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --linear ^
  alchemist-centerpiece-1-hrbc.ktx2 hrbc.png

# Mask Map（Linear，数据精度优先）
toktx --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --linear ^
  alchemist-centerpiece-mask.ktx2 mask.png
```

> **关键参数说明：**
> - `--encode uastc`：高质量 Basis Universal 超压缩，PixiJS 可直接解码
> - `--linear`：数据贴图（法线/HRBC/Mask）必须加此参数，防止 GPU 自动 sRGB 矫正污染数据
> - `--genmipmap`：自动生成 Mipmap，减少远距离锯齿
> - `--zcmp 18`：启用 Zstandard 超压缩，进一步减小文件体积

### 最终文件放置
```
public/assets/canvas/decals/
  ├── alchemist-centerpiece-1.ktx2        ← Diffuse
  ├── alchemist-centerpiece-1-normal.ktx2 ← Normal
  ├── alchemist-centerpiece-1-hrbc.ktx2   ← HRBC (Height/Roughness/BakedAO/Curvature)
  └── alchemist-centerpiece-mask.ktx2     ← Mask (Mask1/Mask2/Mask3/Thickness)
```

---

## 七、技术陷阱清单

1. **Gamma 污染**：HRBC / Normal / Mask 在 Photoshop 中必须全程保持 Gamma 1.0，导出 PNG 时绝对不能嵌入 sRGB Profile。
2. **toktx `--linear` 遗漏**：数据贴图忘加 `--linear` 会导致 GPU 对数值做 sRGB 矫正，AO/Curvature 数值完全错误。
3. **Thickness 方向错误**：Blender Thickness 输出默认"白=薄"，需在 Shader 侧确认约定（本项目约定为**白=厚，黑=薄**）；若 Blender 输出相反，在 Photoshop 通道打包时执行 `Ctrl+I` 反相。
4. **Pointiness 过曝**：Curvature 若出现大片纯白，需在 ColorRamp 节点中压缩高端，保留中间灰度范围。
5. **Mask 硬边**：RGB 区域之间的硬边在强视差模式下会产生断裂感，建议羽化 2-4px。
6. **Alpha 通道丢失**：Photoshop 导出 PNG 时务必勾选"Alpha 通道"，否则 Thickness / Curvature 数据全部丢失。
