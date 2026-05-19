/**
 * CenterpieceDecal Preset 系统 v3.2
 * 
 * 现已支持从 JSON 配置文件按 Persona (Skins/Themes) 进行动态加载与保存，
 * 并支持通过本地草稿 (localStorage) 机制自动记忆各个 Persona 内部子阶段的参数修改。
 */

import defaultJson from './presets/default.json';
import cyberpunkJson from './presets/cyberpunk.json';

export interface CenterpiecePreset {
  label: string;

  // ── 系统基础 ─────────────────────────────────────────────────────────────────
  exposure?:        number; 
  baseAlpha?:       number; 
  alphaClip:        number;
  diffuseTint:      [number, number, number];
  diffuseSaturation?: number; 
  normalFlipY:      number; 
  lightHeight:      number; 

  // ── 交互与动态 ───────────────────────────────────────────────────────────────
  lightOrbitSpeed?:  number;
  lightOrbitRadiusX?: number;
  lightOrbitRadiusY?: number;
  mouseInfluence?:   number;
  maskAnimSpeed?:    number;

  // ── 光照与结构 ───────────────────────────────────────────────────────────────
  lightColor?:      [number, number, number];
  lightStrength?:   number;
  ambient:          number; 
  ambientColor:     [number, number, number];
  diffuse:          number; 
  diffuseWrap?:     number; 
  bumpX?:           number; 
  bumpY?:           number; 
  parallax:         number; 
  ao:               number; 
  cavityStrength?:  number; 

  // ── 粗糙度 (Roughness) ───────────────────────────────────────────────────────
  roughnessMin:     number;
  roughnessMax:     number;
  roughnessContrast?: number;
  roughnessBias?:     number;

  // ── 完整 GGX 高光 ────────────────────────────────────────────────────────────
  specStrength:     number;
  specColor:        [number, number, number];
  f0Dielectric:     number; 
  fresnelPower:     number; 
  specAoMask:       number; 

  // ── 边缘光 (Rim) ─────────────────────────────────────────────────────────────
  rimStrength:      number;
  rimPower:         number;
  rimColor:         [number, number, number];

  // ── 通道路由权重 ──────────────────────────────────────────────────────────────
  // ── 遮罩通道配置与路由 (Mask Channel Routing) ──────────────────────────────────
  maskR_effectType: number; // 0=Emissive, 1=ColorTint, 2=Rim, 3=SSS
  maskR_color:      [number, number, number];
  maskR_strength:   number;
  maskR_noiseCoupling: number;

  maskG_effectType: number;
  maskG_color:      [number, number, number];
  maskG_strength:   number;
  maskG_noiseCoupling: number;

  maskB_effectType: number;
  maskB_color:      [number, number, number];
  maskB_strength:   number;
  maskB_noiseCoupling: number;

  baseBlur:         number; 
  bloomScale?:      number; 

  // ── 噪声与流动 (Noise) ────────────────────────────────────────────────────────
  noiseScale:       number;
  noiseScale2?:     number; 
  noiseContrast:    number;
  noiseSpeedX:      number;
  noiseSpeedY:      number;
  noiseBlend?:      number; 

  // ── SSS & Metalness ─────────────────────────────────────────────────────────
  metalness:        number;
  sssStrength?:     number;
  sssColor?:        [number, number, number];
  maskNoiseTex?:    string;
}

// 核心预设常驻引用（不可被重新赋值，但内部键值会根据载入的 Persona 动态刷新）
export const CENTERPIECE_PRESETS: Record<string, CenterpiecePreset> = {
  rubedo: {} as any,
  nigredo: {} as any,
  albedo: {} as any,
};

const JSON_REGISTRY: Record<string, any> = {
  'default': defaultJson,
  'cyberpunk': cyberpunkJson,
};

/**
 * 获取某个 Persona 下的所有基础预设（不包含本地 localStorage 草稿）
 */
export function getBasePresetsForPersona(personaName: string): Record<string, CenterpiecePreset> {
  const baseData = JSON_REGISTRY[personaName] || JSON_REGISTRY['default'];
  return {
    rubedo: { ...baseData.rubedo },
    nigredo: { ...baseData.nigredo },
    albedo: { ...baseData.albedo },
  };
}

/**
 * 载入特定 Persona 的预设并应用本地草稿覆盖，刷新 CENTERPIECE_PRESETS 内容
 */
export function loadPresetsForPersona(personaName: string): void {
  const baseData = JSON_REGISTRY[personaName] || JSON_REGISTRY['default'];
  const subKeys = ['rubedo', 'nigredo', 'albedo'];
  
  subKeys.forEach(key => {
    // 1. 克隆 JSON 基础配置
    const rawPreset = baseData[key];
    if (!rawPreset) return;
    const preset = JSON.parse(JSON.stringify(rawPreset));
    
    // 2. 读取针对当前 Persona 与当前子阶段的独立持久化草稿
    const draftStr = localStorage.getItem(`centerpiece-preset-${personaName}-${key}`);
    if (draftStr) {
      try {
        const draftObj = JSON.parse(draftStr);
        // 将平面存储 of shader parameters re-assembled and merged back to preset
        Object.assign(preset, paramsToPreset(draftObj, preset));
      } catch (e) {
        console.error(`[presets] Failed to load draft for ${personaName}.${key}:`, e);
      }
    }
    
    // 3. 更新全局静态引用中的属性
    const target = CENTERPIECE_PRESETS[key];
    if (target) {
      Object.assign(target, preset);
    }
  });
}

/**
 * 将平铺的 shader 参数结构重组成标准的 CenterpiecePreset 嵌套结构
 */
export function paramsToPreset(params: Record<string, any>, base: CenterpiecePreset): CenterpiecePreset {
  return {
    label: base.label,
    exposure:          params.exposure,
    baseAlpha:         params.baseAlpha,
    alphaClip:         params.alphaClip,
    diffuseTint:       [params.diffuseTintR, params.diffuseTintG, params.diffuseTintB],
    diffuseSaturation: params.diffuseSaturation,
    normalFlipY:       params.normalFlipY,
    lightHeight:       params.lightHeight,

    lightOrbitSpeed:   params.lightOrbitSpeed,
    lightOrbitRadiusX: params.lightOrbitRadiusX,
    lightOrbitRadiusY: params.lightOrbitRadiusY,
    mouseInfluence:    params.mouseInfluence,
    maskAnimSpeed:     params.maskAnimSpeed,

    lightColor:        [params.lightR, params.lightG, params.lightB],
    lightStrength:     params.lightStrength,
    ambient:           params.ambientStrength,
    ambientColor:      [params.ambientR, params.ambientG, params.ambientB],
    diffuse:           params.diffuse,
    diffuseWrap:       params.diffuseWrap,
    bumpX:             params.bumpX,
    bumpY:             params.bumpY,
    parallax:          params.parallax,
    ao:                params.ao,
    cavityStrength:    params.cavityStrength,

    roughnessMin:      params.roughnessMin,
    roughnessMax:      params.roughnessMax,
    roughnessContrast: params.roughnessContrast,
    roughnessBias:     params.roughnessBias,

    specStrength:      params.specStrength,
    specColor:         [params.specColorR, params.specColorG, params.specColorB],
    f0Dielectric:      params.f0Dielectric,
    fresnelPower:      params.fresnelPower,
    specAoMask:        params.specAoMask,

    rimStrength:       params.rimStrength,
    rimPower:          params.rimPower,
    rimColor:          [params.rimColorR, params.rimColorG, params.rimColorB],

    maskR_effectType:  params.maskR_effectType,
    maskR_color:       [params.maskR_colorR, params.maskR_colorG, params.maskR_colorB],
    maskR_strength:    params.maskR_strength,
    maskR_noiseCoupling: params.maskR_noiseCoupling,

    maskG_effectType:  params.maskG_effectType,
    maskG_color:       [params.maskG_colorR, params.maskG_colorG, params.maskG_colorB],
    maskG_strength:    params.maskG_strength,
    maskG_noiseCoupling: params.maskG_noiseCoupling,

    maskB_effectType:  params.maskB_effectType,
    maskB_color:       [params.maskB_colorR, params.maskB_colorG, params.maskB_colorB],
    maskB_strength:    params.maskB_strength,
    maskB_noiseCoupling: params.maskB_noiseCoupling,

    baseBlur:          params.baseBlur,
    bloomScale:        params.bloomScale,

    noiseScale:        params.noiseScale,
    noiseScale2:       params.noiseScale2,
    noiseContrast:     params.noiseContrast,
    noiseSpeedX:       params.noiseSpeedX,
    noiseSpeedY:       params.noiseSpeedY,
    noiseBlend:        params.noiseBlend,

    metalness:         params.metalness,
    ...(params.sssStrength !== undefined && { sssStrength: params.sssStrength }),
    ...(params.sssR !== undefined && { sssColor: [params.sssR, params.sssG, params.sssB] }),
  };
}

export function presetToParams(p: CenterpiecePreset): Record<string, number | string> {
  return {
    exposure:         p.exposure ?? 1.0,
    baseAlpha:        p.baseAlpha ?? 1.0,
    alphaClip:        p.alphaClip,
    diffuseTintR:     p.diffuseTint[0],
    diffuseTintG:     p.diffuseTint[1],
    diffuseTintB:     p.diffuseTint[2],
    diffuseSaturation: p.diffuseSaturation ?? 1.0,
    normalFlipY:      p.normalFlipY,
    lightHeight:      p.lightHeight,

    lightOrbitSpeed:   p.lightOrbitSpeed ?? 0.2,
    lightOrbitRadiusX: p.lightOrbitRadiusX ?? 0.4,
    lightOrbitRadiusY: p.lightOrbitRadiusY ?? 0.3,
    mouseInfluence:    p.mouseInfluence ?? 0.5,
    maskAnimSpeed:     p.maskAnimSpeed ?? 1.0,

    lightR:           p.lightColor ? p.lightColor[0] : 1.0,
    lightG:           p.lightColor ? p.lightColor[1] : 1.0,
    lightB:           p.lightColor ? p.lightColor[2] : 1.0,
    lightStrength:    p.lightStrength ?? 1.0,
    ambientStrength:  p.ambient,
    ambientR:         p.ambientColor[0],
    ambientG:         p.ambientColor[1],
    ambientB:         p.ambientColor[2],
    diffuse:          p.diffuse,
    diffuseWrap:      p.diffuseWrap ?? 0.0,
    bumpX:            p.bumpX ?? 1.0,
    bumpY:            p.bumpY ?? 1.0,
    parallax:         p.parallax,
    ao:               p.ao,
    cavityStrength:   p.cavityStrength ?? 0.0,

    roughnessMin:     p.roughnessMin,
    roughnessMax:     p.roughnessMax,
    roughnessContrast: p.roughnessContrast ?? 1.0,
    roughnessBias:     p.roughnessBias ?? 0.0,

    specStrength:     p.specStrength,
    specColorR:       p.specColor[0],
    specColorG:       p.specColor[1],
    specColorB:       p.specColor[2],
    f0Dielectric:     p.f0Dielectric,
    fresnelPower:     p.fresnelPower,
    specAoMask:       p.specAoMask,

    rimStrength:      p.rimStrength,
    rimPower:         p.rimPower,
    rimColorR:        p.rimColor[0],
    rimColorG:        p.rimColor[1],
    rimColorB:        p.rimColor[2],

    maskR_effectType: p.maskR_effectType,
    maskR_colorR:     p.maskR_color[0],
    maskR_colorG:     p.maskR_color[1],
    maskR_colorB:     p.maskR_color[2],
    maskR_strength:   p.maskR_strength,
    maskR_noiseCoupling: p.maskR_noiseCoupling,

    maskG_effectType: p.maskG_effectType,
    maskG_colorR:     p.maskG_color[0],
    maskG_colorG:     p.maskG_color[1],
    maskG_colorB:     p.maskG_color[2],
    maskG_strength:   p.maskG_strength,
    maskG_noiseCoupling: p.maskG_noiseCoupling,

    maskB_effectType: p.maskB_effectType,
    maskB_colorR:     p.maskB_color[0],
    maskB_colorG:     p.maskB_color[1],
    maskB_colorB:     p.maskB_color[2],
    maskB_strength:   p.maskB_strength,
    maskB_noiseCoupling: p.maskB_noiseCoupling,

    baseBlur:         p.baseBlur,
    bloomScale:       p.bloomScale ?? 1.0,

    noiseScale:       p.noiseScale,
    noiseScale2:      p.noiseScale2 ?? 3.5,
    noiseContrast:    p.noiseContrast,
    noiseSpeedX:      p.noiseSpeedX,
    noiseSpeedY:      p.noiseSpeedY,
    noiseBlend:       p.noiseBlend ?? 0.0,

    metalness:        p.metalness,
    ...(p.sssStrength !== undefined && { sssStrength: p.sssStrength }),
    ...(p.sssColor    !== undefined && { sssR: p.sssColor[0], sssG: p.sssColor[1], sssB: p.sssColor[2] }),
  };
}

// 初始化默认载入 'default' 皮肤的预设，作为降级/启动保障
loadPresetsForPersona('default');
