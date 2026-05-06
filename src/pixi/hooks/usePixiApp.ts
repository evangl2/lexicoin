import { getPixiApp } from '../core/globalApp'
import type { Application } from 'pixi.js'

export function usePixiApp(): Application | null {
  return getPixiApp()
}
