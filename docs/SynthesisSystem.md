# 合成系统技术文档 (Synthesis System Specification)

合成系统 (Synthesis System) 是 Lexicoin 的核心交互模块。该模块处理来自前端的元素组合请求，调度大语言模型（LLM）与生图模型服务，管理全局异步加载状态，并最终结算实体的生命周期与用户属性收益。

本文档详细描述了合成系统的架构全貌，包含了云端函数调用、异步资源轮询、状态机以及后置业务结算逻辑。

## 1. 系统数据流向概览 (Data Flow)
当前端的两张 `SenseEntity` 卡牌在特定区域内发生交互，操作会被 `useSynthesis.ts` 钩子拦截，并触发以下完整管线：
1. **输入构建**：将两张源卡的 `uid`、用户选定的目标语言（`learningLang`）以及通过 `LevelDistributionSampler.ts` 采样的难度系数（`CEFRLevel`）打包。
2. **Edge Function 调用**：携带上述负载请求 Supabase 云函数 `synthesize-sense`。
3. **文字结果返回**：Edge Function 内部调用 LLM（通常响应时间 < 3 秒），返回结构化的 `SenseEntity` 文本数据，前端立即生成新卡牌实例。
4. **视觉资源分离加载**：图片生成通常需要较长时间（~10秒），系统将文字与图片的加载链路解耦。前端收到文字后会立刻展示无图卡牌，并进入后台图片轮询阶段（详见第3节）。

## 2. 交互状态机 (State Management)
为了在长时程的网络请求中提供准确的 UI 反馈，`useSynthesis` 内部维护了一个五态状态机 (`SynthesisState`)：
*   `idle`: 空闲状态，等待输入。
*   `processing`: 发起云函数调用，开始计算文字节点。
*   `processing-long`: 当请求超过 15,000 毫秒（15秒）仍未收到 Edge Function 响应时，自动转换为此状态。通常用于前端 UI 展示“AI 思考中”或超时安抚提示。
*   `success`: 成功接收到文字级 `SenseEntity` 响应。
*   `error`: 网络阻断或 Edge Function 返回业务错误时的状态，附带具体的错误字符串供 UI 消费。

## 3. 异步图像生成与轮询池 (Async Visual Polling)
在传统的 AIGC 链路中，等待生图会导致极长的前端阻塞。本系统在此处启用了缓存优先与独立异步轮询机制：

### 缓存命中 (Cache Hit)
当请求的合成配方在全局数据库中已被其他玩家触发过，Edge Function 会直接返回完整的 `SenseEntity` 加上 `Visual` 数据（`response.cached = true`）。
此时，客户端会直接通过消息总线 (`MessageBus`) 同步派发 `ASSET_LOADED` 事件，卡面会瞬间获得对应的图像配置。

### 递进式异步轮询 (Progressive Auto-Polling)
如果这是一次冷启动的生词创作，客户端仅会收到空图占位符。随即，`runAutoPollChain()` 会在后台开启无声轮询，监控 Supabase 的 `sense_visuals` 宽表：
*   **第 1 阶**：等待 25 秒后第一次拉取。
*   **第 2 阶**：如果失败，再等待 25 秒后第二次拉取。
*   **第 3 阶**：如果仍未就绪，继续等待 50 秒后进行最后一次托底拉取。
*   **降级策略 (Fallback)**：累计 100 秒的尝试全部落空后系统判定自动轮询超时（Timeout）。此时目标卡片的 `uid` 会被写入一个全局 Set (`autoPollExhausted`) 集合中，并将主动刷新图像的重试按钮（Manual Poll）放出，交接给用户手动点击触发后续的图片拉取请求。

## 4. 后置业务结算漏斗 (Post-Synthesis Resolution)
当合成成功并拿到数据后，将进入物理持久层的分发判决逻辑。系统不只是单纯掉落一张卡，而是经过三条严密的业务流比对：

1.  **首发新词获取 (New Discovery)**
    *   **判定**：用户的 `SynthesisLogRepository` 和当前画布本地缓存均无此卡牌。
    *   **执行**：生成耐久度（Durability）为 100 的实物卡片写入 `cardInventory`。触发 `XPRegistry.ts` 发放全额经验值（受本身 CEFR 难度系数加成）。
2.  **画布去重与耐久恢复 (Duplicate Forcing)**
    *   **判定**：本次合成的目标卡片在当前显示画面里已经有一张存活。
    *   **执行**：不再生成第二张实体卡占用性能，而是调用 `restoreOnDuplicate`，将存活的那张旧卡的耐久回复至上限。仅发放极低的挂机经验（约 10%）。
3.  **遗失卡片找回 (Recovery / Lost Item)**
    *   **判定**：曾经合成过该词，但实体卡此前已因耐久耗尽而碎裂销毁。
    *   **执行**：向画布再次发放耐久度为 100 的实物卡片，但为了游戏数值平衡，不提供任何额外经验值。

## 5. 扣费与耐久损耗模型 (Cost & Lifecycle)
所有的源头素材并非无限使用。
*   只要当前合并在云端**成功生成**了目标结果（且不论走了上述哪一条结算分支），系统强制调用 `DurabilitySystem.ts`。
*   作为催化剂参股的两张来源子卡均会被扣减配置表中的 `DURABILITY_SYNTHESIS_COST` 额度。
*   一旦任意源卡片的剩余寿命归零，事件侦听器即派发 `CARD_DEPLETED` 指令，执行该源卡实体在视觉组件树上的抹杀与退场，以此保持游戏画面的整洁与库存的代谢流通。
