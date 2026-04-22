// ── HUD ──────────────────────────────────────────────────────────────────────
export const HUD_PROGRESS_BAR_SPRING = { stiffness: 50, damping: 20 } as const;
export type HudProgressBarSpring = typeof HUD_PROGRESS_BAR_SPRING;

// ── Zoom ─────────────────────────────────────────────────────────────────────
/** Per-frame velocity retention during zoom inertia (0 = instant stop, 1 = infinite glide) */
export const ZOOM_FRICTION = 0.72;

/** Velocity threshold below which the inertia loop stops */
export const ZOOM_MIN_VELOCITY = 0.5;

/** Converts accumulated wheel delta to a zoom multiplier exponent */
export const ZOOM_SENSITIVITY = 0.001;

/** Maximum zoom scale */
export const ZOOM_MAX = 2.0;

/** Floor for minimum zoom (clamped above screen/world ratio) */
export const ZOOM_MIN_FLOOR = 0.08;

/** Debounce delay after last zoom event before "zoom settled" fires (ms) */
export const CANVAS_ZOOM_END_DEBOUNCE_MS = 150;

// ── Pan ───────────────────────────────────────────────────────────────────────
/** Extra pixels of pan allowed beyond world edges (asymmetric: X wider for landscape cards) */
export const CANVAS_OVERSCROLL = { X: 300, Y: 150 } as const;
export type CanvasOverscroll = typeof CANVAS_OVERSCROLL;

// ── Culling ───────────────────────────────────────────────────────────────────
/** Pixels beyond viewport edges where cards remain mounted (prevents pop-in during pan/zoom) */
export const VIEWPORT_CULL_MARGIN = 2500;

// ── Card snap ────────────────────────────────────────────────────────────────
/** Spring physics for card grid-snap animation */
export const SNAP_SPRING = { stiffness: 400, damping: 28, mass: 0.8 } as const;
export type SnapSpring = typeof SNAP_SPRING;

/** Maximum grid cells searched outward for an empty snap slot (spiral search radius) */
export const GRID_SNAP_SEARCH_RADIUS = 10;
