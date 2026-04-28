# PixiJS v8 + Vite + React · Troubleshooting 实录

本文记录 Lexicoin PixiJS v8 初始化阶段（Stage B/C）实际踩到的所有坑，含根因分析和已验证的解法。  
每个问题均可独立复现于**任何** PixiJS v8 + Vite + React 新项目，与旧代码无关。

---

## 问题一：Shader null crash

### 症状

```
Uncaught TypeError: Cannot read properties of null (reading 'split')
    at logPrettyShaderError (logProgramError.ts:9)
    at logProgramError (logProgramError.ts:74)
    at generateProgram (generateProgram.ts:56)
    at GlShaderSystem._createProgramData (GlShaderSystem.ts:183)
```

### 根因

Vite 的 `optimizeDeps` 预打包机制。dev server 启动时，Vite 把 `node_modules` 里的包预编译成单一 ESM bundle。PixiJS v8 内部通过动态 import 路径加载各系统的 shader 字符串；预打包把这些路径"压平"进 bundle 后，运行时动态 import 找不到对应模块，`GlProgram` 的 `vertex`/`fragment` 字段为 `undefined`，`gl.getShaderSource()` 返回 null，触发此崩溃。

**这是 PixiJS v8 + Vite 的已知不兼容**，production build 不受影响（Rollup 处理方式不同）。

### 解法

在 `vite.config.ts` 排除 pixi.js 本身，不让 Vite 预打包它：

```typescript
// vite.config.ts
optimizeDeps: {
    exclude: ['pixi.js'],
}
```

---

## 问题二：CJS 依赖 `does not provide an export named 'default'`

### 症状

```
Uncaught SyntaxError: The requested module '/node_modules/eventemitter3/index.js'
    does not provide an export named 'default'

Uncaught SyntaxError: The requested module '/node_modules/parse-svg-path/index.js'
    does not provide an export named 'default'
```

### 根因

问题一的 **副作用**。排除 `pixi.js` 后，Vite 不再预打包它，也不再为它的 CJS 传递依赖做 CJS→ESM 转换。这些 CJS 包（`eventemitter3`、`parse-svg-path`、`ismobilejs` 等）被原样发送给浏览器，没有 `export default`，ESM `import` 语句找不到默认导出。

### 解法

把 pixi.js 的所有 CJS 传递依赖单独加入 `include`，让 Vite 只对它们做 CJS→ESM 转换：

```typescript
// vite.config.ts
optimizeDeps: {
    exclude: ['pixi.js'],
    include: [
        'eventemitter3',    // pixi.js + pixi-viewport 共用
        'parse-svg-path',   // pixi.js SVG 路径解析
        '@pixi/colord',     // pixi.js 颜色工具
        '@xmldom/xmldom',   // pixi.js XML 解析
        'gifuct-js',        // pixi.js GIF 支持
        'ismobilejs',       // pixi.js 设备检测
    ],
}
```

**如何找齐所有 CJS 依赖：**

```bash
node -e "
const pkg = require('./node_modules/pixi.js/package.json');
const deps = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
const cjs = [];
for (const name of deps) {
  try {
    const sub = require('./node_modules/' + name + '/package.json');
    if (sub.type !== 'module') cjs.push(name);
  } catch {}
}
console.log(cjs);
"
```

---

## 问题三：React StrictMode → GPU crash（哭脸）

### 症状

页面出现浏览器 GPU crash 页（白屏 + 哭脸图标），控制台出现 shader null 错误（同问题一），stack trace 包含：

```
commitDoubleInvokeEffectsInDEV @ react-dom.development.js
```

### 根因

`React.StrictMode` 在 **dev 模式**故意把所有 `useEffect` 执行**两遍**（mount → cleanup → re-mount），用于暴露不纯的副作用。

流程：
1. 首次 mount → `initPixiApp(canvas)` 开始（async）
2. StrictMode cleanup → `destroyPixiApp()` 被调用
3. StrictMode re-mount → `initPixiApp(canvas)` **再次**被调用
4. 第二次 init 在同一 `<canvas>` 元素上尝试创建第二个 WebGL context
5. 浏览器不允许同一 canvas 同时持有两个 WebGL context → GPU process crash

### 解法

移除 `React.StrictMode`。WebGL / Canvas 游戏本质上是有状态的单次初始化，与 StrictMode 的"双重执行"模型根本不兼容。

```typescript
// src/main.tsx
// 修改前：
ReactDOM.createRoot(root).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// 修改后：
ReactDOM.createRoot(root).render(<App />);
```

**替代方案（不推荐）**：用模块级单例 + 幂等 init guard 使 `initPixiApp` 能被多次调用而不崩溃。但维护成本高，且 WebGL 应用不需要 StrictMode 的检测能力。

---

## 问题四：antialias 切换 → GPU crash

### 症状

DevConsole 切换 antialias 后页面卡死，变白 + 哭脸。

### 根因

与问题三同源：**同一 `<canvas>` 不能有两个 WebGL context**。

即便 `app.destroy()` 被正确 await，WebGL 规范也不要求浏览器在 `destroy` 后立即释放 context handle。PixiJS v8 的 `destroy()` 不会显式调用 `gl.getExtension('WEBGL_lose_context').loseContext()`，context 在 GC 回收前实际上仍"存活"。再创建新 Application 时，浏览器判定同一 canvas 上的 context 数超限 → GPU crash。

**注**：即使 `PixiJS Application.destroy()` 在 v8 中是 `async`，不 await 会导致更早崩溃——但 await 后仍然崩溃，根因是 context 未显式释放。

### 解法

**不在同一 canvas 元素上重建 WebGL context。** 改为：写 `localStorage` + `window.location.reload()`，让下一次页面加载读取新设置，从全新 canvas 上 init。

```typescript
// DevConsole 中的 antialias 切换按钮
<button onClick={() => {
    const cur = localStorage.getItem('pixi-antialias') !== 'false'
    localStorage.setItem('pixi-antialias', String(!cur))
    window.location.reload()
}}>
    Antialias: {localStorage.getItem('pixi-antialias') !== 'false' ? 'ON' : 'OFF'}
</button>
```

```typescript
// PixiRoot.tsx mount 时读取
function readAntialias(): boolean {
    const stored = localStorage.getItem('pixi-antialias')
    return stored !== null ? stored === 'true' : true  // 默认 true
}
```

**如果真的需要热切换**（不 reload），唯一安全路径是：销毁旧 canvas DOM 元素，创建全新 `<canvas>` 元素并插入 DOM，再 init。但这需要 React 组件重新 mount（换 `key`），不是简单的 reinit。

---

## 问题五：背景只渲染左上角小块

### 症状

PixiJS 背景色块只出现在屏幕左上角一小块，不填满全屏。

### 根因

`buildPixiConfig` 没有传 `width` / `height`，PixiJS 默认渲染尺寸为 **800×600**。canvas 元素通过 CSS `position:fixed; inset:0` 撑满屏幕，但 PixiJS renderer 的逻辑分辨率仍然是 800×600，只有左上角 800×600 的区域有内容。

### 解法

在 config 中显式传入窗口尺寸：

```typescript
// src/pixi/config.ts
export function buildPixiConfig(antialias: boolean): Partial<ApplicationOptions> {
    return {
        width: window.innerWidth,   // ← 必填
        height: window.innerHeight, // ← 必填
        preference: 'webgl',
        antialias,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        // ...
    }
}
```

同时确保 `resize` handler 也更新 renderer 尺寸：

```typescript
// src/pixi/core/resize.ts
const handler = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
}
```

---

## 最终有效的 `vite.config.ts` 配置

```typescript
optimizeDeps: {
    // pixi.js 排除预打包以保全 shader 字符串
    exclude: ['pixi.js'],
    // pixi.js 的 CJS 传递依赖单独预打包做 CJS→ESM 转换
    include: [
        'eventemitter3',
        'parse-svg-path',
        '@pixi/colord',
        '@xmldom/xmldom',
        'gifuct-js',
        'ismobilejs',
    ],
},
```

---

## 版本信息（已验证可工作）

| 包 | 版本 |
|---|---|
| `pixi.js` | 8.18.1 |
| `pixi-viewport` | 6.0.3 |
| `pixi-filters` | 6.1.5 |
| `pixi-stats` | 5.1.7 |
| `gsap` | 3.15.0 |
| `vite` | 6.4.2 |
| `react` | 18.x |

**注**：`@pixi/stats` 包名不存在（npm 404），正确包名为 `pixi-stats`。  
**注**：`@pixi/vite-plugin` 包名不存在（npm 404），用 `optimizeDeps` 手动配置替代。

---

## 快速排查清单

碰到 PixiJS v8 dev 环境报错时，按顺序检查：

- [ ] `vite.config.ts` 有 `optimizeDeps.exclude: ['pixi.js']`
- [ ] `vite.config.ts` 有 `optimizeDeps.include` 包含所有 CJS 传递依赖
- [ ] `main.tsx` **没有** `<React.StrictMode>`
- [ ] `buildPixiConfig` 传了 `width: window.innerWidth, height: window.innerHeight`
- [ ] antialias 切换用 `localStorage + reload`，不做 canvas 原地 reinit
- [ ] `Application.destroy()` 在 v8 是 `async`，需要 `await`（避免更早的竞态崩溃）
