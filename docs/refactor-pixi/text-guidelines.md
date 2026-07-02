# 文字分层规范(多语言 · 大文本量)

> 状态: 现行 · 类型: 指南 · 更新: 2026-07-03
> 📖 人话: 游戏里哪种文字用哪种技术画、各自的注意事项。决策理由见 [ADR-003](../decisions/ADR-003-text-layering.md)。

本游戏文字含量高、语种极多(含 CJK、将来可能含 RTL 文种)。文字渲染按**文字的角色**分层,不按"是不是文字"一刀切。本规范是项目铁律(见根目录 CLAUDE.md 铁律四),Stage G(文字层)和 Stage H(InspectOverlay)的实现必须遵循。

## 分层判断标准

问一个问题:**这段文字是"世界里的物体",还是"阅读的内容"?**

| 角色 | 例子 | 实现 | 理由 |
|---|---|---|---|
| 世界内短文字 | 卡片标题、设备名、简短标签、计数徽章 | Pixi `Text` | 随相机变换零同步问题;浏览器排版,任何语言 shaping 正确 |
| 阅读型内容 | 词条释义、例句、flavor text、图书馆、设置界面 | React DOM 覆盖层 | 富文本 / RTL 混排 / 选中复制 / 无障碍 / IME 全是 DOM 主场 |
| 文字输入 | 任何输入框 | DOM(无例外) | IME(中文/日文输入法)只能在 DOM 里正确工作 |

## 禁令

- **`BitmapText` 全面禁用。** 它依赖预烘焙字形图集:中文常用字数千个会撑爆图集,阿拉伯文连写(shaping)在原理上无法实现。纯数字/拉丁字母计数器也不要用——为省这点性能引入双轨字体管线不值得。
- **DOM 不做逐元素跟随相机。** 几百个 DOM 元素每帧同步位置必卡(这正是当初 React 卡顿的根源)。如确需世界锚定的 DOM 内容,见下文"单容器矩阵同步"。

## Pixi `Text` 使用纪律

普通 `Text` 是把排版交给浏览器再画成纹理,质量与 DOM 一致,但**每段文字占一张纹理**,所以:

1. **短、少变。** 只放标题级短文字;不要每帧改 `text` 内容(每次修改都触发重新光栅化)
2. **销毁要彻底。** 卡片销毁时 `text.destroy(true)` 释放纹理,否则显存泄漏
3. **样式对象复用。** `TextStyle` 实例按用途共享,不要每张卡片 new 一个
4. **字体先加载后使用。** 自定义字体(`src/assets/fonts/`)必须等 `document.fonts.ready`(或 `Assets.load` 字体)之后再创建 Text,否则光栅化时字体未就绪,渲染成回退字体
5. **resolution 跟随设备。** 创建时设 `resolution: min(devicePixelRatio, 2)`,与 renderer 一致,否则高分屏发虚

## React DOM 覆盖层规则

1. **层级结构:** DOM 层整体在 canvas 之上(不能与单个 Sprite 穿插)。设计上,阅读面板出现时就是"最上层检视态",与 Stage H 设计一致
2. **输入路由:** 覆盖层根节点 `pointer-events: none`,只有面板本身 `pointer-events: auto`,否则会挡住 Pixi 的拖拽/平移
3. **更新频率:** React 只在"打开/关闭/换内容"时工作(人的阅读节奏)。**高频交互(拖拽、平移、缩放)一律留在 Pixi**——当初 React 卡顿是因为让它驱动每帧 60 次的更新,不是它渲染文字慢
4. **单容器矩阵同步(仅在确需世界锚定 DOM 时):** 整个覆盖层只有一个容器 div,每帧把 viewport 的 x/y/scale 同步为该 div 的 CSS `transform`。变换一个元素而非 N 个,且与 Pixi 用同一矩阵所以不漂移。能不用就不用——大多数阅读发生在相机静止时,直接居中弹层即可

## 与 roadmap 的对应

- Stage G(Hover + 文字层):卡片标题用 Pixi `Text`(roadmap 原写 HTMLText,按本规范评估:HTMLText 每实例走 SVG foreignObject 光栅化,开销高于 Text,仅在确需富文本内联样式时使用)
- Stage H(InspectOverlay):React DOM 检视态,本规范第二层的参考实现
- Stage N(Dock/Library 等):界面型 UI 优先评估 DOM 实现,不默认搬进 Pixi
