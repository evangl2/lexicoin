import { useEffect, useRef } from 'react'
import { initPixiApp, destroyPixiApp, setCleanupResize } from '@/pixi/core/app'
import { initResizeHandler } from '@/pixi/core/resize'
import { initPixiStats, destroyPixiStats } from '@/pixi/core/stats'

// antialias 由 localStorage 控制，切换需 reload（无法在同一 canvas 上重建 WebGL context）
function readAntialias(): boolean {
  const stored = localStorage.getItem('pixi-antialias')
  return stored !== null ? stored === 'true' : true
}

export function PixiRoot() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const antialias = readAntialias()
    let cancelled = false

    initPixiApp(antialias).then(app => {
      if (cancelled) { destroyPixiApp(); return }
      
      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas)
      }
      
      setCleanupResize(initResizeHandler(app))
      initPixiStats(app)
    })

    return () => {
      cancelled = true
      destroyPixiStats()
      destroyPixiApp()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
    />
  )
}
