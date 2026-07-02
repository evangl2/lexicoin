# Lexicoin 项目规则

游戏化语言学习平台"语言炼金术"。React 18 + TS + Vite 数据层 + PixiJS v8 渲染层(重构中,见 [docs/refactor-pixi/roadmap.md](docs/refactor-pixi/roadmap.md))。

始终用简体中文交流。前端视觉验证由用户负责,AI 不自行启动 preview。

**每次会话必读**:[docs/INDEX.md](docs/INDEX.md)(文档路由)→ [docs/workflow/session-protocol.md](docs/workflow/session-protocol.md)(开局/收尾清单)。

## 铁律一:视觉效果的分工 —— AI 写管线,用户拖滑块

AI **永远不许**通过盲改数字来"调效果"。用户描述"高光太散/质感发闷"时,不要去改 uniform 数值,那是死路(AI 看不见渲染结果)。

正确做法:

- AI 负责:shader 骨架、uniform 传输、坐标系、资源绑定、调试面板、preset 导入导出——一切有对错、可验证的管线代码
- 用户负责:在调试面板上拖滑块,亲眼调出想要的效果,导出为 preset JSON
- **任何新视觉效果,必须先把调试面板滑块和 preset 导出做好,再开始调效果。没有滑块的视觉参数不许写死进 shader。**

参考实现:`src/pixi/backgrounds/CenterpieceDebugPanel.ts` + `src/pixi/backgrounds/presets/*.json`。

## 铁律二:Shader 预算 —— 三层实现策略

视觉效果按下表选实现层,**默认从第 0 层开始**,只有低层做不到才升级:

| 层 | 手段 | 适用 |
|---|---|---|
| 0 | 烘焙进贴图(AI 直接生成最终效果 / 序列帧) | 默认选项,大多数视觉 |
| 1 | pixi-filters 现成滤镜 | 动态但通用的效果(glow、bloom、displacement) |
| 2 | 自研 shader | 仅限游戏招牌视觉,**新增自研 shader 必须经用户明确批准** |

Persona 的视觉多样性来自"换贴图 + 换 preset JSON",**不来自新 shader**。现有自研 shader 只有 WGSL(WebGPU-only);目标平台含手机,新写 shader 要控制特性复杂度,为将来补 GLSL 双后端留余地。

## 铁律三:法线图不由 AI 生成

AI 图像模型画的法线图物理上不可靠(Y 方向不一致、与高度图对不上)。流程:

1. AI 只生成 diffuse(提示词要求平光/albedo,无烘焙光影)和高度图
2. 法线图用脚本从高度图推导:`npm run assets -- normal --in height.png`
3. HRBA / Mask 打包同样走脚本:`npm run assets`(用法见 [scripts/assets/preprocess.mjs](scripts/assets/preprocess.mjs) 头注释)

材质通道规范见 [docs/refactor-pixi/Assets-guide.md](docs/refactor-pixi/Assets-guide.md) §6。

## 铁律四:文字分层规范

多语言大文本量是本项目核心约束。规则详见 [docs/refactor-pixi/text-guidelines.md](docs/refactor-pixi/text-guidelines.md),要点:

- 世界内短文字(卡片标题等)→ Pixi `Text`
- 阅读型长文本(释义、词条、面板)→ React DOM 覆盖层
- **`BitmapText` 全面禁用**(中文字形图集爆炸、阿拉伯文连写无法实现)

## 铁律五:文档与代码同会话同步

文档制度见 [docs/documentation-standard.md](docs/documentation-standard.md)。要点:

- 改了结构/行为/约定,**同一个 commit** 更新对应文档;收尾按 [session-protocol.md](docs/workflow/session-protocol.md) 清单逐条核对
- 新文档必须登记进 [docs/INDEX.md](docs/INDEX.md) 并带文档头,否则视为不存在
- 发现过期文档:当场修正或标记归档,禁止以"现行"状态留存
- 方向性决策必须写 ADR(`docs/decisions/`);**AI 不得擅自推翻现行 ADR**,有异议向用户提出
