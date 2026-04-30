import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { IBackground } from './IBackground';
import type { PixiPersonaData } from '../bridges/PersonaBridge';
import { getPixiApp } from '../core/app';
import type { gsap as GsapType } from 'gsap';

/**
 * DefaultBackground 是 Alchemist (默认) Persona 的背景实现。
 */
export class DefaultBackground implements IBackground {
  public readonly label = 'DefaultBackground';
  private _container: Container | null = null;
  private _vignetteSprite: Sprite | null = null;

  public async init(
    container: Container,
    _viewport: Viewport,
    persona: PixiPersonaData
  ): Promise<void> {
    const app = getPixiApp();
    if (!app) return;

    this._container = new Container();
    this._container.label = this.label;
    container.addChild(this._container);

    const w = app.screen.width;
    const h = app.screen.height;

    // 1. Void Layer: 设置全局背景色
    app.renderer.background.color = persona.bgVoid;

    // 2. Vignette Layer: 离屏 Canvas 渐变 → Texture → Sprite (最可靠方案)
    this._vignetteSprite = this._createVignetteSprite(w, h, persona);
    this._container.addChild(this._vignetteSprite);

    console.log(`[DefaultBackground] Core layers (Void & Vignette) initialized`);
  }

  public enter(tl: GsapType.core.Timeline): void {
    if (!this._container) return;
    tl.fromTo(this._container, { alpha: 0 }, { alpha: 1, duration: 0.8, ease: 'power2.out' });
  }

  public exit(tl: GsapType.core.Timeline): void {
    if (!this._container) return;
    tl.to(this._container, { alpha: 0, duration: 0.6, ease: 'power2.in' });
  }

  public resize(w: number, h: number): void {
    // 仅拉伸 Sprite 尺寸以覆盖新分辨率，不需要重建纹理
    if (this._vignetteSprite) {
      this._vignetteSprite.width = w;
      this._vignetteSprite.height = h;
    }
  }

  public destroy(): void {
    if (this._vignetteSprite) {
      this._vignetteSprite.texture?.destroy(true);
      this._vignetteSprite = null;
    }
    if (this._container) {
      this._container.destroy({ children: true });
      this._container = null;
    }
    console.log(`[DefaultBackground] Destroyed`);
  }

  /**
   * 用离屏 Canvas 生成径向渐变暗角纹理，然后作为 Sprite 渲染。
   */
  private _createVignetteSprite(w: number, h: number, persona: PixiPersonaData): Sprite {
    // 离屏 Canvas — 固定 512x512 分辨率即可 (渐变缩放后依然平滑)
    const size = 512;
    const oc = document.createElement('canvas');
    oc.width = size;
    oc.height = size;
    const ctx = oc.getContext('2d')!;

    // 转换为 CSS 颜色字符串
    const color = new Color(persona.bgVoid);
    const cssColor = color.toRgbString();

    // 径向渐变：中心透明 → 边缘暗色
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');          // 中心透明
    grad.addColorStop(0.8,  cssColor.replace('rgb', 'rgba').replace(')', ', 0.5)'));   // 边缘半透明
    grad.addColorStop(1.0,  cssColor.replace('rgb', 'rgba').replace(')', ', 0.85)'));  // 边缘深色

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = Texture.from(oc);
    const sprite = new Sprite(texture);
    sprite.label = 'vignette-layer';
    sprite.width = w;
    sprite.height = h;

    return sprite;
  }
}
