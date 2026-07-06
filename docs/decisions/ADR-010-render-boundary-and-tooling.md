# ADR-010: 渲染边界三律与工具选型冻结

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-06
> 📖 人话: Pixi 和 React DOM 各管什么、在哪握手,立三条法;HTMLText 与 BitmapText 一起全面禁用;渲染相关不再引新库(@pixi/react、第二动画引擎、拖拽库都不要)。

## 背景

2026-07-06 技术栈讨论(作者 × Claude)确认:渲染分工"视觉归 Pixi、文字与界面型 UI 归 React DOM"即 ADR-001/ADR-003 的现行架构,方向不变。讨论识别出四个真难点(世界锚定 DOM、层级无法穿插、跨界拖拽、双渲染时钟),对策不是技术硬扛,而是把边界立成明文规则。作者同时定案:**HTMLText 全面禁用**。

## 决策

### 1. 渲染边界三律

> **律一:世界归 Pixi,屏幕归 DOM。** 判据唯一——该元素随相机移动吗?随,Pixi;不随,DOM。
> **律二:DOM 永不逐帧跟随世界物体。** 唯一豁免:检视态(Stage H)的那一张卡,且用单容器矩阵同步(text-guidelines §DOM 规则 4)。
> **律三:两界只在指定"关口"互通,每个关口一个专门的桥,不做通用跨界机制。** 已知关口:① Dock/界面 → 画布的**拖入桥**(DOM pointerdown 起手 → 全局幽灵元素 → 越界后 Pixi 接管落点预览 → screen→world 换算落子);② 卡片 → 检视态的**展开桥**。新增关口需先记录在案。

### 2. HTMLText 全面禁用

与 BitmapText 同级禁令。理由:HTMLText 每实例经 SVG foreignObject 光栅化,**每段唯一文本一张纹理**,乘以本项目的多语言大文本量即纹理内存炸弹,且开销高于普通 `Text`。富文本/内联样式需求一律走 DOM 覆盖层(ADR-003 立场)。世界内短文字只用 Pixi `Text`。

### 3. 工具选型冻结(渲染相关不再引新库)

| 禁止引入 | 理由 | 替代 |
|---|---|---|
| `@pixi/react` | 项目已是命令式 systems 架构;reconciler 开销 + 版本耦合,第三种范式徒增混乱 | 维持"React 只挂 PixiRoot,Zustand 为界"模式 |
| 第二动画运行时(Lottie/Rive/Spine 等) | 每多一个运行时 = 一种新资产格式 + 一层移动端债 | GSAP(已装)+ Totem 动画清单(ADR-009)已覆盖全部需求 |
| 拖拽库(react-dnd 的任何替代品) | 核心拖拽在 Pixi 内部(Pointer events,Stage I);跨界拖拽没有任何现成库支持 DOM↔canvas | 律三的自写拖入桥 |
| culling/空间索引库 | 已有 AABBSystem 可复用 | 视口剔除基于 AABBSystem 实现(Stage F 设计输入) |

### 4. 双渲染时钟隔离(重申为规则)

React 永不参与每帧更新:Pixi 系统经 `store.subscribe`(transient,不走 React hook)读高频状态;React 只订阅低频 UI 状态(面板开关、选中项)。`PixiPersonaBridge` 为参考实现。

## 理由

- 三律把"混合渲染的已知深坑"(逐帧同步 DOM、层级穿插幻想、通用跨界抽象)在设计层封死,代价是纪律而非性能;
- 律二的豁免精确到"一个元素":一个元素每帧同步廉价,一百个是灾难——当初 React 渲染层卡顿的病根正在于此;
- 层级无法穿插不是缺陷而是设计语言:DOM 出场即"仪式时刻"(检视/结算/面板),罩在世界之上理所应当。

## 后果

- [text-guidelines.md](../refactor-pixi/text-guidelines.md) 禁令区与 Stage G 对应条已同步(HTMLText 由"评估后慎用"升格为禁用);
- CLAUDE.md 铁律四 + AGENTS.md + `.agents/rules/` 三处挂载点已同步禁令;
- roadmap Stage G 措辞更新(不再提 HTMLText);
- Stage F 坐标契约、Stage I 拖拽系统、Stage N UI 回归的规划对话必须引用本 ADR;
- 跨界拖入桥是 Stage I/N 前置工作项,自写不引库。
