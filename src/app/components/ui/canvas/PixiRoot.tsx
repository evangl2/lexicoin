import { useEffect, useRef } from 'react'
import { initPixiApp, destroyPixiApp } from '@/pixi/core/app'
import { initResizeHandler } from '@/pixi/core/resize'
import { initPixiStats, destroyPixiStats } from '@/pixi/core/stats'

// antialias 由 localStorage 控制，切换需 reload（无法在同一 canvas 上重建 WebGL context）
function readAntialias(): boolean {
  const stored = localStorage.getItem('pixi-antialias')
  return stored !== null ? stored === 'true' : true
}

export function PixiRoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const antialias = readAntialias()
    let cancelled = false

    initPixiApp(canvas, antialias).then(app => {
      if (cancelled) { destroyPixiApp(); return }
      initResizeHandler(app)
      initPixiStats(app)
    })

    return () => {
      cancelled = true
      destroyPixiStats()
      destroyPixiApp()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
    />
  )
}
