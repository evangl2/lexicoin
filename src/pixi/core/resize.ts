import type { Application } from 'pixi.js'
import { cameraSystem } from '../systems/CameraSystem'
import { ZOOM_MAX } from '@/config/physics'

export function initResizeHandler(app: Application): () => void {
  const handler = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    
    // Stage D: viewport resize + min scale recalculation
    const viewport = cameraSystem.viewport;
    if (viewport) {
      viewport.resize(window.innerWidth, window.innerHeight);
      cameraSystem.updateWorldBounds();
    }
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
