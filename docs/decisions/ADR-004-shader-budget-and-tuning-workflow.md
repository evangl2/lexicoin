# ADR-004: 视觉三层预算 + "AI 写管线、人调滑块"分工

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-03
> 📖 人话: 规定视觉效果优先用贴图和现成滤镜,手写 shader 是最后手段;以及为什么"让 AI 调效果参数"被永久禁止。

## 背景

Centerpiece PBR shader 开发陷入泥潭:效果调不出来、进度停滞。归因:(1) AI 看不见渲染结果,用文字描述视觉让 AI 盲改数字的反馈回路注定失败;(2) 为背景装饰建了引擎级材质系统,shader 复杂度失控;(3) 多 Persona 多样化视觉的需求被误解为"需要很多 shader"。

## 决策

1. **分工铁律**:AI 只写管线(shader 骨架、uniform、调试面板、preset 导入导出);视觉参数由作者在调试面板拖滑块调定,导出 JSON。没有滑块的视觉参数不许写死进 shader
2. **三层预算**:烘焙进贴图(默认)→ pixi-filters → 自研 shader(仅招牌视觉,新增须作者批准)
3. Persona 视觉多样性 = 换贴图 + 换 preset JSON,**不新增 shader**

## 理由

- 调视觉需要实时反馈回路(眼睛 + 滑块),AI 天然不具备;管线代码有对错、可验证,是 AI 强项
- 资材本就是 AI 生成的,光影可以直接"画"进贴图,运行时计算是多余成本
- 目标平台含手机浏览器,现有 shader 为 WGSL(WebGPU-only),每个自研 shader 都是双后端 + 性能的长期负债

## 后果

- 参考实现:`src/pixi/backgrounds/CenterpieceDebugPanel.ts` + `presets/*.json`
- 新写 shader 须控制特性复杂度,为补 GLSL 双后端留余地;上手机前需补齐降级路径
- 已写入 `CLAUDE.md` 铁律一/铁律二
