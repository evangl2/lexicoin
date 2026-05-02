import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { WORLD_W, WORLD_H } from '@/config/canvas';

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
    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: WORLD_W,
      worldHeight: WORLD_H,
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

    return viewport;
  }

  public destroy(): void {
    this._viewport?.destroy();
    this._viewport = null;
    this._contentLayer = null;
  }
}

export const worldSystem = WorldSystem.getInstance();
