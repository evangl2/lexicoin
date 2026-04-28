import { useEffect, useRef } from 'react'
import { initPixiApp, destroyPixiApp, getPixiApp, reinitPixiApp } from '@/pixi/core/app'
import { initResizeHandler } from '@/pixi/core/resize'
import { initPixiStats, destroyPixiStats } from '@/pixi/core/stats'
import { useGameStore } from '@store/index'

export function PixiRoot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const antialiasEnabled = useGameStore(s => s.featureFlags.antialiasEnabled)
  const cleanupResizeRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(false)

  // 初始化（仅 mount 时）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    initPixiApp(canvas, antialiasEnabled).then(app => {
      if (cancelled) { destroyPixiApp(); return }
      cleanupResizeRef.current = initResizeHandler(app)
      initPixiStats(app)
      mountedRef.current = true
    })

    return () => {
      cancelled = true
      mountedRef.current = false
      cleanupResizeRef.current?.()
      cleanupResizeRef.current = null
      destroyPixiStats()
      destroyPixiApp()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // antialias 切换（DevConsole 改变设置时 reinit renderer）
  useEffect(() => {
    if (!mountedRef.current) return
    const canvas = canvasRef.current
    if (!canvas || !getPixiApp()) return
    cleanupResizeRef.current?.()
    destroyPixiStats()
    reinitPixiApp(canvas, antialiasEnabled).then(newApp => {
      cleanupResizeRef.current = initResizeHandler(newApp)
      initPixiStats(newApp)
    })
  }, [antialiasEnabled])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }}
    />
  )
}
