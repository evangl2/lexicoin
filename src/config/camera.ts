/** 
 * Camera Intent & Feel Configuration
 */
export const CAMERA_CONF = {
  // Intent Prediction (Lead the View)
  LEAD_FACTOR: 0.2,

  // Cursor-Aware Focus (Peeking)
  MOUSE_INFLUENCE_MAX: 150,
  MOUSE_INFLUENCE_DEAD_ZONE: 0.6,
  MOUSE_INFLUENCE_LERP: 0.08,

  // Edge Scrolling
  EDGE_SCROLL_DEAD_ZONE: 0.95,
  EDGE_SCROLL_SPEED: 15,
  EDGE_SCROLL_DELAY: 1000, // ms

  // Boundary Resistance
  RESISTANCE_BASE: 0.4,
  RESISTANCE_STEEPNESS: 1.5,
  RESISTANCE_MULTIPLIER: 4.0,
  RESISTANCE_MAX: 0.99,

  // Animation
  BOUNCE_TIME: 400,
  LOOKAT_DURATION: 0.8
} as const;
