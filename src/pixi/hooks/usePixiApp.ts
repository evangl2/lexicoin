import { getPixiApp } from '../core/app'
import type { Application } from 'pixi.js'

export function usePixiApp(): Application | null {
  return getPixiApp()
}
