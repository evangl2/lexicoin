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
  uMetalness:   f32,
  uSSSStrength: f32,
  uIsFallback:  f32,
  uPad2:        f32,
  uSSSColor:    vec4<f32>,
}

@group(1) @binding(0) var<uniform> light:    LightUniforms;
@group(1) @binding(1) var uDiffuse:           texture_2d<f32>;
@group(1) @binding(2) var uSampler:           sampler;
@group(1) @binding(3) var uNormalMap:         texture_2d<f32>;
@group(1) @binding(4) var uHRBCMap:           texture_2d<f32>;
@group(1) @binding(5) var uMaskMap:           texture_2d<f32>;
@group(1) @binding(6) var<uniform> channel:  ChannelConfig;

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
  let baseAlpha  = textureSample(uDiffuse, uSampler, uv).a;
  let hrbc_base  = textureSample(uHRBCMap, uSampler, uv);
  let h1         = hrbc_base.r;
  let L          = normalize(light.uLightDir.xyz);
  
  // 第一步估算视差位移
  let offset1    = -vec2<f32>(L.x, -L.y) * h1 * light.uSurface.z;
  
  // 第二步在估算坐标处进行二次采样，通过高度均值平滑
  let hrbc_next  = textureSample(uHRBCMap, uSampler, uv + offset1);
  let h2         = hrbc_next.r;
  let smoothH    = (h1 + h2) * 0.5;
  
  // 凸起 3D 浮雕视差
  let pOffset    = -vec2<f32>(L.x, -L.y) * smoothH * light.uSurface.z;
  let pUV        = uv + pOffset;

  let rawDiffuse = textureSample(uDiffuse, uSampler, pUV);
  let clipThreshold = light.uRoughness.z;
  let edgeAlpha = smoothstep(clipThreshold - 0.008, clipThreshold + 0.008, rawDiffuse.a);
  if (edgeAlpha <= 0.0) { discard; }
  
  var diffuseColor = rawDiffuse.rgb * light.uDiffuseTint.rgb;
  
  // 饱和度调整
  let luminance = dot(diffuseColor, vec3<f32>(0.2126, 0.7152, 0.0722));
  diffuseColor = mix(vec3<f32>(luminance), diffuseColor, light.uSystem.z);

  let nRaw = textureSample(uNormalMap, uSampler, pUV);
  let hrbc = textureSample(uHRBCMap, uSampler, pUV);
  let height = hrbc.r;
  
  // hrbc.a is Curvature
  var curvature = hrbc.a;
  if (channel.uIsFallback > 0.5) {
    curvature = 0.0;
  }
  
  // Roughness 调整
  var roughness_base = hrbc.g;
  roughness_base = adjust_contrast(roughness_base + light.uRoughnessAdj.y, light.uRoughnessAdj.x);
  let roughness = mix(light.uRoughness.x, light.uRoughness.y, clamp(roughness_base, 0.0, 1.0));

  var N = nRaw.rgb * 2.0 - 1.0;
  if (light.uRoughness.w > 0.5) { N.y = -N.y; }
  N = normalize(vec3<f32>(N.x * light.uSurface.y, N.y * light.uRoughnessAdj.z, N.z));

  // hrbc.b is Baked AO
  var bakedAO = hrbc.b;
  if (channel.uIsFallback > 0.5) {
    bakedAO = hrbc.r; // Use height as AO proxy in PNG fallback mode
  }
  let ao = mix(1.0, bakedAO, light.uSurface.w);
  let cavity = mix(1.0, height, light.uSystem.w);
  
  let ambient_term = light.uAmbient.rgb * light.uAmbient.w * ao * diffuseColor;

  let metalness      = clamp(channel.uMetalness, 0.0, 1.0);
  let f0             = mix(vec3<f32>(light.uSpec.y), diffuseColor, metalness);
  let diffuse_factor = 1.0 - metalness;

  let V           = vec3<f32>(0.0, 0.0, 1.0);
  let H           = normalize(L + V);
  let n_dot_v     = max(dot(N, V), 0.0);
  let n_dot_h     = max(dot(N, H), 0.0);
  let v_dot_h     = max(dot(V, H), 0.0);
  
  // Diffuse Wrap
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

  // Curvature based edge highlight enhancement
  let rim      = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y) * light.uRim.x * specMask;
  let edgeHighlight = curvature * light.uRimColor.rgb * light.uRim.x * specMask;
  let rim_term = light.uRimColor.rgb * rim + edgeHighlight;

  // SSS Subsurface scattering using Mask Map's alpha channel (thickness)
  let maskSample = textureSample(uMaskMap, uSampler, pUV);
  var thickness = maskSample.a;
  if (channel.uIsFallback > 0.5) {
    thickness = 1.0 - hrbc.r; // thickness proxy in PNG fallback mode
  }
  let sssAmount = (1.0 - thickness) * channel.uSSSStrength;

  let sss_strength  = sssAmount;
  let n_dot_l_final = max((n_dot_l_raw + sss_strength) / (1.0 + sss_strength), 0.0);
  let sss_term = channel.uSSSColor.rgb * sss_strength * n_dot_l_final * light.uSurface.x;

  let main_light_diffuse = light.uLightColor.rgb * light.uLightColor.w * n_dot_l_wrap * light.uSurface.x;
  let diffuse_term = diffuseColor * diffuse_factor * main_light_diffuse + sss_term;

  var lit = ambient_term + diffuse_term + spec_term + rim_term;
  
  // 全局曝光
  lit *= light.uSystem.x;

  let finalAlpha = rawDiffuse.a * edgeAlpha * baseAlpha;
  return vec4<f32>(lit * finalAlpha, finalAlpha);
}
`;

const MASK_EMISSIVE_WGSL = `
struct LightUniforms {
  uLightDir:     vec4<f32>,
  uLightColor:   vec4<f32>,
  uAmbient:      vec4<f32>,
  uSurface:      vec4<f32>,
  uRoughness:    vec4<f32>,
  uRoughnessAdj: vec4<f32>,
  uSpec:         vec4<f32>,
  uSpecColor:    vec4<f32>,
  uRim:          vec4<f32>,
  uRimColor:     vec4<f32>,
  uDiffuseTint:  vec4<f32>,
  uSystem:       vec4<f32>,
}

struct MaskUniforms {
  // 16-byte aligned parameters (Grouped first)
  maskR_colorAndType: vec4<f32>, // rgb=color, a=effectType
  maskG_colorAndType: vec4<f32>,
  maskB_colorAndType: vec4<f32>,
  uNoiseCfg:          vec4<f32>, // x=scale, y=contrast, z=speedX, w=speedY
  uNoiseCfg2:         vec4<f32>, // x=scale2, y=blendMode
  
  // 8-byte aligned parameters (Grouped second)
  maskR_strengthAndNoise: vec2<f32>, // x=strength, y=noiseCoupling
  maskG_strengthAndNoise: vec2<f32>,
  maskB_strengthAndNoise: vec2<f32>,
  
  // 4-byte aligned parameters (Grouped last)
  uTime: f32,
  uIsFallback: f32,
}

@group(1) @binding(0) var<uniform> cfg:       MaskUniforms;
@group(1) @binding(1) var<uniform> light:     LightUniforms;
@group(1) @binding(2) var uSampler:           sampler;
@group(1) @binding(3) var uMaskMap:           texture_2d<f32>;
@group(1) @binding(4) var uNoiseMap:          texture_2d<f32>;
@group(1) @binding(5) var uDiffuse:           texture_2d<f32>;
@group(1) @binding(6) var uNormalMap:         texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let maskSample = textureSample(uMaskMap, uSampler, uv);
  
  var rChannel = maskSample.r;
  var gChannel = maskSample.g;
  var bChannel = maskSample.b;
  var thickness = maskSample.a;
  
  if (cfg.uIsFallback > 0.5) {
    // In fallback PNG mode, maskSample is the HRD texture (r=height, g=roughness, b=emissive, a=specularAO)
    rChannel = maskSample.b; // Route gold emissive (b) to R channel
    gChannel = 0.0;
    bChannel = 0.0;
    thickness = 1.0 - maskSample.r; // Thickness = 1.0 - height
  }
  
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

  // Sample Normal and Diffuse to support ColorTint, Rim, and SSS
  let diffuseColor = textureSample(uDiffuse, uSampler, uv).rgb;
  let rawN = textureSample(uNormalMap, uSampler, uv).rgb * 2.0 - 1.0;
  let N = normalize(vec3<f32>(rawN.x * light.uSurface.y, rawN.y, rawN.z));
  let V = vec3<f32>(0.0, 0.0, 1.0);
  let L = normalize(light.uLightDir.xyz);
  let n_dot_v = max(dot(N, V), 0.0);

  var litAccum = vec3<f32>(0.0);
  var alphaAccum = 0.0;

  // --- Channel R Routing ---
  {
    let maskVal = rChannel;
    let effectType = round(cfg.maskR_colorAndType.a);
    let color = cfg.maskR_colorAndType.rgb;
    let strength = cfg.maskR_strengthAndNoise.x;
    let noiseCoupling = cfg.maskR_strengthAndNoise.y;
    let noiseMod = mix(1.0, combinedNoise, noiseCoupling);
    let finalIntensity = strength * maskVal * noiseMod;
    
    if (finalIntensity > 0.0) {
      if (effectType == 0.0) { // Emissive
        litAccum += color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 1.0) { // ColorTint
        litAccum += diffuseColor * color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 2.0) { // Rim
        let rim = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y);
        litAccum += color * rim * finalIntensity;
        alphaAccum += finalIntensity * rim;
      } else if (effectType == 3.0) { // SSS
        let n_dot_l_sss = max((dot(N, L) + 0.5) / 1.5, 0.0);
        let sss = (1.0 - thickness) * n_dot_l_sss;
        litAccum += color * sss * finalIntensity;
        alphaAccum += finalIntensity * sss;
      }
    }
  }

  // --- Channel G Routing ---
  {
    let maskVal = gChannel;
    let effectType = round(cfg.maskG_colorAndType.a);
    let color = cfg.maskG_colorAndType.rgb;
    let strength = cfg.maskG_strengthAndNoise.x;
    let noiseCoupling = cfg.maskG_strengthAndNoise.y;
    let noiseMod = mix(1.0, combinedNoise, noiseCoupling);
    let finalIntensity = strength * maskVal * noiseMod;
    
    if (finalIntensity > 0.0) {
      if (effectType == 0.0) { // Emissive
        litAccum += color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 1.0) { // ColorTint
        litAccum += diffuseColor * color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 2.0) { // Rim
        let rim = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y);
        litAccum += color * rim * finalIntensity;
        alphaAccum += finalIntensity * rim;
      } else if (effectType == 3.0) { // SSS
        let n_dot_l_sss = max((dot(N, L) + 0.5) / 1.5, 0.0);
        let sss = (1.0 - thickness) * n_dot_l_sss;
        litAccum += color * sss * finalIntensity;
        alphaAccum += finalIntensity * sss;
      }
    }
  }

  // --- Channel B Routing ---
  {
    let maskVal = bChannel;
    let effectType = round(cfg.maskB_colorAndType.a);
    let color = cfg.maskB_colorAndType.rgb;
    let strength = cfg.maskB_strengthAndNoise.x;
    let noiseCoupling = cfg.maskB_strengthAndNoise.y;
    let noiseMod = mix(1.0, combinedNoise, noiseCoupling);
    let finalIntensity = strength * maskVal * noiseMod;
    
    if (finalIntensity > 0.0) {
      if (effectType == 0.0) { // Emissive
        litAccum += color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 1.0) { // ColorTint
        litAccum += diffuseColor * color * finalIntensity;
        alphaAccum += finalIntensity;
      } else if (effectType == 2.0) { // Rim
        let rim = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y);
        litAccum += color * rim * finalIntensity;
        alphaAccum += finalIntensity * rim;
      } else if (effectType == 3.0) { // SSS
        let n_dot_l_sss = max((dot(N, L) + 0.5) / 1.5, 0.0);
        let sss = (1.0 - thickness) * n_dot_l_sss;
        litAccum += color * sss * finalIntensity;
        alphaAccum += finalIntensity * sss;
      }
    }
  }

  let finalAlpha = clamp(alphaAccum, 0.0, 1.0);
  if (finalAlpha <= 0.0) { discard; }

  return vec4<f32>(litAccum * finalAlpha, finalAlpha);
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
  private _animMult = 1.0;
  private _lastWorldW = 0;
  private _lastWorldH = 0;
  private _isFallback = 0.0;
  
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

    // --- Mask R Routing ---
    maskR_effectType: 0,
    maskR_colorR: 1.0, maskR_colorG: 0.1, maskR_colorB: 0.05,
    maskR_strength: 1.0,
    maskR_noiseCoupling: 0.5,

    // --- Mask G Routing ---
    maskG_effectType: 1,
    maskG_colorR: 0.0, maskG_colorG: 1.0, maskG_colorB: 0.0,
    maskG_strength: 0.0,
    maskG_noiseCoupling: 0.0,

    // --- Mask B Routing ---
    maskB_effectType: 2,
    maskB_colorR: 0.0, maskB_colorG: 0.0, maskB_colorB: 1.0,
    maskB_strength: 0.0,
    maskB_noiseCoupling: 0.0,

    // --- Global Mask Post-process ---
    maskAnimMode: 1, 
    maskAnimSpeed: 1.0,
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
    metalness: 0.0,
    sssR: 0.8, sssG: 0.6, sssB: 0.5, sssStrength: 0.5,
  };

  constructor() {
    this.container = new Container();
    this.container.label = 'centerpiece-root';
  }

  async init(viewport: Viewport, contentLayer: Container): Promise<void> {
    this._viewport = viewport;

    try {
      this._currentNoiseTexKey = this._params.maskNoiseTex;
      
      let diffuse: Texture;
      let normal: Texture;
      let hrbc: Texture;
      let noise: Texture;
      let maskMap: Texture;
      let isFallback = 0.0;

      try {
        [diffuse, normal, hrbc, noise, maskMap] = await Promise.all([
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1.ktx2'),
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-normal.ktx2'),
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-hrbc.ktx2'),
          Assets.load<Texture>(this._currentNoiseTexKey),
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-mask.ktx2'),
        ]);
      } catch (e) {
        console.warn('[CenterpieceDecal] KTX2 load failed (unsupported ASTC on Windows). Falling back to high-res PNGs:', e);
        isFallback = 1.0;
        const [diffusePng, normalPng, hrdPng, noisePng] = await Promise.all([
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1.png'),
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-normal.png'),
          Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-hrd.png'),
          Assets.load<Texture>(this._currentNoiseTexKey),
        ]);
        diffuse = diffusePng;
        normal = normalPng;
        hrbc = hrdPng;
        maskMap = hrdPng; // PNG hrd is used for both PBR HRBC map and Mask map
        noise = noisePng;
      }

      this._isFallback = isFallback;

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
        uMetalness:   { value: 0.0, type: 'f32' },
        uSSSStrength: { value: 0.5, type: 'f32' },
        uIsFallback:  { value: this._isFallback, type: 'f32' },
        uPad2:        { value: 0.0, type: 'f32' },
        uSSSColor:    { value: [0.8, 0.6, 0.5, 0.0], type: 'vec4<f32>' },
      });

      this._maskUniforms = new UniformGroup({
        maskR_colorAndType:     { value: [1.0, 0.1, 0.05, 0.0], type: 'vec4<f32>' },
        maskG_colorAndType:     { value: [0.0, 1.0, 0.0, 1.0], type: 'vec4<f32>' },
        maskB_colorAndType:     { value: [0.0, 0.0, 1.0, 2.0], type: 'vec4<f32>' },
        uNoiseCfg:              { value: [2.5, 1.2, 0.02, 0.01], type: 'vec4<f32>' },
        uNoiseCfg2:             { value: [3.5, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        maskR_strengthAndNoise: { value: [1.0, 0.5], type: 'vec2<f32>' },
        maskG_strengthAndNoise: { value: [0.0, 0.0], type: 'vec2<f32>' },
        maskB_strengthAndNoise: { value: [0.0, 0.0], type: 'vec2<f32>' },
        uTime:                  { value: 0.0, type: 'f32' },
        uIsFallback:            { value: this._isFallback, type: 'f32' },
      });

      const shader = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: FRAG_WGSL, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          light:      this._lightUniforms,
          uDiffuse:   diffuse.source,
          uSampler:   diffuse.source.style,
          uNormalMap: normal.source,
          uHRBCMap:   hrbc.source,
          uMaskMap:   maskMap.source,
          channel:    this._channelConfig,
        }
      });
      this._mesh = new Mesh({ geometry, shader, label: 'centerpiece-metal-mesh' });

      const maskShader = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: MASK_EMISSIVE_WGSL, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          cfg:        this._maskUniforms,
          light:      this._lightUniforms,
          uSampler:   diffuse.source.style,
          uMaskMap:   maskMap.source,
          uNoiseMap:  noise.source,
          uDiffuse:   diffuse.source,
          uNormalMap: normal.source,
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

      this._animMult = animMult;
      
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
    lu.uSurface[1] = this._params.bumpX;

    const cc = this._channelConfig.uniforms;
    cc.uMetalness   = this._params.metalness;
    cc.uSSSStrength = this._params.sssStrength;
    cc.uIsFallback  = this._isFallback;
    cc.uSSSColor    = [this._params.sssR, this._params.sssG, this._params.sssB, 0];

    const mu = this._maskUniforms.uniforms;
    mu.maskR_colorAndType = [this._params.maskR_colorR, this._params.maskR_colorG, this._params.maskR_colorB, this._params.maskR_effectType];
    mu.maskG_colorAndType = [this._params.maskG_colorR, this._params.maskG_colorG, this._params.maskG_colorB, this._params.maskG_effectType];
    mu.maskB_colorAndType = [this._params.maskB_colorR, this._params.maskB_colorG, this._params.maskB_colorB, this._params.maskB_effectType];
    
    mu.uNoiseCfg  = [this._params.noiseScale, this._params.noiseContrast, this._params.noiseSpeedX, this._params.noiseSpeedY];
    mu.uNoiseCfg2 = [this._params.noiseScale2, this._params.noiseBlend, 0, 0];
    mu.uIsFallback = this._isFallback;
    
    mu.maskR_strengthAndNoise = [this._params.maskR_strength * this._animMult, this._params.maskR_noiseCoupling];
    mu.maskG_strengthAndNoise = [this._params.maskG_strength * this._animMult, this._params.maskG_noiseCoupling];
    mu.maskB_strengthAndNoise = [this._params.maskB_strength * this._animMult, this._params.maskB_noiseCoupling];
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

    // 2. 获取该主题下上一次处于激活状态 of 子阶段
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
