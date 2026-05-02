
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

  private static instance: AABBSystem;

  private constructor() {}

  public static getInstance(): AABBSystem {
    if (!AABBSystem.instance) {
      AABBSystem.instance = new AABBSystem();
    }
    return AABBSystem.instance;
  }

  /**
   * 将世界坐标吸附到最近的网格单元中心
   * 此处点阵（Dots）作为 AABB 的四个顶点
   */
  public snapToGrid(x: number, y: number): Point {
    const col = Math.floor(x / this.CELL_W);
    const row = Math.floor(y / this.CELL_H);
    
    return {
      x: (col + 0.5) * this.CELL_W,
      y: (row + 0.5) * this.CELL_H
    };
  }

  /**
   * 获取坐标所属的网格单元索引
   */
  public getGridPos(x: number, y: number): GridPos {
    return {
      col: Math.floor(x / this.CELL_W),
      row: Math.floor(y / this.CELL_H)
    };
  }

  /**
   * 获取指定单元格的中心世界坐标
   */
  public getCellCenter(col: number, row: number): Point {
    return {
      x: (col + 0.5) * this.CELL_W,
      y: (row + 0.5) * this.CELL_H
    };
  }

  /**
   * 获取指定单元格的 AABB 包围盒 (世界坐标)
   */
  public getCellBounds(col: number, row: number) {
    const center = this.getCellCenter(col, row);
    
    return {
      left: center.x - this.CELL_W / 2,
      right: center.x + this.CELL_W / 2,
      top: center.y - this.CELL_H / 2,
      bottom: center.y + this.CELL_H / 2
    };
  }
}

export const aabbSystem = AABBSystem.getInstance();
