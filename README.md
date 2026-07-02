# Lexicoin - 语言炼金术

> 状态: 现行 · 类型: 指南 · 更新: 2026-07-03
> 📖 人话: 项目门面。人类第一次打开仓库看这里;AI 会话的规则入口是 `CLAUDE.md`(不要合并或改名这两个文件,`CLAUDE.md` 依赖文件名被自动加载)。

游戏化语言学习平台:通过沉浸式的"语言炼金术"体验,打破传统枯燥的语言学习模式。资材由 AI 生成,开发以 AI 辅助为主。

## ⚠️ 当前状态

渲染层正在从 React DOM 重写为 PixiJS v8(**期间游戏不可玩**),进度见 [docs/refactor-pixi/roadmap.md](docs/refactor-pixi/roadmap.md)。数据/逻辑层完整可用。

## 技术栈

- **数据/逻辑层**: React 18 + TypeScript 5 + Zustand + Dexie (IndexedDB) + Supabase
- **渲染层**: PixiJS v8 + pixi-viewport + GSAP(重写中)
- **构建**: Vite + Tailwind CSS 4

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run type-check   # 类型检查
npm run build        # 生产构建
npm run assets       # 资产预处理(法线图推导 / HRBA 打包),用法见 scripts/assets/preprocess.mjs
```

## 文档入口

| 读者 | 入口 |
|---|---|
| AI 会话 | [CLAUDE.md](CLAUDE.md)(自动加载)→ [docs/INDEX.md](docs/INDEX.md) |
| 人类 | [docs/INDEX.md](docs/INDEX.md)(文档地图)· [docs/documentation-standard.md](docs/documentation-standard.md)(文档规范) |
| 游戏设计 | [docs/grimoire/GDD_Grimoire.md](docs/grimoire/GDD_Grimoire.md) |
| 关键决策 | [docs/decisions/](docs/decisions/)(ADR) |

## License

Private - All Rights Reserved
