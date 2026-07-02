# ADR-003: 文字分层——Pixi Text + React DOM 混合,禁用 BitmapText

> 状态: 现行 · 类型: 决策 · 更新: 2026-07-03
> 📖 人话: 游戏里的文字分两种画法:跟着卡片跑的短文字用 Pixi,大段阅读内容用网页层。为什么这么分、为什么有一个 API 被全面禁用。

## 背景

游戏文本量大、语种极多(CJK、将来可能 RTL)。纯 Pixi 方案文字能力弱;当初 React 卡顿的根源是让它驱动每帧 60 次的拖拽更新,而非渲染文字慢。

## 决策

按"文字的角色"分层:世界内短文字(卡片标题等)用 Pixi `Text`;阅读型长文本与一切输入框用 React DOM 覆盖层;`BitmapText` 全面禁用。细则见 [text-guidelines.md](../refactor-pixi/text-guidelines.md)。

## 理由

- Pixi `Text` 由浏览器排版再光栅化,任意语言 shaping 正确,且随相机变换零同步成本
- 阅读型内容需要富文本/选中复制/IME/无障碍,全是 DOM 主场;其更新频率是人的阅读节奏,React 毫无压力
- `BitmapText` 依赖预烘焙字形图集:中文数千常用字撑爆图集,阿拉伯连写原理上无法实现

## 后果

- 高频交互(拖拽/平移/缩放)必须全部留在 Pixi 侧,DOM 层不做逐元素相机跟随
- roadmap Stage G 原定的 HTMLText 降级为"仅确需富文本内联样式时使用"
- 界面型 UI(Dock/Library,Stage N)优先评估 DOM 实现,不默认搬进 Pixi
