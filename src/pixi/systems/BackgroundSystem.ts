import { Container, type Application } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import { personaBridge, type PixiPersonaData } from '../bridges/PersonaBridge';
import type { IBackground } from '../backgrounds/IBackground';
import { DefaultBackground } from '../backgrounds/DefaultBackground';
import gsap from 'gsap';

class BackgroundSystem {
  private _app: Application | null = null;
  private _viewport: Viewport | null = null;
  private _rootContainer: Container | null = null;
  
  private _currentBackground: IBackground | null = null;
  private _isTransitioning = false;
  private _pendingPersona: PixiPersonaData | null = null;
  
  private _unsubscribe: (() => void) | null = null;

  private static instance: BackgroundSystem;

  private constructor() {}

  public static getInstance(): BackgroundSystem {
    if (!BackgroundSystem.instance) {
      BackgroundSystem.instance = new BackgroundSystem();
    }
    return BackgroundSystem.instance;
  }

  /**
   * 初始化背景系统。
   * @param app Pixi 应用实例
   * @param viewport Viewport 实例
   */
  public init(app: Application, viewport: Viewport): void {
    this._app = app;
    this._viewport = viewport;

    // 创建背景专用根容器，插入在 stage 的最底层 (index 0)
    this._rootContainer = new Container();
    this._rootContainer.label = 'background-root';
    // 注意：如果有 placeholder 背景，app.ts 应该先清理它
    this._app.stage.addChildAt(this._rootContainer, 0);

    // 订阅 Persona 变化（包括 React 侧 Bridge 首次推送）
    this._unsubscribe = personaBridge.onChange((data) => this.switchTo(data));

    // 如果初始化时已经有数据（React bridge 先执行），立即同步
    // 如果没有（更常见的情况），等 React bridge 的 onChange 触发
    const initialData = personaBridge.getData();
    if (initialData) {
      this.switchTo(initialData);
    } else {
      // React 的 useEffect 还没执行，使用硬编码的 Default fallback 先渲染
      // 等 personaBridge.onChange 触发后会自动切换到真实 Persona
      this.switchTo({
        theme: 'default',
        bgVoid: 0x0a0502,
        primary: 0xd4af37,
        secondary: 0x5d4c26,
        accent: 0xe8c96d,
      });
    }
  }

  /**
   * 切换到指定的 Persona 背景。
   */
  public async switchTo(persona: PixiPersonaData): Promise<void> {
    if (!this._app || !this._viewport || !this._rootContainer) return;

    // 如果正在转场中，记录待处理的 Persona，防止竞态
    if (this._isTransitioning) {
      this._pendingPersona = persona;
      return;
    }

    // 如果主题没变，且已经有背景，则跳过
    // 注意：label 是类级别的，不随 persona 变化，这里改为比较 theme
    if (this._currentBackground && this._currentBackground.label === this._getBackgroundLabel(persona.theme) && !this._isTransitioning) {
      return;
    }

    this._isTransitioning = true;
    console.log(`[BackgroundSystem] Switching to ${persona.theme}...`);

    try {
      // 1. 实例化新背景
      const NewBgClass = this._resolveBackgroundClass(persona.theme);
      const newBackground = new NewBgClass();
      
      // 2. 异步初始化新背景（加载资源等）
      await newBackground.init(this._rootContainer, this._viewport, persona);

      // 3. 执行转场动画
      const tl = gsap.timeline({
        onComplete: () => {
          // 4. 清理旧背景
          if (oldBackground) {
            oldBackground.destroy();
          }
          this._currentBackground = newBackground;
          this._isTransitioning = false;
          
          // 5. 检查是否有堆积的切换请求
          if (this._pendingPersona) {
            const next = this._pendingPersona;
            this._pendingPersona = null;
            this.switchTo(next);
          }
        }
      });

      const oldBackground = this._currentBackground;
      
      // 旧背景淡出，新背景淡入
      if (oldBackground) {
        oldBackground.exit(tl);
      }
      newBackground.enter(tl);

    } catch (error) {
      console.error('[BackgroundSystem] Failed to switch background:', error);
      this._isTransitioning = false;
    }
  }

  public resize(w: number, h: number): void {
    this._currentBackground?.resize(w, h);
  }

  public update(delta: number): void {
    this._currentBackground?.update?.(delta);
  }

  public destroy(): void {
    this._unsubscribe?.();
    this._unsubscribe = null;
    
    this._currentBackground?.destroy();
    this._currentBackground = null;
    
    if (this._rootContainer) {
      this._rootContainer.destroy({ children: true });
      this._rootContainer = null;
    }
    
    this._app = null;
    this._viewport = null;
  }

  private _resolveBackgroundClass(theme: string): new () => IBackground {
    // 目前只有 DefaultBackground，未来在这里添加逻辑分支
    switch (theme) {
      default:
        return DefaultBackground;
    }
  }

  private _getBackgroundLabel(theme: string): string {
    switch (theme) {
      default:
        return 'DefaultBackground';
    }
  }
}

export const backgroundSystem = BackgroundSystem.getInstance();
