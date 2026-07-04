# Lexicoin 项目规则(Antigravity workspace rule)

开始任何工作之前,先完整阅读仓库根目录的 `AGENTS.md` 和 `CLAUDE.md`,并遵守其中全部铁律。要点速览:

1. 视觉参数不许盲改数字"调效果"——AI 只写管线/调试面板/preset 导出,滑块归用户
2. 新增自研 shader 必须经用户明确批准;视觉效果优先烘焙贴图 → pixi-filters
3. 高度/法线只能有一个真相源:只推理其中一张,另一张用 `npm run assets -- normal` 推导;混用推理产物前必须 `npm run assets -- check` 校验(ADR-005)
4. `BitmapText` 全面禁用;文字分层规范见 `docs/refactor-pixi/text-guidelines.md`
5. 改代码必须同一个 commit 更新对应文档;新文档登记进 `docs/INDEX.md`
6. 不得推翻 `docs/decisions/` 中的现行 ADR;有异议向用户提出
7. 始终用简体中文交流

会话开局/收尾清单:`docs/workflow/session-protocol.md`。
