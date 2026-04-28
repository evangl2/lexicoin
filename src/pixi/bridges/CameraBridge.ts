import { useGameStore } from '@/core/store/index';
import { cameraSystem } from '../systems/CameraSystem';
import { Viewport } from 'pixi-viewport';

export class CameraBridge {
  private _unsubscribeStore: (() => void) | null = null;
  private _viewport: Viewport | null = null;
  private _throttleTimer: number | null = null;

  public init() {
    this._viewport = cameraSystem.viewport;
    if (!this._viewport) return;

    // 1. Restore initial position from store
    const { canvasView } = useGameStore.getState();
    this._viewport.moveCenter(canvasView.x, canvasView.y);
    this._viewport.setZoom(canvasView.scale, true);

    // 2. Sync Pixi -> React (Throttled)
    this._viewport.on('moved', this.handleViewportMoved);
    this._viewport.on('zoomed', this.handleViewportMoved);

    // 3. Sync React -> Pixi
    this._unsubscribeStore = useGameStore.subscribe((state, prevState) => {
      // Handle cameraFocusTarget changes
      if (state.cameraFocusTarget && state.cameraFocusTarget !== prevState.cameraFocusTarget) {
        // Find the target's world position. 
        // In Stage F (Card Sprite), cards will register their positions.
        // For now, if we have a target, we might need a lookup service.
        // As a placeholder, we log it. Later, we query the registry.
        console.log(`[CameraBridge] Focus target changed to: ${state.cameraFocusTarget}`);
        // cameraSystem.lookAt(targetX, targetY);
      }
    });
  }

  public destroy() {
    this._unsubscribeStore?.();
    this._unsubscribeStore = null;

    if (this._viewport) {
      this._viewport.off('moved', this.handleViewportMoved);
      this._viewport.off('zoomed', this.handleViewportMoved);
      this._viewport = null;
    }

    if (this._throttleTimer !== null) {
      window.clearTimeout(this._throttleTimer);
      this._throttleTimer = null;
    }
  }

  private handleViewportMoved = () => {
    if (!this._viewport) return;

    if (this._throttleTimer !== null) {
      return;
    }

    // Throttle updates to ~10fps to avoid React thrashing
    this._throttleTimer = window.setTimeout(() => {
      if (this._viewport) {
        useGameStore.getState().setCanvasView({
          x: this._viewport.center.x,
          y: this._viewport.center.y,
          scale: this._viewport.scale.x
        });
      }
      this._throttleTimer = null;
    }, 100);
  };
}

export const cameraBridge = new CameraBridge();
