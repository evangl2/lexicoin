
export interface GridPos {
  col: number;
  row: number;
}

export interface Point {
  x: number;
  y: number;
}

class AABBSystem {
  // 网格单元尺寸 (与 Shader 保持严格一致)
  public readonly CELL_W = 275;
  public readonly CELL_H = 385;

  private _reservedCells: Set<string> = new Set();
  private static instance: AABBSystem;

  private constructor() {}

  public static getInstance(): AABBSystem {
    if (!AABBSystem.instance) {
      AABBSystem.instance = new AABBSystem();
    }
    return AABBSystem.instance;
  }

  private _getCellKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  /**
   * 预留/占用指定的网格区域 (使用中心相对索引)
   */
  public reserveCells(col: number, row: number, width: number, height: number): void {
    for (let c = col; c < col + width; c++) {
      for (let r = row; r < row + height; r++) {
        this._reservedCells.add(this._getCellKey(c, r));
      }
    }
  }

  public isCellOccupied(col: number, row: number): boolean {
    return this._reservedCells.has(this._getCellKey(col, row));
  }

  public clearOccupancy(): void {
    this._reservedCells.clear();
  }

  /**
   * 将世界坐标吸附到最近的网格单元中心 (中心归一化)
   */
  public snapToGrid(x: number, y: number, worldW: number, worldH: number): Point {
    const midX = worldW * 0.5;
    const midY = worldH * 0.5;
    
    const col = Math.floor((x - midX) / this.CELL_W);
    const row = Math.floor((y - midY) / this.CELL_H);
    
    return this.getCellCenter(col, row, worldW, worldH);
  }

  /**
   * 获取相对于世界中心的网格索引
   * 中心右下方的第一个格子为 [0, 0], 左上方为 [-1, -1]
   */
  public getGridPos(x: number, y: number, worldW: number, worldH: number): GridPos {
    return {
      col: Math.floor((x - (worldW * 0.5)) / this.CELL_W),
      row: Math.floor((y - (worldH * 0.5)) / this.CELL_H)
    };
  }

  /**
   * 获取指定索引的单元格中心世界坐标
   */
  public getCellCenter(col: number, row: number, worldW: number, worldH: number): Point {
    const midX = worldW * 0.5;
    const midY = worldH * 0.5;

    return {
      x: midX + (col + 0.5) * this.CELL_W,
      y: midY + (row + 0.5) * this.CELL_H
    };
  }

  /**
   * 获取指定单元格的 AABB 包围盒 (世界坐标)
   */
  public getCellBounds(col: number, row: number, worldW: number, worldH: number) {
    const center = this.getCellCenter(col, row, worldW, worldH);
    
    return {
      left: center.x - this.CELL_W / 2,
      right: center.x + this.CELL_W / 2,
      top: center.y - this.CELL_H / 2,
      bottom: center.y + this.CELL_H / 2
    };
  }
}

export const aabbSystem = AABBSystem.getInstance();
