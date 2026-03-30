# 持久化与数据管理系统 (Persistence System)

本文档详细说明了 Lexicoin 项目中的数据持久化架构。该系统旨在实现“彻底离线自治”与“即时存档”，确保玩家的核心数据、图鉴、卡牌防身寿命和关键选择在刷新或关闭浏览器后依然保留，并且支持跨设备的全量打包注血迁移。

## 1. 架构概览 (Architecture)

持久化系统采用了 **Zustand Middleware** + **IndexedDB (Dexie V6)** 的双擎架构。由于 React 的挂载机制要求急速呈现，同时我们需要处理大量的历史日志与二维坐标系，我们将数据的持久化切分为“轻量状态树”与“重量存储库”两条管线。

*   **Zustand (State Layer)**: 负责应用的实时状态管理，作为全工程的高速“内存数据库”。
*   **persist Middleware**: Zustand 的官方中间件，监听状态变化并依赖适配器异步打包。
*   **Dexie.js (Storage Engine)**: 封装原生 IndexedDB 操作的核心底层引擎。
*   **Local Adapter**: 自定义的 `indexedDBStorage` 适配器，将 Zustand 快照送入 Dexie 特定键槽中。
*   **ExportImportService (Backup System)**: 对客户端暴露的数据搬运微服务，处理 JSON IO 流。

## 2. 数据库设计结构 (Dexie DB Schema)

由于大模型合成带来的庞大海量词语，游戏底层依赖的 Dexie 升级为 `V6` 模型，拆分成了 7 个相互协作的专用物理表 `lexicoin_db`：

| 表名 (Table) | 描述 (Description) | 主键结构 |
| :--- | :--- | :--- |
| `gameData` | 作为仓库，包含 Zustand 的全量快照 (键名为 `app-state`)。 | `key` |
| `canvasPositions`| 保存每张悬浮卡片的物理 x, y 坐标系或收容所归属地。 | `uid, location` |
| `senses` | 直接保存 AI 确立后不可篡改的词条本体数据结构字典。 | `uid` |
| `visuals` | 用于储存词卡的外观皮肤变异或者动态图片资源的引用映射。| `[uid+variantId], uid` |
| `devices` | 环境组件坐标状态，如魔法阵合成槽的参数等。 | `uid, location` |
| `cardInventory` | **V6新增**。管控每一张存在于画面里的实卡的生命与防身（耐久度）追踪字典。 | `uid, language` |
| `synthesisLog` | **V6新增**。合成溯源表。保存所有源卡片合成推算的 CEFR 难度记录。| `id, resultUid, language...` |

## 3. 内存记忆准则 (Zustand Allowlist)

尽管底层 IndexedDB 大量采用直读直写模式接管历史数据，为了保持 UI 的瞬时重载响应率，Zustand (内存数据库) 同样会使用 **白名单 (Allowlist)** 策略提取关键热数据交由 `persist` 存入 `gameData` 表 `app-state` 字段中。

### ✅ 缓存的热数据 (Persisted)
这些数据一旦变化会被实时打入 IndexedDB 留存（通过 store `partialize` 截取）：
*   **玩家总档案 `player`**: 包含了所有语言细分的经验槽 `languageProgress` 以及总体的连签数据 `streak`。
*   **环境偏好偏好**: 如 `learningLang`，`activeSkin`。
*   **交互保留档**: `activeVariants` (同义词切换器最后选择状态)、`canvasView` (大视口焦点参数)、`activePersona` (当前共鸣的人格导师)。

### ❌ 临时数据 (Transient)
这些内存属于抛弃式碎片，在页面刷新后即刻抹杀以保证安全启动周期：
*   **UI 抽屉开关**: 设置栏 `isConfigOpen` 或图鉴栏的开启虚位。
*   **高频物理手势**: `dragState` 或卡片的 `isFlipped`。
*   **全局生命周期**: `modulesReady` 初始化标识。

## 4. 迁移与安全覆盖 (Export / Import Mechanism)

为摆脱服务端限制，该系统集成了一套完全由前端原生执行的客户端搬家策略 (`ExportImportService.ts`)。

### 导出 (ExportData)
1. 将当前 Zustand 的 `useGameStore().getState().player` 以及上方提及的 **全部 7 张 Dexie 表单** 循环查询。
2. 强力约束 JSON 对象，外贴 `schemaVersion: 1` 签章并标注时间轴。
3. 伪装为原生 `a` 标签挂载，实现二进制流导出，文件名为 `lexicoin-backup-*.json`。

### 导入与阻断 (Import & Reset)
1. 读取传入文件的二进制信息流，匹配 JSON 以及 Schema 协议是否吻合。
2. 调用后台异步事务对全部 7 大表格施加最暴力的表层擦除行为 (`table.clear()`)。
3. 清除完毕后执行万级别的阵列重注入 (`bulkAdd`)。
4. 全量覆盖 Zustand 中的玩家属性表。
5. 为了绝对切断一切残存的悬空物理引擎 hook 参考或旧卡片的帧渲染动画，执行最无情的阻断：`window.location.reload()` 触发硬重启展现完美复刻后的存档状态。

## 5. 调试指南

*   **审查持久化骨架**: 开启浏览器 F12 (DevTools) -> Application -> IndexedDB -> `lexicoin_db`。
*   **清除异常渲染档**: 若导入中不幸遭遇页面卡死报错，可通过上述路径点击外层的 “Delete database” 实施格式化急救。所有进度系统将在重新进入此域名后利用默认空数组安全重启。

---
*文档由于大模型 AI 引擎合集以及多语言化架构更新，当前基准为 IndexedDB V6 版本体系。*
