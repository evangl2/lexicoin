# Lexicoin · PixiJS v8 重构

## 当前状态

main 分支正在执行**先卸载、再重建**策略：

1. 一次性卸载所有游戏 UI（仅保留 DevConsole 作为系统入口）
2. 从零搭建 PixiJS v8 画布（`src/pixi/`）
3. 把游戏内容增量接回新画布

游戏在重写期间不可玩。数据/逻辑层（`src/core/`、`src/modules/`、`src/schemas/`）完整保留，等于"打地基再造楼"。

## 文档

- [`roadmap.md`](./roadmap.md) — 当前 Stage 路线图
- [`archive/`](./archive/) — 已废弃的 feature-flag 双系统并行方案及其 Phase 计划，仅作参考

## 历史背景

最初的迁移方案是"双系统并行 + feature flag 切换"，文档在 `archive/`。该方案需要长期维护两套 UI 直到 Phase 11 清理，认知负担和资源占用都偏高。改用物理 import 切断后路径更短，但代价是中间一段时间游戏不可玩。

# Lexicoin · 卸载游戏内容 + PixiJS v8 重启方案

## Context

当前 `docs/refactor-pixi/` 下的方案是 **feature-flag 双系统并行迁移**——旧 DOM/HTML5 Canvas 与新 PixiJS 同时挂载，靠 `usePixiCanvas` flag 切换，最终在 Phase 11 清理旧系统。

用户决定改换思路：**先一次性卸载所有 UI（除 DevConsole）**，让 GameShell 变成空壳，然后从零搭建 PixiJS v8 画布，再把游戏内容一点点接回去。这样做的收益：

- 没有双系统并行的认知负担，不需要 feature flag
- 旧 React 组件不再"挡路"，可以彻底重新设计交互
- 所有数据/逻辑层（Zustand store、Dexie、services、modules、schemas）完整保留，等于"打地基再造楼"
- main 上推进，过程中接受一段时间游戏不可玩

最终目标和原方案一致——PixiJS v8 + pixi-viewport + GSAP 的画布世界，但路径更短更直接。

---

## 用户已确认的关键决策

| 项 | 决策 |
|---|---|
| 卸载范围 | 全部 UI 组件（包括 Dock、HUD、Overlay、SceneManager、Canvas、DragLayer、NotificationSystem），仅保留 DevConsole |
| 分支策略 | 直接在 main 上推进（不开 pixi-rewrite 分支） |
| 数据层 | `src/core/store/`、`src/core/services/`、`src/modules/`、`src/core/storage/`、`src/schemas/`、`src/types/` 全部保留不动 |
| 旧 phase 计划 | 归档到 `docs/refactor-pixi/archive/` 作参考，不删 |

---

## 阶段划分

### Stage A · 卸载 + 归档（一次性，可回滚）

**目标：** `npm run dev` 启动后浏览器是黑屏 + 右下角 DevConsole 可用，store/services 全部正常运转，控制台无 runtime 错误。

#### A1. 归档旧方案文档

- `mkdir docs/refactor-pixi/archive/`
- 把以下文件移入 archive：
  - `docs/refactor-pixi/pixi_migration_plan.md`
  - `docs/refactor-pixi/phase01-plan.md` ~ `phase07-plan.md`
- 在 `docs/refactor-pixi/` 下新建 `README.md`，说明历史方案已归档，新方案另开（指向后续 roadmap 文件）

#### A2. 改写 `src/app/App.tsx`（**关键文件**）

当前 273 行的 GameShell 完全替换为最小骨架：

```tsx
import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";

function GameShell() {
  // TODO(pixi): PixiRoot 将在 Stage C 接入此处
  return (
    <div
      className="w-full h-screen bg-black overflow-hidden relative"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export default function App() {
  return (
    <PersonaProvider>
      <AudioProvider>
        <GameShell />
      </AudioProvider>
    </PersonaProvider>
  );
}
```

保留要点：
- `PersonaProvider` / `AudioProvider`：保留。它们是数据层，DevConsole 切 Persona 仍依赖
- 删除 `DndProvider`：新方案用 PixiJS pointer events，不再用 react-dnd
- 删除 `CardPersonaVarsInjector`：CSS 变量注入针对旧 DOM 卡片，PixiJS 不需要（保留文件待将来评估）
- 删除所有 `useCanvasCamera` / `useCardManager` / `useDeviceManager` / `useCardGrouping` / `useGrimoireExpiry` / `useGameInteractions` 调用——hook 文件保留在磁盘上，仅在 GameShell 中不再调用

#### A3. 改写 `src/App.tsx`

按用户决策"全部 UI 除 DevConsole"——也卸载 `NotificationSystem`：

```tsx
return (
  <div className="app-container">
    <CanvasApp />
    <DevConsole />
  </div>
);
```

`NotificationSystem` 文件保留，仅不挂载（后续如需可重新接入）。

#### A4. **不删除**任何源文件

所有 `src/app/components/ui/canvas/`、`src/app/components/ui/shell/`、`src/app/components/ui/grimoire/`、`src/app/components/ui/system/`、`src/app/components/ui/card/`、`src/app/components/ui/visual/`、`src/app/components/ui/text/`、`src/app/hooks/` 下的文件原地保留。

理由：
- 后续把功能接回 PixiJS 时这些是参考实现（动画参数、状态机、坐标系、命名约定）
- 一次性删除会丢失大量隐性知识（comment、edge case 处理）
- 等 PixiJS 迁移完成进入"清理 Stage"再统一删除（对应原方案 Phase 11）

TypeScript 报错：移除 `import` 后，未引用的组件/hook 文件不会被 build 触及，原有 `noUncheckedIndexedAccess` 报错（用户记忆中已知的 `usePhysics.ts`、`useCardGrouping.ts`）也不会再编译。如出现 dead-import 警告，单独修。

#### A5. 验证

- `npm run dev` 黑屏 + DevConsole 右下角可见、可切 tab、可切 Persona、可改 store
- 控制台无 runtime 错误（允许有 unused import warning）
- `initializeModules()` 仍正常打印 `✅ All modules initialized successfully`
- Dexie / Zustand persist 数据完整未被破坏

#### A6. Commit

`git commit -m "refactor: unmount all game UI, keep DevConsole as the sole entry point"` —— 这是 main 上的回滚锚点，PixiJS 工作从此开始。

---

### Stage B · PixiJS 基础设施

**目标：** 安装依赖，建立 `src/pixi/` 目录，挂载一个全屏空白 Pixi canvas。

#### B1. 依赖安装

```bash
npm install pixi.js@^8 gsap@^3.12 pixi-viewport pixi-filters
npm install -D @pixi/stats
```

> **必须先验证** pixi-viewport 是否兼容 pixi.js v8：`npm info pixi-viewport peerDependencies`。若官方未支持 v8，记录处理方案（社区 fork / 临时移除 / 自实现 viewport）后再继续。

#### B2. 目录结构（参考原 phase01 设计，已被验证合理）

```
src/pixi/
├── core/
│   ├── app.ts        # Application 单例：getPixiApp / initPixiApp / destroyPixiApp / reinitPixiApp
│   ├── resize.ts     # window resize handler
│   └── stats.ts      # @pixi/stats dev overlay
├── systems/          # （Stage D+ 填充）CameraSystem 等
├── bridges/          # （Stage E+ 填充）persona-bridge / card-bridge 等
├── hooks/
│   └── usePixiApp.ts # React 薄封装
└── config.ts         # buildPixiConfig
```

#### B3. PixiJS Application 配置（沿用原 phase01 决策）

```ts
{
  preference: 'webgl',
  antialias: true,        // 玩家可在 DevConsole 切换；切换需 reinit renderer
  resolution: Math.min(devicePixelRatio, 2),
  autoDensity: true,
  powerPreference: 'high-performance',
  backgroundAlpha: 0,
  preserveDrawingBuffer: false,
  hello: false,
}
```

#### B4. Feature flag（简化版）

`src/core/store/slices/featureFlags.ts` 加一个 `antialiasEnabled: boolean`（默认 true），用于 Stage B 之后的玩家切换。**不再需要** `usePixiCanvas` flag——既然旧系统已卸载，没东西可切。

DevConsole Cheat tab 加 antialias toggle。

---

### Stage C · 挂载 PixiRoot

**目标：** 浏览器看到 PixiJS 渲染的 bgVoid 深色背景填满屏幕，PixiJS Stats 在右上角（dev only）。

#### C1. 新建 `src/app/components/ui/canvas/PixiRoot.tsx`

参考 `docs/refactor-pixi/archive/phase01-plan.md` 第 214-271 行的实现，去掉双系统判断（不再有 `usePixiCanvas` flag）。

#### C2. 在 `src/app/App.tsx` 的 GameShell 内挂载 `<PixiRoot />`

替换 Stage A2 留下的 TODO 注释。

#### C3. 验证清单

- 黑屏变成 PixiJS bgVoid 色（`0x0a0a0f` 占位，等 Persona Bridge 接入后改为动态读取）
- 右上角 PixiJS Stats overlay
- 窗口 resize 无黑边
- DevConsole 切 antialias → renderer 重建，视觉变化可见
- DevConsole 切 Persona → 当前还看不出变化（Persona Bridge 还没接），但不报错

#### C4. Commit

`git commit -m "feat(pixi): mount blank PixiJS Application as new canvas root"`

---

### Stage D 及之后 · 增量接入功能

到这里"先卸载，再重启"的核心动作完成。**Stage D 起的内容不在本计划详细写出**——每个 Stage 单独开一次规划对话，对应到原方案的 Phase 1-10：

| 新 Stage | 对应原 Phase | 内容简述 |
|---|---|---|
| D | Phase 1 | Camera 系统（pixi-viewport，pan + zoom + clamp） |
| E | Phase 2 | Persona Bridge + 背景层（IBackground 接口） |
| F | Phase 3 | 卡片 Sprite（占位色块、坐标桥、Variant Stack、LOD） |
| G | Phase 4 | Hover 交互 + HTMLText 文字层 |
| H | Phase 5 | InspectOverlay（DOM 检视态） |
| I | Phase 6 | 拖拽系统（Pointer events + Edge Pan） |
| J | Phase 7 | 落点检测（Grid Snap + 设备碰撞） |
| K | Phase 8 | 真实卡片视觉（SVG → Texture） |
| L | Phase 9 | 画布动画（GSAP + 粒子） |
| M | Phase 10 | 设备双态（SynthesisCircle / Grimoire 重设计） |
| N | （新增）| Dock/Library/DeckRepository 重新接入（旧方案未涵盖） |
| O | Phase 11 | 删除磁盘上保留的旧组件文件 |

新 roadmap 在 Stage A 完成后写入 `docs/refactor-pixi/roadmap.md`。

---

## 关键文件路径

**Stage A 修改（仅这些）：**
- `src/app/App.tsx` —— 完全替换为最小骨架
- `src/App.tsx` —— 移除 NotificationSystem 挂载
- `docs/refactor-pixi/*.md` —— 移到 `archive/` 子目录
- `docs/refactor-pixi/README.md` —— 新建，说明归档
- `docs/refactor-pixi/roadmap.md` —— 新建，写新 Stage 列表

**Stage B 新建：**
- `src/pixi/config.ts`
- `src/pixi/core/app.ts`
- `src/pixi/core/resize.ts`
- `src/pixi/core/stats.ts`
- `src/pixi/hooks/usePixiApp.ts`
- `src/core/store/slices/featureFlags.ts` —— 加 `antialiasEnabled`
- `src/app/components/system/DevConsole.tsx` —— 加 antialias toggle

**Stage C 新建：**
- `src/app/components/ui/canvas/PixiRoot.tsx`
- 修改 `src/app/App.tsx` 挂载 PixiRoot

**保留不动（数据/逻辑层）：**
- `src/core/store/` 全部
- `src/core/services/` 全部
- `src/core/storage/` 全部
- `src/core/init/moduleInit.ts`
- `src/modules/` 全部
- `src/schemas/` 全部
- `src/types/` 全部
- `src/config/` 全部
- `src/app/context/PersonaContext.tsx` + `AudioContext.tsx`
- `src/app/components/system/DevConsole.tsx`（仅小修：加 toggle）

**保留但暂不挂载（磁盘上原地放着）：**
- `src/app/components/ui/canvas/Canvas.tsx`、`CanvasContent.tsx`、`DragLayer.tsx`
- `src/app/components/ui/shell/SceneManager.tsx`、`Dock.tsx`、`ProgressionHUD.tsx`、`DeckRepository.tsx`、`ConfigMenu.tsx`、`SkinSwitcher.tsx`、`ImageWithFallback.tsx`
- `src/app/components/ui/card/` 全部
- `src/app/components/ui/visual/` 全部
- `src/app/components/ui/text/` 全部
- `src/app/components/ui/grimoire/`（如存在）
- `src/app/components/ui/system/LevelUpOverlay.tsx`
- `src/app/components/system/NotificationSystem.tsx`
- `src/app/components/persona/`
- `src/app/hooks/` 全部
- `src/app/utils/` 全部

这些将在 Stage O（最终清理）一次性删除，期间仅作参考。

---

## 验证（Stage A 结束时）

1. `npm run dev` —— 浏览器黑屏 + 右下角 DevConsole 可见
2. DevConsole 切 Cheat tab、切 Persona、改 store —— 全部响应正常
3. `initializeModules()` 在控制台打印成功
4. 浏览器 IndexedDB（Dexie）数据完整
5. `npm run build` —— 通过（允许 unused-import warning，但不能有错）
6. `git diff --stat` 显示：`src/app/App.tsx`、`src/App.tsx` 被大幅简化；新增 `docs/refactor-pixi/archive/`；其他文件未动

## 验证（Stage C 结束时）

1. 浏览器看到 PixiJS bgVoid 深色画布填满屏幕
2. 右上角 PixiJS Stats（FPS、render time）实时更新
3. 窗口 resize 无黑边、Stats 跟随更新
4. DevConsole antialias toggle 生效（renderer 重建后视觉差异）
5. 控制台无 PixiJS 警告（除 dev-mode 信息）
6. 关闭 dev server、`npm run build` 通过

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Stage A 后磁盘上保留了大量 unused 文件，可能产生 build warning | 接受 warning。`npm run build` 不应有错。如果 strict 模式禁止 warning，临时 `// @ts-ignore` 或 tsconfig 关 `noUnusedLocals`（仅 unused 文件层级），后续 Stage O 删除时一并恢复 |
| pixi-viewport 不兼容 pixi.js v8 | Stage B1 第一步验证。若不兼容，Stage D（Camera）需要换实现策略，但不影响 Stage A-C |
| main 上长期处于"游戏不可玩"状态 | 用户已接受。可在 README 顶部加一个 banner："正在 PixiJS v8 重写中，main 暂不可玩" |
| Persona/Audio Provider 在没有任何子组件消费时是否报错 | 这两个 Provider 是无条件提供 context，没有消费者时静默不影响 |
| DevConsole 内部依赖某些已卸载组件的类型/函数 | Stage A 实施时如发现，按需保留依赖文件（仅删除挂载，不删类型） |