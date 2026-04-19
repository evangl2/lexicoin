/**
 * Canvas — 世界尺寸与视口常量
 *
 * 所有需要引用世界边界的地方（Canvas 平移限制、网格吸附、卡片拖拽约束、
 * Persona 视觉布局）均从这里导入，禁止在各模块内单独硬编码。
 */

/** 世界总宽度（像素，世界坐标系中心为 0,0） */
export const WORLD_W = 9600;

/** 世界总高度（像素） */
export const WORLD_H = 6000;

// ── Card LOD ─────────────────────────────────────────────────────────────────
/** Zoom thresholds for switching cards to CompactCardVisual (hysteresis pair) */
export const CARD_LOD = { ENTER: 0.32, EXIT: 0.38 } as const;
export type CardLod = typeof CARD_LOD;

// ── Card scale ───────────────────────────────────────────────────────────────
/** Card scale multipliers for hover and drag states */
export const CARD_SCALE = { HOVER: 1.05, DRAG: 1.15 } as const;
export type CardScale = typeof CARD_SCALE;

/** Fraction of the viewport's smaller dimension that an expanded card fills */
export const CARD_EXPANDED_VIEWPORT_FRACTION = 0.8;

/** Milliseconds the card ignores hover interactions after a merge/split animation */
export const CARD_ANIMATION_LOCKOUT_MS = 600;

// ── Dock ─────────────────────────────────────────────────────────────────────
/** Dock scale when a card is expanded (recedes to give the card space) */
export const DOCK_ZOOMED_SCALE = 0.75;

// ── Visual grid ───────────────────────────────────────────────────────────────
/** Decorative SVG grid cell sizes in DefaultGridSystem */
export const GRID_VIS = { SMALL_CELL: 100, LARGE_CELL: 1000 } as const;
export type GridVis = typeof GRID_VIS;

/** Opacity transition breakpoints for the visual grid at different zoom levels */
export const GRID_OPACITY = {
    SMALL: { input: [0.1, 0.4, 1.5] as const, output: [0, 0.2, 0.4] as const },
    LARGE: { input: [0.1, 1] as const, output: [0.3, 0.6] as const },
} as const;
export type GridOpacity = typeof GRID_OPACITY;
