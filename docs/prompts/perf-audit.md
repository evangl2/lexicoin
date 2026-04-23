# 性能巡检 Prompt 集

> 用途：定期（每次大功能合入后）运行以下 prompt，发现并**即时修复**本项目中的性能问题。
> 每条 prompt 独立可用，可按需单独执行，也可全套顺序执行。

---

## P1 · 渲染热点扫描（Re-render Audit）

```
扫描以下文件，找出**会导致不必要重渲染**的代码并立即修复：

目标范围：
- src/app/components/ui/card/Card.tsx
- src/app/components/ui/grimoire/（全部文件）
- src/app/hooks/useCardManager.ts
- src/app/hooks/useCardGrouping.ts
- src/app/hooks/useViewportCulling.ts

检查项：
1. Zustand selector 是否用 `s => s.field` 细粒度选取，而非整个 store 对象（`useGameStore()` 无参数调用）。
2. 组件 props 是否含有每次渲染都重新创建的内联对象/数组/箭头函数（如 `style={{ ... }}` 直接写对象、`onClick={() => ...}` 未 useCallback 包裹）。
3. React.memo 包裹的组件，其 props 中是否有引用不稳定的值导致 memo 失效。
4. useEffect/useCallback/useMemo 的依赖数组是否有遗漏或多余依赖（用 exhaustive-deps 规则判断）。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P2 · MotionValue 与动画性能检查

```
检查以下文件中 framer-motion / motion 的使用方式，找出**阻塞主线程**的动画模式并修复：

目标范围：
- src/app/hooks/useCardAnimation.ts
- src/app/hooks/useCardPhysics.ts
- src/app/hooks/useCanvasCamera.ts
- src/app/components/ui/canvas/Canvas.tsx
- src/app/components/ui/card/Card.tsx

检查项：
1. 是否有直接读取 MotionValue（`.get()`）放在渲染路径或 render 函数里——应改为 `useTransform` 或 `useMotionValueEvent`。
2. `animate` 属性是否在每次渲染都传新对象，而非复用 MotionValue——改为 `style={{ x: motionVal }}`。
3. `useSpring` / `useTransform` 是否在组件顶层调用（正确），还是在事件回调里动态创建（错误）。
4. 画布平移/缩放：onPan/onWheel 回调内是否有同步的 setState 导致掉帧——应只写 MotionValue，不触发 React state。
5. `DragLayer.tsx`：拖拽预览是否每帧都触发组件重渲染？应使用 `useDragLayer` + `useMotionValue` 分离渲染。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P3 · 内存泄漏与订阅清理检查

```
扫描以下文件，找出**未正确清理的订阅、定时器、事件监听**并修复：

目标范围：
- src/app/hooks/useGrimoireExpiry.ts
- src/app/hooks/useCardManager.ts
- src/app/hooks/useViewportCulling.ts
- src/app/hooks/useCardLOD.ts
- src/app/hooks/useGrimoireLOD.ts
- src/core/protocol/MessageBus.ts（如存在）

检查项：
1. `setInterval` / `setTimeout` 是否在 useEffect return 里 clearInterval/clearTimeout。
2. `messageBus.subscribe()` 返回的 unsubscribe 是否在 useEffect return 里调用。
3. MotionValue 的 `.on('change', cb)` 是否在 useEffect return 里调用 `.destroy()` 或返回的清理函数。
4. Zustand `store.subscribe()` 是否保存返回值并在 useEffect return 里调用取消订阅。
5. AbortController：useSynthesis 中的 abortRef，是否在组件卸载时调用 `abortRef.current?.abort()`。
6. useGrimoireExpiry 的 30s 轮询：组件卸载后轮询是否继续（内存泄漏 + 幽灵请求）。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P4 · Canvas 与视口剔除效率检查

```
检查画布渲染管线的性能，找出**低效的可见性判断和不必要的全量渲染**并修复：

目标范围：
- src/app/hooks/useViewportCulling.ts
- src/app/hooks/useCardLOD.ts
- src/app/hooks/useGrimoireLOD.ts
- src/app/components/ui/canvas/Canvas.tsx
- src/app/hooks/useCardGrouping.ts

检查项：
1. useViewportCulling：摄像机 MotionValue onChange 触发时，是否对每张卡都重新计算 AABB？卡牌数量大时应加节流（throttle ~16ms）。
2. 视口剔除结果是否用 Set 做 O(1) 查找，还是用 Array.includes（O(n)）。
3. useCardGrouping：当卡牌位置更新时，是否触发了整个卡组的重新排列计算？能否只计算 dirty 的卡。
4. LOD 迟滞（hysteresis）阈值是否合理：进入低 LOD 阈值 vs 退出低 LOD 阈值是否有足够间距（建议 ≥0.05 差值），避免频繁切换。
5. Canvas.tsx：screenWRef/screenHRef 的 ResizeObserver，是否在组件卸载时 disconnect。
6. DragLayer：拖拽时是否渲染了所有卡牌的预览，还是只渲染被拖拽项。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P5 · Zustand Store 选择器与派生值检查

```
检查 Zustand store 的使用方式，找出**导致无效重渲染的选择器写法**并修复：

目标范围：
- src/core/store/slices/（全部 slice 文件）
- src/app/hooks/useCardManager.ts
- src/app/hooks/useGrimoireInteraction.ts
- src/app/hooks/useGrimoireSummoning.ts
- src/app/hooks/useGrimoireReward.ts

检查项：
1. 是否有 `useGameStore()` 无参数调用后再解构——任何 state 变化都会触发重渲染，改为精确 selector。
2. Selector 函数是否在组件内部每次渲染都重新创建（`useGameStore(s => ({ a: s.a, b: s.b }))`）——对象字面量 selector 每次返回新引用，应改用 `useShallow` 或分开两个 `useGameStore` 调用。
3. createGrimoireSlice：`grimoireInventory` 是对象还是 Map？是否有 O(n) 遍历在 selector 里。
4. 派生数据（如"Canvas上的卡牌列表"）是否每次都在 hook 里重新过滤/映射？应在 slice 中或用 `useMemo` 缓存。
5. store.setState 调用是否批量（`immer` 或单次调用合并）还是多次分散调用（导致多次重渲染）。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P6 · 异步操作与防抖节流检查

```
检查异步操作的性能，找出**频繁调用、缺少防抖/节流、或瀑布式请求**并修复：

目标范围：
- src/app/hooks/useCardManager.ts
- src/app/hooks/useSynthesis.ts
- src/app/hooks/useVisualPoll.ts
- src/app/hooks/useGrimoireSummoning.ts
- src/app/hooks/useEchoSystem.ts

检查项：
1. useCardManager 防抖保存：debounce 延迟是否合理（建议 500ms-1000ms）？是否在快速操作时（拖拽中）意外触发保存？
2. useVisualPoll 轮询间隔：冷却时间是否随重试次数指数退避（exponential backoff），避免持续失败时频繁请求。
3. useSynthesis：90s 硬超时后是否正确取消 in-flight 请求（abortRef）？Edge Function 调用是否有请求级别的超时（fetch signal）？
4. useGrimoireSummoning：召唤前的体力检查是否有竞态问题（两次快速点击触发两次召唤）？是否有 in-flight guard。
5. 任何 `await` 链：是否存在串行等待可以并行的情况（用 `Promise.all` 优化）。
6. IndexedDB（Dexie）写入：是否在每次卡牌位移后都写 DB，还是批量写？

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P7 · 文本渲染与布局抖动检查

```
检查文本相关组件的渲染，找出**强制同步布局（layout thrashing）和高频 DOM 测量**并修复：

目标范围：
- src/app/hooks/useTextFit.ts
- src/app/hooks/useTieredAutoType.ts
- src/app/components/ui/text/（全部文件）
- src/app/components/ui/card/CardWCSlots.tsx

检查项：
1. useTextFit 二分法：每次二分是否触发同步 offsetWidth/offsetHeight 读取？应在 requestAnimationFrame 外或 ResizeObserver 中批量读取，避免强制回流。
2. useTieredAutoType：物理溢出检测（`scrollHeight > clientHeight`）是否在渲染路径中同步调用？
3. FlavorCarousel：轮播动画是否用 CSS transform 而非改变 top/left（前者走 GPU 合成层）。
4. DynamicText：字体加载前是否有 fallback 尺寸，避免 FOUT 导致的布局跳动。
5. TieredText：层级切换时是否有闪烁（先渲染大字再切小字）？应先隐藏测量再显示。

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## P8 · 卡牌 Web Component 性能检查

```
检查 Card Web Component 实现，找出**Shadow DOM 更新低效和样式重算**并修复：

目标范围：
- src/app/components/ui/card/CardWCSlots.tsx
- src/app/components/ui/card/MemoizedCardVisual.tsx
- src/app/components/ui/card/DragPreviewCard.tsx
- src/app/components/ui/card/（Web Component 相关文件，如 LexiCardChrome.ts 等）

检查项：
1. Web Component 的 CSS Custom Properties 是否通过 `element.style.setProperty` 批量更新，还是多次单独调用（每次调用都触发样式重算）。
2. `MemoizedCardVisual`：React.memo 的比较函数（areEqual）是否写得过于宽松（永远返回 true）或过于严格（深比较大对象）？
3. DragPreviewCard：拖拽预览是否复用了完整的卡牌渲染树？对于预览可以用 `will-change: transform` + 简化版渲染。
4. CardWCSlots：slot 内容变化时是否触发不必要的 Web Component 重新渲染？检查 slot change 事件监听。
5. 大量卡牌同时在 Canvas 上时（>30 张）：是否有虚拟化或卡牌实例池机制？

对每个发现的问题：说明文件+行号 → 给出修复代码 → 直接应用修改。
```

---

## 使用指南

### 单次全量巡检（复制整段交给 Claude）

```
依次执行以下性能巡检，每项完成修复后再进行下一项。遇到不确定的改动，先描述方案等我确认再修改。

1. 渲染热点扫描（P1）
2. MotionValue 动画性能（P2）
3. 内存泄漏与订阅清理（P3）
4. Canvas 视口剔除效率（P4）

完成后输出：已修复问题列表（文件+行号+问题类型）+ 未修复但需关注的风险点。
```

### 快速单项检查（针对某次改动后）

- 改了 Canvas/拖拽相关 → 运行 **P2 + P4**
- 改了 Store/Hook → 运行 **P1 + P5**
- 改了异步/召唤/合成流程 → 运行 **P3 + P6**
- 改了卡牌渲染/文本 → 运行 **P7 + P8**

### Grimoire 大重构后专项

```
Grimoire 系统刚完成重构，执行专项性能检查：

1. 检查 src/app/components/ui/grimoire/ 所有文件的 React.memo 覆盖是否完整
2. 检查 useGrimoireInteraction / useGrimoireDrop / useGrimoireReward 三个 hook 是否有重复的 store 读取或派生计算
3. 检查 GrimoireSlot 的 react-dnd drop target 注册是否在每次渲染都重新注册（应该 memo 化 drop spec）
4. 检查 GrimoireOverlayVisual 动画是否在 overlay 未打开时仍在运行（应 lazy mount 或用 AnimatePresence 卸载）

发现问题立即修复，输出修复摘要。
```
