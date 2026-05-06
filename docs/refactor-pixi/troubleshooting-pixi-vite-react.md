# PixiJS v8 + Vite + React · Troubleshooting 全集

本文分两部分：
- **Part 1 · 实战记录**：本项目 Stage B/C 实际踩到的坑，含完整根因 + 已验证解法
- **Part 2 · 预测问题**：基于 PixiJS v8 breaking changes、Vite 工具链特性、React 集成模式，预测后续阶段最可能出现的问题及解法

---

# Part 1 · 实战记录（已验证）

## P1-1 · Shader null crash

**症状**
```
TypeError: Cannot read properties of null (reading 'split')
    at logPrettyShaderError (logProgramError.ts:9)
    at GlShaderSystem._createProgramData (GlShaderSystem.ts:183)
```

**根因**  
Vite `optimizeDeps` 预打包阶段把 `pixi.js` 编译成单一 bundle，破坏了 PixiJS v8 内部通过动态 import 加载 shader 字符串的路径。运行时 `GlProgram.vertex / .fragment` 为 `undefined`，`gl.getShaderSource()` 返回 null。仅影响 dev server，production build 正常。

**解法**
```typescript
// vite.config.ts
optimizeDeps: { exclude: ['pixi.js'] }
```

---

## P1-2 · CJS 依赖 `does not provide an export named 'default'`

**症状**
```
SyntaxError: /node_modules/eventemitter3/index.js does not provide an export named 'default'
SyntaxError: /node_modules/parse-svg-path/index.js does not provide an export named 'default'
```

**根因**  
P1-1 解法的连锁效应：排除 `pixi.js` 后，其 CJS 传递依赖也不被预打包，Vite 直接把原始 CJS 文件发给浏览器，没有 `export default`。

**解法**
```typescript
optimizeDeps: {
    exclude: ['pixi.js'],
    include: [
        'eventemitter3', 'parse-svg-path', '@pixi/colord',
        '@xmldom/xmldom', 'gifuct-js', 'ismobilejs',
    ],
}
```

找齐所有 CJS 依赖的命令：
```bash
node -e "
const pkg = require('./node_modules/pixi.js/package.json');
Object.keys({...pkg.dependencies,...pkg.peerDependencies}).forEach(name => {
  try {
    const s = require('./node_modules/'+name+'/package.json');
    if (s.type !== 'module') console.log(name);
  } catch {}
});"
```

---

## P1-3 · React StrictMode → GPU crash（哭脸页面）

**症状**  
页面白屏 + 浏览器 GPU crash 哭脸，stack trace 含 `commitDoubleInvokeEffectsInDEV`。

**根因**  
StrictMode dev 模式故意把 `useEffect` 执行两遍（mount→cleanup→re-mount）。PixiJS `initPixiApp` 是异步的，cleanup 调用 `destroyPixiApp` 后第二次 mount 再次 `initPixiApp`，两次 init 在同一 `<canvas>` 上创建两个 WebGL context → GPU crash。

**解法**
```typescript
// src/main.tsx — 移除 StrictMode
ReactDOM.createRoot(root).render(<App />)
```

---

## P1-4 · antialias 切换 → GPU crash

**症状**  
DevConsole 切换 antialias 后页面卡死变白 + 哭脸，即使正确 `await destroyPixiApp()` 也发生。

**根因**  
WebGL 规范不要求 `destroy()` 后立即释放 context handle；PixiJS v8 不调用 `gl.getExtension('WEBGL_lose_context').loseContext()`。同一 `<canvas>` 上的旧 context 在 GC 回收前仍"存活"，再创建新 Application 时浏览器判定 context 数超限 → GPU crash。

**解法**  
不在同一 canvas 上重建，改用 `localStorage + reload`：
```typescript
// DevConsole 按钮
localStorage.setItem('pixi-antialias', String(!cur)); window.location.reload();

// PixiRoot mount 时读取
const antialias = localStorage.getItem('pixi-antialias') !== 'false';
```

---

## P1-5 · 背景只渲染左上角 800×600 色块

**根因**：`buildPixiConfig` 未传 `width/height`，PixiJS 默认 800×600。

**解法**：`width: window.innerWidth, height: window.innerHeight` 加入 config。

---

## P1-6 · `@pixi/stats` / `@pixi/vite-plugin` 包名不存在

- `@pixi/stats` → 正确包名：**`pixi-stats`**
- `@pixi/vite-plugin` → 不存在，用 `optimizeDeps` 手动配置替代

---

---

## P1-7 · 背景系统初始化“空窗期”（Sync Timing Race）

**症状**  
首屏加载时背景为黑色（Stage 0 默认值），只有手动切换 Persona 后背景才会出现。

**具体原因**  
`BackgroundSystem.init()` 在 PixiJS 启动时同步执行，而 React 的 `PixiPersonaBridge`（useEffect）在 React Commit 阶段才执行。初始化时 `personaBridge.getData()` 为 `null`，导致 `switchTo` 被跳过，背景系统进入无限等待。

**深层原因（抽象高度）**  
这是**混合状态架构中的“启动序列冲突”**。当一个同步驱动的系统（PixiJS）依赖于一个异步/响应式驱动的配置源（React/Zustand）时，依赖链路在 T0 时刻是断裂的。系统设计不能假设“数据已就绪”，必须具备**自初始化能力（Self-Sufficient Fallback）**或**状态回溯补全**机制，以保证视觉一致性的连续性。

**解法**  
在 `BackgroundSystem.init` 中加入硬编码的 Default Fallback，确保 T0 时刻有渲染，后续再由 Bridge 的首次推送进行平滑覆盖。

---

## P1-8 · 自定义 Shader 的“版本红利”陷阱（Abstraction Fragility）

**症状**  
自定义 Shader 报错 `GL_INVALID_OPERATION: glUniform4f mismatch`，或 `ProjectionMatrix` 未注入导致 Mesh 渲染在错误的坐标（如左上角 1x1 像素）。

**具体原因**  
PixiJS v8 为了 WebGPU 兼容性，在内存对齐（vec3 vs vec4）和矩阵自动注入逻辑上与 v7 有巨大差异。手动维护 `Mesh + Shader` 方案在 v8 早期版本中非常脆弱，极易受内部对齐规则影响导致 WebGL 驱动层报错。

**深层原因（抽象高度）**  
**“过度封装导致的技术债”**。在图形框架发生重大架构范式转移（WebGL -> WebGPU）时，底层 API 的稳定性远低于高层 API。过度追求“Shader 极致性能”而选择低级抽象，会引入与业务无关的兼容性维护开销。

**解法（架构转向）**  
**“降维打击”**：放弃 Raw Mesh，改用 **Canvas 2D 动态生成纹理 + Sprite**。该方案 100% 屏蔽了底层渲染驱动的差异，不仅解决了矩阵注入和内存对齐问题，还大幅降低了布局计算的复杂度，实现了“实现无关”的可移植性。

---

## P1-9 · PixiJS v8 自定义 Mesh/Buffer 初始化报错 (WebGL INVALID_VALUE)

**症状**  
控制台抛出 `bufferData: no data` 或 `no buffer is bound to enabled attribute`，画面不显示任何东西。

**原因**  
PixiJS v8 为了极致优化，对 Geometry 的属性定义极其严格。如果仅提供普通 Array 而不显式指定属性的 `size` 或使用显式的 `Buffer` 对象，GPU 无法识别内存布局。

**深层原因（抽象高度）**  
**“显式语义缺失”**。在高版本图形 API（类似 WebGPU 的思维）中，不再支持隐式推断，所有内存布局必须在初始化阶段精确声明。

**解法**  
1. 显式创建 `new Buffer()` 实例。
2. 在 `Geometry` 属性中显式声明 `size: 2` (针对 vec2)。
3. **架构建议**：在不涉及复杂几何体变形时，优先使用 `Filter` 方案代替 `Mesh`，利用引擎内置的 Quad 管理来避开底层 Buffer 绑定的黑盒。

---

## P1-10 · Shader 网格绘制逻辑失效 (全屏纯色)

**症状**  
Shader 已运行（变色），但看不到线条，全屏呈现纯色。

**原因**  
`drawGrid` 函数中的 `thickness`（线宽）未进行空间归一化。在 `fract()` 后的 0..1 空间内直接使用像素单位，导致判定区域覆盖了整个网格单元。

**深层原因（抽象高度）**  
**“空间坐标系的认知错位”**。在 Shader 编程中，开发者极易混淆“物理像素空间”、“世界坐标空间”与“归一化单元空间（UV）”。

**解法**  
将所有物理参数（厚度、抗锯齿宽度）除以网格尺寸（size），映射到 0..1 的归一化网格空间内进行 smoothstep 计算。

---

## P1-11 · 滤镜管线中的“透明度陷阱” (State Entanglement)

**症状**  
网格颜色正确但背景色不显示，或者背景色显示但网格消失，甚至出现意料之外的颜色填充。

**原因**  
当滤镜附加在 `alpha: 0` 的 Graphics 上时，Pixi 渲染管线可能跳过渲染，或在混合阶段（Blending）因为 Shader 输出的 Alpha 导致与背景混合失败。

**深层原因（抽象高度）**  
**“渲染主权被剥夺导致的耦合”**。过度依赖框架自带的透明度混合，使渲染层（Graphics 填充）与逻辑层（Shader 绘图）的状态产生了不稳定的耦合。在滤镜管线这种离屏渲染路径中，这种耦合会导致环境不确定性。

**解法（架构转向）**  
1. **不透明输出模式 (Self-Contained Fragment)**：不再依赖外界的混合，将背景色作为 Uniform 传入 Shader。
2. 在 Shader 内部使用 `mix(bgColor, gridColor, intensity)` 完成图层叠加，输出 `Alpha = 1.0` 的不透明像素。
3. **架构教训**：**能用数学公式在 GPU 内解决的图层关系，绝不要交给外界的状态机。**

## P1-12 · 自定义 Filter 的“Alpha 通道残留与黑块” (Premultiplied Alpha)

**症状**  
自定义 Filter 渲染时，本该透明的区域出现了“淡淡的底色”、“黑块”或颜色异常发亮。即使将 `gl_FragColor` 的 Alpha 设为 0，依然无法看到底层的 DOM 或其他 Pixi 对象。

**原因**  
PixiJS v8 的渲染管线（无论是 WebGL 还是 WebGPU）默认采用 **预乘透明度 (Premultiplied Alpha, PMA)**。
*   **Straight Alpha (常规认知)**：输出 `vec4(R, G, B, A)`。
*   **Premultiplied Alpha (Pixi 预期)**：输出 `vec4(R*A, G*A, B*A, A)`。

如果 Shader 输出的是 Straight Alpha，渲染器在混合阶段会按 PMA 逻辑再次处理，导致颜色溢出或混合计算错误，从而产生“底色漏出”的 Bug。

**解法**  
1. **Shader 内部预乘**：在 Fragment Shader 输出前，手动将 RGB 乘以 Alpha。
   ```glsl
   // GLSL 示例
   float finalAlpha = uColor.a * intensity;
   gl_FragColor = vec4(uColor.rgb * finalAlpha, finalAlpha);
   ```
2. **清理底层填充**：如果 Filter 作用于 `Graphics`，确保该 Graphics 的 fill 是透明的，否则 Filter 的 Alpha 会与 Graphics 的初始颜色叠加：
   ```typescript
   graphics.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0 });
   ```

**深层原因（抽象高度）**  
**“图形管线的工业标准强制性”**。随着渲染引擎向 WebGPU 靠拢，原本在 WebGL 时代可以被“兼容”的非标准操作（如 Straight Alpha 混合）正被更高效但更严格的工业标准（PMA）取代。这要求开发者必须从“像素涂色”的思维转向“色彩能量传输（Energy Conservation）”的思维。

---

## P1-13 · ESM 环境下的 `require is not defined` (DebugSystem)

**症状**  
控制台报错 `ReferenceError: require is not defined`，导致调试面板（DevConsole）崩溃。

**根因**  
在 Vite + ESM 架构中，不能使用 CommonJS 的 `require` 动态加载模块。代码中尝试通过 `require` 获取 Renderer 类型，但在浏览器环境中该指令无效。

**解法**  
1. 废弃 `require`，改为标准的 ESM `import`。
2. 建立 `globalApp.ts` 单例中心，让各个系统通过统一的入口访问 `app` 实例，避免直接从初始化脚本中提取导致的竞态或非法引用。

---

## P1-14 · WebGPU BindGroup 布局与内存对齐 (Padding)

**症状**  
切换到 WebGPU 后报错：`Failed to read the 'layout' property from 'GPUBindGroupDescriptor': Required member is undefined.`。

**根因**  
1. **命名匹配**：WGSL 中的 `group(1) @binding(0) var<uniform> grid: GridUniforms` 要求 TypeScript 中的资源 key 必须严格为 `grid`。
2. **16字节对齐**：WebGPU 的 Uniform 块要求大小必须是 16 字节的倍数。如果结构体（如 `uZoom: f32` 后面紧跟 `uColor: vec4`）不满足对齐规则，BindGroup 创建会失败。

**解法**  
1. 确保 `Shader.from` 的 `resources` key 与 WGSL 的变量名一致。
2. 在 UniformGroup 中添加显式的填充字段（如 `_pad: { value: 0, type: 'f32' }`），使总字节数对齐。

---

## P1-15 · PixiJS v8 循环依赖导致的 Export 缺失

**症状**  
`Uncaught SyntaxError: ... does not provide an export named 'getPixiApp'`。

**根因**  
`app.ts` 导入了各个 `System`，而 `System` 又反过来导入 `app.ts` 以获取应用实例。这种循环依赖在 Vite/ESM 下会导致某些导出的函数在初始化瞬间为 `undefined`。

**解法**  
**架构解耦**：创建一个极简的 `src/pixi/core/globalApp.ts`，只负责持有 `Application` 引用。所有系统从 `globalApp` 获取实例，不再直接引用 `app.ts`。

---

## P1-16 · Filter 渲染管线的性能开销 (Mesh 优化)

**症状**  
全屏背景使用 Filter 时，在大分辨率/高刷屏上 FPS 从 100 掉到 88。

**根因**  
`Filter` 强制执行 **Render-to-Texture (离屏渲染)**。GPU 必须先在临时纹理上画一遍网格，再将其拷贝回主缓冲区。在大屏幕上，这种带宽损耗（纹理读写）会拖慢主线程帧率。

**解法**  
**迁移至 Mesh 模式**：使用全屏 `Mesh` + 自定义 `Shader` 进行 **Direct-to-Screen** 渲染。省去了离屏纹理的分配与读写，性能可直接回升 10% - 15%。

---

## P1-17 · Mesh 模式下的顶点 Y 轴翻转

**症状**  
背景网格显示位置错误，或者暗角在上方而不是四周。

**根因**  
在自定义 Mesh 顶点着色器中，NDC（归一化设备坐标）的 Y 轴是向上为正（-1 到 1），而 PixiJS 的屏幕坐标是向下为正。

**解法**  
在顶点着色器中进行坐标转换时翻转 Y 轴：
```glsl
vec2 pos = (aPosition / uResolution) * 2.0 - 1.0;
gl_Position = vec4(pos.x, -pos.y, 0.0, 1.0); // 关键：取负值
```

---

## 最终有效的 vite.config.ts 片段

```typescript
optimizeDeps: {
    exclude: ['pixi.js'],
    include: [
        'eventemitter3', 'parse-svg-path', '@pixi/colord',
        '@xmldom/xmldom', 'gifuct-js', 'ismobilejs',
    ],
},
```

---

# Part 2 · 预测问题（后续阶段）

---

## 类别 A · PixiJS v8 Breaking Changes（从 v7 迁移必踩）

### A-1 · `Application.init()` 是 async，忘记 await

**症状**：`app.stage` / `app.renderer` 为 undefined，`app.screen.width` 为 0。

```typescript
// ❌ v7 写法
const app = new Application({ width: 800 });
app.stage.addChild(sprite);

// ✅ v8 写法
const app = new Application();
await app.init({ width: 800 });
app.stage.addChild(sprite);
```

同理，`Application.destroy()` 也是 async，`destroyPixiApp` 必须 `await`。

---

### A-2 · `Graphics` API 完全重写

v8 的 `Graphics` 使用 builder 链式 API，v7 的写法全部无效。

```typescript
// ❌ v7
graphics.beginFill(0xff0000).drawRect(0,0,100,100).endFill();

// ✅ v8
graphics.rect(0, 0, 100, 100).fill(0xff0000);
graphics.rect(0, 0, 100, 100).fill({ color: 0xff0000, alpha: 0.5 });
graphics.circle(50, 50, 30).stroke({ color: 0xffffff, width: 2 });
```

---

### A-3 · `Loader` 完全移除，改用 `Assets`

```typescript
// ❌ v7
PIXI.Loader.shared.add('img', 'image.png').load((loader, res) => {
    const sprite = new Sprite(res.img.texture);
});

// ✅ v8
await Assets.load('image.png');
const sprite = Sprite.from('image.png');

// 或
const texture = await Assets.load<Texture>('image.png');
const sprite = new Sprite(texture);
```

---

### A-4 · `Texture.from()` 用于未预加载资源会返回空纹理

v8 中 `Texture.from(url)` 触发异步加载，**同步调用时立即返回空纹理**（白色 1×1），不报错。

```typescript
// ❌ 竞态：sprite 初始为白色
const sprite = Sprite.from('image.png');
app.stage.addChild(sprite);

// ✅ 先加载，再创建
await Assets.load('image.png');
const sprite = Sprite.from('image.png'); // 现在纹理已在缓存
```

---

### A-5 · `InteractionManager` 移除，改用 EventSystem

```typescript
// ❌ v7
sprite.interactive = true;
sprite.buttonMode = true;
sprite.on('pointerdown', handler);

// ✅ v8
sprite.eventMode = 'static';   // 'none' | 'passive' | 'auto' | 'static' | 'dynamic'
sprite.cursor = 'pointer';
sprite.on('pointerdown', handler);
```

`eventMode` 值含义：
- `'none'`：不接收事件（默认，性能最优）
- `'passive'`：接收来自子元素的冒泡，自身不触发
- `'static'`：接收事件，自身不移动时使用（卡片、按钮）
- `'dynamic'`：接收事件，自身会移动时使用（拖拽中的对象）

---

### A-6 · `PIXI` 命名空间 import 阻止 tree-shaking

```typescript
// ❌ 阻止 tree-shaking，bundle 体积翻倍
import * as PIXI from 'pixi.js';
const sprite = new PIXI.Sprite();

// ✅ 按需 import
import { Sprite, Graphics, Container } from 'pixi.js';
```

---

### A-7 · `DisplayObject` 基类方法变化

- `zIndex` 设置后需要父容器 `sortableChildren = true` 才生效（v7 也如此，但 v8 更严格）
- `pivot` / `anchor` 行为在部分场景有细微差异
- `getBounds()` 默认行为改变，注意 `skipUpdateTransform` 参数

---

## 类别 B · Vite 工具链特性

### B-1 · HMR 热更新导致 PixiJS 单例残留

**症状**：HMR 更新后画面出现重叠、双倍渲染、事件绑定两次。

**根因**：Vite HMR 替换模块代码，但模块级单例（`let _app`）不随 HMR 清空，旧 Application 实例仍在运行。

**解法**：在单例模块加 HMR dispose 钩子：
```typescript
// src/pixi/core/app.ts
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        destroyPixiApp();
    });
}
```

---

### B-2 · 自定义 GLSL/WGSL shader 文件需要 `?raw` 后缀

PixiJS v8 内置 shader 已编译进 JS，无需额外处理。但若项目自定义了 `.vert` / `.frag` / `.wgsl` 文件：

```typescript
// ❌ Vite 不知道如何处理
import vertSrc from './myShader.vert';

// ✅ 以原始字符串导入
import vertSrc from './myShader.vert?raw';
```

TypeScript 类型声明：
```typescript
// src/vite-env.d.ts
declare module '*.vert?raw' { const src: string; export default src; }
declare module '*.frag?raw' { const src: string; export default src; }
declare module '*.wgsl?raw' { const src: string; export default src; }
```

---

### B-3 · Web Worker 纹理解压（Basis / KTX）需要 Vite worker 配置

PixiJS v8 的 `Assets` 系统对压缩纹理格式（`.basis`、`.ktx2`）使用 Web Worker 解压。Vite 需要配置：

```typescript
// vite.config.ts
worker: { format: 'es' }
```

若不配置，Worker 内的 ESM import 会失败。

---

### B-4 · `import.meta.env` 在 PixiJS 系统模块中不可用

PixiJS 内部不使用 `import.meta.env`，但项目自建的 PixiJS 系统模块（如 `stats.ts`）可以正常使用：
```typescript
if (import.meta.env.DEV) { /* dev only */ }
```

注意：该判断在 production build 时会被静态替换为 `false` 并 tree-shake 掉。

---

## 类别 C · React 集成

### C-1 · PixiJS 对象放入 React state 导致无限重渲染

**症状**：组件高频重渲染，性能崩溃。

**根因**：React state 变化 → 重渲染 → 创建新 PixiJS 对象 → 放入 state → 再次变化……

**解法**：PixiJS 对象（`Application`、`Container`、`Texture`）**只放 `useRef`，永不放 `useState`**：
```typescript
// ❌
const [sprite, setSprite] = useState<Sprite | null>(null);

// ✅
const spriteRef = useRef<Sprite | null>(null);
```

---

### C-2 · `useEffect` 依赖数组包含 PixiJS 对象导致 effect 无限循环

PixiJS 对象每次渲染都是新引用，放入 deps 会导致 effect 每帧执行：
```typescript
// ❌
useEffect(() => { sprite.x = 100; }, [sprite]); // sprite 每次都是新对象

// ✅ 用 ref，不放 deps
useEffect(() => {
    if (spriteRef.current) spriteRef.current.x = 100;
}, []);
```

---

### C-3 · React 卸载时未销毁 PixiJS 资源 → 内存泄漏

```typescript
useEffect(() => {
    const sprite = new Sprite(texture);
    app.stage.addChild(sprite);

    return () => {
        app.stage.removeChild(sprite);
        sprite.destroy();          // ✅ 销毁 DisplayObject
        texture.destroy(true);     // ✅ true = 同时销毁底层 WebGL 纹理
    };
}, []);
```

常见遗漏：Ticker 监听、事件监听、GSAP tween 未 kill。

---

### C-4 · DOM 事件与 PixiJS EventSystem 冲突

当 PixiJS canvas（`position:fixed`）上方浮有 React DOM 元素（`z-index > 0`）时：
- DOM 元素的 `onClick` / `onPointerDown` 会阻止事件冒泡到 canvas
- PixiJS 的 `pointerdown` 不会触发

解法：确保 DOM overlay 元素在不需要接收点击时设置 `pointer-events: none`；只有真正需要交互的 DOM 元素才开启 pointer events。

---

### C-5 · React 组件和 PixiJS Ticker 同时驱动状态导致撕裂

不要在 PixiJS Ticker 回调内直接调用 React setState：
```typescript
// ❌ Ticker 每帧 60fps 触发 setState → 触发 React 重渲染
app.ticker.add(() => {
    setScore(score + 1); // 性能灾难
});

// ✅ 游戏数据写 Zustand，React 以较低频率读取
app.ticker.add(() => {
    useGameStore.getState().incrementScore(); // 直接写 store，不触发渲染
});
```

---

## 类别 D · Assets 系统

### D-1 · 并发加载同一资源触发重复请求

`Assets.load()` 自动去重，但仅限完全相同的 URL 字符串：
```typescript
// 这两个是不同的 key，会加载两次
await Assets.load('image.png');
await Assets.load('./image.png');
```

**最佳实践**：用 `Assets.add()` 预先注册 alias，统一通过 alias 加载：
```typescript
Assets.add({ alias: 'hero', src: 'sprites/hero.png' });
const texture = await Assets.load('hero');
```

---

### D-2 · `Assets.load()` 在组件 unmount 后 resolve → 操作已销毁对象

```typescript
useEffect(() => {
    let cancelled = false;
    Assets.load('image.png').then(texture => {
        if (cancelled) return; // ✅ 检查组件是否还存活
        const sprite = new Sprite(texture);
        app.stage.addChild(sprite);
    });
    return () => { cancelled = true; };
}, []);
```

---

### D-3 · 纹理缓存不主动清理 → 长时间运行内存增长

```typescript
// 卸载场景时主动卸载不再需要的资源
await Assets.unload('scene1-bundle');
// 或清空全部缓存（谨慎）
Assets.cache.reset();
```

---

## 类别 E · pixi-viewport 特有问题

### E-1 · 初始化时必须传 `events` 参数

```typescript
// ❌ 不传 events → 指针事件无效
const viewport = new Viewport({ screenWidth, screenHeight, worldWidth, worldHeight });

// ✅
const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
    events: app.renderer.events,  // ← 必须
});
```

---

### E-2 · `wheel` 事件的 passive listener 警告

浏览器默认把 `wheel` 设为 passive，阻止 `preventDefault()` → 控制台警告。

```typescript
// pixi-viewport 内置 wheel 插件会自动处理
// 若自定义 wheel handler：
canvas.addEventListener('wheel', handler, { passive: false });
```

---

### E-3 · `clamp` 在 `moveCenter` 之前调用导致初始位置被限制

```typescript
// ✅ 正确顺序
viewport.drag().decelerate();
viewport.clamp({ ... });         // 先设边界
viewport.clampZoom({ ... });     // 先设缩放范围
viewport.moveCenter(x, y);       // 最后设初始位置
```

---

### E-4 · `decelerate` 与自定义 wheel handler 冲突

若同时使用 `viewport.decelerate()` 插件和自定义 wheel 处理，需要禁用 viewport 内置 wheel 插件：

```typescript
viewport.plugins.remove('wheel'); // 移除内置 wheel 插件
// 然后接管自定义 wheel 逻辑
```

---

## 类别 F · TypeScript 类型

### F-1 · v8 中 `PIXI` 命名空间类型仍可用但不推荐

```typescript
// 可以用但 tree-shaking 无效
import * as PIXI from 'pixi.js';
type MySprite = PIXI.Sprite;

// 推荐
import type { Sprite } from 'pixi.js';
```

---

### F-2 · `PointData` vs `Point` vs `ObservablePoint`

- `PointData`：只读接口 `{ x: number, y: number }`，适合参数类型
- `Point`：可变 class，有 `set()` 方法
- `ObservablePoint`：`position` / `scale` / `pivot` 等属性的实际类型，变化时触发回调

函数签名用 `PointData`，不要用 `Point`（更宽松，`{ x, y }` 对象直接传）。

---

### F-3 · `Container` 泛型参数在 v8 中改变

```typescript
// v7
class MyContainer extends Container {}

// v8 - 如需自定义子元素类型
class MyContainer extends Container<Sprite> {}
```

---

## 类别 G · 性能陷阱

### G-1 · 每帧重建 `Graphics` 对象

```typescript
// ❌ 极慢：每帧创建新 Graphics 并上传 GPU
app.ticker.add(() => {
    const g = new Graphics();
    g.circle(x, y, r).fill(0xff0000);
    stage.addChild(g);
});

// ✅ 复用 Graphics，只在数据变化时重绘
const g = new Graphics();
stage.addChild(g);
app.ticker.add(() => {
    g.clear();
    g.circle(x, y, r).fill(0xff0000);
});

// ✅✅ 更好：如果形状不变，渲染为 Texture 后复用
const texture = app.renderer.generateTexture(g);
const sprite = new Sprite(texture);
```

---

### G-2 · 大量同类 Sprite 不使用 `ParticleContainer`

100+ 相同纹理的 Sprite（粒子、子弹、网格点）应使用 `ParticleContainer`：

```typescript
// ✅ 专为大量同纹理 Sprite 优化，单 draw call
const particles = new ParticleContainer(10000, {
    position: true, scale: true, alpha: true,
});
```

限制：不支持 tint 以外的 filter，不支持 mask，子元素只能是 Sprite。

---

### G-3 · `sortableChildren` 默认为 false，开启有性能代价

```typescript
container.sortableChildren = true;  // 每帧排序，仅在需要 zIndex 时开启
```

若只需要少量元素在最顶层，用 `container.setChildIndex()` 代替。

---

## 类别 H · WebGL Context 管理

### H-1 · 浏览器 WebGL context 数量上限

Chrome 默认限制每个页面约 **8-16 个** WebGL context，每个 `<canvas>` 只能有 **1 个**。

超限时最旧的 context 被强制丢失（`contextlost` 事件）。监听并处理：

```typescript
canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // 允许恢复
    console.warn('WebGL context lost');
}, false);

canvas.addEventListener('webglcontextrestored', () => {
    reinitPixiApp(canvas, readAntialias());
}, false);
```

---

### H-2 · iOS Safari WebGL context 极易被回收

iOS 在 tab 切换、内存压力下会主动丢失 WebGL context。必须处理 `contextlost` + `contextrestored`，否则用户切 tab 回来看到白屏。

---

## 类别 I · HTMLText / 文字渲染

### I-1 · 字体必须在 `HTMLText` 创建前加载完毕

```typescript
// ❌ 字体还未加载，使用 fallback 字体渲染
const text = new HTMLText({ text: '...' });

// ✅ 等待字体加载
await document.fonts.ready;
const text = new HTMLText({ text: '...' });
```

或用 `Assets.load()` 加载字体文件（PixiJS v8 支持）：
```typescript
await Assets.load({ src: 'fonts/MyFont.woff2', data: { family: 'MyFont' } });
```

---

### I-2 · `HTMLText` 每个实例都是独立 canvas 纹理，数量多时性能差

100+ 个 `HTMLText` 会创建 100+ 个 canvas 元素用于纹理生成。考虑使用 `BitmapText`（预烘焙字形集）替代：

```typescript
// 预生成 BitmapFont
await BitmapFont.install({ name: 'MyFont', style: { ... }, chars: BitmapFont.ASCII });
const text = new BitmapText({ text: 'Hello', style: { fontFamily: 'MyFont' } });
```

---

## 快速排查清单

碰到问题时按顺序核查：

**Vite 配置**
- [ ] `optimizeDeps.exclude: ['pixi.js']`
- [ ] `optimizeDeps.include` 包含所有 CJS 传递依赖
- [ ] 自定义 shader 文件用 `?raw` 后缀

**React 集成**
- [ ] `main.tsx` **没有** `<React.StrictMode>`
- [ ] PixiJS 对象只放 `useRef`，不放 `useState`
- [ ] `useEffect` cleanup 销毁了所有 PixiJS 资源 + 取消所有监听
- [ ] Ticker 回调内不直接调用 React setState

**PixiJS 初始化**
- [ ] `app.init()` 有 `await`
- [ ] `buildPixiConfig` 传了 `width: window.innerWidth, height: window.innerHeight`
- [ ] `app.destroy()` 有 `await`（v8 是 async）
- [ ] antialias 切换用 `localStorage + reload`，不做 canvas 原地 reinit

**pixi-viewport**
- [ ] `Viewport` 构造函数传了 `events: app.renderer.events`
- [ ] 初始化顺序：drag → decelerate → clamp → clampZoom → moveCenter

**Assets / 纹理**
- [ ] `Assets.load()` 有 `await`，不依赖同步返回
- [ ] 组件 unmount 时检查 `cancelled` flag 防止操作已销毁对象

---

## 版本信息（本项目已验证组合）

| 包 | 版本 |
|---|---|
| `pixi.js` | 8.18.1 |
| `pixi-viewport` | 6.0.3（原生支持 pixi v8）|
| `pixi-filters` | 6.1.5 |
| `pixi-stats` | 5.1.7（非 `@pixi/stats`）|
| `gsap` | 3.15.0 |
| `vite` | 6.4.2 |
| `react` | 18.x |
| `typescript` | 5.x |
