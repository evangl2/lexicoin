/**
 * CenterpieceDecal Preset 系统 v3.3 (PNG-HRBA版)
 * 
 * 现已支持从 JSON 配置文件按 Persona (Skins/Themes) 进行动态加载与保存，
 * 并支持通过本地草稿 (localStorage) 机制自动记忆各个 Persona 内部子阶段的参数修改。
 *
 * v3.3 变更：
 *   - 移除旧的 bWeights/aWeights 通道路由权重字段
 *   - 新增 hrbaMetalnessEnabled / hrbaSssEnabled HRBA 通道开关
 *   - 新增 maskR_* / maskG_* / maskB_* 三路 Mask 通用路由系统
 *   - maskAnimMode 保留为纯 runtime _params 字段（不写入预设 JSON）
 */

import defaultJson from './presets/default.json';
import cyberpunkJson from './presets/cyberpunk.json';

export interface CenterpiecePreset {
  label: string;

  // ── V4 管线(线性工作流 + 材质模型,见 ADR-006) ──────────────────────────────
  shaderVersion?:  number;  // 0 = v3(legacy), 1 = v4
  materialModel?:  number;  // 0 = PBR, 1 = Stylized
  tonemapMode?:    number;  // 0 = None, 1 = Reinhard, 2 = ACES
  envStrength?:    number;
  envRoughFade?:   number;
  envTex?:         string;  // matcap 贴图路径(空 = 程序默认棚光)
  unpremultiply?:  number;
  rampSoftness?:   number;
  rampSteps?:      number;

  // ── 资材调理(吸收推理贴图的系统性误差) ─────────────────────────────────────
  normalFlipX?:       number;
  normalBiasX?:       number;
  normalBiasY?:       number;
  heightInvert?:      number;
  curvatureScale?:    number;
  curvatureBoost?:    number;
  emissiveNoiseGain?: number;
  emissiveEdgeWidth?: number;

  // ── 光照系统重做(plan-centerpiece-workbench.md §1) ──────────────────────────
  lightType?:            number; // 0=平行光, 1=点光
  lightDrive?:           number; // 0=固定, 1=自动公转, 2=跟随鼠标, 3=公转+鼠标混合
  fixedLightAngle?:      number;
  fixedLightX?:          number;
  fixedLightY?:          number;
  mouseRange?:           number;
  lightSmoothing?:       number;
  pointFalloffRadius?:   number;
  pointFalloffCurve?:    number;
  lightFlickerAmp?:      number;
  lightFlickerSpeed?:    number;
  fillLightStrength?:    number;
  fillLightColor?:       [number, number, number];
  fillLightAngle?:       number;
  fillLightAutoOppose?:  number;
  reliefShadowStrength?: number;
  reliefShadowLength?:   number;
  reliefShadowSoftness?: number;
  hoverGlowRadius?:      number;
  hoverGlowStrength?:    number;
  maskAnimDepth?:        number;
  parallaxFollow?:       number; // 0=跟随光, 1=跟随鼠标
  envUniformity?:        number;
  ditherStrength?:       number;

  // ── 系统基础 ─────────────────────────────────────────────────────────────────
  exposure?:        number;
  baseAlpha?:       number;
  alphaClip:        number;
  diffuseTint:      [number, number, number];
  diffuseSaturation?: number;
  normalFlipY:      number;
  lightHeight:      number;

  // ── 交互与动态 ───────────────────────────────────────────────────────────────
  lightOrbitSpeed?:   number;
  lightOrbitRadiusX?: number;
  lightOrbitRadiusY?: number;
  mouseInfluence?:    number;
  maskAnimSpeed?:     number;

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
  roughnessMin:       number;
  roughnessMax:       number;
  roughnessContrast?: number;
  roughnessBias?:     number;

  // ── 完整 GGX 高光 ────────────────────────────────────────────────────────────
  specStrength:  number;
  specColor:     [number, number, number];
  f0Dielectric:  number;
  fresnelPower:  number;
  specAoMask:    number;

  // ── 边缘光 (Rim) ─────────────────────────────────────────────────────────────
  rimStrength: number;
  rimPower:    number;
  rimColor:    [number, number, number];

  // ── HRBA 路由 ────────────────────────────────────────────────────────────────
  hrbaB_route?:         number;
  hrbaA_route?:         number;
  hrbaMetalnessEnabled?: number;
  hrbaSssEnabled?:       number;

  // ── Mask 三路路由 ────────────────────────────────────────────────────────────
  maskR_effectType?:    number;
  maskR_color?:         [number, number, number];
  maskR_strength?:      number;
  maskR_noiseCoupling?: number;

  maskG_effectType?:    number;
  maskG_color?:         [number, number, number];
  maskG_strength?:      number;
  maskG_noiseCoupling?: number;

  maskB_effectType?:    number;
  maskB_color?:         [number, number, number];
  maskB_strength?:      number;
  maskB_noiseCoupling?: number;

  // ── 发光层基础参数 ────────────────────────────────────────────────────────────
  maskIntensity: number;  // 全局 Emissive 强度乘数
  baseBlur:      number;
  bloomScale?:   number;
  maskBrightness?: number;
  maskContrast?:   number;
  maskEdgeSoftness?: number;

  // ── 噪声贴图与流动 (Noise) ───────────────────────────────────────────────────
  maskNoiseTex:  string;
  noiseScale:    number;
  noiseScale2?:  number;
  noiseContrast: number;
  noiseSpeedX:   number;
  noiseSpeedY:   number;
  noiseBlend?:   number;

  // ── SSS 全局参数 ─────────────────────────────────────────────────────────────
  sssStrength?: number;
  sssColor?:    [number, number, number];
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
 * 将平铺的 shader 参数结构重组成标准的 CenterpiecePreset 嵌套结构 (v3.3)
 */
export function paramsToPreset(params: Record<string, any>, base: CenterpiecePreset): CenterpiecePreset {
  return {
    label: base.label,

    shaderVersion:     params.shaderVersion,
    materialModel:     params.materialModel,
    tonemapMode:       params.tonemapMode,
    envStrength:       params.envStrength,
    envRoughFade:      params.envRoughFade,
    envTex:            params.envTex,
    unpremultiply:     params.unpremultiply,
    rampSoftness:      params.rampSoftness,
    rampSteps:         params.rampSteps,

    normalFlipX:       params.normalFlipX,
    normalBiasX:       params.normalBiasX,
    normalBiasY:       params.normalBiasY,
    heightInvert:      params.heightInvert,
    curvatureScale:    params.curvatureScale,
    curvatureBoost:    params.curvatureBoost,
    emissiveNoiseGain: params.emissiveNoiseGain,
    emissiveEdgeWidth: params.emissiveEdgeWidth,

    lightType:            params.lightType,
    lightDrive:           params.lightDrive,
    fixedLightAngle:      params.fixedLightAngle,
    fixedLightX:          params.fixedLightX,
    fixedLightY:          params.fixedLightY,
    mouseRange:           params.mouseRange,
    lightSmoothing:       params.lightSmoothing,
    pointFalloffRadius:   params.pointFalloffRadius,
    pointFalloffCurve:    params.pointFalloffCurve,
    lightFlickerAmp:      params.lightFlickerAmp,
    lightFlickerSpeed:    params.lightFlickerSpeed,
    fillLightStrength:    params.fillLightStrength,
    fillLightColor:       [params.fillLightColorR, params.fillLightColorG, params.fillLightColorB],
    fillLightAngle:       params.fillLightAngle,
    fillLightAutoOppose:  params.fillLightAutoOppose,
    reliefShadowStrength: params.reliefShadowStrength,
    reliefShadowLength:   params.reliefShadowLength,
    reliefShadowSoftness: params.reliefShadowSoftness,
    hoverGlowRadius:      params.hoverGlowRadius,
    hoverGlowStrength:    params.hoverGlowStrength,
    maskAnimDepth:        params.maskAnimDepth,
    parallaxFollow:       params.parallaxFollow,
    envUniformity:        params.envUniformity,
    ditherStrength:       params.ditherStrength,

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

    // ── HRBA 路由 (v3.4) ────────────────────────────────────────────────────────
    hrbaB_route: params.hrbaB_route ?? params.hrbaMetalnessEnabled ?? 1,
    hrbaA_route: params.hrbaA_route ?? params.hrbaSssEnabled ?? 0,
    hrbaMetalnessEnabled: params.hrbaB_route ?? params.hrbaMetalnessEnabled ?? 1,
    hrbaSssEnabled: params.hrbaA_route ?? params.hrbaSssEnabled ?? 0,

    // ── Mask 三路路由 (v3.3) ─────────────────────────────────────────────────────
    maskR_effectType:    params.maskR_effectType    ?? 1,
    maskR_color:         [params.maskR_colorR ?? 1.0, params.maskR_colorG ?? 0.1, params.maskR_colorB ?? 0.05],
    maskR_strength:      params.maskR_strength      ?? 1.0,
    maskR_noiseCoupling: params.maskR_noiseCoupling ?? 0.5,

    maskG_effectType:    params.maskG_effectType    ?? 0,
    maskG_color:         [params.maskG_colorR ?? 0.0, params.maskG_colorG ?? 1.0, params.maskG_colorB ?? 0.0],
    maskG_strength:      params.maskG_strength      ?? 1.0,
    maskG_noiseCoupling: params.maskG_noiseCoupling ?? 0.5,

    maskB_effectType:    params.maskB_effectType    ?? 0,
    maskB_color:         [params.maskB_colorR ?? 0.0, params.maskB_colorG ?? 0.0, params.maskB_colorB ?? 1.0],
    maskB_strength:      params.maskB_strength      ?? 1.0,
    maskB_noiseCoupling: params.maskB_noiseCoupling ?? 0.5,

    // ── 发光层基础参数 ───────────────────────────────────────────────────────────
    maskIntensity:  params.maskIntensity,
    baseBlur:       params.baseBlur,
    bloomScale:     params.bloomScale,
    maskBrightness: params.maskBrightness ?? 0.0,
    maskContrast:   params.maskContrast ?? 1.0,
    maskEdgeSoftness: params.maskEdgeSoftness ?? 0.0,

    maskNoiseTex:   params.maskNoiseTex,
    noiseScale:     params.noiseScale,
    noiseScale2:    params.noiseScale2,
    noiseContrast:  params.noiseContrast,
    noiseSpeedX:    params.noiseSpeedX,
    noiseSpeedY:    params.noiseSpeedY,
    noiseBlend:     params.noiseBlend,

    ...(params.sssStrength !== undefined && { sssStrength: params.sssStrength }),
    ...(params.sssR !== undefined && { sssColor: [params.sssR, params.sssG, params.sssB] }),
  };
}

export function presetToParams(p: CenterpiecePreset): Record<string, number | string> {
  return {
    shaderVersion:     p.shaderVersion     ?? 1,
    materialModel:     p.materialModel     ?? 0,
    tonemapMode:       p.tonemapMode       ?? 2,
    envStrength:       p.envStrength       ?? 0.0,
    envRoughFade:      p.envRoughFade      ?? 0.5,
    envTex:            p.envTex            ?? '',
    unpremultiply:     p.unpremultiply     ?? 1,
    rampSoftness:      p.rampSoftness      ?? 1.0,
    rampSteps:         p.rampSteps         ?? 4,

    normalFlipX:       p.normalFlipX       ?? 0,
    normalBiasX:       p.normalBiasX       ?? 0.0,
    normalBiasY:       p.normalBiasY       ?? 0.0,
    heightInvert:      p.heightInvert      ?? 0,
    curvatureScale:    p.curvatureScale    ?? 2.0,
    curvatureBoost:    p.curvatureBoost    ?? 1.5,
    emissiveNoiseGain: p.emissiveNoiseGain ?? 5.0,
    emissiveEdgeWidth: p.emissiveEdgeWidth ?? 0.015,

    lightType:            p.lightType            ?? 0,
    lightDrive:           p.lightDrive           ?? 3,
    fixedLightAngle:      p.fixedLightAngle      ?? 0,
    fixedLightX:          p.fixedLightX          ?? 0,
    fixedLightY:          p.fixedLightY          ?? 0,
    mouseRange:           p.mouseRange           ?? 1000,
    lightSmoothing:       p.lightSmoothing       ?? 0,
    pointFalloffRadius:   p.pointFalloffRadius   ?? 0.6,
    pointFalloffCurve:    p.pointFalloffCurve    ?? 2.0,
    lightFlickerAmp:      p.lightFlickerAmp      ?? 0,
    lightFlickerSpeed:    p.lightFlickerSpeed    ?? 1.0,
    fillLightStrength:    p.fillLightStrength    ?? 0,
    fillLightColorR:      p.fillLightColor ? p.fillLightColor[0] : 0.6,
    fillLightColorG:      p.fillLightColor ? p.fillLightColor[1] : 0.7,
    fillLightColorB:      p.fillLightColor ? p.fillLightColor[2] : 0.9,
    fillLightAngle:       p.fillLightAngle       ?? 180,
    fillLightAutoOppose:  p.fillLightAutoOppose  ?? 1,
    reliefShadowStrength: p.reliefShadowStrength ?? 0,
    reliefShadowLength:   p.reliefShadowLength   ?? 0.02,
    reliefShadowSoftness: p.reliefShadowSoftness ?? 0.5,
    hoverGlowRadius:      p.hoverGlowRadius      ?? 0,
    hoverGlowStrength:    p.hoverGlowStrength    ?? 1.0,
    maskAnimDepth:        p.maskAnimDepth        ?? 1.0,
    parallaxFollow:       p.parallaxFollow       ?? 0,
    envUniformity:        p.envUniformity        ?? 0,
    ditherStrength:       p.ditherStrength       ?? 1.0,

    exposure:          p.exposure ?? 1.0,
    baseAlpha:         p.baseAlpha ?? 1.0,
    alphaClip:         p.alphaClip,
    diffuseTintR:      p.diffuseTint[0],
    diffuseTintG:      p.diffuseTint[1],
    diffuseTintB:      p.diffuseTint[2],
    diffuseSaturation: p.diffuseSaturation ?? 1.0,
    normalFlipY:       p.normalFlipY,
    lightHeight:       p.lightHeight,

    lightOrbitSpeed:   p.lightOrbitSpeed   ?? 0.2,
    lightOrbitRadiusX: p.lightOrbitRadiusX ?? 0.4,
    lightOrbitRadiusY: p.lightOrbitRadiusY ?? 0.3,
    mouseInfluence:    p.mouseInfluence    ?? 0.5,
    maskAnimSpeed:     p.maskAnimSpeed     ?? 1.0,

    lightR:          p.lightColor ? p.lightColor[0] : 1.0,
    lightG:          p.lightColor ? p.lightColor[1] : 1.0,
    lightB:          p.lightColor ? p.lightColor[2] : 1.0,
    lightStrength:   p.lightStrength ?? 1.0,
    ambientStrength: p.ambient,
    ambientR:        p.ambientColor[0],
    ambientG:        p.ambientColor[1],
    ambientB:        p.ambientColor[2],
    diffuse:         p.diffuse,
    diffuseWrap:     p.diffuseWrap ?? 0.0,
    bumpX:           p.bumpX ?? 1.0,
    bumpY:           p.bumpY ?? 1.0,
    parallax:        p.parallax,
    ao:              p.ao,
    cavityStrength:  p.cavityStrength ?? 0.0,

    roughnessMin:      p.roughnessMin,
    roughnessMax:      p.roughnessMax,
    roughnessContrast: p.roughnessContrast ?? 1.0,
    roughnessBias:     p.roughnessBias     ?? 0.0,

    specStrength: p.specStrength,
    specColorR:   p.specColor[0],
    specColorG:   p.specColor[1],
    specColorB:   p.specColor[2],
    f0Dielectric: p.f0Dielectric,
    fresnelPower: p.fresnelPower,
    specAoMask:   p.specAoMask,

    rimStrength: p.rimStrength,
    rimPower:    p.rimPower,
    rimColorR:   p.rimColor[0],
    rimColorG:   p.rimColor[1],
    rimColorB:   p.rimColor[2],

    // ── HRBA 路由 (v3.4) ────────────────────────────────────────────────────────
    hrbaB_route: p.hrbaB_route ?? p.hrbaMetalnessEnabled ?? 1,
    hrbaA_route: p.hrbaA_route ?? p.hrbaSssEnabled ?? 0,
    hrbaMetalnessEnabled: p.hrbaB_route ?? p.hrbaMetalnessEnabled ?? 1,
    hrbaSssEnabled: p.hrbaA_route ?? p.hrbaSssEnabled ?? 0,
    // 向下兼容：旧 _flushParams() 读取 bMetalness/bSSS 等，Phase 2 前归零
    bMetalness: 0, bAO: 0, bSSS: 0,
    aMetalness: 0, aAO: 0, aSSS: 0,

    // ── Mask 三路路由 (v3.3) ─────────────────────────────────────────────────────
    maskR_effectType:    p.maskR_effectType    ?? 1,
    maskR_colorR:        p.maskR_color ? p.maskR_color[0] : 1.0,
    maskR_colorG:        p.maskR_color ? p.maskR_color[1] : 0.1,
    maskR_colorB:        p.maskR_color ? p.maskR_color[2] : 0.05,
    maskR_strength:      p.maskR_strength      ?? 1.0,
    maskR_noiseCoupling: p.maskR_noiseCoupling ?? 0.5,

    maskG_effectType:    p.maskG_effectType    ?? 0,
    maskG_colorR:        p.maskG_color ? p.maskG_color[0] : 0.0,
    maskG_colorG:        p.maskG_color ? p.maskG_color[1] : 1.0,
    maskG_colorB:        p.maskG_color ? p.maskG_color[2] : 0.0,
    maskG_strength:      p.maskG_strength      ?? 1.0,
    maskG_noiseCoupling: p.maskG_noiseCoupling ?? 0.5,

    maskB_effectType:    p.maskB_effectType    ?? 0,
    maskB_colorR:        p.maskB_color ? p.maskB_color[0] : 0.0,
    maskB_colorG:        p.maskB_color ? p.maskB_color[1] : 0.0,
    maskB_colorB:        p.maskB_color ? p.maskB_color[2] : 1.0,
    maskB_strength:      p.maskB_strength      ?? 1.0,
    maskB_noiseCoupling: p.maskB_noiseCoupling ?? 0.5,

    // ── 发光层基础参数 ───────────────────────────────────────────────────────────
    maskIntensity: p.maskIntensity,
    baseBlur:      p.baseBlur,
    bloomScale:    p.bloomScale ?? 1.0,
    maskBrightness: p.maskBrightness ?? 0.0,
    maskContrast:   p.maskContrast ?? 1.0,
    maskEdgeSoftness: p.maskEdgeSoftness ?? 0.0,

    maskNoiseTex:  p.maskNoiseTex,
    noiseScale:    p.noiseScale,
    noiseScale2:   p.noiseScale2  ?? 3.5,
    noiseContrast: p.noiseContrast,
    noiseSpeedX:   p.noiseSpeedX,
    noiseSpeedY:   p.noiseSpeedY,
    noiseBlend:    p.noiseBlend  ?? 0.0,

    ...(p.sssStrength !== undefined && { sssStrength: p.sssStrength }),
    ...(p.sssColor    !== undefined && { sssR: p.sssColor[0], sssG: p.sssColor[1], sssB: p.sssColor[2] }),
  };
}

// 初始化默认载入 'default' 皮肤的预设，作为降级/启动保障
loadPresetsForPersona('default');
