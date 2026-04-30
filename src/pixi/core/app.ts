import { Application, Graphics, WorkerManager } from 'pixi.js'
import { buildPixiConfig } from '../config'
import { cameraSystem } from '../systems/CameraSystem'
import { backgroundSystem } from '../systems/BackgroundSystem'
import { cameraBridge } from '../bridges/CameraBridge'
import { worldSystem } from '../systems/WorldSystem'
import { DebugSystem } from '../systems/DebugSystem'

let _app: Application | null = null
let _cleanupResize: (() => void) | null = null
let _debugTickerFn: (() => void) | null = null

export function getPixiApp(): Application | null {
  return _app
}

export async function initPixiApp(
  antialias: boolean
): Promise<Application> {
  const app = new Application()
  await app.init({ ...buildPixiConfig(antialias) })
  _app = app

  // Aggressive GC for HMR Dev Stability
  if (app.renderer.textureGC) {
    app.renderer.textureGC.maxIdle = 600
    app.renderer.textureGC.checkCountMax = 300
  }

  // Stage D: Initialize World, Camera, and Debug Systems
  const viewport = worldSystem.init(app)
  const contentLayer = worldSystem.contentLayer!

  // Stage E: Background System (Replaces Stage 0 placeholder)
  backgroundSystem.init(app, viewport);

  cameraSystem.init(app, viewport, contentLayer)
  cameraBridge.init()

  // --- Debug System Bootstrapping (Dynamic & Selective) ---
  const showVisuals = localStorage.getItem('LEXI_DEBUG_VISUALS') === 'true';
  const showHUD = localStorage.getItem('LEXI_DEBUG_HUD') === 'true';

  if (showVisuals) DebugSystem.setVisualsEnabled(contentLayer, true);
  if (showHUD) DebugSystem.setHUDEnabled(app.stage, true);

  // 始终挂载 Ticker，但 updateHUD 内部会判断 visible 状态，隐藏时开销为 0
  _debugTickerFn = () => DebugSystem.updateHUD();
  app.ticker.add(_debugTickerFn);

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

export function setCleanupResize(fn: () => void): void {
  _cleanupResize = fn
}

// PixiJS v8.18 的 Application.destroy() 实际是同步的（返回 void）。
export async function destroyPixiApp(): Promise<void> {
  _cleanupResize?.()
  _cleanupResize = null

  if (_debugTickerFn && _app) {
    _app.ticker.remove(_debugTickerFn)
    _debugTickerFn = null
  }

  // Stage D: Destroy Systems
  cameraBridge.destroy()
  cameraSystem.destroy()
  backgroundSystem.destroy() // Stage E
  worldSystem.destroy()

  _app?.destroy(true, { children: true, texture: true, textureSource: true, context: true })
  if (typeof WorkerManager !== 'undefined') {
    WorkerManager.reset()
  }
  _app = null
}

export async function reinitPixiApp(
  antialias: boolean
): Promise<Application> {
  await destroyPixiApp()
  return initPixiApp(antialias)
  // Stage K TODO: reinit 后纹理缓存重建（当前无纹理，安全）
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    destroyPixiApp()
  })
}
