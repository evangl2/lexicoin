/**
 * CenterpieceDecal Preset 系统 v2.0
 */

export interface CenterpiecePreset {
  label: string;

  // ── 系统基础 ─────────────────────────────────────────────────────────────────
  alphaClip:        number;
  diffuseTint:      [number, number, number];
  normalFlipY:      number; // 0 或 1
  lightHeight:      number; // 光源高度 (Z)

  // ── 光照与结构 ───────────────────────────────────────────────────────────────
  ambient:          number; // 环境光强度
  ambientColor:     [number, number, number];
  diffuse:          number; // 漫反射强度
  bump:             number; // 法线凹凸强度
  parallax:         number; // 视差深度
  ao:               number; // 高度AO强度

  // ── 粗糙度 (Roughness) ───────────────────────────────────────────────────────
  roughnessMin:     number;
  roughnessMax:     number;

  // ── 完整 GGX 高光 ────────────────────────────────────────────────────────────
  specStrength:     number;
  specColor:        [number, number, number];
  f0Dielectric:     number; // 基础反射率 (默认0.04)
  fresnelPower:     number; // 菲涅尔衰减幂次 (默认5.0)
  specAoMask:       number; // 高度 AO 对高光的遮蔽程度 (0~1)

  // ── 边缘光 (Rim) ─────────────────────────────────────────────────────────────
  rimStrength:      number;
  rimPower:         number;
  rimColor:         [number, number, number];

  // ── 通道路由权重 ──────────────────────────────────────────────────────────────
  bWeights:         [number, number, number]; // [metalness, ao, sss]
  aWeights:         [number, number, number]; // [metalness, ao, sss]

  // ── 遮罩发光层 (Mask Emissive) ───────────────────────────────────────────────
  maskBWeight:      number;
  maskAWeight:      number;
  maskAnimMode:     number; // 0=Static, 1=Breathe, 2=Blink, 3=Pulse
  maskIntensity:    number;
  maskColor:        [number, number, number];
  baseBlur:         number; // 基础模糊辉光强度

  // ── 噪声贴图与流动 (Noise) ───────────────────────────────────────────────────
  maskNoiseTex:     string;
  noiseScale:       number;
  noiseContrast:    number;
  noiseSpeedX:      number;
  noiseSpeedY:      number;

  // ── SSS (Stub) ──────────────────────────────────────────────────────────────
  sssStrength?:     number;
  sssColor?:        [number, number, number];
}

const rubedo: CenterpiecePreset = {
  label: '炼金 · 赤化 (Rubedo)',
  alphaClip:        0.01,
  diffuseTint:      [1.0, 1.0, 1.0],
  normalFlipY:      0.0,
  lightHeight:      1.5,

  ambient:          0.05,
  ambientColor:     [1.0, 1.0, 1.0],
  diffuse:          0.8,
  bump:             1.0,
  parallax:         0.03,
  ao:               0.5,

  roughnessMin:     0.0,
  roughnessMax:     1.0,

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
  maskAnimMode:     1, // Breathe
  maskIntensity:    1.0,
  maskColor:        [1.0, 0.1, 0.05],
  baseBlur:         14.0,

  maskNoiseTex:     '/assets/canvas/textures/noise/Melt 14 - 512x512.png',
  noiseScale:       2.5,
  noiseContrast:    1.2,
  noiseSpeedX:      0.02,
  noiseSpeedY:      0.01,
};

const nigredo: CenterpiecePreset = {
  ...rubedo,
  label: '炼金 · 黑化 (Nigredo)',
  maskColor: [0.2, 0.1, 0.8],
  maskNoiseTex: '/assets/canvas/textures/noise/Melt 14 - 512x512.png', // 可以换别的
};

const albedo: CenterpiecePreset = {
  ...rubedo,
  label: '炼金 · 白化 (Albedo)',
  maskColor: [0.8, 0.9, 1.0],
};

export const CENTERPIECE_PRESETS: Record<string, CenterpiecePreset> = {
  rubedo,
  nigredo,
  albedo,
};

export function presetToParams(p: CenterpiecePreset): Record<string, number | string> {
  return {
    alphaClip:        p.alphaClip,
    diffuseTintR:     p.diffuseTint[0],
    diffuseTintG:     p.diffuseTint[1],
    diffuseTintB:     p.diffuseTint[2],
    normalFlipY:      p.normalFlipY,
    lightHeight:      p.lightHeight,

    ambientStrength:  p.ambient,
    ambientR:         p.ambientColor[0],
    ambientG:         p.ambientColor[1],
    ambientB:         p.ambientColor[2],
    diffuse:          p.diffuse,
    bump:             p.bump,
    parallax:         p.parallax,
    ao:               p.ao,

    roughnessMin:     p.roughnessMin,
    roughnessMax:     p.roughnessMax,

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
    baseBlur:         p.baseBlur,

    maskNoiseTex:     p.maskNoiseTex, // string, will not be tweened, handled in applyPreset
    noiseScale:       p.noiseScale,
    noiseContrast:    p.noiseContrast,
    noiseSpeedX:      p.noiseSpeedX,
    noiseSpeedY:      p.noiseSpeedY,

    ...(p.sssStrength !== undefined && { sssStrength: p.sssStrength }),
    ...(p.sssColor    !== undefined && { sssR: p.sssColor[0], sssG: p.sssColor[1], sssB: p.sssColor[2] }),
  };
}
