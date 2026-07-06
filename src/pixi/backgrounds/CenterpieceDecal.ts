import {
  Container, Assets, Mesh, Geometry, Shader, UniformGroup,
  Texture, BlurFilter, Buffer
} from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import gsap from 'gsap';
import { aabbSystem } from '../systems/AABBSystem';
import { CenterpieceDebugPanel } from './CenterpieceDebugPanel';
import { CENTERPIECE_PRESETS, presetToParams, loadPresetsForPersona } from './centerpiece-presets';
import { personaBridge } from '../bridges/PersonaBridge';
import { debugPanelBridge } from '../bridges/DebugPanelBridge';
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
  uSurface:      vec4<f32>,  // x=漫反射强度, y=法线凹凸X, z=视差, w=高度AO
  uRoughness:    vec4<f32>,  // x=min, y=max, z=alphaClip, w=normalFlipY
  uRoughnessAdj: vec4<f32>,  // x=contrast, y=bias, z=法线凹凸Y, w=unused
  uSpec:         vec4<f32>,  // x=强度, y=f0, z=fresnelPower, w=specAoMask
  uSpecColor:    vec4<f32>,  // rgb=颜色
  uRim:          vec4<f32>,  // x=强度, y=幂次
  uRimColor:     vec4<f32>,  // rgb=颜色
  uDiffuseTint:  vec4<f32>,  // rgb=染色
  uSystem:       vec4<f32>,  // x=exposure, y=diffuseWrap, z=diffuseSaturation, w=cavityStrength
}

struct HRBAConfig {
  uHRBAFlags:    vec4<f32>,  // x=metalnessEnabled, y=sssEnabled, zw=unused
  uMetalness:    vec4<f32>,  // x=globalMetalness, yzw=unused
  uSSSColor:     vec4<f32>,  // rgb=SSS颜色, w=全局SSS强度
}

struct MaskUniforms {
  maskR_effectColorAndType: vec4<f32>, // rgb=颜色, a=路由类型 (0=None, 1=Emissive, 2=ColorTint, 3=Rim, 4=SSS)
  maskR_strengthAndNoise:   vec4<f32>, // x=发光强度(已应用动画/总强度,供发光层用), y=noiseCoupling, z=材质路由强度(未动画,供染色/边缘光/SSS用), w=unused
  maskG_effectColorAndType: vec4<f32>,
  maskG_strengthAndNoise:   vec4<f32>,
  maskB_effectColorAndType: vec4<f32>,
  maskB_strengthAndNoise:   vec4<f32>,
  uNoiseCfg:  vec4<f32>,  // x=scale, y=contrast, z=speedX, w=speedY
  uNoiseCfg2: vec4<f32>,  // x=scale2, y=blendMode, zw=unused
  uMaskAdj:   vec4<f32>,  // x=brightness, y=contrast, z=softness, w=unused
  uTime:      f32,
  _pad1:      f32,
  _pad2:      f32,
  _pad3:      f32,
}

@group(1) @binding(0) var<uniform> light:      LightUniforms;
@group(1) @binding(1) var uDiffuse:            texture_2d<f32>;
@group(1) @binding(2) var uSampler:            sampler;
@group(1) @binding(3) var uNormalMap:          texture_2d<f32>;
@group(1) @binding(4) var uHRBAMap:            texture_2d<f32>;
@group(1) @binding(5) var uMaskMap:            texture_2d<f32>;
@group(1) @binding(6) var<uniform> hrbaConfig:  HRBAConfig;
@group(1) @binding(7) var<uniform> maskConfig:  MaskUniforms;

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
  let hrba_base  = textureSample(uHRBAMap, uSampler, uv);
  let h1         = hrba_base.r;
  let L          = normalize(light.uLightDir.xyz);
  
  // 第一步估算视差位移
  let offset1    = -vec2<f32>(L.x, -L.y) * h1 * light.uSurface.z;
  
  // 第二步在估算坐标处进行二次采样，通过高度均值平滑
  let hrba_next  = textureSample(uHRBAMap, uSampler, uv + offset1);
  let h2         = hrba_next.r;
  let smoothH    = (h1 + h2) * 0.5;
  
  // 凸起 3D 浮雕视差：与边界掩码 baseAlpha 解耦，保证纹理在边缘滑动的连续性与圆润感
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
  let hrba = textureSample(uHRBAMap,    uSampler, pUV);
  let height = hrba.r;
  
  // Roughness 调整
  var roughness_base = hrba.g;
  roughness_base = adjust_contrast(roughness_base + light.uRoughnessAdj.y, light.uRoughnessAdj.x);
  let roughness = mix(light.uRoughness.x, light.uRoughness.y, clamp(roughness_base, 0.0, 1.0));

  var N = nRaw.rgb * 2.0 - 1.0;
  if (light.uRoughness.w > 0.5) { N.y = -N.y; }
  N = normalize(vec3<f32>(N.x * light.uSurface.y, N.y * light.uRoughnessAdj.z, N.z));

  let ao = mix(1.0, height, light.uSurface.w);
  let cavity = mix(1.0, height, light.uSystem.w);
  
  let ambient_term = light.uAmbient.rgb * light.uAmbient.w * ao * diffuseColor;

  // Metalness 路由计算
  var metalness = hrbaConfig.uMetalness.x; // 默认 0 = None (使用 flat constant)
  if (hrbaConfig.uHRBAFlags.x > 0.5) { // 1.0 = Metalness (B channel)
    metalness = hrba.b * hrbaConfig.uMetalness.x;
  }
  metalness = clamp(metalness, 0.0, 1.0);

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

  let curvature   = clamp(length(fwidth(N.xyz)) * 2.0, 0.0, 1.0);
  let specStrength = light.uSpec.x * (1.0 + curvature * 1.5);
  let spec_term   = light.uSpecColor.rgb * specular * specMask * specStrength * n_dot_l * light.uLightColor.rgb * light.uLightColor.w;

  let rim      = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y) * light.uRim.x * specMask;
  var rim_term = light.uRimColor.rgb * rim;

  // thickness and SSS/Transmission strength
  var sss_strength: f32 = 0.0;
  var transmission_strength: f32 = 0.0;

  if (hrbaConfig.uHRBAFlags.y > 0.5 && hrbaConfig.uHRBAFlags.y < 1.5) { // 1.0 = SSS
    sss_strength = hrba.a * hrbaConfig.uSSSColor.w;
  } else if (hrbaConfig.uHRBAFlags.y > 1.5) { // 2.0 = Transmission
    transmission_strength = hrba.a * hrbaConfig.uSSSColor.w;
  }

  // Mask 路由累加逻辑
  let maskRGB = textureSample(uMaskMap, uSampler, pUV);

  // Process Channel R
  let maskR_val = maskRGB.r;
  let maskR_type = u32(maskConfig.maskR_effectColorAndType.a + 0.5);
  let maskR_color = maskConfig.maskR_effectColorAndType.rgb;
  let maskR_strength = maskConfig.maskR_strengthAndNoise.z;
  if (maskR_type == 2u) { // ColorTint
    diffuseColor = mix(diffuseColor, diffuseColor * maskR_color, clamp(maskR_val * maskR_strength, 0.0, 1.0));
  } else if (maskR_type == 3u) { // Rim
    rim_term += maskR_color * rim * maskR_val * maskR_strength;
  } else if (maskR_type == 4u) { // SSS
    if (hrbaConfig.uHRBAFlags.y > 1.5) { // 2.0 = Transmission
      transmission_strength += maskR_val * maskR_strength;
    } else {
      sss_strength += maskR_val * maskR_strength;
    }
  }

  // Process Channel G
  let maskG_val = maskRGB.g;
  let maskG_type = u32(maskConfig.maskG_effectColorAndType.a + 0.5);
  let maskG_color = maskConfig.maskG_effectColorAndType.rgb;
  let maskG_strength = maskConfig.maskG_strengthAndNoise.z;
  if (maskG_type == 2u) { // ColorTint
    diffuseColor = mix(diffuseColor, diffuseColor * maskG_color, clamp(maskG_val * maskG_strength, 0.0, 1.0));
  } else if (maskG_type == 3u) { // Rim
    rim_term += maskG_color * rim * maskG_val * maskG_strength;
  } else if (maskG_type == 4u) { // SSS
    if (hrbaConfig.uHRBAFlags.y > 1.5) { // 2.0 = Transmission
      transmission_strength += maskG_val * maskG_strength;
    } else {
      sss_strength += maskG_val * maskG_strength;
    }
  }

  // Process Channel B
  let maskB_val = maskRGB.b;
  let maskB_type = u32(maskConfig.maskB_effectColorAndType.a + 0.5);
  let maskB_color = maskConfig.maskB_effectColorAndType.rgb;
  let maskB_strength = maskConfig.maskB_strengthAndNoise.z;
  if (maskB_type == 2u) { // ColorTint
    diffuseColor = mix(diffuseColor, diffuseColor * maskB_color, clamp(maskB_val * maskB_strength, 0.0, 1.0));
  } else if (maskB_type == 3u) { // Rim
    rim_term += maskB_color * rim * maskB_val * maskB_strength;
  } else if (maskB_type == 4u) { // SSS
    if (hrbaConfig.uHRBAFlags.y > 1.5) { // 2.0 = Transmission
      transmission_strength += maskB_val * maskB_strength;
    } else {
      sss_strength += maskB_val * maskB_strength;
    }
  }

  let n_dot_l_final = max((n_dot_l_raw + sss_strength) / (1.0 + sss_strength), 0.0);
  let sss_color = mix(vec3<f32>(1.0), hrbaConfig.uSSSColor.rgb, clamp(sss_strength, 0.0, 1.0));

  let main_light_diffuse = light.uLightColor.rgb * light.uLightColor.w * n_dot_l_wrap * light.uSurface.x;
  let diffuse_term = diffuseColor * diffuse_factor * (main_light_diffuse + n_dot_l_final * light.uSurface.x * sss_color);

  // 背光物理透射 (Transmission)
  var transmission_term: vec3<f32> = vec3<f32>(0.0);
  if (transmission_strength > 0.0) {
    let trans_light_dir = normalize(vec3<f32>(-L.x, -L.y, 1.0));
    let trans_dot = max(dot(N, trans_light_dir), 0.0);
    transmission_term = hrbaConfig.uSSSColor.rgb * transmission_strength * trans_dot * light.uLightColor.rgb * light.uLightColor.w;
  }

  var lit = ambient_term + diffuse_term + spec_term + rim_term + transmission_term;
  
  // 全局曝光
  lit *= light.uSystem.x;

  let finalAlpha = rawDiffuse.a * edgeAlpha * baseAlpha;
  return vec4<f32>(lit * finalAlpha, finalAlpha);
}
`;

// ─── WGSL: PBR v4 Fragment (线性工作流 + Tonemap + Matcap 环境反射 + 双材质模型) ──
// 与 v3 共享全部 UniformGroup;新增 v4(参数) 与 uEnvMap(matcap 环境图) 两个绑定。
// 材质模型: uV4A.x = 0 → PBR(宝石/血肉/植物/金属), 1 → Stylized(手绘/纸板/少女)。

const FRAG_WGSL_V4 = `
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

struct HRBAConfig {
  uHRBAFlags:    vec4<f32>,
  uMetalness:    vec4<f32>,
  uSSSColor:     vec4<f32>,
}

struct MaskUniforms {
  maskR_effectColorAndType: vec4<f32>,
  maskR_strengthAndNoise:   vec4<f32>,
  maskG_effectColorAndType: vec4<f32>,
  maskG_strengthAndNoise:   vec4<f32>,
  maskB_effectColorAndType: vec4<f32>,
  maskB_strengthAndNoise:   vec4<f32>,
  uNoiseCfg:  vec4<f32>,
  uNoiseCfg2: vec4<f32>,
  uMaskAdj:   vec4<f32>,
  uTime:      f32,
  _pad1:      f32,
  _pad2:      f32,
  _pad3:      f32,
}

struct V4Uniforms {
  uV4A: vec4<f32>,  // x=materialModel(0=PBR,1=Stylized), y=tonemapMode(0=None,1=Reinhard,2=ACES), z=envStrength, w=unpremultiply
  uV4B: vec4<f32>,  // x=normalFlipX, y=normalBiasX, z=normalBiasY, w=heightInvert
  uV4C: vec4<f32>,  // x=curvatureScale, y=curvatureBoost, z=rampSoftness, w=rampSteps
  uV4D: vec4<f32>,  // x=envRoughFade, yzw=reserved
  // ── 光照系统重做新增(计划: plan-centerpiece-workbench.md §1) ──
  uV4E: vec4<f32>,  // x=lightType(0=平行光,1=点光), y=pointFalloffRadius, z=pointFalloffCurve, w=envUniformity
  uV4F: vec4<f32>,  // xy=lightPosUV(点光位置/方向驱动向量+0.5), z=parallaxFollow(0=跟随光,1=跟随鼠标), w=ditherStrength
  uV4G: vec4<f32>,  // xy=mouseOffsetUV(原始鼠标偏移,供视差跟随鼠标专用,与光照驱动模式无关), zw=reserved
  uV4H: vec4<f32>,  // x=reliefShadowStrength, y=reliefShadowLength, z=reliefShadowSoftness, w=reserved
  uV4I: vec4<f32>,  // rgb=fillColor(副光颜色), w=fillStrength(副光强度)
  uV4J: vec4<f32>,  // xyz=fillDir(副光方向,TS 预计算未归一化分量), w=reserved
}

struct CameraUniforms {
  uResolution: vec2<f32>,
  uViewPos:    vec2<f32>,
  uWorldSize:  vec2<f32>,
  uZoom:       f32,
}

@group(0) @binding(0) var<uniform> cam:        CameraUniforms;
@group(1) @binding(0) var<uniform> light:      LightUniforms;
@group(1) @binding(1) var uDiffuse:            texture_2d<f32>;
@group(1) @binding(2) var uSampler:            sampler;
@group(1) @binding(3) var uNormalMap:          texture_2d<f32>;
@group(1) @binding(4) var uHRBAMap:            texture_2d<f32>;
@group(1) @binding(5) var uMaskMap:            texture_2d<f32>;
@group(1) @binding(6) var<uniform> hrbaConfig:  HRBAConfig;
@group(1) @binding(7) var<uniform> maskConfig:  MaskUniforms;
@group(1) @binding(8) var<uniform> v4:          V4Uniforms;
@group(1) @binding(9) var uEnvMap:              texture_2d<f32>;

const PI: f32 = 3.14159265359;

// sRGB ↔ 线性空间(2.2 近似,美术管线足够)
fn s2l(c: vec3<f32>) -> vec3<f32> { return pow(max(c, vec3<f32>(0.0)), vec3<f32>(2.2)); }
fn l2s(c: vec3<f32>) -> vec3<f32> { return pow(max(c, vec3<f32>(0.0)), vec3<f32>(1.0 / 2.2)); }

// 去色带用整数散列噪声(屏幕空间,不随缩放/平移漂移)
fn hash21(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// ACES 近似 (Narkowicz)
fn aces(x: vec3<f32>) -> vec3<f32> {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3<f32>(0.0), vec3<f32>(1.0));
}

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
    return geometry_schlick_ggx(n_dot_v, roughness) * geometry_schlick_ggx(n_dot_l, roughness);
}

fn adjust_contrast(v: f32, contrast: f32) -> f32 {
    return (v - 0.5) * contrast + 0.5;
}

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let baseAlpha  = textureSample(uDiffuse, uSampler, uv).a;
  let hrba_base  = textureSample(uHRBAMap, uSampler, uv);
  var h1         = hrba_base.r;
  if (v4.uV4B.w > 0.5) { h1 = 1.0 - h1; }

  // 光源方向:平行光(现状)或点光(逐像素方向 + 距离衰减)
  var L: vec3<f32>;
  var lightAtten: f32 = 1.0;
  if (v4.uV4E.x > 0.5) {
    let toLightUV = v4.uV4F.xy - uv;
    let dist = length(toLightUV);
    lightAtten = pow(clamp(1.0 - dist / max(v4.uV4E.y, 0.001), 0.0, 1.0), max(v4.uV4E.z, 0.01));
    let pointDirRaw = vec3<f32>(toLightUV.x, -toLightUV.y, light.uLightDir.z);
    L = normalize(select(vec3<f32>(0.0, 0.0, 1.0), pointDirRaw, length(pointDirRaw) > 0.0001));
  } else {
    L = normalize(light.uLightDir.xyz);
  }

  // 视差驱动向量:跟随光(现状)或跟随鼠标(资材调理:视差跟随)
  let parallaxDriver = select(vec2<f32>(L.x, -L.y), vec2<f32>(v4.uV4G.x, -v4.uV4G.y), v4.uV4F.z > 0.5);

  // 光驱动视差(2.5D 技巧,沿用 v3;高度经过 invert 调理)
  let offset1    = -parallaxDriver * h1 * light.uSurface.z;
  var h2         = textureSample(uHRBAMap, uSampler, uv + offset1).r;
  if (v4.uV4B.w > 0.5) { h2 = 1.0 - h2; }
  let smoothH    = (h1 + h2) * 0.5;
  let pOffset    = -parallaxDriver * smoothH * light.uSurface.z;
  let pUV        = uv + pOffset;

  let rawDiffuse = textureSample(uDiffuse, uSampler, pUV);
  let clipThreshold = light.uRoughness.z;
  // 边缘抗锯齿:过渡带宽度跟随屏幕像素导数,任意缩放倍率下都恰好一个像素左右的柔和过渡
  let edgeAAWidth = max(fwidth(rawDiffuse.a), 0.0001);
  let edgeAlpha = smoothstep(clipThreshold - edgeAAWidth, clipThreshold + edgeAAWidth, rawDiffuse.a);
  if (edgeAlpha <= 0.0) { discard; }

  // 反预乘(修 v3 的边缘双乘 alpha 暗边)→ 解码到线性空间
  var albedo = rawDiffuse.rgb;
  if (v4.uV4A.w > 0.5) { albedo = albedo / max(rawDiffuse.a, 0.0001); }
  albedo = s2l(albedo);
  var diffuseColor = albedo * s2l(light.uDiffuseTint.rgb);

  // 饱和度(线性空间)
  let luminance = dot(diffuseColor, vec3<f32>(0.2126, 0.7152, 0.0722));
  diffuseColor = mix(vec3<f32>(luminance), diffuseColor, light.uSystem.z);

  let nRaw = textureSample(uNormalMap, uSampler, pUV);
  let hrba = textureSample(uHRBAMap,    uSampler, pUV);
  var height = hrba.r;
  if (v4.uV4B.w > 0.5) { height = 1.0 - height; }

  var roughness_base = hrba.g;
  roughness_base = adjust_contrast(roughness_base + light.uRoughnessAdj.y, light.uRoughnessAdj.x);
  let roughness = mix(light.uRoughness.x, light.uRoughness.y, clamp(roughness_base, 0.0, 1.0));

  // 法线解码 + 资材调理(轴向翻转 / 偏置校正,吸收推理资材的系统性误差)
  var N = nRaw.rgb * 2.0 - 1.0;
  if (light.uRoughness.w > 0.5) { N.y = -N.y; }
  if (v4.uV4B.x > 0.5)          { N.x = -N.x; }
  N.x = N.x - v4.uV4B.y;
  N.y = N.y - v4.uV4B.z;
  N = normalize(vec3<f32>(N.x * light.uSurface.y, N.y * light.uRoughnessAdj.z, N.z));

  let ao = mix(1.0, height, light.uSurface.w);
  let cavity = mix(1.0, height, light.uSystem.w);

  let ambient_term = s2l(light.uAmbient.rgb) * light.uAmbient.w * ao * diffuseColor;

  // 浮雕投影:沿光方向在高度图上采样,遮挡则压暗(默认 strength=0 完全旁路)
  var reliefShadowFactor = 1.0;
  if (v4.uV4H.x > 0.0) {
    let shadowDir = vec2<f32>(L.x, -L.y);
    let sLen = v4.uV4H.y;
    var h_s1 = textureSample(uHRBAMap, uSampler, pUV + shadowDir * sLen * 0.33).r;
    var h_s2 = textureSample(uHRBAMap, uSampler, pUV + shadowDir * sLen * 0.66).r;
    var h_s3 = textureSample(uHRBAMap, uSampler, pUV + shadowDir * sLen).r;
    if (v4.uV4B.w > 0.5) { h_s1 = 1.0 - h_s1; h_s2 = 1.0 - h_s2; h_s3 = 1.0 - h_s3; }
    let soft = v4.uV4H.z;
    let d1 = clamp((h_s1 - height - 0.033) * 4.0, 0.0, 1.0);
    let d2 = clamp((h_s2 - height - 0.066) * 4.0, 0.0, 1.0) * (1.0 - soft * 0.3);
    let d3 = clamp((h_s3 - height - 0.100) * 4.0, 0.0, 1.0) * (1.0 - soft * 0.6);
    let occlusion = max(d1, max(d2, d3)) * v4.uV4H.x;
    reliefShadowFactor = 1.0 - occlusion;
  }

  var metalness = hrbaConfig.uMetalness.x;
  if (hrbaConfig.uHRBAFlags.x > 0.5) {
    metalness = hrba.b * hrbaConfig.uMetalness.x;
  }
  metalness = clamp(metalness, 0.0, 1.0);

  let f0             = mix(vec3<f32>(light.uSpec.y), diffuseColor, metalness);
  let diffuse_factor = 1.0 - metalness;

  // 副光(职责=托暗部,仅参与漫反射;默认 fillStrength=0 完全旁路)
  // 零向量兜底,避免 lightHeight=0 等边界情况下 normalize(0) 产生 NaN 污染画面
  let fillDirRaw   = v4.uV4J.xyz;
  let fillDirN     = normalize(select(vec3<f32>(0.0, 0.0, 1.0), fillDirRaw, length(fillDirRaw) > 0.0001));
  let fill_n_dot_l = max(dot(N, fillDirN), 0.0);
  let fill_term    = diffuseColor * diffuse_factor * s2l(v4.uV4I.rgb) * v4.uV4I.w * fill_n_dot_l;

  let V           = vec3<f32>(0.0, 0.0, 1.0);
  let H           = normalize(L + V);
  let n_dot_v     = max(dot(N, V), 0.0);
  let n_dot_h     = max(dot(N, H), 0.0);
  let v_dot_h     = max(dot(V, H), 0.0);

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

  // 曲率高光(系数滑块化,v3 硬编码 2.0/1.5)
  let curvature   = clamp(length(fwidth(N.xyz)) * v4.uV4C.x, 0.0, 1.0);
  let specStrength = light.uSpec.x * (1.0 + curvature * v4.uV4C.y);
  let lightLin    = s2l(light.uLightColor.rgb) * light.uLightColor.w * lightAtten;
  let spec_term   = s2l(light.uSpecColor.rgb) * specular * specMask * specStrength * n_dot_l * lightLin * reliefShadowFactor;

  let rim      = pow(clamp(1.0 - n_dot_v, 0.0, 1.0), light.uRim.y) * light.uRim.x * specMask;
  var rim_term = s2l(light.uRimColor.rgb) * rim;

  var sss_strength: f32 = 0.0;
  var transmission_strength: f32 = 0.0;
  if (hrbaConfig.uHRBAFlags.y > 0.5 && hrbaConfig.uHRBAFlags.y < 1.5) {
    sss_strength = hrba.a * hrbaConfig.uSSSColor.w;
  } else if (hrbaConfig.uHRBAFlags.y > 1.5) {
    transmission_strength = hrba.a * hrbaConfig.uSSSColor.w;
  }

  // Mask 三路路由(与 v3 相同逻辑,颜色转线性)
  let maskRGB = textureSample(uMaskMap, uSampler, pUV);

  let maskR_val = maskRGB.r;
  let maskR_type = u32(maskConfig.maskR_effectColorAndType.a + 0.5);
  let maskR_color = s2l(maskConfig.maskR_effectColorAndType.rgb);
  let maskR_strength = maskConfig.maskR_strengthAndNoise.z;
  if (maskR_type == 2u) {
    diffuseColor = mix(diffuseColor, diffuseColor * maskR_color, clamp(maskR_val * maskR_strength, 0.0, 1.0));
  } else if (maskR_type == 3u) {
    rim_term += maskR_color * rim * maskR_val * maskR_strength;
  } else if (maskR_type == 4u) {
    if (hrbaConfig.uHRBAFlags.y > 1.5) { transmission_strength += maskR_val * maskR_strength; }
    else { sss_strength += maskR_val * maskR_strength; }
  }

  let maskG_val = maskRGB.g;
  let maskG_type = u32(maskConfig.maskG_effectColorAndType.a + 0.5);
  let maskG_color = s2l(maskConfig.maskG_effectColorAndType.rgb);
  let maskG_strength = maskConfig.maskG_strengthAndNoise.z;
  if (maskG_type == 2u) {
    diffuseColor = mix(diffuseColor, diffuseColor * maskG_color, clamp(maskG_val * maskG_strength, 0.0, 1.0));
  } else if (maskG_type == 3u) {
    rim_term += maskG_color * rim * maskG_val * maskG_strength;
  } else if (maskG_type == 4u) {
    if (hrbaConfig.uHRBAFlags.y > 1.5) { transmission_strength += maskG_val * maskG_strength; }
    else { sss_strength += maskG_val * maskG_strength; }
  }

  let maskB_val = maskRGB.b;
  let maskB_type = u32(maskConfig.maskB_effectColorAndType.a + 0.5);
  let maskB_color = s2l(maskConfig.maskB_effectColorAndType.rgb);
  let maskB_strength = maskConfig.maskB_strengthAndNoise.z;
  if (maskB_type == 2u) {
    diffuseColor = mix(diffuseColor, diffuseColor * maskB_color, clamp(maskB_val * maskB_strength, 0.0, 1.0));
  } else if (maskB_type == 3u) {
    rim_term += maskB_color * rim * maskB_val * maskB_strength;
  } else if (maskB_type == 4u) {
    if (hrbaConfig.uHRBAFlags.y > 1.5) { transmission_strength += maskB_val * maskB_strength; }
    else { sss_strength += maskB_val * maskB_strength; }
  }

  // Matcap 环境反射(把材质从"一盏灯"世界带进"有环境"世界)
  let muv = vec2<f32>(N.x, -N.y) * 0.5 + 0.5;
  let envCol = s2l(textureSample(uEnvMap, uSampler, muv).rgb);
  let envFresnel = fresnel_schlick(n_dot_v, f0, light.uSpec.z);
  let envGate = mix(envFresnel, vec3<f32>(1.0), v4.uV4E.w);
  let envFade = clamp(1.0 - roughness * v4.uV4D.x, 0.0, 1.0);
  let env_term = envCol * v4.uV4A.z * envGate * envFade * specMask;

  let n_dot_l_final = max((n_dot_l_raw + sss_strength) / (1.0 + sss_strength), 0.0);
  let sss_color = mix(vec3<f32>(1.0), s2l(hrbaConfig.uSSSColor.rgb), clamp(sss_strength, 0.0, 1.0));

  var transmission_term: vec3<f32> = vec3<f32>(0.0);
  if (transmission_strength > 0.0) {
    let trans_light_dir = normalize(vec3<f32>(-L.x, -L.y, 1.0));
    let trans_dot = max(dot(N, trans_light_dir), 0.0);
    transmission_term = s2l(hrbaConfig.uSSSColor.rgb) * transmission_strength * trans_dot * lightLin;
  }

  var lit: vec3<f32>;
  if (v4.uV4A.x < 0.5) {
    // ── 材质模型 PBR:宝石/血肉/植物/金属 ──
    let main_light_diffuse = lightLin * n_dot_l_wrap * light.uSurface.x;
    let diffuse_term = diffuseColor * diffuse_factor * (main_light_diffuse + n_dot_l_final * light.uSurface.x * sss_color) * cavity * reliefShadowFactor;
    lit = ambient_term + diffuse_term + spec_term + rim_term + transmission_term + env_term + fill_term;
  } else {
    // ── 材质模型 Stylized:手绘/纸板/少女(色阶化柔光,不做物理高光) ──
    let steps = max(v4.uV4C.w, 1.0);
    let posterized = clamp(floor(n_dot_l_wrap * steps + 0.5) / steps, 0.0, 1.0);
    let ramp = mix(posterized, n_dot_l_wrap, v4.uV4C.z);
    let main_light = lightLin * ramp * light.uSurface.x * cavity * reliefShadowFactor;
    lit = ambient_term + diffuseColor * main_light + rim_term + env_term + fill_term;
  }

  // 曝光(线性)→ 色调映射 → 编码回 sRGB
  lit *= light.uSystem.x;
  if (v4.uV4A.y > 1.5)      { lit = aces(lit); }
  else if (v4.uV4A.y > 0.5) { lit = lit / (vec3<f32>(1.0) + lit); }
  lit = l2s(lit);

  // 去色带:屏幕空间散列噪声,人眼不可见,消除暗部渐变的色带(默认 ditherStrength=1.0)
  let ditherNoise = (hash21(uv * cam.uResolution) - 0.5) / 255.0 * v4.uV4F.w;
  lit = lit + vec3<f32>(ditherNoise);

  let finalAlpha = rawDiffuse.a * edgeAlpha * baseAlpha;
  return vec4<f32>(lit * finalAlpha, finalAlpha);
}
`;

const MASK_EMISSIVE_WGSL = `
struct MaskUniforms {
  maskR_effectColorAndType: vec4<f32>,
  maskR_strengthAndNoise:   vec4<f32>,
  maskG_effectColorAndType: vec4<f32>,
  maskG_strengthAndNoise:   vec4<f32>,
  maskB_effectColorAndType: vec4<f32>,
  maskB_strengthAndNoise:   vec4<f32>,
  uNoiseCfg:  vec4<f32>,
  uNoiseCfg2: vec4<f32>,
  uMaskAdj:   vec4<f32>,
  uTime:      f32,
  _pad1:      f32,
  _pad2:      f32,
  _pad3:      f32,
}
@group(1) @binding(0) var<uniform> maskConfig: MaskUniforms;
@group(1) @binding(1) var uMaskMap:            texture_2d<f32>;
@group(1) @binding(2) var uSampler:            sampler;
@group(1) @binding(3) var uNoiseMap:           texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let maskRGB = textureSample(uMaskMap, uSampler, uv);
  
  let t = maskConfig.uTime;
  
  // Layer 1 Noise
  let noiseUV1 = uv * maskConfig.uNoiseCfg.x + vec2<f32>(t * maskConfig.uNoiseCfg.z, t * maskConfig.uNoiseCfg.w);
  let n1 = textureSample(uNoiseMap, uSampler, noiseUV1).r;
  
  // Layer 2 Noise
  let noiseUV2 = uv * maskConfig.uNoiseCfg2.x - vec2<f32>(t * maskConfig.uNoiseCfg.z * 0.25, t * maskConfig.uNoiseCfg.w * 1.5);
  let n2 = textureSample(uNoiseMap, uSampler, noiseUV2).r;
  
  var combinedNoise: f32;
  if (maskConfig.uNoiseCfg2.y < 0.25) { // Mul
    combinedNoise = n1 * n2;
  } else if (maskConfig.uNoiseCfg2.y < 0.75) { // Lerp
    combinedNoise = mix(n1, n2, 0.5);
  } else { // Add
    combinedNoise = clamp(n1 + n2, 0.0, 1.0);
  }
  combinedNoise = pow(combinedNoise, maskConfig.uNoiseCfg.y) * max(maskConfig._pad1, 0.0);
  
  if (maskConfig.uNoiseCfg.x <= 0.0) { combinedNoise = 1.0; }

  var finalColor: vec3<f32> = vec3<f32>(0.0);
  var finalAlpha: f32 = 0.0;
  
  // Process Channel R
  let maskR_val = maskRGB.r;
  let maskR_type = u32(maskConfig.maskR_effectColorAndType.a + 0.5);
  let maskR_color = maskConfig.maskR_effectColorAndType.rgb;
  let maskR_strength = maskConfig.maskR_strengthAndNoise.x;
  let maskR_noiseCoupling = maskConfig.maskR_strengthAndNoise.y;
  
  if (maskR_type == 1u) { // Emissive
    var mR = saturate(maskR_val * maskConfig.uMaskAdj.y + maskConfig.uMaskAdj.x);
    if (maskConfig.uMaskAdj.z > 0.0) {
      mR = pow(mR, 1.0 + maskConfig.uMaskAdj.z * 5.0);
    }
    let edgeMaskR = smoothstep(0.0, max(maskConfig.uMaskAdj.w, 0.0005), mR);
    if (edgeMaskR > 0.0) {
      let noiseMod = mix(1.0, combinedNoise, maskR_noiseCoupling);
      let alphaR = mR * noiseMod * maskR_strength * edgeMaskR;
      finalColor += maskR_color * alphaR;
      finalAlpha = max(finalAlpha, alphaR);
    }
  }
  
  // Process Channel G
  let maskG_val = maskRGB.g;
  let maskG_type = u32(maskConfig.maskG_effectColorAndType.a + 0.5);
  let maskG_color = maskConfig.maskG_effectColorAndType.rgb;
  let maskG_strength = maskConfig.maskG_strengthAndNoise.x;
  let maskG_noiseCoupling = maskConfig.maskG_strengthAndNoise.y;
  
  if (maskG_type == 1u) { // Emissive
    var mG = saturate(maskG_val * maskConfig.uMaskAdj.y + maskConfig.uMaskAdj.x);
    if (maskConfig.uMaskAdj.z > 0.0) {
      mG = pow(mG, 1.0 + maskConfig.uMaskAdj.z * 5.0);
    }
    let edgeMaskG = smoothstep(0.0, max(maskConfig.uMaskAdj.w, 0.0005), mG);
    if (edgeMaskG > 0.0) {
      let noiseMod = mix(1.0, combinedNoise, maskG_noiseCoupling);
      let alphaG = mG * noiseMod * maskG_strength * edgeMaskG;
      finalColor += maskG_color * alphaG;
      finalAlpha = max(finalAlpha, alphaG);
    }
  }

  // Process Channel B
  let maskB_val = maskRGB.b;
  let maskB_type = u32(maskConfig.maskB_effectColorAndType.a + 0.5);
  let maskB_color = maskConfig.maskB_effectColorAndType.rgb;
  let maskB_strength = maskConfig.maskB_strengthAndNoise.x;
  let maskB_noiseCoupling = maskConfig.maskB_strengthAndNoise.y;
  
  if (maskB_type == 1u) { // Emissive
    var mB = saturate(maskB_val * maskConfig.uMaskAdj.y + maskConfig.uMaskAdj.x);
    if (maskConfig.uMaskAdj.z > 0.0) {
      mB = pow(mB, 1.0 + maskConfig.uMaskAdj.z * 5.0);
    }
    let edgeMaskB = smoothstep(0.0, max(maskConfig.uMaskAdj.w, 0.0005), mB);
    if (edgeMaskB > 0.0) {
      let noiseMod = mix(1.0, combinedNoise, maskB_noiseCoupling);
      let alphaB = mB * noiseMod * maskB_strength * edgeMaskB;
      finalColor += maskB_color * alphaB;
      finalAlpha = max(finalAlpha, alphaB);
    }
  }
  
  if (finalAlpha <= 0.0) { discard; }
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
  private _hrbaConfig:      UniformGroup | null = null;
  private _maskUniforms:    UniformGroup | null = null;
  private _v4Uniforms:      UniformGroup | null = null;
  private _shaderV3:        Shader | null = null;
  private _shaderV4:        Shader | null = null;
  private _activeShaderVersion = -1;
  private _currentEnvTexKey = '';
  private _defaultMatcapSource: unknown = null;
  // 光照驱动的平滑状态(lightSmoothing);与瞬时目标值分离,避免每帧重新计算导致跳变
  private _smoothDriveX = 0;
  private _smoothDriveY = 0;
  private _driveInited = false;
  // 以下均为 update() 每帧算好、供 _flushParams() 统一写入 uniform 的动态派生量。
  // 运行时调制(摇曳/接近发光)只在这里相乘,绝不写回 _params,避免污染草稿与改动高亮。
  private _flickerMult = 1.0;
  private _lightPosUVX = 0.5;
  private _lightPosUVY = 0.5;
  private _mouseOffsetX = 0;
  private _mouseOffsetY = 0;
  private _fillDirX = 0;
  private _fillDirY = 0;
  private _fillDirZ = 1.0;
  private _debugPanel: CenterpieceDebugPanel | null = null;
  private _personaUnsubscribe: (() => void) | null = null;
  private _time = 0;
  private _lastWorldW = 0;
  private _lastWorldH = 0;
  
  private _currentNoiseTexKey = '';

  private _params = {
    // --- V4 Pipeline ---
    shaderVersion: 1,       // 0 = v3(legacy), 1 = v4(线性工作流)
    materialModel: 0,       // 0 = PBR, 1 = Stylized
    tonemapMode: 2,         // 0 = None, 1 = Reinhard, 2 = ACES
    envStrength: 0.0,       // matcap 环境反射强度(默认关,不改变迁移前观感)
    envRoughFade: 0.5,      // 粗糙度对环境反射的衰减
    unpremultiply: 1,       // 反预乘修正(修 v3 边缘暗圈)
    rampSoftness: 1.0,      // Stylized: 色阶柔化(1=平滑)
    rampSteps: 4,           // Stylized: 色阶数
    envTex: '',             // matcap 贴图路径(空 = 程序生成的默认棚光)

    // --- Asset Conditioning(资材调理:吸收推理贴图的系统性误差) ---
    normalFlipX: 0,
    normalBiasX: 0.0,
    normalBiasY: 0.0,
    heightInvert: 0,
    curvatureScale: 2.0,    // v3 硬编码 2.0
    curvatureBoost: 1.5,    // v3 硬编码 1.5
    emissiveNoiseGain: 5.0, // v3 硬编码 5.0
    emissiveEdgeWidth: 0.015, // v3 硬编码 0.015

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

    // --- Light System Rework(plan-centerpiece-workbench.md §1) ---
    lightType: 0,           // 0=平行光, 1=点光
    lightDrive: 3,          // 0=固定, 1=自动公转, 2=跟随鼠标, 3=公转+鼠标混合(现状默认)
    fixedLightAngle: 0,     // 固定+平行光:方位角(度)
    fixedLightX: 0,         // 固定+点光:位置 X(-1~1,相对法阵中心)
    fixedLightY: 0,         // 固定+点光:位置 Y(-1~1)
    mouseRange: 1000,       // 鼠标灵敏度分母(替换原硬编码 /1000)
    lightSmoothing: 0,      // 光追鼠标的阻尼,0=瞬移(现状)
    pointFalloffRadius: 0.6,
    pointFalloffCurve: 2.0,
    lightFlickerAmp: 0,     // 摇曳幅度(运行时调制光强,不写回本对象)
    lightFlickerSpeed: 1.0,
    fillLightStrength: 0,
    fillLightColorR: 0.6, fillLightColorG: 0.7, fillLightColorB: 0.9,
    fillLightAngle: 180,
    fillLightAutoOppose: 1,
    reliefShadowStrength: 0,
    reliefShadowLength: 0.02,
    reliefShadowSoftness: 0.5,
    hoverGlowRadius: 0,
    hoverGlowStrength: 1.0,
    maskAnimDepth: 1.0,
    parallaxFollow: 0,      // 0=跟随光(现状), 1=跟随鼠标
    envUniformity: 0,
    ditherStrength: 1.0,

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

    // --- HRBA Controls ---
    hrbaB_route: 1, // 0 = None, 1 = Metalness
    hrbaA_route: 0, // 0 = None, 1 = SSS, 2 = Transmission
    hrbaMetalnessEnabled: 1, // keep for compatibility
    hrbaSssEnabled: 0, // keep for compatibility
    globalMetalness: 1.0,

    // --- Mask Channels (v3.3 Universal Mask Routing) ---
    maskR_effectType: 1,
    maskR_colorR: 1.0, maskR_colorG: 0.1, maskR_colorB: 0.05,
    maskR_strength: 1.0,
    maskR_noiseCoupling: 0.5,

    maskG_effectType: 0,
    maskG_colorR: 0.0, maskG_colorG: 1.0, maskG_colorB: 0.0,
    maskG_strength: 1.0,
    maskG_noiseCoupling: 0.5,

    maskB_effectType: 0,
    maskB_colorR: 0.0, maskB_colorG: 0.0, maskB_colorB: 1.0,
    maskB_strength: 1.0,
    maskB_noiseCoupling: 0.5,

    // --- Mask Emissive & Adjustments ---
    maskAnimMode: 1, 
    maskAnimSpeed: 1.0,
    maskIntensity: 1.0,
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
      const [diffuse, normal, hrba, mask, noise] = await Promise.all([
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-normal.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-hrba.png'),
        Assets.load<Texture>('/assets/canvas/decals/alchemist-centerpiece-1-mask.png'),
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

      this._hrbaConfig = new UniformGroup({
        uHRBAFlags: { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uMetalness: { value: [1.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uSSSColor:  { value: [0.8, 0.6, 0.5, 0.0], type: 'vec4<f32>' },
      });

      this._maskUniforms = new UniformGroup({
        maskR_effectColorAndType: { value: [1.0, 0.1, 0.05, 1.0], type: 'vec4<f32>' },
        maskR_strengthAndNoise:   { value: [1.0, 0.5, 0.0, 0.0], type: 'vec4<f32>' },
        maskG_effectColorAndType: { value: [0.0, 1.0, 0.0, 0.0], type: 'vec4<f32>' },
        maskG_strengthAndNoise:   { value: [1.0, 0.5, 0.0, 0.0], type: 'vec4<f32>' },
        maskB_effectColorAndType: { value: [0.0, 0.0, 1.0, 0.0], type: 'vec4<f32>' },
        maskB_strengthAndNoise:   { value: [1.0, 0.5, 0.0, 0.0], type: 'vec4<f32>' },
        uNoiseCfg:  { value: [2.5, 1.2, 0.02, 0.01], type: 'vec4<f32>' },
        uNoiseCfg2: { value: [3.5, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uMaskAdj:   { value: [0.0, 1.0, 0.0, 0.0], type: 'vec4<f32>' },
        uTime:      { value: 0.0, type: 'f32' },
        _pad1:      { value: 0.0, type: 'f32' },
        _pad2:      { value: 0.0, type: 'f32' },
        _pad3:      { value: 0.0, type: 'f32' },
      });

      this._v4Uniforms = new UniformGroup({
        uV4A: { value: [0.0, 2.0, 0.0, 1.0], type: 'vec4<f32>' },
        uV4B: { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uV4C: { value: [2.0, 1.5, 1.0, 4.0], type: 'vec4<f32>' },
        uV4D: { value: [0.5, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uV4E: { value: [0.0, 0.6, 2.0, 0.0], type: 'vec4<f32>' },
        uV4F: { value: [0.5, 0.5, 0.0, 1.0], type: 'vec4<f32>' },
        uV4G: { value: [0.0, 0.0, 0.0, 0.0], type: 'vec4<f32>' },
        uV4H: { value: [0.0, 0.02, 0.5, 0.0], type: 'vec4<f32>' },
        uV4I: { value: [0.6, 0.7, 0.9, 0.0], type: 'vec4<f32>' },
        uV4J: { value: [0.0, 0.0, 1.0, 0.0], type: 'vec4<f32>' },
      });

      const envTexture = this._createDefaultMatcap();
      this._defaultMatcapSource = envTexture.source;

      this._shaderV3 = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: FRAG_WGSL, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          light:      this._lightUniforms,
          uDiffuse:   diffuse.source,
          uSampler:   diffuse.source.style,
          uNormalMap: normal.source,
          uHRBAMap:   hrba.source,
          uMaskMap:   mask.source,
          hrbaConfig: this._hrbaConfig,
          maskConfig: this._maskUniforms,
        }
      });

      this._shaderV4 = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: FRAG_WGSL_V4, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          light:      this._lightUniforms,
          uDiffuse:   diffuse.source,
          uSampler:   diffuse.source.style,
          uNormalMap: normal.source,
          uHRBAMap:   hrba.source,
          uMaskMap:   mask.source,
          hrbaConfig: this._hrbaConfig,
          maskConfig: this._maskUniforms,
          v4:         this._v4Uniforms,
          uEnvMap:    envTexture.source,
        }
      });

      const initialShader = this._params.shaderVersion >= 1 ? this._shaderV4 : this._shaderV3;
      this._activeShaderVersion = this._params.shaderVersion >= 1 ? 1 : 0;
      this._mesh = new Mesh({ geometry, shader: initialShader, label: 'centerpiece-metal-mesh' });

      const maskShader = Shader.from({
        gpu: { vertex: { source: VERT_WGSL, entryPoint: 'main' }, fragment: { source: MASK_EMISSIVE_WGSL, entryPoint: 'main' } },
        resources: {
          cam:        this._cameraUniforms,
          maskConfig: this._maskUniforms,
          uMaskMap:   mask.source,
          uSampler:   mask.source.style,
          uNoiseMap:  noise.source,
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
      debugPanelBridge.register(this._debugPanel);

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
    const dt = delta / 60;

    // 鼠标世界坐标 + 相对法阵中心的偏移,供光照驱动、视差跟随鼠标、鼠标接近发光共用
    let haveMouse = false;
    let targetLX = 0, targetLY = 0;
    let mouseWorldDX = 0, mouseWorldDY = 0;
    if (this._viewport) {
      const app = getPixiApp();
      const pointer = app?.renderer?.events?.pointer;
      if (pointer) {
        const worldPos = this._viewport.toWorld(pointer.global.x, pointer.global.y);
        const centerX = this._viewport.worldWidth * 0.5;
        const centerY = this._viewport.worldHeight * 0.5;
        mouseWorldDX = worldPos.x - centerX;
        mouseWorldDY = worldPos.y - centerY;
        targetLX = mouseWorldDX / this._params.mouseRange;
        targetLY = -mouseWorldDY / this._params.mouseRange;
        haveMouse = true;
      }
    }

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

      // 动画幅度:1=现状,越低动画越接近静止,越高越剧烈
      animMult = 1.0 + (animMult - 1.0) * this._params.maskAnimDepth;

      // 鼠标接近发光:0=关(现状)
      let hoverBoost = 1.0;
      if (this._params.hoverGlowRadius > 0 && haveMouse) {
        const dist = Math.hypot(mouseWorldDX, mouseWorldDY);
        const t = Math.max(0, Math.min(1, 1 - dist / this._params.hoverGlowRadius));
        const smoothT = t * t * (3 - 2 * t);
        hoverBoost = 1 + this._params.hoverGlowStrength * smoothT;
      }

      const finalIntensityR = Math.max(0.0, Math.min(5.0, animMult * this._params.maskR_strength * this._params.maskIntensity * hoverBoost));
      const finalIntensityG = Math.max(0.0, Math.min(5.0, animMult * this._params.maskG_strength * this._params.maskIntensity * hoverBoost));
      const finalIntensityB = Math.max(0.0, Math.min(5.0, animMult * this._params.maskB_strength * this._params.maskIntensity * hoverBoost));

      // z 槽位存未动画的原始强度,供主体材质(染色/边缘光/SSS 路由)使用,
      // 与发光层的 x(已叠加呼吸/闪烁/脉搏动画与总强度)解耦——见 ADR-006 附录。
      this._maskUniforms.uniforms.maskR_effectColorAndType = [this._params.maskR_colorR, this._params.maskR_colorG, this._params.maskR_colorB, this._params.maskR_effectType];
      this._maskUniforms.uniforms.maskR_strengthAndNoise   = [finalIntensityR, this._params.maskR_noiseCoupling, this._params.maskR_strength, 0];

      this._maskUniforms.uniforms.maskG_effectColorAndType = [this._params.maskG_colorR, this._params.maskG_colorG, this._params.maskG_colorB, this._params.maskG_effectType];
      this._maskUniforms.uniforms.maskG_strengthAndNoise   = [finalIntensityG, this._params.maskG_noiseCoupling, this._params.maskG_strength, 0];

      this._maskUniforms.uniforms.maskB_effectColorAndType = [this._params.maskB_colorR, this._params.maskB_colorG, this._params.maskB_colorB, this._params.maskB_effectType];
      this._maskUniforms.uniforms.maskB_strengthAndNoise   = [finalIntensityB, this._params.maskB_noiseCoupling, this._params.maskB_strength, 0];
      
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
      // ── 光照驱动:两个独立选择题(光源类型 × 驱动方式)算出的目标方向/位置 ──
      let driveX = 0, driveY = 0;
      switch (this._params.lightDrive) {
        case 0: { // 固定
          if (this._params.lightType === 0) {
            const rad = (this._params.fixedLightAngle * Math.PI) / 180;
            driveX = Math.cos(rad);
            driveY = Math.sin(rad);
          } else {
            driveX = this._params.fixedLightX;
            driveY = this._params.fixedLightY;
          }
          break;
        }
        case 1: { // 自动公转
          driveX = Math.cos(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusX;
          driveY = Math.sin(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusY;
          break;
        }
        case 2: { // 跟随鼠标
          driveX = haveMouse ? targetLX : 0;
          driveY = haveMouse ? targetLY : 0;
          break;
        }
        default: { // 公转 + 鼠标混合(现状默认)
          const ox = Math.cos(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusX;
          const oy = Math.sin(this._time * this._params.lightOrbitSpeed) * this._params.lightOrbitRadiusY;
          driveX = haveMouse ? mix_num(ox, targetLX, this._params.mouseInfluence) : ox;
          driveY = haveMouse ? mix_num(oy, targetLY, this._params.mouseInfluence) : oy;
          break;
        }
      }

      // 光照跟随平滑(lightSmoothing):0=瞬移(现状);首帧直接对齐,避免开场从 (0,0) 飞入的跳变
      if (!this._driveInited) {
        this._smoothDriveX = driveX;
        this._smoothDriveY = driveY;
        this._driveInited = true;
      } else if (this._params.lightSmoothing > 0) {
        const alpha = 1 - Math.exp(-dt * this._params.lightSmoothing * 10);
        this._smoothDriveX = mix_num(this._smoothDriveX, driveX, alpha);
        this._smoothDriveY = mix_num(this._smoothDriveY, driveY, alpha);
      } else {
        this._smoothDriveX = driveX;
        this._smoothDriveY = driveY;
      }

      this._lightUniforms.uniforms.uLightDir = [this._smoothDriveX, this._smoothDriveY, this._params.lightHeight, 0.0];

      // 点光位置(与方向驱动共用同一套 fixed/orbit/mouse/mixed 计算,+0.5 换算到 UV 中心原点)
      this._lightPosUVX = 0.5 + this._smoothDriveX;
      this._lightPosUVY = 0.5 + this._smoothDriveY;

      // 视差跟随鼠标专用的原始鼠标偏移(不受 lightDrive/lightSmoothing 影响,鼠标不在画布上时回落为 0)
      this._mouseOffsetX = haveMouse ? targetLX : 0;
      this._mouseOffsetY = haveMouse ? targetLY : 0;

      // 摇曳(flicker):三个不同频率的正弦波叠加出的平滑噪声,幅度和归一化为 1
      if (this._params.lightFlickerAmp > 0) {
        const t = this._time * this._params.lightFlickerSpeed;
        const n = Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.3) * 0.3 + Math.sin(t * 13.7) * 0.2;
        this._flickerMult = 1.0 + n * this._params.lightFlickerAmp;
      } else {
        this._flickerMult = 1.0;
      }

      // 副光方向:自动对位(与主光方向相反,同高度)或手动方位角
      if (this._params.fillLightAutoOppose) {
        this._fillDirX = -this._smoothDriveX;
        this._fillDirY = -this._smoothDriveY;
        this._fillDirZ = this._params.lightHeight;
      } else {
        const rad = (this._params.fillLightAngle * Math.PI) / 180;
        this._fillDirX = Math.cos(rad);
        this._fillDirY = Math.sin(rad);
        this._fillDirZ = this._params.lightHeight;
      }
    }

    this.container.alpha = this._params.baseAlpha;

    this._flushParams();
  }

  private _flushParams(): void {
    if (!this._lightUniforms || !this._hrbaConfig || !this._maskUniforms) return;
    const lu = this._lightUniforms.uniforms as any;
    // 摇曳(flicker)运行时调制,只在这里相乘进 uLightColor.w,不改 _params.lightStrength 本身
    lu.uLightColor = [this._params.lightR, this._params.lightG, this._params.lightB, this._params.lightStrength * this._flickerMult];
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

    if (this._v4Uniforms) {
      const v4 = this._v4Uniforms.uniforms;
      v4.uV4A = [this._params.materialModel, this._params.tonemapMode, this._params.envStrength, this._params.unpremultiply];
      v4.uV4B = [this._params.normalFlipX, this._params.normalBiasX, this._params.normalBiasY, this._params.heightInvert];
      v4.uV4C = [this._params.curvatureScale, this._params.curvatureBoost, this._params.rampSoftness, this._params.rampSteps];
      v4.uV4D = [this._params.envRoughFade, 0, 0, 0];
      v4.uV4E = [this._params.lightType, this._params.pointFalloffRadius, this._params.pointFalloffCurve, this._params.envUniformity];
      v4.uV4F = [this._lightPosUVX, this._lightPosUVY, this._params.parallaxFollow, this._params.ditherStrength];
      v4.uV4G = [this._mouseOffsetX, this._mouseOffsetY, 0, 0];
      v4.uV4H = [this._params.reliefShadowStrength, this._params.reliefShadowLength, this._params.reliefShadowSoftness, 0];
      v4.uV4I = [this._params.fillLightColorR, this._params.fillLightColorG, this._params.fillLightColorB, this._params.fillLightStrength];
      v4.uV4J = [this._fillDirX, this._fillDirY, this._fillDirZ, 0];
    }

    // shader 版本切换(v3 ↔ v4)
    const wantVersion = this._params.shaderVersion >= 0.5 ? 1 : 0;
    if (wantVersion !== this._activeShaderVersion && this._mesh && this._shaderV3 && this._shaderV4) {
      this._mesh.shader = wantVersion === 1 ? this._shaderV4 : this._shaderV3;
      this._activeShaderVersion = wantVersion;
    }

    const hrb = this._hrbaConfig.uniforms;
    hrb.uHRBAFlags = [this._params.hrbaB_route, this._params.hrbaA_route, 0, 0];
    hrb.uMetalness = [this._params.globalMetalness, 0, 0, 0];
    hrb.uSSSColor  = [this._params.sssR, this._params.sssG, this._params.sssB, this._params.sssStrength];

    const mu = this._maskUniforms.uniforms;
    mu.uNoiseCfg  = [this._params.noiseScale, this._params.noiseContrast, this._params.noiseSpeedX, this._params.noiseSpeedY];
    mu.uNoiseCfg2 = [this._params.noiseScale2, this._params.noiseBlend, 0, 0];
    mu.uMaskAdj   = [this._params.maskBrightness, this._params.maskContrast, this._params.maskEdgeSoftness, this._params.emissiveEdgeWidth];
    mu._pad1      = this._params.emissiveNoiseGain;
  }

  /**
   * 程序生成默认 matcap 环境图(左上棚光 + 底部反光的标准球),
   * 让 envStrength 在没有外部贴图时开箱即用;persona 可用 envTex 换成 AI 生成的 matcap。
   */
  private _createDefaultMatcap(): Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#101014';
    ctx.fillRect(0, 0, size, size);
    // 主棚光(左上)
    const key = ctx.createRadialGradient(size * 0.35, size * 0.3, size * 0.02, size * 0.35, size * 0.3, size * 0.75);
    key.addColorStop(0, 'rgba(255,255,255,0.95)');
    key.addColorStop(0.25, 'rgba(200,200,210,0.5)');
    key.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, size, size);
    // 底部冷色反光
    const fill = ctx.createRadialGradient(size * 0.7, size * 0.85, size * 0.05, size * 0.7, size * 0.85, size * 0.6);
    fill.addColorStop(0, 'rgba(90,110,140,0.5)');
    fill.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, size, size);
    return Texture.from(canvas);
  }

  async loadEnvTexture(texturePath: string): Promise<void> {
    if (!texturePath || this._currentEnvTexKey === texturePath || !this._shaderV4) return;
    try {
      const tex = await Assets.load<Texture>(texturePath);
      (this._shaderV4 as any).resources.uEnvMap = tex.source;
      this._currentEnvTexKey = texturePath;
    } catch (e) {
      console.error('Failed to load env/matcap texture:', texturePath, e);
    }
  }

  /** 切回程序生成的默认 matcap(圆形缩略图网格的"默认"项,以及 preset 里 envTex='' 时使用) */
  resetEnvToDefault(): void {
    if (this._shaderV4 && this._defaultMatcapSource) {
      (this._shaderV4 as any).resources.uEnvMap = this._defaultMatcapSource;
    }
    this._currentEnvTexKey = '';
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

  applyPreset(preset: Partial<typeof this._params> & { maskNoiseTex?: string; envTex?: string }, duration = 1.0): void {
    if (preset.maskNoiseTex) {
      this.loadMaskNoiseTexture(preset.maskNoiseTex);
      delete preset.maskNoiseTex;
    }
    if (preset.envTex !== undefined) {
      if (preset.envTex) this.loadEnvTexture(preset.envTex);
      else this.resetEnvToDefault();
      this._params.envTex = preset.envTex;
      delete preset.envTex;
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
          this._debugPanel?.syncUI();
        }
      });
    } else {
      Object.assign(this._params, preset);
      this._debugPanel?.syncUI();
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
      if ((preset as any).envTex) {
        this.loadEnvTexture((preset as any).envTex);
      } else {
        this.resetEnvToDefault();
      }
    }

    // 4. 通知 Debug 面板渲染新主题与子阶段的数据结构
    this._debugPanel?.onPersonaChanged(theme);
  }

  destroy(): void {
    if (this._personaUnsubscribe) {
      this._personaUnsubscribe();
      this._personaUnsubscribe = null;
    }
    debugPanelBridge.register(null);
    this._debugPanel?.destroy();
    this._debugPanel = null;
    aabbSystem.clearOccupancy();
    this.container.destroy({ children: true });
  }
}

function mix_num(a: number, b: number, ratio: number): number {
  return a * (1 - ratio) + b * ratio;
}
