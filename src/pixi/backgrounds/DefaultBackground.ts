import { Container, Sprite, Texture, Graphics, Filter, Color } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { IBackground } from './IBackground';
import type { PixiPersonaData } from '../bridges/PersonaBridge';
import { getPixiApp } from '../core/app';
import { cameraSystem } from '../systems/CameraSystem';
import type { gsap as GsapType } from 'gsap';

/**
 * DefaultBackground 是 Alchemist (默认) Persona 的背景实现。
 */
export class DefaultBackground implements IBackground {
  public readonly label = 'DefaultBackground';
  private _container: Container | null = null;
  private _gridGraphics: Graphics | null = null;
  private _gridFilter: Filter | null = null;

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

    // 1. Void Layer
    app.renderer.background.color = 0x141C1D; // 设置一个极深的底色作为兜底

    // 2. Grid Layer (Using Filter for maximum stability)
    this._gridFilter = this._createGridFilter(w, h, persona);
    this._gridGraphics = new Graphics().rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0 });
    this._gridGraphics.label = 'grid-layer';
    this._gridGraphics.filters = [this._gridFilter];
    this._container.addChild(this._gridGraphics);

    console.log(`[DefaultBackground] Initialized with Grid Filter (World Space Vignette)`);
  }

  public enter(tl: GsapType.core.Timeline): void {
    if (!this._container) return;
    tl.fromTo(this._container, { alpha: 0 }, { alpha: 1, duration: 0.8, ease: 'power2.out' });
  }

  public exit(tl: GsapType.core.Timeline): void {
    if (!this._container) return;
    tl.to(this._container, { alpha: 0, duration: 0.6, ease: 'power2.in' });
  }

  public update(_delta: number): void {
    if (!this._gridFilter) return;

    const viewport = cameraSystem.viewport;
    if (!viewport) return;

    // 直接在 filter.resources 上更新
    const uniforms = this._gridFilter.resources.gridUniforms.uniforms;

    // 获取内容层的 Peeking 偏移量 (contentLayer.x 是世界单位)
    const peekX = cameraSystem.contentLayer?.x || 0;
    const peekY = cameraSystem.contentLayer?.y || 0;

    uniforms.uViewPos = [viewport.center.x - peekX, viewport.center.y - peekY];
    uniforms.uZoom = viewport.scale.x;
    uniforms.uWorldSize = [viewport.worldWidth, viewport.worldHeight];
  }

  public resize(w: number, h: number): void {
    if (this._gridGraphics) {
      // 填充透明颜色，确保 Filter 能够覆盖全屏但背景不产生颜色
      this._gridGraphics.clear().rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 0 });
      if (this._gridFilter) {
        this._gridFilter.resources.gridUniforms.uniforms.uResolution = [w, h];
      }
    }
  }

  public destroy(): void {
    if (this._gridGraphics) {
      this._gridGraphics.destroy({ children: true });
      this._gridGraphics = null;
    }
    this._gridFilter = null;
    if (this._container) {
      this._container.destroy({ children: true });
      this._container = null;
    }
    console.log(`[DefaultBackground] Destroyed`);
  }

  /**
   * 创建基于 Filter 的网格着色器
   */
  private _createGridFilter(w: number, h: number, persona: PixiPersonaData): Filter {
    const fragmentSrc = `
    const fragmentSrc = `
        // PixiJS v8 自动注入 precision 和 varying，此处不再手动声明
        uniform vec2 uResolution;
        uniform vec2 uViewPos;
        uniform vec2 uWorldSize;
        uniform float uZoom;
        uniform vec4 uGridColor;
        uniform vec4 uVoidColor;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        vec3 drawMetallicBackground(vec2 worldPos, vec3 baseColor) {
            float n = hash(vec2(worldPos.x * 0.1, floor(worldPos.y * 5.0)));
            float val = (n - 0.5) * 0.03 + sin(worldPos.x * 0.0005 + worldPos.y * 0.0003) * 0.02;
            
            // 显式构造 vec3 以兼容所有 WebGL 版本
            return baseColor + vec3(val, val, val);
        }

        // 高级炼金四角星符文 (The Alchemist's Tetragrammaton)
        float drawRuneDot(vec2 worldPos, vec2 gridSize, float scale) {
            vec2 p = (fract(worldPos / gridSize + 0.5) - 0.5) * gridSize;
            float blur = 1.0 / uZoom;
            
            // 1. 锐利四角星 (使用凹面曲线 x^0.5 + y^0.5 = r^0.5)
            // 这种形状比普通菱形更尖锐、更有高级感
            float astroidDist = pow(sqrt(abs(p.x)) + sqrt(abs(p.y)), 2.0);
            float star = smoothstep(10.0 + blur, 5.0, astroidDist);
            
            // 2. 中心镂空效果
            float d = length(p);
            float hollow = smoothstep(1.2, 1.2 + blur, d);
            float starWithHole = star * hollow;
            
            // 3. 极细约束圆环 (修正：中心必须镂空)
            float ringRadius = 6.5;
            float ringThickness = 0.8;
            float ring = smoothstep(ringRadius + ringThickness + blur, ringRadius + ringThickness, d) 
                       - smoothstep(ringRadius + blur, ringRadius, d);
            
            // 3.5 第二层真正的空心细环 (半径 7)
            float ring2 = smoothstep(8.5 + 0.4 + blur, 8.5 + 0.4, d) - smoothstep(8.0 + blur, 8.0, d);
            
            // 4. 四角端点锚纹 (Cardinal Accents)
            vec2 absP = abs(p);
            float accents = smoothstep(0.6 + blur, 0.6, length(absP - vec2(11.0, 0.0))) +
                            smoothstep(1.0 + blur, 1.0, length(absP - vec2(0.0, 11.0)));
            
            // 混合：星形核心 + 圆环 + 端点
            float finalIntensity = starWithHole * 0.8 + ring * 0.08 + ring2 * 0.3 + accents * 0.4;
            
            return finalIntensity * scale * 0.9; // 全局近景淡化
        }

        // 远景层：全局天体轨道模式 (The Celestial Sphere)
        float drawCelestialPattern(vec2 worldPos) {
            vec2 center = uWorldSize * 0.5;
            float d = length(worldPos - center);
            float blur = 1.0 / uZoom;
            
            // 1. 宏大主轨道 (每 1500 世界单位一个大环)
            float ring1 = smoothstep(0.995, 1.0, sin(d * 0.004)); 
            
            // 2. 精密谐波环 (间距更密，作为装饰)
            float ring2 = smoothstep(0.998, 1.0, sin(d * 0.02)) * 0.4;
            
            // 3. 中心区域的强化阵法 (只在中心 3000 像素范围内出现)
            float innerCore = smoothstep(3000.0, 0.0, d) * smoothstep(0.99, 1.0, sin(d * 0.08)) * 0.3;
            
            // 4. 远景亮度衰减
            float intensity = (ring1 + ring2 + innerCore);
            
            return intensity * 0.3;
        }

        void main() {
            // 使用 vTextureCoord 替代 gl_FragCoord 以避免部分驱动下的保留字 Bug
            vec2 worldPos = (vTextureCoord * uResolution - uResolution * 0.5) / uZoom + uViewPos;
            
            // 边界裁剪：超出世界范围则不显示
            if (worldPos.x < 0.0 || worldPos.x > uWorldSize.x || worldPos.y < 0.0 || worldPos.y > uWorldSize.y) {
                gl_FragColor = vec4(0.0);
                return;
            }

            // LOD 混合逻辑
            vec2 closeSize = vec2(275.0, 385.0);
            float lod = smoothstep(0.4, 0.45, uZoom);
            
            float intensityClose = drawRuneDot(worldPos, closeSize, 1.0);
            float intensityFar = drawCelestialPattern(worldPos);
            
            float intensity = mix(intensityFar, intensityClose, lod);
            
            // 5. 世界空间暗角
            vec2 normWorld = worldPos / uWorldSize;
            vec2 vDist = abs(normWorld - 0.5) * 2.0;
            float vignette = 1.0 - smoothstep(0.7, 1.05, max(vDist.x, vDist.y));
            
            // 6. 融合
            vec3 background = drawMetallicBackground(worldPos, uVoidColor.rgb);
            float weight = intensity * uGridColor.a * vignette;
            vec3 finalColor = mix(background, uGridColor.rgb, weight);
            
            gl_FragColor = vec4(finalColor.r, finalColor.g, finalColor.b, 1.0);
        }
    `;

    const color = new Color(persona.primary);
    const bgColor = new Color(persona.bgVoid);

    return Filter.from({
      gpu: {
        vertex: {
          source: `
                    struct VertexOutput {
                        @builtin(position) position: vec4<f32>,
                        @location(0) uv: vec2<f32>,
                    }
                    @vertex
                    fn main(@location(0) aPosition: vec2<f32>) -> VertexOutput {
                        var out: VertexOutput;
                        out.position = vec4<f32>(aPosition * 2.0 - 1.0, 0.0, 1.0);
                        out.uv = aPosition;
                        return out;
                    }
                `,
          entryPoint: 'main',
        },
        fragment: {
          source: `
                    struct GridUniforms {
                        uResolution: vec2<f32>,
                        uViewPos: vec2<f32>,
                        uWorldSize: vec2<f32>,
                        uZoom: f32,
                        uGridColor: vec4<f32>,
                        uVoidColor: vec4<f32>,
                    }

                    @group(1) @binding(0) var<uniform> grid: GridUniforms;

                    fn hash(p: vec2<f32>) -> f32 {
                        return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453);
                    }

                    fn drawMetallicBackground(worldPos: vec2<f32>, baseColor: vec3<f32>) -> vec3<f32> {
                        let n = hash(vec2<f32>(worldPos.x * 0.1, floor(worldPos.y * 5.0)));
                        let val = (n - 0.5) * 0.03 + sin(worldPos.x * 0.0005 + worldPos.y * 0.0003) * 0.02;
                        return baseColor + vec3<f32>(val, val, val);
                    }

                    fn drawRuneDot(worldPos: vec2<f32>, gridSize: vec2<f32>, scale: f32) -> f32 {
                        let p = (fract(worldPos / gridSize + 0.5) - 0.5) * gridSize;
                        let blur = 1.0 / grid.uZoom;
                        
                        let astroidDist = pow(sqrt(abs(p.x)) + sqrt(abs(p.y)), 2.0);
                        let star = smoothstep(10.0 + blur, 5.0, astroidDist);
                        
                        let d = length(p);
                        let hollow = smoothstep(1.2, 1.2 + blur, d);
                        let starWithHole = star * hollow;
                        
                        // 3. Ring 1 (Hollow Fix)
                        let ringR: f32 = 6.5;
                        let ringT: f32 = 0.8;
                        let ring = smoothstep(ringR + ringT + blur, ringR + ringT, d) 
                                 - smoothstep(ringR + blur, ringR, d);
                        
                        let ring2 = smoothstep(7.0 + 0.4 + blur, 7.0 + 0.4, d) - smoothstep(7.0 + blur, 7.0, d);
                        
                        let absP = abs(p);
                        let accX = smoothstep(0.6 + blur, 0.6, length(absP - vec2<f32>(11.0, 0.0)));
                        let accY = smoothstep(1.0 + blur, 1.0, length(absP - vec2<f32>(0.0, 11.0)));
                        let accents = accX + accY;
                        
                        return (starWithHole * 0.8 + ring * 0.08 + ring2 * 0.3 + accents * 0.4) * scale * 0.9;
                    }

                    fn drawCelestialPattern(worldPos: vec2<f32>) -> f32 {
                        let center = grid.uWorldSize * 0.5;
                        let d = length(worldPos - center);
                        
                        let ring1 = smoothstep(0.995, 1.0, sin(d * 0.004));
                        let ring2 = smoothstep(0.998, 1.0, sin(d * 0.02)) * 0.4;
                        let inner = smoothstep(3000.0, 0.0, d) * smoothstep(0.99, 1.0, sin(d * 0.08)) * 0.3;
                        
                        return (ring1 + ring2 + inner) * 0.3;
                    }

                    @fragment
                    fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
                        let worldPos = (pos.xy - grid.uResolution * 0.5) / grid.uZoom + grid.uViewPos;
                        
                        if (worldPos.x < 0.0 || worldPos.x > grid.uWorldSize.x || worldPos.y < 0.0 || worldPos.y > grid.uWorldSize.y) {
                            return vec4<f32>(0.0);
                        }
                        
                        let closeSize = vec2<f32>(275.0, 385.0);
                        let lod = smoothstep(0.4, 0.45, grid.uZoom);
                        
                        let intensityClose = drawRuneDot(worldPos, closeSize, 1.0);
                        let intensityFar = drawCelestialPattern(worldPos);
                        
                        let intensity = mix(intensityFar, intensityClose, lod);
                        
                        // 5. World Space Vignette
                        let normWorld = worldPos / grid.uWorldSize;
                        let vDist = abs(normWorld - 0.5) * 2.0;
                        let vignette = 1.0 - smoothstep(0.7, 1.05, max(vDist.x, vDist.y));
                        
                        // 6. Merge Metallic Background & Rune
                        let bgColor = drawMetallicBackground(worldPos, grid.uVoidColor.rgb);
                        let finalColor = mix(bgColor, grid.uGridColor.rgb, intensity * grid.uGridColor.a * vignette);
                        
                        return vec4<f32>(finalColor, 1.0);
                    }
                `,
          entryPoint: 'main',
        }
      },
      gl: {
        vertex: `
                attribute vec2 aPosition;
                varying vec2 vTextureCoord;
                void main(void) {
                    vTextureCoord = aPosition;
                    gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
                }
            `,
        fragment: fragmentSrc,
      },
      resources: {
        gridUniforms: {
          uResolution: { value: [w, h], type: 'vec2<f32>' },
          uViewPos: { value: [0, 0], type: 'vec2<f32>' },
          uWorldSize: { value: [2000, 2000], type: 'vec2<f32>' },
          uZoom: { value: 1.0, type: 'f32' },
          uGridColor: { value: [...color.toRgbArray(), 0.8], type: 'vec4<f32>' },
          uVoidColor: { value: [0.10, 0.14, 0.15, 1.0], type: 'vec4<f32>' },
        }
      }
    });
  }
}
