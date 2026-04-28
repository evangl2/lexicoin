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
      const minScale = cameraSystem.calcMinScale();
      viewport.clampZoom({ minScale, maxScale: ZOOM_MAX });
    }
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
