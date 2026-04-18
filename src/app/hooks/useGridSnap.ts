import { animate } from 'motion/react'
import type { MotionValue } from 'motion/react'
import { WORLD_W, WORLD_H } from '@/config/canvas'

export const GRID_CELL_W = 280
export const GRID_CELL_H = 380
const MIN_COL = Math.ceil((-WORLD_W / 2) / GRID_CELL_W)
const MAX_COL = Math.floor((WORLD_W / 2) / GRID_CELL_W)
const MIN_ROW = Math.ceil((-WORLD_H / 2) / GRID_CELL_H)
const MAX_ROW = Math.floor((WORLD_H / 2) / GRID_CELL_H)

export interface OccupiedItem {
  id: string
  x: number
  y: number
}

/** 将世界坐标吸附到最近的空格子（螺旋搜索，最大半径 10 格） */
export function snapPosition(
  rawX: number,
  rawY: number,
  occupied: OccupiedItem[],
  excludeId?: string,
): { x: number; y: number } {
  const targetCol = Math.round(rawX / GRID_CELL_W)
  const targetRow = Math.round(rawY / GRID_CELL_H)

  const taken = new Set<string>()
  for (const item of occupied) {
    if (item.id === excludeId) continue
    const col = Math.round(item.x / GRID_CELL_W)
    const row = Math.round(item.y / GRID_CELL_H)
    taken.add(`${col},${row}`)
  }

  for (let r = 0; r <= 10; r++) {
    const candidates: [number, number][] = []
    if (r === 0) {
      candidates.push([targetCol, targetRow])
    } else {
      for (let i = -r; i <= r; i++) {
        candidates.push([targetCol + i, targetRow - r])
        candidates.push([targetCol + i, targetRow + r])
      }
      for (let i = -r + 1; i < r; i++) {
        candidates.push([targetCol - r, targetRow + i])
        candidates.push([targetCol + r, targetRow + i])
      }
    }
    // 按与目标格子的距离排序
    candidates.sort((a, b) => {
      const da = (a[0] - targetCol) ** 2 + (a[1] - targetRow) ** 2
      const db = (b[0] - targetCol) ** 2 + (b[1] - targetRow) ** 2
      return da - db
    })
    for (const [col, row] of candidates) {
      const cc = Math.max(MIN_COL, Math.min(MAX_COL, col))
      const cr = Math.max(MIN_ROW, Math.min(MAX_ROW, row))
      if (!taken.has(`${cc},${cr}`)) {
        return { x: cc * GRID_CELL_W, y: cr * GRID_CELL_H }
      }
    }
  }

  // 兜底：原地吸附到边界内最近格
  const col = Math.max(MIN_COL, Math.min(MAX_COL, targetCol))
  const row = Math.max(MIN_ROW, Math.min(MAX_ROW, targetRow))
  return { x: col * GRID_CELL_W, y: row * GRID_CELL_H }
}

/** 对 MotionValue 做弹簧吸附动画 */
export function applySnap(mx: MotionValue<number>, my: MotionValue<number>, x: number, y: number) {
  animate(mx, x, { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 })
  animate(my, y, { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 })
}
