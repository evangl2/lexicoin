# Tailwind → 原生 CSS 翻译对照表

> **用途**：Phase 1 写作 `base.css` / `default.css` 的依据。
> **来源**：`CardVisual.tsx` + `CompactCardVisual.tsx` 全量扫描。
> **约定**：
> - Shadow 内部全部使用原生 CSS；Tailwind class 不穿越 shadow 边界。
> - `var(--card-*)` 变量由 `CardPersonaVarsInjector` 注入到 light DOM，可穿透 shadow 边界使用。
> - 动态 class（如 `getTitleClass` 的结果）在 shadow 内改用 CSS data-attribute / `:host([...])` 选择器驱动。

---

## 一、CardVisual.tsx — 正反面主结构

### 1.1 Drop-target overlay（`isOver` 时渲染）
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute` | `position: absolute;` |
| `inset-[-10px]` | `inset: -10px;` |
| `rounded-[30px]` | `border-radius: 30px;` |
| `border-2` | `border-width: 2px; border-style: solid;` |
| `border-dashed` | `border-style: dashed;` |
| `z-[60]` | `z-index: 60;` |
| `animate-pulse` | `animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;` |
| `pointer-events-none` | `pointer-events: none;` |

> Shadow 内 `:host([is-over]) [part=drop-target-ring]` 响应

---

### 1.2 Hover glow layer（`.group-hover:opacity-100`）
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute` | `position: absolute;` |
| `-inset-[3px]` | `inset: -3px;` |
| `rounded-[22px]` | `border-radius: 22px;` |
| `opacity-0` | `opacity: 0;` |
| `group-hover:opacity-100` | `:host(:hover) [part=hover-glow] { opacity: 1; }` |
| `transition-opacity` | `transition: opacity;` |
| `duration-500` | `transition-duration: 500ms;` |

---

### 1.3 Flip wrapper（`flipWrapperRef`）
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative` | `position: relative;` |
| `w-full` | `width: 100%;` |
| `h-full` | `height: 100%;` |

---

### 1.4 Front face
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute` | `position: absolute;` |
| `inset-0` | `inset: 0;` |
| `overflow-hidden` | `overflow: hidden;` |
| `flex` | `display: flex;` |
| `flex-col` | `flex-direction: column;` |
| `isolate` | `isolation: isolate;` |
| `antialiased` | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` |

> `borderRadius`、`background`、`backfaceVisibility` 通过 `var(--card-radius)` 等 CSS 变量 + `:host([is-active])` 响应

---

### 1.5 Outer border overlay（两层）
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0` | `position: absolute; inset: 0;` |
| `pointer-events-none` | `pointer-events: none;` |
| `z-50` | `z-index: 50;` |
| `border-[2px]` | `border: 2px solid;` |
| `rounded-[inherit]` | `border-radius: inherit;` |
| `absolute inset-[4px]` | `position: absolute; inset: 4px;` |
| `border-[1px]` | `border: 1px solid;` |

---

### 1.6 Front — Header section
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative z-30` | `position: relative; z-index: 30;` |
| `w-full h-[15%]` | `width: 100%; height: 15%;` |
| `flex items-center justify-center` | `display: flex; align-items: center; justify-content: center;` |
| `px-5 pt-3` | `padding-left: 1.25rem; padding-right: 1.25rem; padding-top: 0.75rem;` |

---

### 1.7 Front — Visual section
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative z-20` | `position: relative; z-index: 20;` |
| `w-full h-[55%]` | `width: 100%; height: 55%;` |
| `flex items-center justify-center` | `display: flex; align-items: center; justify-content: center;` |
| `px-4 pt-0 pb-0` | `padding: 0 1rem;` |
| `-translate-y-2` | `transform: translateY(-0.5rem);` |
| `perspective: 1000px` (inline) | `perspective: 1000px;` |

---

### 1.8 Front — Divider container
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute -bottom-5` | `position: absolute; bottom: -1.25rem;` |
| `w-full` | `width: 100%;` |
| `px-12` | `padding-left: 3rem; padding-right: 3rem;` |
| `opacity-80` | `opacity: 0.8;` |

---

### 1.9 Front — Text section
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative z-30` | `position: relative; z-index: 30;` |
| `h-[30%]` | `height: 30%;` |
| `flex flex-col items-center justify-start` | `display: flex; flex-direction: column; align-items: center; justify-content: flex-start;` |
| `px-4 pt-0` | `padding-left: 1rem; padding-right: 1rem; padding-top: 0;` |
| `text-center` | `text-align: center;` |

---

### 1.10 Front — Noise texture overlay
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0` | `position: absolute; inset: 0;` |
| `opacity-[0.04]` | `opacity: 0.04;` |
| `pointer-events-none z-10` | `pointer-events: none; z-index: 10;` |
| `mix-blend-overlay` | `mix-blend-mode: overlay;` |

---

### 1.11 Front — Glare layer（Framer Motion `motion.div`）
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0` | `position: absolute; inset: 0;` |
| `z-40` | `z-index: 40;` |
| `pointer-events-none` | `pointer-events: none;` |
| `mix-blend-plus-lighter` | `mix-blend-mode: plus-lighter;` |

> `background` 和 `opacity` 由 Framer MotionValue 驱动，通过 CSS 自定义属性 `--glare-opacity` / `--glare-bg` 传入

---

### 1.12 Back face
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0` | `position: absolute; inset: 0;` |
| `overflow-hidden` | `overflow: hidden;` |
| `flex flex-col items-stretch` | `display: flex; flex-direction: column; align-items: stretch;` |
| `p-5` | `padding: 1.25rem;` |
| `isolate antialiased` | `isolation: isolate; -webkit-font-smoothing: antialiased;` |

> `borderRadius`、`backgroundColor`、`border`、`backfaceVisibility` 通过 CSS 变量 + `:host([is-active])` 响应

---

### 1.13 Back — Pattern overlay
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0 opacity-10 pointer-events-none` | `position: absolute; inset: 0; opacity: 0.1; pointer-events: none;` |

---

### 1.14 Back — Sheen overlay
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0 pointer-events-none` | `position: absolute; inset: 0; pointer-events: none;` |

---

### 1.15 Back — Ontology badge
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute top-[8px] left-1/2 -translate-x-1/2 z-40` | `position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 40;` |
| `px-1.5 pt-[2px] pb-0` | `padding: 2px 0.375rem 0;` |
| `border-[0.5px] rounded-full` | `border: 0.5px solid; border-radius: 9999px;` |
| `flex items-center justify-center` | `display: flex; align-items: center; justify-content: center;` |
| `text-[7px] leading-none` | `font-size: 7px; line-height: 1;` |
| `font-serif` | `font-family: serif;` |
| `tracking-[0.1em]` | `letter-spacing: 0.1em;` |
| `uppercase` | `text-transform: uppercase;` |
| `opacity-50 mix-blend-plus-lighter` | `opacity: 0.5; mix-blend-mode: plus-lighter;` |
| `select-none whitespace-nowrap` | `user-select: none; white-space: nowrap;` |

---

### 1.16 Back — Scrollable container
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative flex flex-col w-full h-full z-10` | `position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; z-index: 10;` |

---

### 1.17 Back — Header (word + pos)
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex items-baseline mb-3 px-1 shrink-0` | `display: flex; align-items: baseline; margin-bottom: 0.75rem; padding: 0 0.25rem; flex-shrink: 0;` |
| `text-3xl font-bold font-serif mr-3 leading-tight pb-[0.1em]` | `font-size: 1.875rem; font-weight: 700; font-family: serif; margin-right: 0.75rem; line-height: 1.25; padding-bottom: 0.1em;` |
| `text-lg italic font-serif opacity-80` | `font-size: 1.125rem; font-style: italic; font-family: serif; opacity: 0.8;` |

---

### 1.18 Back — Content flex container
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex-1 flex flex-col min-h-0 gap-2` | `flex: 1 1 0%; display: flex; flex-direction: column; min-height: 0; gap: 0.5rem;` |

---

### 1.19 Back — Definition box
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex-[3]` | `flex: 3 3 0%;` |
| `rounded-md` | `border-radius: 0.375rem;` |
| `pt-1.5 pb-4 pl-4 pr-0.5` | `padding: 0.375rem 0.125rem 1rem 1rem;` |
| `cursor-pointer` | `cursor: pointer;` |
| `transition-all duration-300` | `transition: all 0.3s;` |
| `relative` | `position: relative;` |
| `flex flex-col min-h-0 overflow-hidden` | `display: flex; flex-direction: column; min-height: 0; overflow: hidden;` |

> hover 样式变化通过 `mouseenter/mouseleave` 内联 style 写入（保留 JS 方式，shadow 内通过 CSS `:hover` 实现即可）

---

### 1.20 Back — Definition label
| Tailwind class | 等价原生 CSS |
|---|---|
| `text-[8px] uppercase font-serif` | `font-size: 8px; text-transform: uppercase; font-family: serif;` |
| `tracking-[0.1em] mb-0.5` | `letter-spacing: 0.1em; margin-bottom: 0.125rem;` |
| `select-none flex items-center gap-1.5 pr-3.5` | `user-select: none; display: flex; align-items: center; gap: 0.375rem; padding-right: 0.875rem;` |

---

### 1.21 Back — Definition scroll container
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex items-start gap-3 w-full h-full overflow-y-auto pr-0` | `display: flex; align-items: flex-start; gap: 0.75rem; width: 100%; height: 100%; overflow-y: auto; padding-right: 0;` |
| `scrollbarWidth: 'thin'` (inline) | `scrollbar-width: thin;` |

---

### 1.22 Back — Definition text
| Tailwind class | 等价原生 CSS |
|---|---|
| `text-base font-sans leading-relaxed` | `font-size: 1rem; font-family: sans-serif; line-height: 1.625;` |
| `flex-1 select-none pr-0.5` | `flex: 1 1 0%; user-select: none; padding-right: 0.125rem;` |

---

### 1.23 Back — Flavor box
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex-1` | `flex: 1 1 0%;` |
| `rounded-md py-1.5 px-0.5` | `border-radius: 0.375rem; padding: 0.375rem 0.125rem;` |
| `flex flex-col min-h-0 relative` | `display: flex; flex-direction: column; min-height: 0; position: relative;` |

---

### 1.24 Back — Flavor persona icon
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute top-0 left-0 text-white opacity-70 pointer-events-none z-10` | `position: absolute; top: 0; left: 0; color: white; opacity: 0.7; pointer-events: none; z-index: 10;` |

---

### 1.25 Back — Flavor indicators
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute bottom-[12px] left-0 right-0` | `position: absolute; bottom: 12px; left: 0; right: 0;` |
| `flex items-center justify-center gap-1.5` | `display: flex; align-items: center; justify-content: center; gap: 0.375rem;` |
| `pointer-events-none z-50` | `pointer-events: none; z-index: 50;` |

**Indicator dot (inactive)**:
| `w-3 h-px rounded-full transition-all duration-300 pointer-events-auto opacity-20` | `width: 0.75rem; height: 1px; border-radius: 9999px; transition: all 0.3s; pointer-events: auto; opacity: 0.2;` |

**Indicator dot (active)**:
| `opacity-100 scale-x-125` | `opacity: 1; transform: scaleX(1.25);` |

---

### 1.26 VisualFeedbackOverlay
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-[-4px] z-[70] pointer-events-none` | `position: absolute; inset: -4px; z-index: 70; pointer-events: none;` |
| `rounded-[26px] border-[3px]` | `border-radius: 26px; border: 3px solid;` |
| `absolute top-2 right-2` | `position: absolute; top: 0.5rem; right: 0.5rem;` |
| `filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]` | `filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));` |

---

## 二、CardVisual.tsx — Sub-components

### 2.1 CardFrontHeader — No-ScrapLabel panel bg
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-x-6 bottom-2 top-3` | `position: absolute; left: 1.5rem; right: 1.5rem; bottom: 0.5rem; top: 0.75rem;` |
| `bg-black/20 border-b border-t rounded-sm` | `background: rgba(0,0,0,0.2); border-bottom: 1px solid; border-top: 1px solid; border-radius: 0.125rem;` |
| `-z-10 opacity-60` | `z-index: -10; opacity: 0.6;` |

### 2.2 CardFrontHeader — flex container
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex flex-col items-center justify-center w-full relative z-10 -mt-1` | `display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; position: relative; z-index: 10; margin-top: -0.25rem;` |

### 2.3 CardFrontHeader — vertical line
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute -top-4 w-[1px] h-5 bg-gradient-to-b from-transparent` | `position: absolute; top: -1rem; width: 1px; height: 1.25rem; background: linear-gradient(to bottom, transparent, var(--card-def-color-gold-base));` |

### 2.4 CardFrontHeader — level span
| Tailwind class | 等价原生 CSS |
|---|---|
| `text-xl font-bold tracking-[0.2em]` | `font-size: 1.25rem; font-weight: 700; letter-spacing: 0.2em;` |
| `drop-shadow-[0_0_12px_rgba(240,208,130,0.4)]` | `filter: drop-shadow(0 0 12px rgba(240,208,130,0.4));` |

---

### 2.5 CardFrontText — outer flex
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex flex-col items-center justify-end w-full h-full pb-0 relative z-40` | `display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 100%; height: 100%; padding-bottom: 0; position: relative; z-index: 40;` |

### 2.6 CardFrontText — pronunciation div
| Tailwind class | 等价原生 CSS |
|---|---|
| `mb-0.5 w-full text-center` | `margin-bottom: 0.125rem; width: 100%; text-align: center;` |

### 2.7 CardFrontText — pronunciation span
| Tailwind class | 等价原生 CSS |
|---|---|
| `font-serif text-[10px] tracking-[0.2em] opacity-50 mix-blend-plus-lighter inline-block` | `font-family: serif; font-size: 10px; letter-spacing: 0.2em; opacity: 0.5; mix-blend-mode: plus-lighter; display: inline-block;` |

### 2.8 CardFrontText — word row
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex items-baseline justify-center mb-1 w-full text-center relative z-10` | `display: flex; align-items: baseline; justify-content: center; margin-bottom: 0.25rem; width: 100%; text-align: center; position: relative; z-index: 10;` |

### 2.9 CardFrontText — word/translation column
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex flex-col items-center justify-center gap-2.5 px-4 mb-1.5` | `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.625rem; padding: 0 1rem; margin-bottom: 0.375rem;` |

### 2.10 CardFrontText — main word h2（`getTitleClass` 动态）
Shadow 内通过 `[part=word]` + data-attribute 实现：

| 条件 | Tailwind | 等价原生 CSS |
|---|---|---|
| CJK | `text-4xl tracking-[0.3em] font-bold mr-[-0.3em]` | `font-size: 2.25rem; letter-spacing: 0.3em; font-weight: 700; margin-right: -0.3em;` |
| `len > 14` | `text-xl tracking-wider mr-[-0.05em]` | `font-size: 1.25rem; letter-spacing: 0.05em; margin-right: -0.05em;` |
| `len > 8` | `text-2xl tracking-widest mr-[-0.1em]` | `font-size: 1.5rem; letter-spacing: 0.1em; margin-right: -0.1em;` |
| default | `text-3xl tracking-widest mr-[-0.1em]` | `font-size: 1.875rem; letter-spacing: 0.1em; margin-right: -0.1em;` |
| common | `leading-tight capitalize pb-[0.1em]` | `line-height: 1.25; text-transform: capitalize; padding-bottom: 0.1em;` |

> **注**：动态 class 在 shadow 内改用 `data-word-len="cjk|long|medium|default"` attribute + CSS 属性选择器实现

### 2.11 CardFrontText — translation span
| Tailwind class | 等价原生 CSS |
|---|---|
| `text-sm opacity-70 text-center font-medium` | `font-size: 0.875rem; opacity: 0.7; text-align: center; font-weight: 500;` |

---

## 三、CardVisual.tsx — MemoizedCardVisual（视觉区）

### 3.1 外层 wrapper
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center` | `position: relative; width: 100%; height: 100%; border-radius: 0.125rem; overflow: hidden; display: flex; align-items: center; justify-content: center;` |

### 3.2 BG layer
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-[-20%]` | `position: absolute; inset: -20%;` |
| `w-full h-full opacity-[0.15]` | `width: 100%; height: 100%; opacity: 0.15;` |

### 3.3 FG layer
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0 flex items-center justify-center z-40` | `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 40;` |
| `drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]` | `filter: drop-shadow(0 10px 20px rgba(0,0,0,0.8));` |
| `scale-[1.0] opacity-30 mix-blend-screen` (compact) | `transform: scale(1); opacity: 0.3; mix-blend-mode: screen;` |

### 3.4 DurabilityBar 容器
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute bottom-0 inset-x-0 z-50 flex justify-center` | `position: absolute; bottom: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: center;` |

### 3.5 默认 durability bar（无 Persona 组件时）
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute bottom-0 left-0 right-0 z-50 w-full h-[4px] bg-black/20 flex justify-center items-center` | `position: absolute; bottom: 0; left: 0; right: 0; z-index: 50; width: 100%; height: 4px; background: rgba(0,0,0,0.2); display: flex; justify-content: center; align-items: center;` |
| `h-full opacity-90` | `height: 100%; opacity: 0.9;` |

---

## 四、CompactCardVisual.tsx

### 4.1 外层 wrapper（全模式共用）
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative w-full h-full overflow-hidden select-none` | `position: relative; width: 100%; height: 100%; overflow: hidden; user-select: none;` |

### 4.2 Active ring
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0 z-[60] pointer-events-none border-2 rounded-[inherit] animate-pulse` | `position: absolute; inset: 0; z-index: 60; pointer-events: none; border: 2px solid; border-radius: inherit; animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;` |
| `ring-4 ring-offset-0` | `box-shadow: 0 0 0 4px var(--card-color-gold-metallic);` |

### 4.3 Repository mode — outer
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative w-full h-full flex flex-col p-2 isolate` | `position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; padding: 0.5rem; isolation: isolate;` |

### 4.4 Repository — BG watermark
| Tailwind class | 等价原生 CSS |
|---|---|
| `absolute inset-0 z-0 opacity-40 mix-blend-luminosity overflow-hidden pointer-events-none` | `position: absolute; inset: 0; z-index: 0; opacity: 0.4; mix-blend-mode: luminosity; overflow: hidden; pointer-events: none;` |
| `absolute inset-0 flex items-center justify-center scale-105 -translate-y-[5%]` | `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; transform: scale(1.05) translateY(-5%);` |

### 4.5 Repository — header
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative z-30 flex justify-end items-start w-full` | `position: relative; z-index: 30; display: flex; justify-content: flex-end; align-items: flex-start; width: 100%;` |

### 4.6 Repository — level label
| Tailwind class | 等价原生 CSS |
|---|---|
| `drop-shadow-lg p-1` | `filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1)); padding: 0.25rem;` |
| `text-xs font-bold tracking-widest` | `font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;` |

### 4.7 Repository — center word
| Tailwind class | 等价原生 CSS |
|---|---|
| `flex-1 flex flex-col items-center justify-center relative z-20 pointer-events-none w-full px-1` | `flex: 1 1 0%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 20; pointer-events: none; width: 100%; padding: 0 0.25rem;` |

### 4.8 Repository — footer
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative z-20 mt-auto flex flex-col gap-1.5 w-full` | `position: relative; z-index: 20; margin-top: auto; display: flex; flex-direction: column; gap: 0.375rem; width: 100%;` |

### 4.9 Repository — ontology badge
| Tailwind class | 等价原生 CSS |
|---|---|
| `text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full border` | `font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 9999px; border: 1px solid;` |

### 4.10 Repository — DurabilityBar scale
| Tailwind class | 等价原生 CSS |
|---|---|
| `w-full transform scale-y-[1.5] origin-bottom opacity-90` | `width: 100%; transform: scaleY(1.5); transform-origin: bottom; opacity: 0.9;` |

### 4.11 Icon mode
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative w-full h-full flex flex-col isolate` | `position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; isolation: isolate;` |
| `absolute inset-0 z-10 flex items-center justify-center p-2` | `position: absolute; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center; padding: 0.5rem;` |
| `w-full h-full scale-125` | `width: 100%; height: 100%; transform: scale(1.25);` |
| `absolute bottom-1 left-1 right-1 z-20` | `position: absolute; bottom: 0.25rem; left: 0.25rem; right: 0.25rem; z-index: 20;` |

### 4.12 Word mode
| Tailwind class | 等价原生 CSS |
|---|---|
| `relative w-full h-full flex items-center justify-center isolate group` | `position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; isolation: isolate;` |
| `relative z-20 flex items-center justify-center px-2 pb-1 w-full h-full` | `position: relative; z-index: 20; display: flex; align-items: center; justify-content: center; padding-left: 0.5rem; padding-right: 0.5rem; padding-bottom: 0.25rem; width: 100%; height: 100%;` |
| `absolute bottom-0 left-0 right-0 h-[4px] z-30 opacity-80 group-hover:opacity-100 transition-opacity` | `position: absolute; bottom: 0; left: 0; right: 0; height: 4px; z-index: 30; opacity: 0.8; transition: opacity;` |

---

## 五、备注

### 5.1 OQ 相关
- **OQ3 结论**：Default Persona 的所有 `visuals.*` 组件（HermeticBackground、AlchemicalCorners、CrucibleFrame、SunMoonDivider、BackTopDecoration、BackMiddleSeparator）均为纯 `React.memo` 组件，无 `useState`/`useEffect`，**可烘焙为 HTML 字符串**。
  - 例外：`AlchemyDurabilityBar({ progress })` 依赖 `progress` prop，**不可烘焙**，需保留为 slot 填充。

### 5.2 Tailwind 在 slot 内容中仍然生效
slot 填充内容（如 `<span slot="word" class="text-3xl">`）在 light DOM 中解析样式，Tailwind class 仍然生效，**无需翻译**。只有 shadow 模板内部的 class 需要翻译。

### 5.3 `group` / `group-hover` 在 shadow 内的替代
Tailwind 的 `group-hover:` 在 shadow 内不生效，改用：
- 同一 shadow 内：CSS `:hover > child` 或 `:host(:hover) [part=...]`
- 跨越 host 边界：通过 `is-active` / `is-over` 等 attribute + `:host([...])` 响应
