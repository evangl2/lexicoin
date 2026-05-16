/**
 * CenterpieceDecal Preset 系统 v3.1
 */

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

  // ── 交互与动态 (NEW Phase 2) ─────────────────────────────────────────────────
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
  bWeights:         [number, number, number]; 
  aWeights:         [number, number, number]; 

  // ── 遮罩发光层 (Mask Emissive) ───────────────────────────────────────────────
  maskBWeight:      number;
  maskAWeight:      number;
  maskAnimMode:     number; 
  maskIntensity:    number;
  maskColor:        [number, number, number];
  maskColor2?:      [number, number, number]; 
  maskGradient?:    number; 
  maskBrightness?:  number;
  maskContrast?:    number;
  maskEdgeSoftness?:number;
  baseBlur:         number; 
  bloomScale?:      number; 

  // ── 噪声贴图与流动 (Noise) ───────────────────────────────────────────────────
  maskNoiseTex:     string;
  noiseScale:       number;
  noiseScale2?:     number; 
  noiseContrast:    number;
  noiseSpeedX:      number;
  noiseSpeedY:      number;
  noiseBlend?:      number; 

  // ── SSS (Stub) ──────────────────────────────────────────────────────────────
  sssStrength?:     number;
  sssColor?:        [number, number, number];
}

const rubedo: CenterpiecePreset = {
  label: '炼金 · 赤化 (Rubedo)',
  exposure:         1.0,
  baseAlpha:        1.0,
  alphaClip:        0.01,
  diffuseTint:      [1.0, 1.0, 1.0],
  diffuseSaturation: 1.0,
  normalFlipY:      0.0,
  lightHeight:      1.5,

  lightOrbitSpeed:   0.2,
  lightOrbitRadiusX: 0.4,
  lightOrbitRadiusY: 0.3,
  mouseInfluence:    0.5,
  maskAnimSpeed:     1.0,

  lightColor:       [1.0, 1.0, 1.0],
  lightStrength:    1.0,
  ambient:          0.05,
  ambientColor:     [1.0, 1.0, 1.0],
  diffuse:          0.8,
  diffuseWrap:      0.0,
  bumpX:            1.0,
  bumpY:            1.0,
  parallax:         0.03,
  ao:               0.5,
  cavityStrength:   0.0,

  roughnessMin:     0.0,
  roughnessMax:     1.0,
  roughnessContrast: 1.0,
  roughnessBias:     0.0,

  specStrength:     2.0,
  specColor:        [1.0, 0.9, 0.6],
  f0Dielectric:     0.04,
  fresnelPower:     5.0,
  specAoMask:       1.0,

  rimStrength:      0.6,
  rimPower:         3.0,
  rimColor:         [1.0, 0.4, 0.1],

  bWeights:         [0.0, 0.0, 0.0],
  aWeights:         [0.0, 0.0, 0.0],

  maskBWeight:      1.0,
  maskAWeight:      0.0,
  maskAnimMode:     1, 
  maskIntensity:    1.0,
  maskColor:        [1.0, 0.1, 0.05],
  maskColor2:       [1.0, 0.1, 0.05],
  maskGradient:     0.0,
  maskBrightness:   0.0,
  maskContrast:     1.0,
  maskEdgeSoftness: 0.0,
  baseBlur:         14.0,
  bloomScale:       1.0,

  maskNoiseTex:     '/assets/canvas/textures/noise/Melt 14 - 512x512.png',
  noiseScale:       2.5,
  noiseScale2:      3.5,
  noiseContrast:    1.2,
  noiseSpeedX:      0.02,
  noiseSpeedY:      0.01,
  noiseBlend:       0.0,
};

const nigredo: CenterpiecePreset = {
  ...rubedo,
  label: '炼金 · 黑化 (Nigredo)',
  maskColor: [0.2, 0.1, 0.8],
  maskColor2: [0.4, 0.2, 1.0],
  maskGradient: 0.5,
  lightOrbitSpeed: 0.4,
  mouseInfluence: 0.8,
};

const albedo: CenterpiecePreset = {
  ...rubedo,
  label: '炼金 · 白化 (Albedo)',
  maskColor: [0.8, 0.9, 1.0],
  maskColor2: [1.0, 1.0, 1.0],
  maskGradient: 0.2,
  lightOrbitSpeed: 0.1,
  mouseInfluence: 0.2,
};

export const CENTERPIECE_PRESETS: Record<string, CenterpiecePreset> = {
  rubedo,
  nigredo,
  albedo,
};

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

    bMetalness:       p.bWeights[0],
    bAO:              p.bWeights[1],
    bSSS:             p.bWeights[2],
    aMetalness:       p.aWeights[0],
    aAO:              p.aWeights[1],
    aSSS:             p.aWeights[2],

    maskBWeight:      p.maskBWeight,
    maskAWeight:      p.maskAWeight,
    maskAnimMode:     p.maskAnimMode,
    maskIntensity:    p.maskIntensity,
    maskColorR:       p.maskColor[0],
    maskColorG:       p.maskColor[1],
    maskColorB:       p.maskColor[2],
    maskColor2R:      p.maskColor2 ? p.maskColor2[0] : p.maskColor[0],
    maskColor2G:      p.maskColor2 ? p.maskColor2[1] : p.maskColor[1],
    maskColor2B:      p.maskColor2 ? p.maskColor2[2] : p.maskColor[2],
    maskGradient:     p.maskGradient ?? 0.0,
    maskBrightness:   p.maskBrightness ?? 0.0,
    maskContrast:     p.maskContrast ?? 1.0,
    maskEdgeSoftness: p.maskEdgeSoftness ?? 0.0,
    baseBlur:         p.baseBlur,
    bloomScale:       p.bloomScale ?? 1.0,

    maskNoiseTex:     p.maskNoiseTex,
    noiseScale:       p.noiseScale,
    noiseScale2:      p.noiseScale2 ?? 3.5,
    noiseContrast:    p.noiseContrast,
    noiseSpeedX:      p.noiseSpeedX,
    noiseSpeedY:      p.noiseSpeedY,
    noiseBlend:       p.noiseBlend ?? 0.0,

    ...(p.sssStrength !== undefined && { sssStrength: p.sssStrength }),
    ...(p.sssColor    !== undefined && { sssR: p.sssColor[0], sssG: p.sssColor[1], sssB: p.sssColor[2] }),
  };
}
