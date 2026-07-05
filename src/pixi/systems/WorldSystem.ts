import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { WORLD_W, WORLD_H, GRID_CELL_W, GRID_CELL_H } from '@/config/canvas';
import { cameraSystem } from './CameraSystem';

export class WorldSystem {
  private _viewport: Viewport | null = null;
  private _contentLayer: Container | null = null;
  
  private static instance: WorldSystem;

  private constructor() {}

  public static getInstance(): WorldSystem {
    if (!WorldSystem.instance) {
      WorldSystem.instance = new WorldSystem();
    }
    return WorldSystem.instance;
  }

  public get viewport(): Viewport | null {
    return this._viewport;
  }

  public get contentLayer(): Container | null {
    return this._contentLayer;
  }

  public init(app: Application): Viewport {
    /**
     * [GRID ALIGNMENT RULE]
     * 为了确保背景网格点阵 (Rune Dots) 与世界边界完美契合，
     * 建议物理世界的尺寸始终保持为 AABB 网格单元 (275x385) 的整数倍：
     * WorldWidth  = Math.ceil(desiredWidth / 275) * 275
     * WorldHeight = Math.ceil(desiredHeight / 385) * 385
     */
    const snappedW = Math.ceil(WORLD_W / (GRID_CELL_W * 2)) * (GRID_CELL_W * 2);
    const snappedH = Math.ceil(WORLD_H / (GRID_CELL_H * 2)) * (GRID_CELL_H * 2);

    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: snappedW,
      worldHeight: snappedH,
      events: app.renderer.events,
    });

    app.stage.addChild(viewport);
    this._viewport = viewport;

    // Create a main content layer inside the viewport
    // This is where cards and objects will live. 
    // We apply Lead the View / 2.5D Juice to this layer.
    this._contentLayer = new Container();
    this._contentLayer.label = 'world-content';
    viewport.addChild(this._contentLayer);

    // Initial centering
    this._contentLayer.position.set(snappedW / 2, snappedH / 2);

    return viewport;
  }

  /**
   * 动态更新世界大小，并保持内容居中对齐
   * @param desiredW 目标宽度
   * @param desiredH 目标高度
   */
  public updateSize(desiredW: number, desiredH: number): void {
    if (!this._viewport || !this._contentLayer) return;

    // 强制偶数倍吸附
    const finalW = Math.round(desiredW / (GRID_CELL_W * 2)) * (GRID_CELL_W * 2);
    const finalH = Math.round(desiredH / (GRID_CELL_H * 2)) * (GRID_CELL_H * 2);

    this._viewport.worldWidth = finalW;
    this._viewport.worldHeight = finalH;
    
    // 内容容器永远锁定在当前几何中心
    this._contentLayer.position.set(finalW / 2, finalH / 2);

    // 通知相机系统更新物理边界
    cameraSystem.updateWorldBounds();
  }

  public destroy(): void {
    this._viewport?.destroy();
    this._viewport = null;
    this._contentLayer = null;
  }
}

export const worldSystem = WorldSystem.getInstance();
