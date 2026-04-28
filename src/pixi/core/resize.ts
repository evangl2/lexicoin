import type { Application } from 'pixi.js'
// Stage D: import { getViewport } from '../systems/CameraSystem'

export function initResizeHandler(app: Application): () => void {
  const handler = () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    // Stage D: viewport resize + min scale 重算 将在此处插入
  }
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
