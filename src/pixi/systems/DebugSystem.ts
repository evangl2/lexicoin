import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { getPixiApp } from '../core/globalApp';
import { WORLD_W as DEFAULT_W, WORLD_H as DEFAULT_H } from '@/config/canvas';
import { cameraSystem } from './CameraSystem';
import { aabbSystem } from './AABBSystem';

export class DebugSystem {
  private static _debugLayer: Container | null = null;
  private static _hudLayer: Container | null = null;
  private static _mockCard: Container | null = null;
  private static _mockCardLabel: Text | null = null;
  private static _lodText: Text | null = null;
  private static _isDraggingMock = false;
  private static _mockGridPos: { col: number, row: number } | null = null;

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

    // 3. 如果卡片存在，根据其逻辑坐标重算物理坐标 (实现“卡随表走”)
    if (this._mockCard && this._mockGridPos) {
      const newPos = aabbSystem.getCellCenter(this._mockGridPos.col, this._mockGridPos.row, width, height);
      this._mockCard.position.set(newPos.x, newPos.y);
    }

    // 4. 如果调试层开启，则重绘
    if (this._debugLayer && this._debugLayer.visible) {
      this._debugLayer.removeChildren();
      this.createVisuals(this._debugLayer);
    }
  }

  public static setMockCardEnabled(parent: Container, enabled: boolean) {
    if (enabled) {
      if (!this._mockCard) {
        this._mockCard = new Container();
        this._mockCard.label = 'debug-mock-card';
        this._mockCard.eventMode = 'static';
        this._mockCard.cursor = 'grab';

        const graphics = new Graphics();
        graphics.label = 'debug-mock-card-graphics';
        
        // 绘制参考卡片
        const w = 250;
        const h = 350;
        graphics.rect(-w/2, -h/2, w, h)
          .fill({ color: 0xC0A062, alpha: 0.2 })
          .stroke({ color: 0xF0D082, width: 2, alpha: 0.8 });
        
        graphics.moveTo(-10, 0).lineTo(10, 0).stroke({ color: 0xF0D082, width: 1 });
        graphics.moveTo(0, -10).lineTo(0, 10).stroke({ color: 0xF0D082, width: 1 });

        this._mockCard.addChild(graphics);

        this._mockCardLabel = new Text({
          text: '[0, 0]',
          style: { fill: 0xF0D082, fontSize: 14, fontFamily: 'monospace' }
        });
        this._mockCardLabel.anchor.set(0.5, -1.5);
        this._mockCard.addChild(this._mockCardLabel);

        // --- Drag Events ---
        this._mockCard.on('pointerdown', (e) => {
          this._isDraggingMock = true;
          this._mockCard!.cursor = 'grabbing';
          // 锁定 Viewport 防止拖拽卡片时视口也在动
          const vp = cameraSystem.viewport;
          if (vp) vp.plugins.pause('drag');
        });

        window.addEventListener('pointermove', (e) => {
          if (!this._isDraggingMock || !this._mockCard || !this._mockCard.parent) return;
          
          const vp = cameraSystem.viewport;
          if (!vp) return;

          // 将屏幕坐标转为世界坐标
          const worldPos = vp.toWorld(e.clientX, e.clientY);
          this._mockCard.position.set(worldPos.x, worldPos.y);
          
          if (this._mockCardLabel) {
            this._mockCardLabel.text = `DRAGGING...\nPOS: ${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`;
          }
        });

        window.addEventListener('pointerup', () => {
          if (!this._isDraggingMock || !this._mockCard) return;
          
          this._isDraggingMock = false;
          this._mockCard.cursor = 'grab';
          
          // 恢复 Viewport 拖拽
          const vp = cameraSystem.viewport;
          if (!vp) return;
          vp.plugins.resume('drag');

          // 执行吸附
          const snapped = aabbSystem.snapToGrid(this._mockCard.x, this._mockCard.y, vp.worldWidth, vp.worldHeight);
          const gridPos = aabbSystem.getGridPos(snapped.x, snapped.y, vp.worldWidth, vp.worldHeight);
          const isOccupied = aabbSystem.isCellOccupied(gridPos.col, gridPos.row);
          
          // 记录逻辑位置作为 Source of Truth
          this._mockGridPos = { col: gridPos.col, row: gridPos.row };
          
          this._mockCard.position.set(snapped.x, snapped.y);
          if (this._mockCardLabel) {
            const status = isOccupied ? '!! OCCUPIED !!' : 'FREE';
            this._mockCardLabel.text = `${status}\nREL_CELL: [${gridPos.col}, ${gridPos.row}]\nSNAP: ${Math.round(snapped.x)}, ${Math.round(snapped.y)}`;
            this._mockCardLabel.style.fill = isOccupied ? 0xff3333 : 0xF0D082;
          }

          const graphics = this._mockCard.getChildByLabel('debug-mock-card-graphics') as Graphics;
          if (graphics) {
            graphics.clear();
            const color = isOccupied ? 0xff0000 : 0xC0A062;
            graphics.rect(-125, -175, 250, 350)
              .fill({ color, alpha: 0.3 })
              .stroke({ color: isOccupied ? 0xff0000 : 0xF0D082, width: 2 });
          }
        });
      }
      
      const vp = cameraSystem.viewport;
      if (vp && !this._isDraggingMock) {
        const snapped = aabbSystem.snapToGrid(vp.worldWidth / 2, vp.worldHeight / 2, vp.worldWidth, vp.worldHeight);
        const gridPos = aabbSystem.getGridPos(snapped.x, snapped.y, vp.worldWidth, vp.worldHeight);
        this._mockCard.position.set(snapped.x, snapped.y);
        if (this._mockCardLabel) {
          this._mockCardLabel.text = `REL_CELL: [${gridPos.col}, ${gridPos.row}]\nSNAP: ${Math.round(snapped.x)}, ${Math.round(snapped.y)}`;
        }
      }
      
      parent.addChild(this._mockCard);
      this._mockCard.visible = true;
    } else if (this._mockCard) {
      this._mockCard.visible = false;
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

    // 1. Draw Grid (AABB 辅助参考线 - 对应顶点)
    const stepX = aabbSystem.CELL_W;
    const stepY = aabbSystem.CELL_H;
    const gridStyle = { width: 1, color: 0x444466, alpha: 0.4 }; 
    for (let x = 0; x <= w; x += stepX) {
      grid.moveTo(x, 0).lineTo(x, h).stroke(gridStyle);
    }
    for (let y = 0; y <= h; y += stepY) {
      grid.moveTo(0, y).lineTo(w, y).stroke(gridStyle);
    }

    // 1.5 Draw Occupied/Reserved Cells (基于相对索引遍历)
    const minCol = Math.floor((0 - w * 0.5) / stepX);
    const maxCol = Math.ceil((w - w * 0.5) / stepX);
    const minRow = Math.floor((0 - h * 0.5) / stepY);
    const maxRow = Math.ceil((h - h * 0.5) / stepY);

    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        if (aabbSystem.isCellOccupied(c, r)) {
          const bounds = aabbSystem.getCellBounds(c, r, w, h);
          grid.rect(bounds.left, bounds.top, stepX, stepY)
              .fill({ color: 0xff0000, alpha: 0.15 })
              .stroke({ color: 0xff0000, width: 1, alpha: 0.3 });
        }
      }
    }

    // 2. Center Marker
    const center = new Graphics();
    center.circle(0, 0, 50).fill({ color: 0xff3366, alpha: 0.3 });
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

  /**
   * 获取存储在 localStorage 中的渲染器偏好
   */
  public static getRendererPreference(): 'webgl' | 'webgpu' {
    return (localStorage.getItem('pixi-preference') as 'webgl' | 'webgpu') || 'webgpu';
  }

  /**
   * 设置渲染器偏好并刷新页面
   */
  public static setRendererPreference(pref: 'webgl' | 'webgpu'): void {
    localStorage.setItem('pixi-preference', pref);
    window.location.reload();
  }

  /**
   * 获取当前实际运行的渲染器类型
   */
  public static getActualRendererType(): 'WebGPU' | 'WebGL' | 'Unknown' {
    const app = getPixiApp();
    if (!app) return 'Unknown';
    // PixiJS v8: 0 为 WebGPU, 1 为 WebGL
    return app.renderer.type === 0 ? 'WebGPU' : 'WebGL';
  }
}
