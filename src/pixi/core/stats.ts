import type { Application } from 'pixi.js'

let _stats: { domElement: HTMLDivElement | null; update: () => void } | null = null

export async function initPixiStats(app: Application): Promise<void> {
  if (!import.meta.env.DEV) return
  const { Stats } = await import('pixi-stats')
  const stats = new Stats(app.renderer, app.ticker)
  if (stats.domElement) {
    stats.domElement.style.cssText = 'position:fixed;top:0;right:0;z-index:9999;'
    document.body.appendChild(stats.domElement)
  }
  _stats = stats
}

export function destroyPixiStats(): void {
  _stats?.domElement?.remove()
  _stats = null
}
