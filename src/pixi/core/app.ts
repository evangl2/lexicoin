import { Application, Graphics } from 'pixi.js'
import { buildPixiConfig } from '../config'

let _app: Application | null = null
let _cleanupResize: (() => void) | null = null

export function getPixiApp(): Application | null {
  return _app
}

export async function initPixiApp(
  canvas: HTMLCanvasElement,
  antialias: boolean
): Promise<Application> {
  const app = new Application()
  await app.init({ canvas, ...buildPixiConfig(antialias) })
  _app = app

  // Phase 0 占位背景：bgVoid 深色。Stage E (Persona Bridge) 接入后替换为动态颜色
  const bg = new Graphics()
  bg.rect(0, 0, app.screen.width, app.screen.height).fill(0x0a0a0f)
  bg.label = 'bg-placeholder'
  app.stage.addChild(bg)

  return app
}

export function destroyPixiApp(): void {
  _cleanupResize?.()
  _cleanupResize = null
  // Stage D: destroyCamera() 将在此处插入
  _app?.destroy(false, { children: true })
  _app = null
}

export async function reinitPixiApp(
  canvas: HTMLCanvasElement,
  antialias: boolean
): Promise<Application> {
  destroyPixiApp()
  return initPixiApp(canvas, antialias)
  // Stage K TODO: reinit 后纹理缓存重建（当前无纹理，安全）
}
