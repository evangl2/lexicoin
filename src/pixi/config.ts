import type { ApplicationOptions } from 'pixi.js'

export function buildPixiConfig(antialias: boolean): Partial<ApplicationOptions> {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    preference: 'webgl',
    antialias,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
    backgroundAlpha: 0,
    preserveDrawingBuffer: false,
    hello: false,
  }
}
