# MessageBus 维护与 Debug 指南

> 文件：`src/core/protocol/MessageBus.ts`
> 模式：单例 Pub/Sub，带优先级队列和拦截器

---

## 核心架构

```
publish(msg, priority)
    │
    ├─ CRITICAL / HIGH ──→ publishInternal(msg)        [绕过队列，直接执行]
    │
    └─ NORMAL / LOW ────→ enqueueMessage(msg)
                              │
                              └─ processQueue()
                                     │
                                     └─ publishInternal(msg)   [逐条执行]
                                            │
                                            ├─ applyInterceptors()
                                            ├─ 通知所有 subscribers
                                            └─ Promise.allSettled(handlers)
```

---

## 设计原则（必须遵守）

**1. Handler 失败必须被隔离**

消息总线的职责是传递消息，不是保证每个 handler 成功。单个 handler 抛错不得影响：
- 同一消息的其他 handler
- 队列中后续消息的处理
- `isProcessingQueue` 等状态 flag

**2. 所有状态 flag 必须由 `try/finally` 守护**

```typescript
// 正确
this.isProcessingQueue = true;
try {
    // ...
} finally {
    this.isProcessingQueue = false;  // 无论如何都会执行
}

// 错误——任何 throw 都会让 flag 永远卡在 true
this.isProcessingQueue = true;
await doSomething();
this.isProcessingQueue = false;
```

**3. 并发 handler 用 `allSettled`，不用 `all`**

```typescript
// 正确——所有 handler 都会执行完
await Promise.allSettled(promises);

// 错误——第一个 rejection 中止其余 handler
await Promise.all(promises);
```

---

## 已知设计约束

| 约束 | 说明 |
|------|------|
| `processQueue` 是串行的 | 同一时刻只有一条消息在处理，`isProcessingQueue` flag 防止重入 |
| CRITICAL/HIGH 消息绕过队列 | 它们直接调用 `publishInternal`，不受 `isProcessingQueue` 影响 |
| `subscribe` 返回 unsubscribe 函数 | cleanup 时直接调用返回值，**不要**把返回值作为 handler 再传给 `unsubscribe()` |
| debugMode 默认开启 | 生产环境应关闭，否则每条消息都会 `console.log` |

---

## 常见 Bug 模式

### Bug 1：消息队列死锁（`isProcessingQueue` 卡死）

**症状：** 消息发出后，订阅者永远不响应；`messageBus.getSubscriptions()` 显示有订阅者但没有触发。

**排查：**
```javascript
// 在 console 中执行
const bus = window.__messageBus__ // 如果挂载了
// 或在组件里
import { messageBus } from '@core/protocol/MessageBus';
console.log(messageBus['isProcessingQueue']);  // true = 死锁
console.log(messageBus['messageQueue'].length); // 积压数量
```

**根因：** `processQueue` 的某次执行中，`publishInternal` 抛出了未被捕获的异常，导致 `isProcessingQueue` 没有被重置为 `false`。

**修复确认：** 当前代码已用 `try/finally` 修复。如果死锁复现，检查是否有新的 `isProcessingQueue = true` 赋值没有对应的 `finally` 块。

---

### Bug 2：subscriber cleanup 失效（React Strict Mode 下 handler 泄漏）

**症状：** 同一个事件被处理两次；严格模式下 unmount→remount 后出现重复响应。

**错误写法：**
```typescript
// subscribe 返回的是 unsubscribe 函数，不是 handler
const unsub = messageBus.subscribe('SENSE_CREATED', handleNewSense);

// 错误：把 unsubscribe 函数当 handler 传入，永远找不到，cleanup 无效
return () => messageBus.unsubscribe('SENSE_CREATED', unsub);
```

**正确写法：**
```typescript
const unsub = messageBus.subscribe('SENSE_CREATED', handleNewSense);

// 正确：直接调用返回的 unsubscribe 函数
return () => unsub();
```

---

### Bug 3：async handler 中的 Dexie / 外部 IO 错误导致连锁失败

**症状：** IndexedDB 写入失败后，同一条消息的其他 handler（如 React state 更新）也没有执行。

**根因：** handler 内的 async 操作抛错，被 `Promise.allSettled` 捕获并 console.error，但不影响其他 handler。如果你看到 `[MessageBus] Async handler #N rejected`，说明某个 handler 内部有未处理的错误，需要去那个 handler 里加 try/catch。

**排查：**
```javascript
// 查看 telemetry，找 errorCount > 0 的消息类型
messageBus.getTelemetry().filter(t => t.errorCount > 0);
```

---

## 新增消息类型 Checklist

- [ ] 在 `src/types/protocol.ts`（或相关类型文件）中定义消息的 payload 类型
- [ ] subscriber 内部用 `try/catch` 包裹所有 IO 操作（DB、网络）
- [ ] async subscriber 不要假设执行顺序（`allSettled` 并发执行）
- [ ] cleanup 时调用 `subscribe` 返回的函数，不要手动调用 `unsubscribe`
- [ ] 评估优先级：是否需要 HIGH/CRITICAL 绕过队列？

---

## 监控与调试工具

```typescript
// 查看所有订阅
messageBus.getSubscriptions();
// Map { 'SENSE_CREATED' => 2, 'ASSET_LOADED' => 3, ... }

// 查看消息日志（最近 100 条）
messageBus.getMessageLog();

// 查看性能与错误统计
messageBus.getTelemetry();
// [{ messageType, count, averageProcessingTime, errorCount }, ...]

// 关闭 debug 日志（生产环境）
messageBus.setDebugMode(false);
```
