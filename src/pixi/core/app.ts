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

// PixiJS v8 的 destroy() 是 async，必须 await 否则 WebGL context 未释放就重建会导致 GPU crash
export async function destroyPixiApp(): Promise<void> {
  _cleanupResize?.()
  _cleanupResize = null
  // Stage D: destroyCamera() 将在此处插入
  await _app?.destroy(false, { children: true })
  _app = null
}

export async function reinitPixiApp(
  canvas: HTMLCanvasElement,
  antialias: boolean
): Promise<Application> {
  await destroyPixiApp()
  return initPixiApp(canvas, antialias)
  // Stage K TODO: reinit 后纹理缓存重建（当前无纹理，安全）
}
