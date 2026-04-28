import { Application, Graphics } from 'pixi.js'
import { buildPixiConfig } from '../config'
import { cameraSystem } from '../systems/CameraSystem'
import { cameraBridge } from '../bridges/CameraBridge'
import { worldSystem } from '../systems/WorldSystem'
import { DebugSystem } from '../systems/DebugSystem'

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

  // Stage D: Initialize World, Camera, and Debug Systems
  const viewport = worldSystem.init(app)
  const contentLayer = worldSystem.contentLayer!
  
  cameraSystem.init(app, viewport, contentLayer)
  cameraBridge.init()

  // --- Debug System Bootstrapping (Dynamic & Selective) ---
  const showVisuals = localStorage.getItem('LEXI_DEBUG_VISUALS') === 'true';
  const showHUD = localStorage.getItem('LEXI_DEBUG_HUD') === 'true';

  if (showVisuals) DebugSystem.setVisualsEnabled(contentLayer, true);
  if (showHUD) DebugSystem.setHUDEnabled(app.stage, true);

  // 始终挂载 Ticker，但 updateHUD 内部会判断 visible 状态，隐藏时开销为 0
  app.ticker.add(() => DebugSystem.updateHUD());

  // Expose global toggles (Backward compatibility and quick CLI access)
  (window as any).LEXI_DEBUG_ON = () => {
    localStorage.setItem('LEXI_DEBUG_VISUALS', 'true');
    localStorage.setItem('LEXI_DEBUG_HUD', 'true');
    location.reload();
  };
  (window as any).LEXI_DEBUG_OFF = () => {
    localStorage.removeItem('LEXI_DEBUG_VISUALS');
    localStorage.removeItem('LEXI_DEBUG_HUD');
    location.reload();
  };

  return app
}

// PixiJS v8 的 destroy() 是 async，必须 await 否则 WebGL context 未释放就重建会导致 GPU crash
export async function destroyPixiApp(): Promise<void> {
  _cleanupResize?.()
  _cleanupResize = null
  
  // Stage D: Destroy Systems
  cameraBridge.destroy()
  cameraSystem.destroy()
  worldSystem.destroy()

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
