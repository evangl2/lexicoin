/**
 * PixiPersonaData 定义了 PixiJS 侧消费的主题数据结构。
 * 这些数据由 React 侧的 PixiPersonaBridge 组件根据业务状态计算并推送。
 */
export interface PixiPersonaData {
  theme: string;           // 'default' | 'cyberpunk' 等
  bgVoid: number;          // 核心底色
  primary: number;         // 装饰色
  secondary: number;       // 辅助装饰色
  accent: number;          // 强调色
  scriptTexture?: string;  // 背景纹理 URL
}

type PersonaChangeListener = (data: PixiPersonaData) => void;

class PersonaBridge {
  private _currentData: PixiPersonaData | null = null;
  private _listeners: Set<PersonaChangeListener> = new Set();

  /**
   * 获取当前的 Persona 数据。
   */
  public getData(): PixiPersonaData | null {
    return this._currentData;
  }

  /**
   * 更新 Persona 数据。由 React 侧调用。
   */
  public setData(data: PixiPersonaData): void {
    // 简单的浅比较，避免冗余更新
    if (this._isEqual(this._currentData, data)) return;

    this._currentData = data;
    this._listeners.forEach(fn => fn(data));
  }

  /**
   * 订阅 Persona 变化。
   * @returns 取消订阅的函数
   */
  public onChange(fn: PersonaChangeListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _isEqual(a: PixiPersonaData | null, b: PixiPersonaData): boolean {
    if (!a) return false;
    // 使用 JSON 序列化进行稳健的配置对比，避免未来增加字段时遗漏
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

export const personaBridge = new PersonaBridge();
