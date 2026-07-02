import { Container, Color, Mesh, Geometry, Shader, UniformGroup, Buffer } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { IBackground } from './IBackground';
import type { PixiPersonaData } from '../bridges/PersonaBridge';
import { getPixiApp } from '../core/globalApp';
import { cameraSystem } from '../systems/CameraSystem';
import { WORLD_W, WORLD_H } from '@/config/canvas';
import type { gsap } from 'gsap';
import { CenterpieceDecal } from './CenterpieceDecal';

/**
 * DefaultBackground 是 Alchemist (默认) Persona 的背景实现。
 */
export class DefaultBackground implements IBackground {
  public readonly label = 'DefaultBackground';
  private _container: Container | null = null;
  private _gridMesh: Mesh<any, any> | null = null;
  private _persona: PixiPersonaData | null = null;
  private _centerpiece: CenterpieceDecal | null = null;
  private _time = 0;

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

    this._persona = persona;
    this._container = new Container();
    this._container.label = 'BackgroundContainer';

    // 创建全屏 Mesh
    this._gridMesh = this._createGridMesh(w, h, persona);
    this._container.addChild(this._gridMesh);

    // 背景置于最底层
    container.addChildAt(this._container, 0);

    // Centerpiece: texture-based
    // 增加延迟检测，确保 CameraSystem 的内容层已准备就绪
    const tryInitCenterpiece = async () => {
      const contentLayer = cameraSystem.contentLayer;
      console.log('[DefaultBackground] Checking contentLayer:', !!contentLayer);
      
      if (contentLayer) {
        this._centerpiece = new CenterpieceDecal();
        console.log('[DefaultBackground] Centerpiece ready.');
        await this._centerpiece.init(_viewport, contentLayer);
      } else {
        // 静默重试，不再发送警告
        setTimeout(tryInitCenterpiece, 100);
      }
    };

    tryInitCenterpiece();

    // 初始化位置
    this.update(0);
  }

  public enter(tl: gsap.core.Timeline): void {
    if (!this._container) return;
    tl.fromTo(this._container, { alpha: 0 }, { alpha: 1, duration: 0.8, ease: 'power2.out' });
    this._centerpiece?.enter(tl);
  }

  public exit(tl: gsap.core.Timeline): void {
    if (!this._container) return;
    tl.to(this._container, { alpha: 0, duration: 0.6, ease: 'power2.in' });
    this._centerpiece?.exit(tl);
  }

  public update(delta: number): void {
    if (!this._gridMesh) return;
    const viewport = cameraSystem.viewport;
    if (!viewport) return;

    this._time += delta * 0.02;

    const uniforms = this._gridMesh.shader.resources.grid.uniforms;

    // 获取内容层的 Peeking 偏移量 (contentLayer.x 是世界单位)
    const peekX = cameraSystem.contentLayer?.x || 0;
    const peekY = cameraSystem.contentLayer?.y || 0;

    uniforms.uViewPos = [viewport.center.x - peekX, viewport.center.y - peekY];
    uniforms.uZoom = viewport.scale.x;
    uniforms.uWorldSize = [WORLD_W, WORLD_H];
    uniforms.uCurrentWorldSize = [viewport.worldWidth, viewport.worldHeight];
    uniforms.uTime = this._time;

    this._centerpiece?.update(delta);
  }

  public resize(w: number, h: number): void {
    if (this._gridMesh) {
      // 更新 Mesh 顶点位置，覆盖全屏
      const geometry = this._gridMesh.geometry;
      const positions = new Float32Array([
        0, 0,
        w, 0,
        w, h,
        0, h
      ]);
      geometry.getBuffer('aPosition').data = positions;
      
      // 更新分辨率 Uniform
      this._gridMesh.shader.resources.grid.uniforms.uResolution = [w, h];
    }
  }

  public destroy(): void {
    this._centerpiece?.destroy();
    this._centerpiece = null;

    if (this._gridMesh) {
      this._gridMesh.destroy({ children: true, texture: true, context: true });
      this._gridMesh = null;
    }
    if (this._container) {
      this._container.destroy({ children: true });
      this._container = null;
    }
    console.log(`[DefaultBackground] Mesh Background Destroyed`);
  }

  /**
   * 创建基于 Mesh 的网格渲染器
   */
  private _createGridMesh(w: number, h: number, persona: PixiPersonaData): Mesh<any, any> {
    const color = new Color(persona.primary);
    const bgColor = new Color(persona.bgVoid);

    // 1. WebGPU Shader (WGSL)







    // --- WebGPU Shader (WGSL) ---
    const vertexSrc = `
        struct GridUniforms {
            uResolution: vec2<f32>,
            uViewPos: vec2<f32>,
            uWorldSize: vec2<f32>,
            uCurrentWorldSize: vec2<f32>,
            uZoom: f32,
            uTime: f32,
            uColor: vec4<f32>,
            uBgColor: vec4<f32>,
        }
        @group(1) @binding(0) var<uniform> grid: GridUniforms;

        struct VertexOutput {
            @builtin(position) position: vec4<f32>,
            @location(0) vPosition: vec2<f32>,
        }

        @vertex
        fn main(@location(0) aPosition: vec2<f32>) -> VertexOutput {
            var out: VertexOutput;
            out.vPosition = aPosition;
            let pos = (aPosition / grid.uResolution) * 2.0 - 1.0;
            out.position = vec4<f32>(pos.x, -pos.y, 0.0, 1.0);
            return out;
        }
    `;

    const fragmentSrc = `
        struct GridUniforms {
            uResolution: vec2<f32>,
            uViewPos: vec2<f32>,
            uWorldSize: vec2<f32>,
            uCurrentWorldSize: vec2<f32>,
            uZoom: f32,
            uTime: f32,
            uColor: vec4<f32>,
            uBgColor: vec4<f32>,
        }
        @group(1) @binding(0) var<uniform> grid: GridUniforms;

        fn sdCircle(p: vec2<f32>, r: f32) -> f32 { return length(p) - r; }
        fn drawSmoothLine(d: f32, thickness: f32) -> f32 {
            let blur = 1.5 / grid.uZoom;
            return smoothstep(thickness + blur, thickness, abs(d));
        }

        fn drawRulerTicks(relPos: vec2<f32>, halfSize: vec2<f32>) -> f32 {
            var intensity: f32 = 0.0;
            let edgeDistX = abs(abs(relPos.x) - halfSize.x);
            let edgeDistY = abs(abs(relPos.y) - halfSize.y);

            // 1. Etched Borders
            intensity += drawSmoothLine(edgeDistX, 0.5) * step(abs(relPos.y), halfSize.y);
            intensity += drawSmoothLine(edgeDistY, 0.5) * step(abs(relPos.x), halfSize.x);
            intensity += drawSmoothLine(edgeDistX - 3.0, 0.2) * step(abs(relPos.y), halfSize.y) * 0.5;
            intensity += drawSmoothLine(edgeDistY - 3.0, 0.2) * step(abs(relPos.x), halfSize.x) * 0.5;

            // 2. Horizontal Ticks
            if (edgeDistY < 25.0 && abs(relPos.x) <= halfSize.x) {
                let tickIndex = floor(relPos.x / 275.0 + 0.5);
                let tickX = (relPos.x - tickIndex * 275.0);
                let isEven = 1.0 - abs(tickIndex % 2.0);
                let tickLen = mix(10.0, 20.0, isEven);
                intensity += drawSmoothLine(tickX, 0.8) * step(edgeDistY, tickLen);
            }

            // 3. Vertical Ticks
            if (edgeDistX < 25.0 && abs(relPos.y) <= halfSize.y) {
                let tickIndex = floor(relPos.y / 385.0 + 0.5);
                let tickY = (relPos.y - tickIndex * 385.0);
                let isEven = 1.0 - abs(tickIndex % 2.0);
                let tickLen = mix(10.0, 20.0, isEven);
                intensity += drawSmoothLine(tickY, 0.8) * step(edgeDistX, tickLen);
            }

            return intensity;
        }

        fn drawRuneDot(worldPos: vec2<f32>, gridSize: vec2<f32>, scale: f32) -> f32 {
            let p = (fract(worldPos / gridSize + 0.5) - 0.5) * gridSize;
            let blur = 1.0 / grid.uZoom;
            let astroidDist = pow(sqrt(abs(p.x)) + sqrt(abs(p.y)), 2.0);
            let star = smoothstep(10.0 + blur, 5.0, astroidDist);
            let d = length(p);
            let hollow = smoothstep(1.2, 1.2 + blur, d);
            let starWithHole = star * hollow;
            let ringR: f32 = 6.5;
            let ringT: f32 = 0.8;
            let ring = smoothstep(ringR + ringT + blur, ringR + ringT, d) 
                     - smoothstep(ringR + blur, ringR, d);
            let ring2 = smoothstep(8.5 + 0.4 + blur, 8.5 + 0.4, d) - smoothstep(8.0 + blur, 8.0, d);
            let absP = abs(p);
            let accents = smoothstep(0.6 + blur, 0.6, length(absP - vec2<f32>(11.0, 0.0))) +
                            smoothstep(1.0 + blur, 1.0, length(absP - vec2<f32>(0.0, 11.0)));
            return (starWithHole * 0.8 + ring * 0.08 + ring2 * 0.3 + accents * 0.4) * scale * 0.9;
        }

        fn sdBox(p: vec2<f32>, b: vec2<f32>) -> f32 {
            let d = abs(p) - b;
            return length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
        }

        fn sdEquilateralTriangle(p_in: vec2<f32>, r: f32) -> f32 {
            let k = sqrt(3.0);
            var p = p_in;
            p.x = abs(p.x) - r;
            p.y = p.y + r / k;
            if (p.x + k * p.y > 0.0) {
                p = vec2<f32>(p.x - k * p.y, -k * p.x - p.y) / 2.0;
            }
            p.x -= clamp(p.x, -2.0 * r, 0.0);
            return -length(p) * sign(p.y);
        }

        fn drawCornerGuard(p_in: vec2<f32>, typeIdx: i32, cornerIdx: i32) -> f32 {
            var p = p_in;
            if (cornerIdx == 1) { p = vec2<f32>(-p_in.x, p_in.y); }
            if (cornerIdx == 2) { p = vec2<f32>(p_in.x, -p_in.y); }
            if (cornerIdx == 3) { p = vec2<f32>(-p_in.x, -p_in.y); }
            
            let size: f32 = 60.0;
            var intensity: f32 = 0.0;
            
            // 1. 顶点定位点 (Vertex Anchor)
            let anchor = sdBox(p - vec2<f32>(4.0, 4.0), vec2<f32>(1.5, 1.5));
            intensity += drawSmoothLine(anchor, 0.4);

            // 2. 双重平行蚀刻线 (Dual Etched Lines)
            let lineH1 = sdBox(p - vec2<f32>(size * 0.5 + 4.0, 4.0), vec2<f32>(size * 0.5, 0.3));
            let lineH2 = sdBox(p - vec2<f32>(size * 0.4 + 4.0, 7.5), vec2<f32>(size * 0.4, 0.15));
            let lineV1 = sdBox(p - vec2<f32>(4.0, size * 0.5 + 4.0), vec2<f32>(0.3, size * 0.5));
            let lineV2 = sdBox(p - vec2<f32>(7.5, size * 0.4 + 4.0), vec2<f32>(0.15, size * 0.4));
            
            intensity = max(intensity, max(drawSmoothLine(lineH1, 0.5), drawSmoothLine(lineH2, 0.2)));
            intensity = max(intensity, max(drawSmoothLine(lineV1, 0.5), drawSmoothLine(lineV2, 0.2)));
            
            // 3. 秘文刻度 (Cipher Ticks)
            for (var i: f32 = 0.0; i < 4.0; i += 1.0) {
                let tickX = 15.0 + i * 12.0;
                let tickD = sdBox(p - vec2<f32>(tickX, 5.5), vec2<f32>(0.1, 1.5));
                intensity += drawSmoothLine(tickD, 0.15) * (0.8 - i * 0.15);
                
                let tickY = 15.0 + i * 12.0;
                let tickDV = sdBox(p - vec2<f32>(5.5, tickY), vec2<f32>(1.5, 0.1));
                intensity += drawSmoothLine(tickDV, 0.15) * (0.8 - i * 0.15);
            }

            // 4. 法阵圆弧 (Decorative Arc)
            let arcD = abs(sdCircle(p - vec2<f32>(4.0, 4.0), 32.0)) - 0.2;
            // 限制为 90度圆弧
            let arcIntensity = drawSmoothLine(arcD, 0.4) * step(0.0, p.x - 4.0) * step(0.0, p.y - 4.0);
            intensity = max(intensity, arcIntensity * 0.6);

            // 5. 元素符文嵌套
            let sigilOffset = vec2<f32>(26.0, 26.0);
            let p_sigil = p - sigilOffset;
            let r: f32 = 9.0;
            var d_sigil: f32 = 1e10;
            
            var p_tri = p_sigil;
            if (typeIdx >= 2) { p_tri.y = -p_tri.y; }
            d_sigil = sdEquilateralTriangle(p_tri, r);
            
            let sigilIntensity = drawSmoothLine(d_sigil, 0.8);
            var extra: f32 = 0.0;
            if (typeIdx == 1 || typeIdx == 3) {
                let lineD = sdBox(p_sigil, vec2<f32>(r * 0.8, 0.3));
                extra = drawSmoothLine(lineD, 0.4);
            }
            
            return max(intensity * 0.8, max(sigilIntensity, extra));
        }

        @fragment
        fn main(@location(0) vPosition: vec2<f32>) -> @location(0) vec4<f32> {
            let worldPos = (vPosition - grid.uResolution * 0.5) / grid.uZoom + grid.uViewPos;
            
            // 基础剪裁
            if (worldPos.x < 0.0 || worldPos.x > grid.uCurrentWorldSize.x || 
                worldPos.y < 0.0 || worldPos.y > grid.uCurrentWorldSize.y) {
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }

            let center = grid.uCurrentWorldSize * 0.5;
            let relPos = worldPos - center;
            
            let closeSize = vec2<f32>(275.0, 385.0);
            let zoomAlpha = mix(0.5, 1.0, smoothstep(0.35, 0.55, grid.uZoom));
            let gridIntensity = drawRuneDot(relPos, closeSize, 1.0) * zoomAlpha;
            let runeIntensity = 0.0; // replaced by CenterpieceDecal
            let rulerIntensity = drawRulerTicks(relPos, center);
            
            // --- 四角实物包角逻辑 ---
            var sigilIntensity: f32 = 0.0;
            
            // 1. Air (Top Left: index 0, corner 0)
            sigilIntensity += drawCornerGuard(worldPos, 1, 0);
            
            // 2. Fire (Top Right: index 1, corner 1)
            sigilIntensity += drawCornerGuard(worldPos - vec2<f32>(grid.uCurrentWorldSize.x, 0.0), 0, 1);
            
            // 3. Water (Bottom Left: index 2, corner 2)
            sigilIntensity += drawCornerGuard(worldPos - vec2<f32>(0.0, grid.uCurrentWorldSize.y), 2, 2);
            
            // 4. Earth (Bottom Right: index 3, corner 3)
            sigilIntensity += drawCornerGuard(worldPos - grid.uCurrentWorldSize, 3, 3);
            
            let intensity = max(max(max(gridIntensity, runeIntensity), rulerIntensity), sigilIntensity);
            let vDist = abs(relPos / center);
            let vignette = 1.0 - smoothstep(0.8, 1.1, max(vDist.x, vDist.y));
            
            let finalRGB = (grid.uBgColor.rgb + grid.uColor.rgb * intensity) * vignette;
            return vec4<f32>(finalRGB, 1.0);
        }
    `;

    // 3. 创建几何体
    // 在 WebGPU 中，使用显式的 Buffer 类来确保 usage 和 size 被正确处理
    const geometry = new Geometry({
      attributes: {
        aPosition: new Buffer({
          data: new Float32Array([
            0, 0,
            w, 0,
            w, h,
            0, h
          ]),
          usage: 32 | 8, // BufferUsage.VERTEX (32) | BufferUsage.COPY_DST (8)
        })
      },
      indexBuffer: new Uint16Array([0, 1, 2, 0, 2, 3])
    });

    // 4. 创建着色器
    const gridUniforms = new UniformGroup({
      uResolution: { value: [w, h], type: 'vec2<f32>' },
      uViewPos: { value: [0, 0], type: 'vec2<f32>' },
      uWorldSize: { value: [WORLD_W, WORLD_H], type: 'vec2<f32>' },
      uCurrentWorldSize: { value: [WORLD_W, WORLD_H], type: 'vec2<f32>' },
      uZoom: { value: 1.0, type: 'f32' },
      uTime: { value: 0.0, type: 'f32' },
      uColor: { value: [...color.toRgbArray(), 0.8], type: 'vec4<f32>' },
      uBgColor: { value: [0.0706, 0.0706, 0.0706, 1.0], type: 'vec4<f32>' }, // 强制使用 0x121212
    });

    const shader = Shader.from({
      gpu: {
        vertex: {
          source: vertexSrc,
          entryPoint: 'main',
        },
        fragment: {
          source: fragmentSrc,
          entryPoint: 'main',
        }
      },
      resources: {
        grid: gridUniforms,
      }
    });

    return new Mesh({
      geometry,
      shader,
    });
  }
}
