# ADR-009: Totem 管线——视觉资产合同从可执行代码改为"分层 SVG + 动画清单"

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-05
> 📖 人话: AI 为每个词生成的动画视觉,以前交付的是"会动的程序"(TSX 组件,浏览器现场编译执行),以后交付"图形 + 动画乐谱"(分层 SVG + JSON 动画清单),由 Pixi/GSAP 这个固定"乐团"照谱演奏。动画保留,代码执行消灭。顺带正名:这套系统叫 **Totem 管线**,不再叫 GenUI——它生成的是美术资产,不是界面。

## 背景

现行系统(React 时代建成,2026-07-05 存在性审计重新发现):`generate-visual` Edge Function 为每个新 Sense 生成一段 **TSX 源代码**(SVG + framer-motion 动画),存库后由前端 sucrase 运行时编译执行(`dynamicComponentLoader.ts` / `DynamicVisual.tsx`)。三个问题:

1. **与 Pixi 重构正面冲突**:产物是 React 组件,Pixi 画布没有 React 渲染树,无法消费(strategic-command §3.8);
2. **安全面**:运行 AI 生成的代码;`genui-architecture.md` 设计的校验层/安全扫描**从未实现**;
3. **脆弱性税**:prompt 里的"四条不变量"、loader 里的 setAttribute 补丁,全是为"产物是可执行程序"付出的防御成本。

实勘关键观察(以 `SENSE_PHYSICAL_FIRE_001` 火焰图腾为样本):AI 产物中真正的动画部分(framer-motion variants:关键帧数组 + duration/repeat/ease/delay)**本来就是 JSON 形状的数据**,代码只是包装层。AI 的创意价值在"图形 + 动态设计",与代码容器可分离。

作者定案(2026-07-05):更名 + 采用分层 SVG + 动画清单方案;要求**保留 SVG 动画**。

## 决策

### 1. 正名:GenUI → Totem 管线

本系统定名 **Totem 管线**(取自生成 prompt 自有词汇 "Digital Totem"),定义:**AI 为每个 Sense 生成动画视觉资产的管线**。"GenUI" 一词废弃——本系统不生成界面,该名称具有误导性。所有文档、代码注释、后续讨论一律使用新名。

### 2. 新合同:分层 SVG + 动画清单

AI 输出改为纯数据,用 Gemini `responseSchema` 强制(generate-grimoire 已验证该机制):

```json
{
  "svg": "<svg viewBox='0 0 100 100'><g id='flame-core'>…</g><g id='embers'>…</g></svg>",
  "animations": [
    { "target": "flame-core",
      "props": { "scaleY": [1, 1.15, 0.95, 1.1], "alpha": [0.8, 1, 0.9, 1] },
      "duration": 2, "repeat": true, "ease": "easeInOut" },
    { "target": "embers",
      "props": { "y": -40, "alpha": [0, 1, 0] },
      "duration": 3, "repeat": true, "stagger": 0.8 }
  ]
}
```

- SVG 必须按语义分层:每个可动元素包在带 `id` 的 `<g>` 组里;
- `animations[]` 每项引用一个层 id,描述其补间。

### 3. 动画词汇表 v1

| 允许 | 说明 |
|---|---|
| `x` `y` `scale` `scaleX` `scaleY` `rotation` | 变换类 |
| `alpha` | 透明度 |
| 关键帧数组、`duration`、`repeat`、`ease`、`delay`、`stagger` | 时序控制 |

**排除:路径变形(`d` 值插值)**——栅格化纹理无法变形。这是本方案唯一的表达力损失;确有需要的招牌效果走铁律二的序列帧/多关键帧交叉淡入,个案报批。实勘确认:现行产物的动画词汇(缩放/透明度/位移/错峰/循环)被 v1 词汇表 **100% 覆盖**。

### 4. 渲染器(Totem Renderer)

开发期一次性写好(铁律一"AI 写管线"),运行期 AI 只产数据:

```
SVG 字符串 → 解析 → 按 <g id> 分层栅格化为纹理 → Pixi Container(每层一个 Sprite)
                                                        ↑
动画清单 → GSAP timeline,按 target 驱动各层 transform/alpha
```

**调制接口**:渲染器暴露全局强度参数,供游戏状态调制——记忆保持率 R(ADR-007)低的卡动画减弱/减速,LOD 远景整体降帧或暂停。这是新合同带来的涌现能力:动画第一次能与游戏状态对话。

### 5. 旧机制退役

- 迁移完成后删除:`sucrase` 依赖、`dynamicComponentLoader.ts`、`DynamicVisual.tsx`(时机随 Stage O 清尸);
- 存量 TSX 视觉**批量重新生成**迁移(生成管线自动,成本为 API 调用费),不写转换器;
- `VisualPromptsBackend.ts` 的 prompt 重写:创意部分(设计哲学/语义分类策略表)**原样保留**,技术规范部分(TSX 骨架/四条不变量/沙箱限制)整体替换为新 schema 说明;
- 旧文档 `genui-architecture.md`、`visual-pipeline.md`、`performance-optimizations.md`(sucrase 部分)描述旧合同,迁移完成后归档。

### 6. 可选后续(不进 v1)

检视态高保真动画:Stage H 的 InspectOverlay 是 DOM(ADR-003),将来可让 AI 附带 SMIL/CSS 自动画 SVG 版本,凑近看卡片时播放全保真动画。架构预留,暂不实施。

## 理由

- 动画数据(关键帧/时序)与动画引擎(framer-motion vs GSAP)本就同构,换容器不损失创意内容;
- schema 在 API 层拒绝不合规输出,取代 prompt 立法 + 运行时崩溃的事后发现;
- 不执行 AI 代码 → 安全面归零,从未实现的"校验层"不再需要存在;
- 统一动画引擎使记忆褪色调制、LOD 降级成为一行代码的事,黑盒组件时代不可能。

## 后果

- 实施时机:渲染器与新 prompt 属 **Stage K**(真实卡片视觉)的核心工作,roadmap 已标注;Stage F 的卡片数据结构按"视觉=纹理组 + 清单"设计;
- `generate-visual` 顺带迁移到 `_shared/callAI.ts`(消除 callAI 双副本,见 strategic-command §3.7);
- 涉及 GDD 的卡片视觉表述与 [Assets-guide.md](../refactor-pixi/Assets-guide.md) 届时同步;
- 本 ADR 定案后,strategic-command §3.8 预警状态改为"已决断,待实施"。
