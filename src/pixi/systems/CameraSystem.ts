import { Application, Ticker, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { WORLD_W, WORLD_H } from '@/config/canvas';
import { ZOOM_MAX, ZOOM_MIN_FLOOR, ZOOM_SENSITIVITY, CANVAS_OVERSCROLL } from '@/config/physics';
import { CAMERA_CONF } from '@/config/camera';
import gsap from 'gsap';

export enum CameraLOD {
  FAR = 'far',
  CLOSE = 'close'
}

export const SAFE_AREA = {
  top: 60,
  right: 60,
  bottom: 120,
  left: 320
};

class CameraSystem {
  private _viewport: Viewport | null = null;
  private _contentLayer: Container | null = null;
  private _app: Application | null = null;
  private _lastPos = { x: 0, y: 0 };
  private _lastScale = 1;

  private static instance: CameraSystem;

  private constructor() { }

  public static getInstance(): CameraSystem {
    if (!CameraSystem.instance) {
      CameraSystem.instance = new CameraSystem();
    }
    return CameraSystem.instance;
  }

  public get viewport(): Viewport | null {
    return this._viewport;
  }

  public get contentLayer(): Container | null {
    return this._contentLayer;
  }

  public init(app: Application, viewport: Viewport, contentLayer: Container): void {
    this._app = app;
    this._viewport = viewport;
    this._contentLayer = contentLayer;

    // 1. Configure Viewport Physics
    viewport
      .drag({ mouseButtons: 'left' })
      .wheel({
        percent: 0.1,
        smooth: 10,
        center: null
      })
      .bounce({
        sides: 'all',
        time: CAMERA_CONF.BOUNCE_TIME,
        ease: 'easeOutBack',
      });

    viewport.clamp({
      left: -CANVAS_OVERSCROLL.X,
      right: viewport.worldWidth + CANVAS_OVERSCROLL.X,
      top: -CANVAS_OVERSCROLL.Y,
      bottom: viewport.worldHeight + CANVAS_OVERSCROLL.Y,
      underflow: 'center'
    });

    this.updateWorldBounds();

    app.ticker.add(this.update, this);

    this._lastPos = { x: viewport.x, y: viewport.y };
    this._lastScale = viewport.scale.x;

    (window as any).__LEXI_DEBUG__ = {
      lookAt: (x: number, y: number, zoom?: number) => this.lookAt(x, y, zoom),
      getViewport: () => this._viewport,
      getLOD: () => this.getLOD()
    };
  }


  public destroy(): void {
    if (this._app) {
      this._app.ticker.remove(this.update, this);
    }
    this._viewport = null;
    this._contentLayer = null;
    this._app = null;
    delete (window as any).__LEXI_DEBUG__;
  }

  /**
   * 当世界（画布）大小发生变化时，必须调用此方法刷新物理插件的边界。
   * 注意：传入的 worldWidth/Height 建议遵循 AABB 网格对齐规则（275x385 的整数倍）。
   */
  public updateWorldBounds(): void {
    if (!this._viewport) return;

    // 1. 刷新缩放限制（防止世界变大后依然无法缩小）
    const minScale = this.calcMinScale();
    this._viewport.clampZoom({ minScale, maxScale: ZOOM_MAX });

    // 2. 刷新位置限制（更新 Overscroll 物理边界）
    this._viewport.clamp({
      left: -CANVAS_OVERSCROLL.X,
      right: this._viewport.worldWidth + CANVAS_OVERSCROLL.X,
      top: -CANVAS_OVERSCROLL.Y,
      bottom: this._viewport.worldHeight + CANVAS_OVERSCROLL.Y,
      underflow: 'center'
    });
  }

  public calcMinScale(): number {
    if (!this._viewport) return ZOOM_MIN_FLOOR;
    return Math.max(
      ZOOM_MIN_FLOOR,
      Math.max(window.innerWidth / this._viewport.worldWidth, window.innerHeight / this._viewport.worldHeight)
    );
  }

  public getLOD(): CameraLOD {
    if (!this._viewport) return CameraLOD.FAR;
    return this._viewport.scale.x > 0.4 ? CameraLOD.CLOSE : CameraLOD.FAR;
  }

  public getAdjustedCenter(worldX: number, worldY: number): { x: number, y: number } {
    if (!this._viewport) return { x: worldX, y: worldY };

    const effectiveWidth = window.innerWidth - SAFE_AREA.left - SAFE_AREA.right;
    const effectiveHeight = window.innerHeight - SAFE_AREA.top - SAFE_AREA.bottom;
    const screenCenterX = SAFE_AREA.left + effectiveWidth / 2;
    const screenCenterY = SAFE_AREA.top + effectiveHeight / 2;

    const offsetX = (window.innerWidth / 2 - screenCenterX) / this._viewport.scale.x;
    const offsetY = (window.innerHeight / 2 - screenCenterY) / this._viewport.scale.y;

    return { x: worldX + offsetX, y: worldY + offsetY };
  }

  public lookAt(worldX: number, worldY: number, zoom?: number) {
    if (!this._viewport) return;

    const adjusted = this.getAdjustedCenter(worldX, worldY);
    const targetScale = zoom ?? this._viewport.scale.x;

    gsap.to(this._viewport, {
      x: (window.innerWidth / 2) - (adjusted.x * targetScale),
      y: (window.innerHeight / 2) - (adjusted.y * targetScale),
      duration: CAMERA_CONF.LOOKAT_DURATION,
      ease: "power3.out"
    });

    if (zoom !== undefined) {
      gsap.to(this._viewport.scale, {
        x: zoom, y: zoom, duration: CAMERA_CONF.LOOKAT_DURATION, ease: "power3.out"
      });
    }
  }

  private update(ticker: Ticker) {
    if (!this._viewport || !this._contentLayer) return;

    const dt = ticker.deltaTime;
    const currentX = this._viewport.x;
    const currentY = this._viewport.y;
    const currentScale = this._viewport.scale.x;
    const worldW = this._viewport.worldWidth;
    const worldH = this._viewport.worldHeight;

    let vx = (currentX - this._lastPos.x) / dt;
    let vy = (currentY - this._lastPos.y) / dt;

    const isZooming = Math.abs(currentScale - this._lastScale) > 0.001;
    if (isZooming) {
      vx = 0; vy = 0;
      if (this._viewport.left < 0) this._viewport.x = 0;
      if (this._viewport.top < 0) this._viewport.y = 0;
      const maxRightX = window.innerWidth - worldW * currentScale;
      if (this._viewport.right > worldW && this._viewport.x < maxRightX) {
        this._viewport.x = maxRightX;
      }
      const maxBottomY = window.innerHeight - worldH * currentScale;
      if (this._viewport.bottom > worldH && this._viewport.y < maxBottomY) {
        this._viewport.y = maxBottomY;
      }
    }

    // --- 1. Intent Prediction (Lead the View) & Progressive Resistance ---
    if (this._viewport.input.count() > 0) {
      this._viewport.x += vx * CAMERA_CONF.LEAD_FACTOR;
      this._viewport.y += vy * CAMERA_CONF.LEAD_FACTOR;

      const getProgressiveFactor = (over: number, max: number) => {
        const ratio = Math.min(1, Math.abs(over) / max);
        return Math.min(
          CAMERA_CONF.RESISTANCE_MAX,
          CAMERA_CONF.RESISTANCE_BASE + Math.pow(ratio, CAMERA_CONF.RESISTANCE_STEEPNESS) * CAMERA_CONF.RESISTANCE_MULTIPLIER
        );
      };

      if (this._viewport.left < 0 && vx > 0) {
        const factor = getProgressiveFactor(this._viewport.left, CANVAS_OVERSCROLL.X);
        this._viewport.x -= vx * factor * dt;
      } else if (this._viewport.right > worldW && vx < 0) {
        const factor = getProgressiveFactor(this._viewport.right - worldW, CANVAS_OVERSCROLL.X);
        this._viewport.x -= vx * factor * dt;
      }

      if (this._viewport.top < 0 && vy > 0) {
        const factor = getProgressiveFactor(this._viewport.top, CANVAS_OVERSCROLL.Y);
        this._viewport.y -= vy * factor * dt;
      } else if (this._viewport.bottom > worldH && vy < 0) {
        const factor = getProgressiveFactor(this._viewport.bottom - worldH, CANVAS_OVERSCROLL.Y);
        this._viewport.y -= vy * factor * dt;
      }
    }

    // --- 2. Cursor-Aware Features ---
    const mouse = this._app?.renderer.events.pointer;
    if (mouse) {
      const normX = (mouse.global.x / window.innerWidth - 0.5) * 2;
      const normY = (mouse.global.y / window.innerHeight - 0.5) * 2;

      const getInfluence = (norm: number, deadZone: number) => {
        const absNorm = Math.abs(norm);
        if (absNorm < deadZone) return 0;
        const remapped = (absNorm - deadZone) / (1 - deadZone);
        return Math.pow(remapped, 2) * Math.sign(norm);
      };

      const influencePeekX = getInfluence(normX, CAMERA_CONF.MOUSE_INFLUENCE_DEAD_ZONE);
      const influencePeekY = getInfluence(normY, CAMERA_CONF.MOUSE_INFLUENCE_DEAD_ZONE);
      const influenceScrollX = getInfluence(normX, CAMERA_CONF.EDGE_SCROLL_DEAD_ZONE);
      const influenceScrollY = getInfluence(normY, CAMERA_CONF.EDGE_SCROLL_DEAD_ZONE);

      const targetMouseOffsetX = -influencePeekX * CAMERA_CONF.MOUSE_INFLUENCE_MAX;
      const targetMouseOffsetY = -influencePeekY * CAMERA_CONF.MOUSE_INFLUENCE_MAX;
      this._contentLayer.x += (targetMouseOffsetX - this._contentLayer.x) * CAMERA_CONF.MOUSE_INFLUENCE_LERP;
      this._contentLayer.y += (targetMouseOffsetY - this._contentLayer.y) * CAMERA_CONF.MOUSE_INFLUENCE_LERP;

      if (this._viewport.input.count() === 0) {
        if (Math.abs(influenceScrollX) > 0) {
          this._viewport.x -= influenceScrollX * CAMERA_CONF.EDGE_SCROLL_SPEED;
        }
        if (Math.abs(influenceScrollY) > 0) {
          this._viewport.y -= influenceScrollY * CAMERA_CONF.EDGE_SCROLL_SPEED;
        }

        if (this._viewport.left < 0) this._viewport.x = 0;
        if (this._viewport.top < 0) this._viewport.y = 0;
        const maxRightX = window.innerWidth - worldW * currentScale;
        if (this._viewport.right > worldW && this._viewport.x < maxRightX) {
          this._viewport.x = maxRightX;
        }
        const maxBottomY = window.innerHeight - worldH * currentScale;
        if (this._viewport.bottom > worldH && this._viewport.y < maxBottomY) {
          this._viewport.y = maxBottomY;
        }
      }
    }

    this._lastPos = { x: this._viewport.x, y: this._viewport.y };
    this._lastScale = currentScale;
  }
}

export const cameraSystem = CameraSystem.getInstance();
