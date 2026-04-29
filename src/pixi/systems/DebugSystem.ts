import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { WORLD_W as DEFAULT_W, WORLD_H as DEFAULT_H } from '@/config/canvas';
import { cameraSystem } from './CameraSystem';

export class DebugSystem {
  private static _debugLayer: Container | null = null;
  private static _hudLayer: Container | null = null;
  private static _lodText: Text | null = null;

  /**
   * 动态修改世界大小并重绘调试图形
   */
  public static setWorldSize(width: number, height: number) {
    const vp = cameraSystem.viewport;
    if (!vp) {
      console.warn('DebugSystem: Viewport not initialized');
      return;
    }

    console.log(`DebugSystem: Updating world size to ${width}x${height}`);

    // 1. 更新 Viewport 物理属性
    vp.worldWidth = width;
    vp.worldHeight = height;

    // 2. 通知摄像机系统刷新物理边界
    cameraSystem.updateWorldBounds();

    // 3. 如果调试层开启，则重绘
    if (this._debugLayer && this._debugLayer.visible) {
      this._debugLayer.removeChildren();
      this.createVisuals(this._debugLayer);
    }
  }

  public static setVisualsEnabled(parent: Container, enabled: boolean) {
    if (enabled) {
      if (!this._debugLayer) {
        this._debugLayer = new Container();
        this._debugLayer.label = 'debug-visuals-container';
        this.createVisuals(this._debugLayer);
      }
      parent.addChild(this._debugLayer);
      this._debugLayer.visible = true;
    } else if (this._debugLayer) {
      this._debugLayer.visible = false;
    }
  }

  public static setHUDEnabled(stage: Container, enabled: boolean) {
    if (enabled) {
      if (!this._hudLayer) {
        this._hudLayer = new Container();
        this._hudLayer.label = 'debug-hud-container';
        this.createHUD(this._hudLayer);
      }
      stage.addChild(this._hudLayer);
      this._hudLayer.visible = true;
    } else if (this._hudLayer) {
      this._hudLayer.visible = false;
    }
  }

  private static createVisuals(container: Container) {
    const vp = cameraSystem.viewport;
    const w = vp?.worldWidth ?? DEFAULT_W;
    const h = vp?.worldHeight ?? DEFAULT_H;

    const grid = new Graphics();
    container.addChild(grid);

    // 1. Draw Grid
    const step = 500;
    const gridStyle = { width: 2, color: 0x444466 }; 
    for (let x = 0; x <= w; x += step) {
      grid.moveTo(x, 0).lineTo(x, h).stroke(gridStyle);
    }
    for (let y = 0; y <= h; y += step) {
      grid.moveTo(0, y).lineTo(w, y).stroke(gridStyle);
    }

    // 2. Center Marker
    const center = new Graphics();
    center.circle(0, 0, 50).fill({ color: 0xff3366, alpha: 0.5 });
    center.position.set(w / 2, h / 2);
    container.addChild(center);

    // 3. Corners
    const colors = [0x33ff66, 0x3366ff, 0xffff33, 0xff33ff];
    const corners = [
      { x: 500, y: 500 },
      { x: w - 500, y: 500 },
      { x: 500, y: h - 500 },
      { x: w - 500, y: h - 500 }
    ];
    corners.forEach((c, i) => {
      const g = new Graphics();
      g.rect(-200, -200, 400, 400).fill({ color: colors[i], alpha: 0.8 });
      g.position.set(c.x, c.y);
      container.addChild(g);
    });
  }

  private static createHUD(container: Container): void {
    const style = new TextStyle({
      fill: 0x00ff00,
      fontSize: 24,
      fontFamily: 'monospace',
      dropShadow: { alpha: 0.5, blur: 4, color: 0x000000, distance: 2 }
    });

    this._lodText = new Text({ text: 'LOD: INIT', style });
    this._lodText.position.set(20, 80);
    container.addChild(this._lodText);
  }

  public static updateHUD(): void {
    if (!this._hudLayer || !this._hudLayer.visible || !this._lodText) return;
    const vp = cameraSystem.viewport;
    if (!vp) return;
    
    const lod = cameraSystem.getLOD();
    const zoom = vp.scale.x.toFixed(2);
    const x = Math.round(vp.center.x);
    const y = Math.round(vp.center.y);

    this._lodText.text = `CAMERA HUD:\nLOD: ${lod.toUpperCase()}\nZOOM: ${zoom}x\nPOS: ${x}, ${y}\nWORLD: ${vp.worldWidth}x${vp.worldHeight}`;
  }
}
