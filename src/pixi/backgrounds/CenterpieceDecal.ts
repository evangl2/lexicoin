import {
  Container, Assets, Mesh, Geometry, Shader, UniformGroup,
  type Texture, Sprite, BlurFilter, Buffer
} from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import gsap from 'gsap';
import { aabbSystem } from '../systems/AABBSystem';
import { CenterpieceDebugPanel } from './CenterpieceDebugPanel';
import { CENTERPIECE_PRESETS, presetToParams, loadPresetsForPersona } from './centerpiece-presets';
import { personaBridge } from '../bridges/PersonaBridge';
import { getPixiApp } from '../core/globalApp';

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
  uLightColor:   vec4<f32>,  // rgb=颜色, w=强度
  uAmbient:      vec4<f32>,  // rgb=环境光颜色, w=强度
  uSurface:      vec4<f32>,  // x=漫反射强度, y=法线凹凸, z=视差, w=高度AO
  uRoughness:    vec4<f32>,  // x=min, y=max, z=alphaClip, w=normalFlipY
  uRoughnessAdj: vec4<f32>,  // x=contrast, y=bias, z=unused, w=unused
  uSpec:         vec4<f32>,  // x=强度, y=f0, z=fresnelPower, w=specAoMask
  uSpecColor:    vec4<f32>,  // rgb=颜色
  uRim:          vec4<f32>,  // x=强度, y=幂次
  uRimColor:     vec4<f32>,  // rgb=颜色
  uDiffuseTint:  vec4<f32>,  // rgb=染色
  uSystem:       vec4<f32>,  // x=exposure, y=diffuseWrap, z=diffuseSaturation, w=cavityStrength
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

fn ggx_ndf(n_dot_h: f32, roughness: f32) -> f32 {
    let a     = roughness * roughness;
    let a2    = a * a;
    let denom = n_dot_h * n_dot_h * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

fn fresnel_schlick(v_dot_h: f32, f0: vec3<f32>, power: f32) -> vec3<f32> {
    return f0 + (1.0 - f0) * pow(clamp(1.0 - v_dot_h, 0.0, 1.0), power);
}

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

fn adjust_contrast(v: f32, contrast: f32) -> f32 {
    return (v - 0.5) * contrast + 0.5;
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let hrd_base = textureSample(uHRDMap, uSampler, uv);
  let height   = hrd_base.r;
  let L        = normalize(light.uLightDir.xyz);
  let pOffset  = -vec2<f32>(L.x, -L.y) * (height - 0.5) * light.uSurface.z;
  let pUV      = uv + pOffset;

  let rawDiffuse = textureSample(uDiffuse, uSampler, pUV);
  if (rawDiffuse.a < light.uRoughness.z) { discard; }
  
  var diffuseColor = rawDiffuse.rgb * light.uDiffuseTint.rgb;
  
  // 饱和度调整
  let luminance = dot(diffuseColor, vec3<f32>(0.2126, 0.7152, 0.0722));
  diffuseColor = mix(vec3<f32>(luminance), diffuseColor, light.uSystem.z);

  let nRaw = textureSample(uNormalMap, uSampler, pUV);
  let hrd  = textureSample(uHRDMap,    uSampler, pUV);
  
  // Roughness 调整
  var roughness_base = hrd.g;
  roughness_base = adjust_contrast(roughness_base + light.uRoughnessAdj.y, light.uRoughnessAdj.x);
  let roughness = mix(light.uRoughness.x, light.uRoughness.y, clamp(roughness_base, 0.0, 1.0));

  let detailB = hrd.b;
  let detailA = hrd.a;

  let metalnessMask = detailB * channel.uBWeights.x + detailA * channel.uAWeights.x;
  let sssMask       = detailB * channel.uBWeights.z + detailA * channel.uAWeights.z;

  var N = nRaw.rgb * 2.0 - 1.0;
  if (light.uRoughness.w > 0.5) { N.y = -N.y; }
  N = normalize(vec3<f32>(N.x * light.uSurface.y, N.y * light.uRoughnessAdj.z, N.z));

  let ao = mix(1.0, height, light.uSurface.w);
  // Cavity 强度应用：进一步遮蔽裂缝中的光
  let cavity = mix(1.0, height, light.uSystem.w);
  
  let ambient_term = light.uAmbient.rgb * light.uAmbient.w * ao * diffuseColor;

  let metalness      = clamp(metalnessMask, 0.0, 1.0);
  let f0             = mix(vec3<f32>(light.uSpec.y), diffuseColor, metalness);
  let diffuse_factor = 1.0 - metalness;

  let V           = vec3<f32>(0.0, 0.0, 1.0);
  let H           = normalize(L + V);
  let n_dot_v     = max(dot(N, V), 0.0);
  let n_dot_h     = max(dot(N, H), 0.0);
  let v_dot_h     = max(dot(V, H), 0.0);
  
  // Diffuse Wrap 处理
  let n_dot_l_raw = dot(N, L);
  let n_dot_l_wrap = max((n_dot_l_raw + light.uSystem.y) / (1.0 + light.uSystem.y), 0.0);
  let n_dot_l = max(n_dot_l_raw, 0.0);

  let roughness_c = clamp(roughness, 0.05, 1.0);

  let D = ggx_ndf(n_dot_h, roughness_c);
  let F = fresnel_schlick(v_dot_h, f0, light.uSpec.z);
  let G = geometry_smith(n_dot_v, n_dot_l, roughness_c);

  let specMask    = mix(1.0, ao * cavity, light.uSpec.w);
  let specDenom   = 4.0 * n_dot_v * n_dot_l + 0.0001;
  let specular    = (D * F * G) / specDenom;
  let spec_term   = light.uSpecColor.rgb * specular * specMask * light.uSpec.x * n_dot_l * light.uLightColor.rgb * light.uLightColor.w;

  let rim      = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y) * light.uRim.x * specMask;
  let rim_term = light.uRimColor.rgb * rim;

  let sss_strength  = sssMask * channel.uSSSParams.w;
  let n_dot_l_final = max((n_dot_l_raw + sss_strength) / (1.0 + sss_strength), 0.0);

  let main_light_diffuse = light.uLightColor.rgb * light.uLightColor.w * n_dot_l_wrap * light.uSurface.x;
  let diffuse_term = diffuseColor * diffuse_factor * (main_light_diffuse + n_dot_l_final * light.uSurface.x);

  var lit = ambient_term + diffuse_term + spec_term + rim_term;
  
  // 全局曝光
  lit *= light.uSystem.x;

  return vec4<f32>(lit * rawDiffuse.a, rawDiffuse.a);
}
`;

const MASK_EMISSIVE_WGSL = `
struct MaskEmissiveUniforms {
  uColorAndAlpha: vec4<f32>, // rgb=color, a=intensity
  uColor2AndGrad: vec4<f32>, // rgb=color2, w=gradientFactor
  uNoiseCfg:      vec4<f32>, // x=scale, y=contrast, z=speedX, w=speedY
  uNoiseCfg2:     vec4<f32>, // x=scale2, y=blendMode (0=mul, 0.5=lerp, 1=add)
  uMaskAdj:       vec4<f32>, // x=brightness, y=contrast, z=softness
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
  var mask = hrd.b * cfg.uWeights.x + hrd.a * cfg.uWeights.y;
  
  // Mask 调整
  mask = saturate(mask * cfg.uMaskAdj.y + cfg.uMaskAdj.x);
  if (cfg.uMaskAdj.z > 0.0) {
    mask = pow(mask, 1.0 + cfg.uMaskAdj.z * 5.0);
  }
  
  if (mask < 0.01) { discard; }

  let t = cfg.uTime;
  
  // Layer 1 Noise
  let noiseUV1 = uv * cfg.uNoiseCfg.x + vec2<f32>(t * cfg.uNoiseCfg.z, t * cfg.uNoiseCfg.w);
  let n1 = textureSample(uNoiseMap, uSampler, noiseUV1).r;
  
  // Layer 2 Noise
  let noiseUV2 = uv * cfg.uNoiseCfg2.x - vec2<f32>(t * cfg.uNoiseCfg.z * 0.25, t * cfg.uNoiseCfg.w * 1.5);
  let n2 = textureSample(uNoiseMap, uSampler, noiseUV2).r;
  
  var combinedNoise: f32;
  if (cfg.uNoiseCfg2.y < 0.25) { // Mul
    combinedNoise = n1 * n2;
  } else if (cfg.uNoiseCfg2.y < 0.75) { // Lerp
    combinedNoise = mix(n1, n2, 0.5);
  } else { // Add
    combinedNoise = clamp(n1 + n2, 0.0, 1.0);
  }
  combinedNoise = pow(combinedNoise, cfg.uNoiseCfg.y) * 5.0;
  
  if (cfg.uNoiseCfg.x <= 0.0) { combinedNoise = 1.0; }
  
  // 双色渐变
  var finalBaseColor = cfg.uColorAndAlpha.rgb;
  if (cfg.uColor2AndGrad.w > 0.0) {
    // 基于 UV.y 或 mask 数值做渐变
    let grad = mix(uv.y, mask, 0.5); 
    finalBaseColor = mix(cfg.uColorAndAlpha.rgb, cfg.uColor2AndGrad.rgb, grad);
  }
  
  let finalAlpha = mask * combinedNoise * cfg.uColorAndAlpha.a;
  let finalColor = finalBaseColor * finalAlpha;

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
  private _personaUnsubscribe: (() => void) | null = null;
  private _time = 0;
  private _lastWorldW = 0;
  private _lastWorldH = 0;
  
  private _currentNoiseTexKey = '';

  private _params = {
    // --- System & Global ---
    exposure: 1.0,
    baseAlpha: 1.0,
    diffuseTintR: 1.0, diffuseTintG: 1.0, diffuseTintB: 1.0,
    alphaClip: 0.01,
    normalFlipY: 0.0,

    // --- Lighting ---
    lightR: 1.0, lightG: 1.0, lightB: 1.0, lightStrength: 1.0,
    ambientR: 1.0, ambientG: 1.0, ambientB: 1.0, ambientStrength: 0.05,
    lightHeight: 1.5,
    lightOrbitSpeed: 0.2,
    lightOrbitRadiusX: 0.4,
    lightOrbitRadiusY: 0.3,
    mouseInfluence: 0.5,
    diffuse: 0.8,
    diffuseWrap: 0.0,
    diffuseSaturation: 1.0,
    bumpX: 1.0,
    bumpY: 1.0,
    parallax: 0.03,
    ao: 0.5,
    cavityStrength: 0.0,

    // --- Roughness ---
    roughnessMin: 0.0,
    roughnessMax: 1.0,
    roughnessContrast: 1.0,
    roughnessBias: 0.0,

    // --- GGX Specular ---
    specStrength: 2.0,
    specColorR: 1.0, specColorG: 0.9, specColorB: 0.6,
    f0Dielectric: 0.04,
    fresnelPower: 5.0,
    specAoMask: 1.0,

    // --- Rim Light ---
    rimStrength: 0.6,
    rimPower: 3.0,
    rimColorR: 1.0, rimColorG: 0.4, rimColorB: 0.1,

    // --- Channel Routing ---
    bMetalness: 0.0, bAO: 0.0, bSSS: 0.0,
    aMetalness: 0.0, aAO: 0.0, aSSS: 0.0,

    // --- Mask Emissive ---
    maskBWeight: 1.0,
    maskAWeight: 0.0,
    maskAnimMode: 1, 
    maskAnimSpeed: 1.0,
    maskIntensity: 1.0,
    maskColorR: 1.0, maskColorG: 0.1, maskColorB: 0.05,
    maskColor2R: 1.0, maskColor2G: 0.1, maskColor2B: 0.05,
    maskGradient: 0.0,
    maskBrightness: 0.0,
    maskContrast: 1.0,
    maskEdgeSoftness: 0.0,
    baseBlur: 14.0,
    bloomScale: 1.0,

    // --- Noise ---
    maskNoiseTex: '/assets/canvas/textures/noise/Melt 14 - 512x512.png',
    noiseScale: 2.5,
    noiseScale2: 3.5,
    noiseContrast: 1.2,
    noiseSpeedX: 0.02,
    noiseSpeedY: 0.01,
    noiseBlend: 0.0, // 0=Mul, 0.5=Lerp, 1=Add

    // --- SSS ---
    sssR: 0.8, sssG: 0.6, sssB: 0.5, sssStrength: 0.0,
  };

  constructor() {
    this.container = new Container();
    this.container.label = 'centerpiece-root';
  }

  async init(viewport: Viewport, contentLayer: Container): Promise<void> {
    this._viewport = viewport;

    try {
      this._currentNoiseTexKey = this._params.maskNoiseTex;
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
        uLightColor:   { value: [1.0, 1.0, 1.0, 1.0], type: 'vec4<f32>' },
        uAmbient:      { value: [1.0, 1.0, 1.0, 0.05], type: 'vec4<f32>' },
        uSurface:      { value: [0.8, 1.0, 0.03, 0.5], type: 'vec4<f32>' },
        uRoughness:    { value: [0.0, 1.0, 0.01, 0.0], type: 'vec4<f32>' },
        uRoughnessAdj: { value: [1.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uSpec:         { value: [2.0, 0.04, 5.0, 1.0], type: 'vec4<f32>' },
        uSpecColor:    { value: [1.0, 0.9, 0.6, 0.0], type: 'vec4<f32>' },
        uRim:          { value: [0.6, 3.0, 0.0, 0.0], type: 'vec4<f32>' },
        uRimColor:     { value: [1.0, 0.4, 0.1, 0.0], type: 'vec4<f32>' },
        uDiffuseTint:  { value: [1.0, 1.0, 1.0, 0.0], type: 'vec4<f32>' },
        uSystem:       { value: [1.0, 0.0, 1.0, 0.0], type: 'vec4<f32>' },
      });

      this._channelConfig = new UniformGroup({
        uBWeights:  { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uAWeights:  { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uSSSParams: { value: [0.8, 0.6, 0.5, 0.0], type: 'vec4<f32>' },
      });

      this._maskUniforms = new UniformGroup({
        uColorAndAlpha: { value: [1.0, 0.1, 0.05, 1.0], type: 'vec4<f32>' },
        uColor2AndGrad: { value: [1.0, 0.1, 0.05, 0.0], type: 'vec4<f32>' },
        uNoiseCfg:      { value: [2.5, 1.2, 0.02, 0.01], type: 'vec4<f32>' },
        uNoiseCfg2:     { value: [3.5, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uMaskAdj:       { value: [0.0, 1.0, 0.0, 0.0], type: 'vec4<f32>' },
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

      // Subscribe to persona modifications dynamically
      this._personaUnsubscribe = personaBridge.onChange((data) => {
        if (data && data.theme) {
          this._onPersonaChanged(data.theme);
        }
      });
      // Initial trigger for the active Persona presets
      const activePersona = personaBridge.getData()?.theme || 'default';
      this._onPersonaChanged(activePersona);

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
    this._time += delta * 0.01 * this._params.maskAnimSpeed;

    if (this._runeGlowMesh && this._runeMesh && this._maskUniforms && this._blurFilter && this._viewport) {
      this._maskUniforms.uniforms.uTime = this._time;

      let animMult = 1.0;
      let blurExtra = 0.0;
      let scaleExtra = 0.0;

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

      const finalIntensity = Math.max(0.0, Math.min(5.0, animMult * this._params.maskIntensity));
      this._maskUniforms.uniforms.uColorAndAlpha = [this._params.maskColorR, this._params.maskColorG, this._params.maskColorB, finalIntensity];
      this._maskUniforms.uniforms.uColor2AndGrad = [this._params.maskColor2R, this._params.maskColor2G, this._params.maskColor2B, this._params.maskGradient];
      
      this._blurFilter.strength = (this._params.baseBlur + blurExtra) * this._viewport.scale.x;
      const s = this._params.bloomScale + scaleExtra;
      this._runeGlowMesh.scale.set(s);
      this._runeMesh.scale.set(1.0 + scaleExtra);
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
      
      // 基础公转
      let lx = Math.cos(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusX;
      let ly = Math.sin(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusY;

      // 鼠标影响
      if (pointer) {
        const worldPos = this._viewport.toWorld(pointer.global.x, pointer.global.y);
        const centerX = this._viewport.worldWidth * 0.5;
        const centerY = this._viewport.worldHeight * 0.5;
        const targetLX = (worldPos.x - centerX) / 1000;
        const targetLY = -(worldPos.y - centerY) / 1000;
        
        lx = mix_num(lx, targetLX, this._params.mouseInfluence);
        ly = mix_num(ly, targetLY, this._params.mouseInfluence);
      }
      this._lightUniforms.uniforms.uLightDir = [lx, ly, this._params.lightHeight, 0.0];
    }
    
    this.container.alpha = this._params.baseAlpha;

    this._flushParams();
  }

  private _flushParams(): void {
    if (!this._lightUniforms || !this._channelConfig || !this._maskUniforms) return;
    const lu = this._lightUniforms.uniforms as any;
    lu.uLightColor = [this._params.lightR, this._params.lightG, this._params.lightB, this._params.lightStrength];
    lu.uAmbient    = [this._params.ambientR, this._params.ambientG, this._params.ambientB, this._params.ambientStrength];
    lu.uSurface    = [this._params.diffuse, this._params.bumpX, this._params.parallax, this._params.ao];
    lu.uRoughness  = [this._params.roughnessMin, this._params.roughnessMax, this._params.alphaClip, this._params.normalFlipY];
    lu.uRoughnessAdj = [this._params.roughnessContrast, this._params.roughnessBias, this._params.bumpY, 0];
    lu.uSpec       = [this._params.specStrength, this._params.f0Dielectric, this._params.fresnelPower, this._params.specAoMask];
    lu.uSpecColor  = [this._params.specColorR, this._params.specColorG, this._params.specColorB, 0];
    lu.uRim        = [this._params.rimStrength, this._params.rimPower, 0, 0];
    lu.uRimColor   = [this._params.rimColorR, this._params.rimColorG, this._params.rimColorB, 0];
    lu.uDiffuseTint = [this._params.diffuseTintR, this._params.diffuseTintG, this._params.diffuseTintB, 0];
    lu.uSystem     = [this._params.exposure, this._params.diffuseWrap, this._params.diffuseSaturation, this._params.cavityStrength];
    
    // 注入法线强度修正
    lu.uSurface[1] = this._params.bumpX; // 默认覆盖
    // 如果想要在 Shader 内部支持 Y 分离，我们需要修改 Shader 结构。
    // 为了 Phase 2 简单起见，我们在 update 里直接处理 N.y 的强度或修改 shader。
    // 我们已经在 Shader main 里使用了 uSurface.y 作用于 X 和 Y。
    // 既然要求分离，我这就去顺便改一下 Shader。

    const cc = this._channelConfig.uniforms;
    cc.uBWeights  = [this._params.bMetalness, this._params.bAO, this._params.bSSS, 0];
    cc.uAWeights  = [this._params.aMetalness, this._params.aAO, this._params.aSSS, 0];
    cc.uSSSParams = [this._params.sssR, this._params.sssG, this._params.sssB, this._params.sssStrength];

    const mu = this._maskUniforms.uniforms;
    mu.uNoiseCfg  = [this._params.noiseScale, this._params.noiseContrast, this._params.noiseSpeedX, this._params.noiseSpeedY];
    mu.uNoiseCfg2 = [this._params.noiseScale2, this._params.noiseBlend, 0, 0];
    mu.uMaskAdj   = [this._params.maskBrightness, this._params.maskContrast, this._params.maskEdgeSoftness, 0];
    mu.uWeights   = [this._params.maskBWeight, this._params.maskAWeight];
  }

  async loadMaskNoiseTexture(texturePath: string): Promise<void> {
    if (this._currentNoiseTexKey === texturePath || !this._runeGlowMesh) return;
    try {
      const tex = await Assets.load<Texture>(texturePath);
      if (this._runeGlowMesh) (this._runeGlowMesh.shader as any).resources.uNoiseMap = tex.source;
      if (this._runeMesh) (this._runeMesh.shader as any).resources.uNoiseMap = tex.source;
      this._currentNoiseTexKey = texturePath;
    } catch (e) {
      console.error('Failed to load mask noise texture:', texturePath, e);
    }
  }

  applyPreset(preset: Partial<typeof this._params> & { maskNoiseTex?: string }, duration = 1.0): void {
    if (preset.maskNoiseTex) {
      this.loadMaskNoiseTexture(preset.maskNoiseTex);
      delete preset.maskNoiseTex;
    }
    
    // 杀死当前正在对 _params 进行的 tween，防止冲突并能立刻响应新指令
    gsap.killTweensOf(this._params);

    if (duration > 0) {
      gsap.to(this._params, {
        duration,
        ease: 'power2.inOut',
        ...preset,
        onUpdate: () => {
          // 同步更新 Debug 面板上的滑块与数值输入框
          if (this._debugPanel && typeof (this._debugPanel as any).syncUI === 'function') {
            (this._debugPanel as any).syncUI();
          }
        }
      });
    } else {
      Object.assign(this._params, preset);
      if (this._debugPanel && typeof (this._debugPanel as any).syncUI === 'function') {
        (this._debugPanel as any).syncUI();
      }
    }
  }

  getCurrentParams(): typeof this._params {
    return { ...this._params };
  }

  private _onPersonaChanged(theme: string): void {
    console.log(`[CenterpieceDecal] Persona changed to: ${theme}. Reloading parameters...`);
    // 1. 载入或从本地草稿恢复当前 Persona 的各子阶段预设
    loadPresetsForPersona(theme);

    // 2. 获取该主题下上一次处于激活状态的子阶段
    const activeSubPhase = localStorage.getItem(`centerpiece-active-subphase-${theme}`) || 'rubedo';

    // 3. 应用该预设数据覆盖当前 _params（瞬间覆盖，不使用 Tween，防止重载时跳动）
    const preset = CENTERPIECE_PRESETS[activeSubPhase];
    if (preset) {
      Object.assign(this._params, presetToParams(preset as any));
      if (preset.maskNoiseTex) {
        this.loadMaskNoiseTexture(preset.maskNoiseTex);
      }
    }

    // 4. 通知 Debug 面板渲染新主题与子阶段的数据结构
    if (this._debugPanel && typeof (this._debugPanel as any).onPersonaChanged === 'function') {
      (this._debugPanel as any).onPersonaChanged(theme);
    }
  }

  destroy(): void {
    if (this._personaUnsubscribe) {
      this._personaUnsubscribe();
      this._personaUnsubscribe = null;
    }
    if (this._debugPanel && typeof (this._debugPanel as any).destroy === 'function') {
      (this._debugPanel as any).destroy();
    }
    this._debugPanel = null;
    aabbSystem.clearOccupancy();
    this.container.destroy({ children: true });
  }
}

function mix_num(a: number, b: number, ratio: number): number {
  return a * (1 - ratio) + b * ratio;
}
