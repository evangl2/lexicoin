# NOW —— 驾驶舱

> 状态: 现行 · 类型: 流程 · 更新: 2026-07-05
> 📖 人话: 回归第一分钟看的文件。每次会话收尾更新(session-protocol 清单第 7 条),硬性一屏上限——写新的就删旧的。看完这里 → [PROJECT-ATLAS.md](PROJECT-ATLAS.md) 看全貌。

## 上次做了(2026-07-05)

- 存在性审计(全五问)+ 文档体系建立完整,细节见 [strategic-command.md](strategic-command.md)/[PROJECT-ATLAS.md](PROJECT-ATLAS.md)
- 决策批复已执行:A1(Stage E DoD 写入 roadmap)、A3(ATLAS §2 蓝图转为作者确认)、B4(`eslint.config.js` 落地,顺手抓到 `WorldSystem.updateSize` 一个真实运行时 bug 并修复)、C7(发音进 v1,已排进 roadmap Stage G)、C8(store/MessageBus 归属升格铁律六,CLAUDE.md/AGENTS.md/.agents 三处已同步)、C9(11 份过期文档归档至 `archive/legacy-2026-04/`,INDEX 重写为清晰表格)
- B6 重大修正:OpenRouter 多模型路由与应用内选模型系统**均已存在**(非待设计),模型选择器已重新接入 DevConsole System 面板;发现 `generate-visual` 用了另一份 `callAI.ts` 副本(双份真相隐患,待合并)
- A2/B5 也已批复落地(见下方"已批复归档"),九项决策全部闭环

## 进行中 / 挂起

- **2026-07-06 CenterpieceDebugPanel 新增"🧪测试"页(参数隔离测试)+ HRBA 预乘 alpha bug 修复(作者已验证有效)**:测试页一键把无关参数收敛到最适合观察目标参数的环境,20 项覆盖光照/PBR/发光/风格化,内附"🔬诊断视图"下拉(shader 中间量可视化,排查"参数拖了没反应"用);借这套工具排查出真 bug——HRBA/法线/Mask 这类数据贴图被 `Assets.load()` 默认预乘 alpha 污染(RGB×=A),Pixi 的 `alphaMode` 修复参数名反直觉,踩坑记录见 [Assets-guide.md §5D](refactor-pixi/Assets-guide.md);顺带修了辉光层(mask 双网格自制投影导致包围盒错位,BlurFilter/scale 全部空转,已改走 Pixi 标准变换)和发光强度钳制(总强度滑块被通道强度默认值顶到天花板)。取色器化调色 + 区间滑块互斥 + A/B 快照(📌)+ 曝光等 5 项感知曲线滑块同批完成。全部改动只在这套调参管线内,未涉及正式材质数值。
- ✅ 2026-07-05 全部改动(含 Totem 改名批次、CI、ADR-009)已由作者确认 commit 完毕,工作区干净
- **2026-07-06 debug 面板冻结前整顿完毕(待作者验收)**:CenterpieceDebugPanel 修 7 处(生产构建崩溃防护/快捷键不再劫持输入框/草稿写盘防抖/撤销栈去重/Mask 通道折叠不再抢占/下拉框补改动高亮/destroy 补全);坑已记入 troubleshooting P1-18
- **2026-07-06 DevConsole 全面重构(待作者验收)**:8 页签砍并为 6 个(总线/状态/数据/日志/作弊/引擎),消息流从"从未收到过消息的假通配符订阅"改为真轮询、World Size 默认值不再硬编码错误值、轮询按活跃页签隔离(不再每秒重渲染整个控制台)、Persona 下拉改动态读取 registry、删除死代码 featureFlags slice;危险区(清空 Grimoire/出厂重置)与作弊页签改为仅 DEV 构建可见(AI 决策:两者是不可逆或可被滥用的操作,其余功能因项目尚无真实终端用户而保持常开);新增 `DebugPanelBridge` 让 DevConsole「引擎」页签可发现并开合 CenterpieceDebugPanel(两者仍分属不同生命周期,不合并组件)。lint 145→137(消掉的都是本次顺手清的死引用)
- **2026-07-06 DevConsole 滚动架构重设计**(第一次 min-height:0 修补被作者实测证伪,真凶是消息流每秒 `scrollIntoView` 自动回卷把用户滚动位置强行拽回锚点):重写为 grid 三行外框(header/tabs/`minmax(0,1fr)`)+ **全控制台唯一滚动容器** `.dev-console-body`,页签内容一律普通块级流,禁止内层嵌套滚动;消息/日志改为**最新在最上**,彻底删除 auto-scroll 机制(TSX/CSS 头注释均有"勿回退"铁则);工具条吸顶、滚动条加宽加亮、body 上加 wheel stopPropagation 保险。面板尺寸 `min(880px,96vw)×min(640px,92vh)`、Esc 关闭、记住上次页签保留
- Stage E DoD 已定,尚未执行封版(3 个 preset + 面板冻结)
- 2026-07-06 定案四连:[ADR-010](decisions/ADR-010-render-boundary-and-tooling.md)(渲染边界三律+HTMLText 禁用+工具冻结)、[ADR-011](decisions/ADR-011-interaction-constitution.md)(交互宪法+**词卡不设仓库**)、[ADR-012](decisions/ADR-012-comms-contract.md)(通信契约:request_id 全覆盖/超时 120s/契约哈希比对进 CI);GDD/roadmap/铁律挂载点均已同步
- **GDD 残余偏差盘点完毕(2026-07-06)**:2026-04 清单正式关账——评分算法/fCount/过期路径/归档拆分全部达标,**唯一存活偏差 = Resonance 双轨**(并入 ADR-008 实施包);另发现 APIClient 幽灵后端客户端(Stage O 清除)
- **设计蓝图包落盘并经作者修正定稿**([design-blueprints-2026-07.md](design-blueprints-2026-07.md)):Stage F 三件套/记忆模型+迁移立法/Persona 实施包/部署护栏/檐口/新手引导脚本;四无名者终审——Inflection 活(InflectionSystem.md 为真相源,与记忆模型的 UserSenseProgress 双真相已定 stability 为准)、Construction 冻结、**Item 转正为核心系统**(奖励接口+词术生卡+仪式类,三品类框架)、**等级向玩家展示**(星等徽记+升级仪式)。**仅设计未实施**

## 下一步

按 [strategic-command.md](strategic-command.md) §2 次序:**1** 执行 Stage E 封版(DoD 已定)→ **2** GDD 残余偏差重新盘点 → **3** 记忆模型实施 → **4** Stage F 卡片。

## 等我决策

- (暂无阻塞项——A1~C9 全部批复完毕)

## 已批复归档(2026-07-05)

- ~~A2~~ 定案为 [ADR-009](decisions/ADR-009-totem-asset-contract.md):系统更名 **Totem 管线**(废弃"GenUI"),合同改为分层 SVG + 动画清单,实施在 Stage K;`callAI.ts` 副本合并一并写入该 ADR 后果节
- ~~B5~~ CI 已落地:`.github/workflows/ci.yml`(type-check + lint,push/PR 触发)
