# AI Agent 须知(所有 AI 工具通用)

本项目的完整规则在 [CLAUDE.md](CLAUDE.md),**先读它,再读 [docs/INDEX.md](docs/INDEX.md)**。无论你是哪家的 AI 工具,以下铁律同样约束你:

1. **视觉分工**:AI 只写渲染管线/调试面板/preset 导出,不许盲改数字"调效果";视觉参数由用户拖滑块调定
2. **Shader 预算**:视觉效果优先烘焙进贴图 → 其次 pixi-filters → 自研 shader 须用户明确批准
3. **法线图**:不由 AI 生成,用 `npm run assets -- normal` 从高度图推导
4. **文字**:遵守 [docs/refactor-pixi/text-guidelines.md](docs/refactor-pixi/text-guidelines.md);`BitmapText` 全面禁用
5. **文档同步**:改代码同一个 commit 更新对应文档;新文档登记进 [docs/INDEX.md](docs/INDEX.md);不得推翻 [docs/decisions/](docs/decisions/) 中的现行 ADR
6. **语言**:始终用简体中文与用户交流;前端视觉验证由用户负责

会话开局/收尾清单:[docs/workflow/session-protocol.md](docs/workflow/session-protocol.md)。
