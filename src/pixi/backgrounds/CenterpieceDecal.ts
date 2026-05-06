import {
  Container, Assets, Mesh, Geometry, Shader, UniformGroup,
  type Texture, Sprite, BlurFilter, Buffer
} from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { gsap } from 'gsap';
import { aabbSystem } from '../systems/AABBSystem';
import { getPixiApp } from '../core/globalApp';

const BASE_BLUR = 14;
const SIZE = 550; // world units

// ─── WGSL: PBR Mesh Shader (WebGPU) ──────────────────────────────────────────

const VERT_WGSL = `
struct CameraUniforms {
  uResolution: vec2<f32>,
  uViewPos:    vec2<f32>,
  uWorldSize:  vec2<f32>,
  uZoom:       f32,
}
@group(0) @binding(0) var<uniform> cam: CameraUniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn main(@location(0) aPosition: vec2<f32>, @location(1) aUV: vec2<f32>) -> VertexOutput {
  var out: VertexOutput;
  
  let worldCenter = cam.uWorldSize * 0.5;
  let worldPos = worldCenter + aPosition;
  
  // 计算相对于相机中心的屏幕偏移（像素）
  let screenOffset = (worldPos - cam.uViewPos) * cam.uZoom;
  
  // NDC 坐标转换：将相对于中心的像素偏移转换为 -1.0 到 1.0
  let ndcPos = screenOffset / (cam.uResolution * 0.5);
  
  // WebGPU NDC: Y 轴向上
  out.position = vec4<f32>(ndcPos.x, -ndcPos.y, 0.0, 1.0);
  out.uv = aUV;
  return out;
}
`;

const FRAG_WGSL = `
struct LightUniforms {
  uLightDir: vec4<f32>, // xyz=dir, w=ambient
  uSpec:     vec4<f32>, // x=strength, y=shininess
}
@group(1) @binding(0) var<uniform> light: LightUniforms;
@group(1) @binding(1) var uDiffuse: texture_2d<f32>;
@group(1) @binding(2) var uSampler: sampler;
@group(1) @binding(3) var uNormalMap: texture_2d<f32>;
@group(1) @binding(4) var uSpecularMap: texture_2d<f32>;

// 1. GGX 法线分布函数 (D项) - 非能量守恒版，追求极致的高光形状
fn ggx_ndf(n_dot_h: f32, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let a2 = a * a;
    let n_dot_h2 = n_dot_h * n_dot_h;
    let denom = (n_dot_h2 * (a2 - 1.0) + 1.0);
    // 这里移除了物理归一化因子 1/PI，以保证高光足够闪耀
    return a2 / (denom * denom);
}

// 2. 菲涅尔近似 (F项)
fn fresnel_schlick(v_dot_h: f32, f0: vec3<f32>) -> vec3<f32> {
    return f0 + (1.0 - f0) * pow(clamp(1.0 - v_dot_h, 0.0, 1.0), 5.0);
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let diffuse = textureSample(uDiffuse, uSampler, uv);
  let nRaw    = textureSample(uNormalMap, uSampler, uv);
  let specVal = textureSample(uSpecularMap, uSampler, uv).r;

  if (diffuse.a < 0.01) { discard; }

  // 1. 法线处理
  var N = normalize(nRaw.rgb * 2.0 - 1.0);
  N = normalize(vec3<f32>(N.x * 3.0, N.y * 3.0, N.z)); // 强化凹凸深度

  // 2. 光照方向与视口方向
  let L = normalize(light.uLightDir.xyz);
  let V = vec3<f32>(0.0, 0.0, 1.0);
  let H = normalize(L + V);
  
  let n_dot_l = max(dot(N, L), 0.0);
  let n_dot_h = max(dot(N, H), 0.0);
  let v_dot_h = max(dot(V, H), 0.0);

  // 3. 计算 GGX 高光 (Artist-Driven, No energy conservation)
  // 我们将 light.uSpec.y 作为粗糙度 (建议 0.1 - 0.3)
  let roughness = clamp(light.uSpec.y, 0.05, 1.0); 
  let D = ggx_ndf(n_dot_h, roughness);
  let F = fresnel_schlick(v_dot_h, vec3<f32>(0.04)); // 基础反射率

  // 移除物理分母，直接通过 uSpec.x 控制强度
  let spec = D * F.r * specVal * light.uSpec.x;
  
  // 4. 菲涅尔边缘光 (Fresnel / Rim Light)
  let rim = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 3.0) * 0.8 * specVal;

  let ambient = light.uLightDir.w;
  let specColor = vec3<f32>(1.0, 0.9, 0.6); // 黄金高光色
  
  // 最终合成：环境光 + 漫反射增强 + 高光 + 菲涅尔
  let lit = diffuse.rgb * (ambient + n_dot_l * 0.8) + 
            specColor * spec + specColor * rim * 1.2;

  return vec4<f32>(lit * diffuse.a, diffuse.a);
}
`;

const RUNE_FRAG_WGSL = `
struct RuneUniforms {
  uTime: f32,
  uIntensity: f32,
  uColor: vec3<f32>,
}
@group(1) @binding(0) var<uniform> cfg: RuneUniforms;
@group(1) @binding(1) var uRuneMap: texture_2d<f32>;
@group(1) @binding(2) var uSampler: sampler;
@group(1) @binding(3) var uNoiseMap: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let runeAlpha = textureSample(uRuneMap, uSampler, uv).a;
  if (runeAlpha < 0.01) { discard; }

  // 1. 高对比度噪声流动计算 (减速版，增加厚重感)
  let noiseUV1 = uv * 2.5 + vec2<f32>(cfg.uTime * 0.02, cfg.uTime * 0.01);
  let n1 = textureSample(uNoiseMap, uSampler, noiseUV1).r;
  
  let noiseUV2 = uv * 3.5 - vec2<f32>(cfg.uTime * 0.005, cfg.uTime * 0.015);
  let n2 = textureSample(uNoiseMap, uSampler, noiseUV2).r;
  
  // 通过 pow() 和 乘法拉高对比度，产生“能量脉络”感
  var combinedNoise = pow(n1 * n2, 1.2) * 5.0;
  
  // 2. 最终合成
  let finalAlpha = runeAlpha * combinedNoise * cfg.uIntensity;
  let finalColor = cfg.uColor * finalAlpha;

  return vec4<f32>(finalColor, finalAlpha);
}
`;

// ─── CenterpieceDecal ─────────────────────────────────────────────────────────

export class CenterpieceDecal {
  readonly container: Container;
  private _viewport: Viewport | null = null;
  private _mesh: Mesh<Geometry, Shader> | null = null;
  private _runeMesh: Mesh<Geometry, Shader> | null = null;
  private _runeGlowMesh: Mesh<Geometry, Shader> | null = null;
  private _blurFilter: BlurFilter | null = null;
  private _cameraUniforms: UniformGroup | null = null;
  private _lightUniforms: UniformGroup | null = null;
  private _runeUniforms: UniformGroup | null = null;
  private _time = 0;
  private _lastWorldW = 0;
  private _lastWorldH = 0;

  constructor() {
    this.container = new Container();
    this.container.label = 'centerpiece-root';
  }

  async init(viewport: Viewport, contentLayer: Container): Promise<void> {
    this._viewport = viewport;

    try {
      const [diffuse, normal, specular, rune, noise] = await Promise.all([
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-normal.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-specular.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-rune.png'),
        Assets.load<Texture>('/assets/canvas/textures/noise/Melt 14 - 512x512.png'),
      ]);

      // 1. Setup Mesh Geometry (A centered plane)
      const half = SIZE / 2;
      const geometry = new Geometry({
        attributes: {
          aPosition: new Buffer({
            data: new Float32Array([
              -half, -half,
              half, -half,
              half, half,
              -half, half,
            ]),
            usage: 32, // Vertex
          }),
          aUV: new Buffer({
            data: new Float32Array([
              0, 0,
              1, 0,
              1, 1,
              0, 1,
            ]),
            usage: 32,
          })
        },
        indexBuffer: new Uint16Array([0, 1, 2, 0, 2, 3])
      });

      // 2. Setup Camera & PBR Shader
      this._cameraUniforms = new UniformGroup({
        uResolution: { value: [viewport.screenWidth, viewport.screenHeight], type: 'vec2<f32>' },
        uViewPos: { value: [viewport.center.x, viewport.center.y], type: 'vec2<f32>' },
        uWorldSize: { value: [viewport.worldWidth, viewport.worldHeight], type: 'vec2<f32>' },
        uZoom: { value: viewport.scale.x, type: 'f32' },
      });

      this._lightUniforms = new UniformGroup({
        uLightDir: { value: [0.35, -0.25, 1.5, 0.05], type: 'vec4<f32>' },
        uSpec:     { value: [4.0, 0.16, 0.0, 0.0],    type: 'vec4<f32>' }, // x=强度, y=粗糙度
      });

      this._runeUniforms = new UniformGroup({
        uTime:      { value: 0.0, type: 'f32' },
        uIntensity: { value: 1.0, type: 'f32' },
        uColor:     { value: [1.0, 0.2, 0.2], type: 'vec3<f32>' }, // 初始深红 (Rubedo)
      });

      const shader = Shader.from({
        gpu: {
          vertex: { source: VERT_WGSL, entryPoint: 'main' },
          fragment: { source: FRAG_WGSL, entryPoint: 'main' },
        },
        resources: {
          cam: this._cameraUniforms,
          light: this._lightUniforms,
          uDiffuse: diffuse.source,
          uSampler: diffuse.source.style,
          uNormalMap: normal.source,
          uSpecularMap: specular.source,
        }
      });

      this._mesh = new Mesh({ geometry, shader, label: 'centerpiece-metal-mesh' });

      // 3. Setup Rune Layers with Noise Flow Shader
      const runeShader = Shader.from({
        gpu: {
          vertex: { source: VERT_WGSL, entryPoint: 'main' },
          fragment: { source: RUNE_FRAG_WGSL, entryPoint: 'main' }
        },
        resources: {
          cam: this._cameraUniforms,
          cfg: this._runeUniforms,
          uRuneMap: rune.source,
          uSampler: rune.source.style,
          uNoiseMap: noise.source,
        }
      });

      this._runeGlowMesh = new Mesh({ geometry, shader: runeShader, label: 'rune-glow-mesh' });
      this._runeGlowMesh.blendMode = 'add';
      this._blurFilter = new BlurFilter({ strength: BASE_BLUR, quality: 4 });
      this._runeGlowMesh.filters = [this._blurFilter];

      this._runeMesh = new Mesh({ geometry, shader: runeShader, label: 'rune-core-mesh' });
      this._runeMesh.blendMode = 'add';

      // Assemble
      this.container.addChild(this._mesh);
      this.container.addChild(this._runeGlowMesh);
      this.container.addChild(this._runeMesh);

      // Position at world center (Local to contentLayer)
      // Since contentLayer is already centered, we use (0,0)
      this.container.position.set(0, 0);
      contentLayer.addChild(this.container);

      // 4. Reserve AABB Cells (Center 2x2 area: [-1, -1] to [0, 0])
      // 在中心归一化坐标系下，这 4 个格子永远锁定在世界中心
      aabbSystem.reserveCells(-1, -1, 2, 2);

      console.log(`[CenterpieceDecal] Rebuilt as MESH. Occupying logical center [-1,-1] to [0,0].`);

    } catch (e) {
      console.error('[CenterpieceDecal] Redo failed:', e);
    }
  }

  enter(tl: gsap.core.Timeline): void {
    tl.fromTo(this.container, { alpha: 0 }, { alpha: 1, duration: 1.2 });
  }

  exit(tl: gsap.core.Timeline): void {
    tl.to(this.container, { alpha: 0, duration: 0.6 });
  }

  update(delta: number): void {
    this._time += delta * 0.01;

    if (this._runeGlowMesh && this._runeMesh && this._runeUniforms && this._blurFilter && this._viewport) {
      this._runeUniforms.uniforms.uTime = this._time;

      // 1. 基础平滑呼吸 (缓慢)
      const baseBreath = Math.sin(this._time * 0.8);
      
      // 2. 间歇性闪烁逻辑 (偶尔、快速、短暂)
      let flicker = 0;
      const burstTrigger = Math.sin(this._time * 0.5);
      if (burstTrigger > 0.8) {
        flicker = (Math.sin(this._time * 60.0) * 0.15) * ((burstTrigger - 0.8) / 0.2);
      }
      
      const intensity = 0.5 + baseBreath * 0.2 + flicker; 
      this._runeUniforms.uniforms.uIntensity = Math.max(0.1, Math.min(1.0, intensity));
      
      // 模糊半径随闪烁产生“瞬间喷薄”感
      this._blurFilter.strength = (BASE_BLUR + baseBreath * 4 + flicker * 30) * this._viewport.scale.x;
      
      // 缩放同步
      const s = 1.0 + (baseBreath * 0.005) + (flicker * 0.02);
      this._runeGlowMesh.scale.set(s);
      this._runeMesh.scale.set(s);
    }

    if (this._cameraUniforms && this._viewport) {
      const u = this._cameraUniforms.uniforms;
      u.uResolution = [this._viewport.screenWidth, this._viewport.screenHeight];
      u.uZoom = this._viewport.scale.x;
      u.uWorldSize = [this._viewport.worldWidth, this._viewport.worldHeight];

      // 性能优化：仅在世界大小发生变动时同步容器位置
      // 性能优化：仅在世界大小发生变动时通知状态 (Centerpiece 锁定在 contentLayer 中心，位置设为 0,0)
      if (this._viewport.worldWidth !== this._lastWorldW || this._viewport.worldHeight !== this._lastWorldH) {
        this._lastWorldW = this._viewport.worldWidth;
        this._lastWorldH = this._viewport.worldHeight;
        this.container.position.set(0, 0);
      }

      // 获取 Peeking 偏移以保持同步
      const peekX = (this.container.parent as any)?.x || 0;
      const peekY = (this.container.parent as any)?.y || 0;
      u.uViewPos = [this._viewport.center.x - peekX, this._viewport.center.y - peekY];
    }

    if (this._lightUniforms && this._viewport) {
      const app = getPixiApp();
      const pointer = app?.renderer?.events?.pointer;

      let lx = Math.cos(this._time * 0.2) * 0.4;
      let ly = Math.sin(this._time * 0.2) * 0.3;

      if (pointer) {
        const worldPos = this._viewport.toWorld(pointer.global.x, pointer.global.y);
        const centerX = this._viewport.worldWidth * 0.5;
        const centerY = this._viewport.worldHeight * 0.5;
        
        const dx = (worldPos.x - centerX) / 1000;
        const dy = (worldPos.y - centerY) / 1000;

        lx = dx;
        ly = -dy; 
      }
      this._lightUniforms.uniforms.uLightDir = [lx, ly, 1.5, 0.1];
    }

  }

  destroy(): void {
    // 销毁时清理占用 (如果需要)
    aabbSystem.clearOccupancy();
    this.container.destroy({ children: true });
  }
}

function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}
