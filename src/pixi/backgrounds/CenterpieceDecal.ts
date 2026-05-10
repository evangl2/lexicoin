import {
  Container, Assets, Mesh, Geometry, Shader, UniformGroup,
  type Texture, Sprite, BlurFilter, Buffer
} from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { gsap } from 'gsap';
import { aabbSystem } from '../systems/AABBSystem';
import { getPixiApp } from '../core/globalApp';
import { CenterpieceDebugPanel } from './CenterpieceDebugPanel';

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
  let screenOffset = (worldPos - cam.uViewPos) * cam.uZoom;
  let ndcPos = screenOffset / (cam.uResolution * 0.5);
  out.position = vec4<f32>(ndcPos.x, -ndcPos.y, 0.0, 1.0);
  out.uv = aUV;
  return out;
}
`;

const FRAG_WGSL = `
struct LightUniforms {
  uLightDir:     vec4<f32>,  // xyz=方向, w=备用
  uAmbient:      vec4<f32>,  // rgb=环境光颜色, w=强度
  uSurface:      vec4<f32>,  // x=漫反射, y=法线凹凸, z=视差, w=高度AO
  uRoughness:    vec4<f32>,  // x=min, y=max, z=alphaClip, w=normalFlipY
  uSpec:         vec4<f32>,  // x=强度, y=f0, z=fresnelPower, w=specAoMask
  uSpecColor:    vec4<f32>,  // rgb=颜色
  uRim:          vec4<f32>,  // x=强度, y=幂次
  uRimColor:     vec4<f32>,  // rgb=颜色
  uDiffuseTint:  vec4<f32>,  // rgb=染色
}
struct ChannelConfig {
  uBWeights:  vec4<f32>,  // x=金属度, y=AO, z=SSS
  uAWeights:  vec4<f32>,  // x=金属度, y=AO, z=SSS
  uSSSParams: vec4<f32>,  // rgb=SSS颜色, w=SSS强度
}

@group(1) @binding(0) var<uniform> light:    LightUniforms;
@group(1) @binding(1) var uDiffuse:           texture_2d<f32>;
@group(1) @binding(2) var uSampler:           sampler;
@group(1) @binding(3) var uNormalMap:         texture_2d<f32>;
@group(1) @binding(4) var uHRDMap:            texture_2d<f32>;
@group(1) @binding(5) var<uniform> channel:  ChannelConfig;

const PI: f32 = 3.14159265359;

// GGX NDF (带 1/PI，业界标准)
fn ggx_ndf(n_dot_h: f32, roughness: f32) -> f32 {
    let a     = roughness * roughness;
    let a2    = a * a;
    let denom = n_dot_h * n_dot_h * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

// Schlick Fresnel
fn fresnel_schlick(v_dot_h: f32, f0: vec3<f32>, power: f32) -> vec3<f32> {
    return f0 + (1.0 - f0) * pow(clamp(1.0 - v_dot_h, 0.0, 1.0), power);
}

// Smith-Schlick-GGX Geometric Shadowing
fn geometry_schlick_ggx(n_dot_v: f32, roughness: f32) -> f32 {
    let r = roughness + 1.0;
    let k = (r * r) / 8.0;
    return n_dot_v / (n_dot_v * (1.0 - k) + k);
}

fn geometry_smith(n_dot_v: f32, n_dot_l: f32, roughness: f32) -> f32 {
    let ggx1 = geometry_schlick_ggx(n_dot_v, roughness);
    let ggx2 = geometry_schlick_ggx(n_dot_l, roughness);
    return ggx1 * ggx2;
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let height  = textureSample(uHRDMap, uSampler, uv).r;
  let L       = normalize(light.uLightDir.xyz);
  let pOffset = -vec2<f32>(L.x, -L.y) * (height - 0.5) * light.uSurface.z;
  let pUV     = uv + pOffset;

  let rawDiffuse = textureSample(uDiffuse, uSampler, pUV);
  if (rawDiffuse.a < light.uRoughness.z) { discard; }
  let diffuse = rawDiffuse.rgb * light.uDiffuseTint.rgb;

  let nRaw = textureSample(uNormalMap, uSampler, pUV);
  let hrd  = textureSample(uHRDMap,    uSampler, pUV);
  
  let rMin = light.uRoughness.x;
  let rMax = light.uRoughness.y;
  let roughness = mix(rMin, rMax, hrd.g);

  let detailB = hrd.b;
  let detailA = hrd.a;

  let metalnessMask = detailB * channel.uBWeights.x + detailA * channel.uAWeights.x;
  let sssMask       = detailB * channel.uBWeights.z + detailA * channel.uAWeights.z;

  // 法线翻转与强度
  var N = nRaw.rgb * 2.0 - 1.0;
  if (light.uRoughness.w > 0.5) { N.y = -N.y; }
  N = normalize(vec3<f32>(N.x * light.uSurface.y, N.y * light.uSurface.y, N.z));

  let ao = mix(1.0, height, light.uSurface.w);
  let ambient_term = light.uAmbient.rgb * light.uAmbient.w * ao * diffuse;

  let metalness      = clamp(metalnessMask, 0.0, 1.0);
  let f0             = mix(vec3<f32>(light.uSpec.y), diffuse, metalness);
  let diffuse_factor = 1.0 - metalness;

  let V           = vec3<f32>(0.0, 0.0, 1.0);
  let H           = normalize(L + V);
  let n_dot_l     = max(dot(N, L), 0.0);
  let n_dot_v     = max(dot(N, V), 0.0);
  let n_dot_h     = max(dot(N, H), 0.0);
  let v_dot_h     = max(dot(V, H), 0.0);
  
  let roughness_c = clamp(roughness, 0.05, 1.0);

  // 完整 Cook-Torrance BRDF
  let D = ggx_ndf(n_dot_h, roughness_c);
  let F = fresnel_schlick(v_dot_h, f0, light.uSpec.z);
  let G = geometry_smith(n_dot_v, n_dot_l, roughness_c);

  let specMask    = mix(1.0, ao, light.uSpec.w); // 控制AO是否遮蔽高光
  let specDenom   = 4.0 * n_dot_v * n_dot_l + 0.0001;
  let specular    = (D * F * G) / specDenom;
  // specStrength 作为最终艺术调整倍率，提取 F 的比例作为反射强度
  let spec_term   = light.uSpecColor.rgb * specular * specMask * light.uSpec.x * n_dot_l;

  let rim      = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y) * light.uRim.x * specMask;
  let rim_term = light.uRimColor.rgb * rim;

  let sss_strength  = sssMask * channel.uSSSParams.w;
  let n_dot_l_final = max((dot(N, L) + sss_strength) / (1.0 + sss_strength), 0.0);

  let diffuse_term = diffuse * diffuse_factor * n_dot_l_final * light.uSurface.x;

  let lit = ambient_term + diffuse_term + spec_term + rim_term;
  return vec4<f32>(lit * rawDiffuse.a, rawDiffuse.a);
}
`;

const MASK_EMISSIVE_WGSL = `
struct MaskEmissiveUniforms {
  uColorAndAlpha: vec4<f32>, // rgb=color, a=finalIntensity
  uNoiseCfg:      vec4<f32>, // x=scale, y=contrast, z=speedX, w=speedY
  uWeights:       vec2<f32>, // x=maskBWeight, y=maskAWeight
  uTime:          f32,
}
@group(1) @binding(0) var<uniform> cfg: MaskEmissiveUniforms;
@group(1) @binding(1) var uHRDMap:   texture_2d<f32>;
@group(1) @binding(2) var uSampler:  sampler;
@group(1) @binding(3) var uNoiseMap: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let hrd = textureSample(uHRDMap, uSampler, uv);
  let mask = hrd.b * cfg.uWeights.x + hrd.a * cfg.uWeights.y;
  if (mask < 0.01) { discard; }

  let t = cfg.uTime;
  let scale = cfg.uNoiseCfg.x;
  
  let noiseUV1 = uv * scale + vec2<f32>(t * cfg.uNoiseCfg.z, t * cfg.uNoiseCfg.w);
  let n1 = textureSample(uNoiseMap, uSampler, noiseUV1).r;
  
  let noiseUV2 = uv * (scale * 1.4) - vec2<f32>(t * cfg.uNoiseCfg.z * 0.25, t * cfg.uNoiseCfg.w * 1.5);
  let n2 = textureSample(uNoiseMap, uSampler, noiseUV2).r;
  
  var combinedNoise = pow(n1 * n2, cfg.uNoiseCfg.y) * 5.0;
  if (cfg.uNoiseCfg.x <= 0.0) {
    combinedNoise = 1.0; // 如果 scale=0，关闭噪声
  }
  
  let finalAlpha = mask * combinedNoise * cfg.uColorAndAlpha.a;
  let finalColor = cfg.uColorAndAlpha.rgb * finalAlpha;

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
  private _cameraUniforms:  UniformGroup | null = null;
  private _lightUniforms:   UniformGroup | null = null;
  private _channelConfig:   UniformGroup | null = null;
  private _maskUniforms:    UniformGroup | null = null;
  private _debugPanel:      unknown      | null = null;
  private _time = 0;
  private _lastWorldW = 0;
  private _lastWorldH = 0;
  
  private _currentNoiseTexKey = '';

  // 核心参数镜像
  private _params = {
    ambientR: 1.0, ambientG: 1.0, ambientB: 1.0, ambientStrength: 0.05,
    lightHeight: 1.5,
    diffuse: 0.8, bump: 1.0, parallax: 0.03, ao: 0.5,
    roughnessMin: 0.0, roughnessMax: 1.0,
    specStrength: 2.0, specColorR: 1.0, specColorG: 0.9, specColorB: 0.6,
    f0Dielectric: 0.04, fresnelPower: 5.0, specAoMask: 1.0,
    rimStrength: 0.6, rimPower: 3.0, rimColorR: 1.0, rimColorG: 0.4, rimColorB: 0.1,
    // Channel routing
    bMetalness: 0.0, bAO: 0.0, bSSS: 0.0,
    aMetalness: 0.0, aAO: 0.0, aSSS: 0.0,
    // Mask Emissive
    maskBWeight: 1.0, maskAWeight: 0.0,
    maskAnimMode: 1, // 0=Static, 1=Breathe, 2=Blink, 3=Pulse
    maskIntensity: 1.0, maskColorR: 1.0, maskColorG: 0.1, maskColorB: 0.05,
    noiseScale: 2.5, noiseContrast: 1.2, noiseSpeedX: 0.02, noiseSpeedY: 0.01,
    baseBlur: 14.0,
    // SSS stub
    sssR: 0.8, sssG: 0.6, sssB: 0.5, sssStrength: 0.0,
    // System
    alphaClip: 0.01,
    diffuseTintR: 1.0, diffuseTintG: 1.0, diffuseTintB: 1.0,
    normalFlipY: 0.0,
  };

  constructor() {
    this.container = new Container();
    this.container.label = 'centerpiece-root';
  }

  async init(viewport: Viewport, contentLayer: Container): Promise<void> {
    this._viewport = viewport;

    try {
      this._currentNoiseTexKey = '/assets/canvas/textures/noise/Melt 14 - 512x512.png';
      const [diffuse, normal, hrd, noise] = await Promise.all([
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-normal.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-hrd.png'),
        Assets.load<Texture>(this._currentNoiseTexKey),
      ]);

      const half = SIZE / 2;
      const geometry = new Geometry({
        attributes: {
          aPosition: new Buffer({ data: new Float32Array([-half, -half, half, -half, half, half, -half, half]), usage: 32 }),
          aUV: new Buffer({ data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), usage: 32 })
        },
        indexBuffer: new Uint16Array([0, 1, 2, 0, 2, 3])
      });

      this._cameraUniforms = new UniformGroup({
        uResolution: { value: [viewport.screenWidth, viewport.screenHeight], type: 'vec2<f32>' },
        uViewPos: { value: [viewport.center.x, viewport.center.y], type: 'vec2<f32>' },
        uWorldSize: { value: [viewport.worldWidth, viewport.worldHeight], type: 'vec2<f32>' },
        uZoom: { value: viewport.scale.x, type: 'f32' },
      });

      this._lightUniforms = new UniformGroup({
        uLightDir:     { value: [0.0, 0.0, 1.5, 0.0], type: 'vec4<f32>' },
        uAmbient:      { value: [1.0, 1.0, 1.0, 0.05], type: 'vec4<f32>' },
        uSurface:      { value: [0.8, 1.0, 0.03, 0.5], type: 'vec4<f32>' },
        uRoughness:    { value: [0.0, 1.0, 0.01, 0.0], type: 'vec4<f32>' },
        uSpec:         { value: [2.0, 0.04, 5.0, 1.0], type: 'vec4<f32>' },
        uSpecColor:    { value: [1.0, 0.9, 0.6, 0.0], type: 'vec4<f32>' },
        uRim:          { value: [0.6, 3.0, 0.0, 0.0], type: 'vec4<f32>' },
        uRimColor:     { value: [1.0, 0.4, 0.1, 0.0], type: 'vec4<f32>' },
        uDiffuseTint:  { value: [1.0, 1.0, 1.0, 0.0], type: 'vec4<f32>' },
      });

      this._channelConfig = new UniformGroup({
        uBWeights:  { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uAWeights:  { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uSSSParams: { value: [0.8, 0.6, 0.5, 0.0], type: 'vec4<f32>' },
      });

      this._maskUniforms = new UniformGroup({
        uColorAndAlpha: { value: [1.0, 0.1, 0.05, 1.0], type: 'vec4<f32>' },
        uNoiseCfg:      { value: [2.5, 1.2, 0.02, 0.01], type: 'vec4<f32>' },
        uWeights:       { value: [1.0, 0.0], type: 'vec2<f32>' },
        uTime:          { value: 0.0, type: 'f32' },
      });

      const shader = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: FRAG_WGSL, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          light:      this._lightUniforms,
          uDiffuse:   diffuse.source,
          uSampler:   diffuse.source.style,
          uNormalMap: normal.source,
          uHRDMap:    hrd.source,
          channel:    this._channelConfig,
        }
      });
      this._mesh = new Mesh({ geometry, shader, label: 'centerpiece-metal-mesh' });

      const maskShader = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: MASK_EMISSIVE_WGSL, entryPoint: 'main' } },
        resources: {
          cam:       this._cameraUniforms,
          cfg:       this._maskUniforms,
          uHRDMap:   hrd.source,
          uSampler:  hrd.source.style,
          uNoiseMap: noise.source,
        }
      });

      this._runeGlowMesh = new Mesh({ geometry, shader: maskShader, label: 'mask-glow-mesh' });
      this._runeGlowMesh.blendMode = 'add';
      this._blurFilter = new BlurFilter({ strength: this._params.baseBlur, quality: 4 });
      this._runeGlowMesh.filters = [this._blurFilter];

      this._runeMesh = new Mesh({ geometry, shader: maskShader, label: 'mask-core-mesh' });
      this._runeMesh.blendMode = 'add';

      this.container.addChild(this._mesh);
      this.container.addChild(this._runeGlowMesh);
      this.container.addChild(this._runeMesh);
      this.container.position.set(0, 0);
      contentLayer.addChild(this.container);

      aabbSystem.reserveCells(-1, -1, 2, 2);
      this._debugPanel = new CenterpieceDebugPanel(this);

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

    if (this._runeGlowMesh && this._runeMesh && this._maskUniforms && this._blurFilter && this._viewport) {
      this._maskUniforms.uniforms.uTime = this._time;

      let animMult = 1.0;
      let blurExtra = 0.0;
      let scaleExtra = 0.0;

      // 0=Static, 1=Breathe, 2=Blink, 3=Pulse
      switch (this._params.maskAnimMode) {
        case 1: { // Breathe
          const b = Math.sin(this._time * 0.8);
          animMult = 0.8 + b * 0.2;
          blurExtra = b * 4;
          scaleExtra = b * 0.005;
          break;
        }
        case 2: { // Blink
          const burst = Math.sin(this._time * 0.5);
          if (burst > 0.8) {
            const flicker = (Math.sin(this._time * 60.0) * 0.15) * ((burst - 0.8) / 0.2);
            animMult = 0.5 + flicker;
            blurExtra = flicker * 30;
            scaleExtra = flicker * 0.02;
          } else {
            animMult = 0.5;
          }
          break;
        }
        case 3: { // Pulse (Heartbeat)
          let p = this._time % 1.5;
          if (p < 0.2) animMult = 1.0 + Math.sin(p * Math.PI * 5) * 0.5;
          else if (p < 0.4) animMult = 1.0 + Math.sin((p - 0.2) * Math.PI * 5) * 0.3;
          else animMult = 1.0;
          blurExtra = (animMult - 1.0) * 20;
          scaleExtra = (animMult - 1.0) * 0.01;
          break;
        }
        default: { // Static
          animMult = 1.0;
          break;
        }
      }

      const finalIntensity = Math.max(0.0, Math.min(2.0, animMult * this._params.maskIntensity));
      this._maskUniforms.uniforms.uColorAndAlpha = [this._params.maskColorR, this._params.maskColorG, this._params.maskColorB, finalIntensity];
      
      this._blurFilter.strength = (this._params.baseBlur + blurExtra) * this._viewport.scale.x;
      const s = 1.0 + scaleExtra;
      this._runeGlowMesh.scale.set(s);
      this._runeMesh.scale.set(s);
    }

    if (this._cameraUniforms && this._viewport) {
      const u = this._cameraUniforms.uniforms;
      u.uResolution = [this._viewport.screenWidth, this._viewport.screenHeight];
      u.uZoom = this._viewport.scale.x;
      u.uWorldSize = [this._viewport.worldWidth, this._viewport.worldHeight];

      if (this._viewport.worldWidth !== this._lastWorldW || this._viewport.worldHeight !== this._lastWorldH) {
        this._lastWorldW = this._viewport.worldWidth;
        this._lastWorldH = this._viewport.worldHeight;
        this.container.position.set(0, 0);
      }

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
        lx = (worldPos.x - centerX) / 1000;
        ly = -(worldPos.y - centerY) / 1000;
      }
      this._lightUniforms.uniforms.uLightDir = [lx, ly, this._params.lightHeight, 0.0];
    }

    this._flushParams();
  }

  private _flushParams(): void {
    if (!this._lightUniforms || !this._channelConfig || !this._maskUniforms) return;
    const lu = this._lightUniforms.uniforms;
    lu.uAmbient   = [this._params.ambientR,     this._params.ambientG,   this._params.ambientB,   this._params.ambientStrength];
    lu.uSurface   = [this._params.diffuse,      this._params.bump,       this._params.parallax,   this._params.ao];
    lu.uRoughness = [this._params.roughnessMin, this._params.roughnessMax, this._params.alphaClip,  this._params.normalFlipY];
    lu.uSpec      = [this._params.specStrength, this._params.f0Dielectric, this._params.fresnelPower, this._params.specAoMask];
    lu.uSpecColor = [this._params.specColorR,   this._params.specColorG,   this._params.specColorB,   0];
    lu.uRim       = [this._params.rimStrength,  this._params.rimPower,     0, 0];
    lu.uRimColor  = [this._params.rimColorR,    this._params.rimColorG,    this._params.rimColorB,    0];
    lu.uDiffuseTint = [this._params.diffuseTintR, this._params.diffuseTintG, this._params.diffuseTintB, 0];

    const cc = this._channelConfig.uniforms;
    cc.uBWeights  = [this._params.bMetalness,   this._params.bAO,   this._params.bSSS, 0];
    cc.uAWeights  = [this._params.aMetalness,   this._params.aAO,   this._params.aSSS, 0];
    cc.uSSSParams = [this._params.sssR,         this._params.sssG,  this._params.sssB, this._params.sssStrength];

    const mu = this._maskUniforms.uniforms;
    mu.uNoiseCfg = [this._params.noiseScale, this._params.noiseContrast, this._params.noiseSpeedX, this._params.noiseSpeedY];
    mu.uWeights  = [this._params.maskBWeight, this._params.maskAWeight];
  }

  async loadMaskNoiseTexture(texturePath: string): Promise<void> {
    if (this._currentNoiseTexKey === texturePath || !this._runeGlowMesh) return;
    try {
      const tex = await Assets.load<Texture>(texturePath);
      this._runeGlowMesh.shader.resources.uNoiseMap = tex.source;
      if (this._runeMesh) this._runeMesh.shader.resources.uNoiseMap = tex.source;
      this._currentNoiseTexKey = texturePath;
    } catch (e) {
      console.error('Failed to load mask noise texture:', texturePath, e);
    }
  }

  applyPreset(preset: Partial<typeof this._params> & { maskNoiseTex?: string }, duration = 1.0): void {
    const gsapLib = (globalThis as any).gsap;
    
    // 如果有 noiseTex 更新
    if (preset.maskNoiseTex) {
      this.loadMaskNoiseTexture(preset.maskNoiseTex);
      delete preset.maskNoiseTex; // 不用 GSAP tween 字符串
    }

    if (gsapLib && duration > 0) {
      gsapLib.to(this._params, { duration, ease: 'power2.inOut', ...preset });
    } else {
      Object.assign(this._params, preset);
    }
  }

  getCurrentParams(): typeof this._params {
    return { ...this._params };
  }

  destroy(): void {
    if (this._debugPanel && typeof (this._debugPanel as any).destroy === 'function') {
      (this._debugPanel as any).destroy();
    }
    this._debugPanel = null;
    aabbSystem.clearOccupancy();
    this.container.destroy({ children: true });
  }
}
