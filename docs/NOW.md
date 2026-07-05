# NOW —— 驾驶舱

> 状态: 现行 · 类型: 流程 · 更新: 2026-07-05
> 📖 人话: 回归第一分钟看的文件。每次会话收尾更新(session-protocol 清单第 7 条),硬性一屏上限——写新的就删旧的。看完这里 → [PROJECT-ATLAS.md](PROJECT-ATLAS.md) 看全貌。

## 上次做了(2026-07-05)

- 存在性审计(全五问)+ 文档体系建立完整,细节见 [strategic-command.md](strategic-command.md)/[PROJECT-ATLAS.md](PROJECT-ATLAS.md)
- 决策批复已执行:A1(Stage E DoD 写入 roadmap)、A3(ATLAS §2 蓝图转为作者确认)、B4(`eslint.config.js` 落地,顺手抓到 `WorldSystem.updateSize` 一个真实运行时 bug 并修复)、C7(发音进 v1,已排进 roadmap Stage G)、C8(store/MessageBus 归属升格铁律六,CLAUDE.md/AGENTS.md/.agents 三处已同步)、C9(11 份过期文档归档至 `archive/legacy-2026-04/`,INDEX 重写为清晰表格)
- B6 重大修正:OpenRouter 多模型路由与应用内选模型系统**均已存在**(非待设计),模型选择器已重新接入 DevConsole System 面板;发现 `generate-visual` 用了另一份 `callAI.ts` 副本(双份真相隐患,待合并)
- A2(GenUI 去留)已详细解释,**尚待作者拍板**;B5(CI)已回答但**尚待作者决定**

## 进行中 / 挂起

- ⚠️ **matcap/材质 + 本次全部代码文档改动均未提交**,建议尽快分包收口(材质 / 文档 / lint 修复 / DevConsole 模型选择器 可分开提交)
- Stage E DoD 已定,尚未执行封版(3 个 preset + 面板冻结)
- lint 现存 145 条历史未用变量警告(baseline,未清,不阻断)

## 下一步

按 [strategic-command.md](strategic-command.md) §2 次序:**1** 收口 commit → **2** 执行 Stage E 封版(DoD 已定)→ **3** GDD 残余偏差重新盘点 → **4** 记忆模型实施 → **5** Stage F 卡片。

## 等我决策

- [ ] **A2** GenUI 去留(推荐方案 (a):AI 改产 SVG/贴图,Pixi 转 Texture;认可后起草 ADR-009)
- [ ] **B5** CI 要不要上(倾向:要,单人开发更需要不会忘记检查的看门人;最小方案是一个 type-check Action)
- [ ] `generate-visual` 的 `callAI.ts` 副本要不要合并进 `_shared`(低风险,建议做)
