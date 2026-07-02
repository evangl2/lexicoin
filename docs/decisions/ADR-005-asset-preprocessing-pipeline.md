# ADR-005: 法线图从高度图脚本推导,不由 AI 生成

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-03
> 📖 人话: AI 画的法线图物理上是错的,会让光照效果永远调不对。所以法线图改用脚本从高度图算出来。

## 背景

"资材到位但组合起来效果不好、怎么调都不对"的问题,主要嫌疑是脏输入:AI 图像模型生成的法线图 Y 方向不一致、与高度图不匹配、diffuse 里烘着光影——物理错误的输入喂给物理正确的 GGX,输出必然发闷,调参救不回来。

## 决策

法线图一律用 `npm run assets -- normal` 从高度图 Sobel 推导(OpenGL Y+ 约定);HRBA/Mask 通道打包同样走脚本。AI 只负责生成 diffuse(提示词要求平光/albedo)和高度图。

## 理由

- 程序化推导保证法线与高度图严格一致、方向约定统一
- 消除"效果不好到底是 shader 还是资材的锅"的归因不确定性
- roughness/metalness 类数据图人眼对物理一致性不敏感,AI 生成可接受

## 后果

- 脚本: `scripts/assets/preprocess.mjs`(用法见头注释),依赖 pngjs
- 通道规范沿用 [Assets-guide.md](../refactor-pixi/Assets-guide.md) §6(HRBA / 三路 Universal Mask)
- 已写入 `CLAUDE.md` 铁律三
