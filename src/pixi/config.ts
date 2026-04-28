import type { ApplicationOptions } from 'pixi.js'

export function buildPixiConfig(antialias: boolean): Partial<ApplicationOptions> {
  return {
    preference: 'webgl',
    antialias,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
    backgroundAlpha: 0,
    preserveDrawingBuffer: false,
    hello: false,
  }
}
