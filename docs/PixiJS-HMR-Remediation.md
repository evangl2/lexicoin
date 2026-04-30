# PixiJS v8 + Vite HMR 生命周期修复技术文档

## 1. 背景与问题描述

在开发 Lexicoin 的 PixiJS 渲染引擎时，我们遇到了严重的 Vite 热更新（HMR）问题：每次保存代码后，浏览器标签页会迅速变得无响应（假死），必须强制关闭标签页或重启开发服务器。

通过调查发现，该问题的核心在于 PixiJS v8 的 WebGPU/WebGL 渲染器在 HMR 过程中未能正确释放硬件资源，导致 GPU 上下文冲突、主线程饱和以及内存膨胀。

## 2. 根源分析 (Root Cause Analysis)

经过实际代码排查，我们确定了以下三个核心病因：

1.  **GPU Context Contention (最致命)**: 之前的代码为了保留 Canvas 节点，手动阻止了 WebGL 上下文的销毁 (`loseContext = null`)。这导致每次 HMR 都会残留一个半死不活的 GPU 上下文，迅速占满显存和浏览器限制。
2.  **Worker Pool 泄漏**: PixiJS v8 使用后台 Worker 进行资源解码。我们的销毁逻辑中缺失了对 `WorkerManager.reset()` 的调用，导致 Worker 线程在多次 HMR 后堆积，造成内存溢出。
3.  **主线程饱和 (Ticker Persistence)**: 旧的渲染循环 (Ticker) 在模块替换后未被彻底斩断，残留的帧循环在后台继续运行，造成主线程 100% 占用。

## 3. 修复方案与实施细节

我们采用了“**全量销毁与重建 (Total Wipe & Rebuild)**”协议，彻底重构了 PixiJS 的初始化与清理流程。

### 3.1 核心销毁协议 (`app.ts`)

我们将原本温和的销毁逻辑改为强力清扫模式：

-   **强制释放**: 使用 `app.destroy(true, { ... })`。其中第一个参数 `true` 会强制从 DOM 中移除 Canvas。
-   **资源全清**: 显式设置 `texture` 和 `context` 为 `true`，确保 GPU 资源被释放。
-   **重置 Worker**: 加入 `WorkerManager.reset()` 清理后台线程池。
-   **激进 GC**: 在开发模式下将 `textureGC.maxIdle` 缩短至 600 帧，加快显存回收。

### 3.2 React 架构适配 (`PixiRoot.tsx`)

为了配合“强制移除 Canvas”的逻辑，我们重构了 React 容器：

-   **容器模式**: 不再由 React 渲染 `<canvas>`，而是渲染一个空的 `<div>` 容器。
-   **手动挂载**: 由 PixiJS 自动创建 Canvas 元素，并在 `initPixiApp` 完成后，通过 React 的 `ref` 手动将 `app.canvas` 追加到 DOM 中。
-   **解耦**: 这种模式让 React 的生命周期与 PixiJS 的硬件初始化彻底解耦，避免了 HMR 时的“Text instances are not supported”错误。

### 3.3 Vite 环境优化 (`vite.config.ts`)

为了防止在大规模模块更新时网络请求堆塞：

-   **开启轮询**: 设置 `server.watch.usePolling: true`，提供更稳定的文件变动信号。
-   **错误遮罩**: 开启 `hmr.overlay`，确保任何同步阻塞都能第一时间弹出报错，而不是静默卡死。

## 4. 结论与后续注意事项

目前 HMR 已恢复稳定，不再导致浏览器假死。

**已知限制**:
-   由于销毁流程非常彻底（包含纹理缓存清空），HMR 后的第一次渲染可能不会立即加载所有纹理资源，可能需要手动刷新页面来重置完整的资源包。
-   在当前的开发阶段，这种“稳定但不完美加载”的状态是性能与鲁棒性之间的最佳权衡。

---
*文档版本：1.0.0*
*更新日期：2026-04-30*
