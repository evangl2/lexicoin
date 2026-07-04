import type { CenterpieceDecal } from './CenterpieceDecal';
import { CENTERPIECE_PRESETS, presetToParams, paramsToPreset, loadPresetsForPersona, getBasePresetsForPersona } from './centerpiece-presets';
import { personaBridge } from '../bridges/PersonaBridge';

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  isAdv?: boolean;
  tip?: string;
}

interface ColorDef {
  label: string;
  keys: [string, string, string]; // [R, G, B]
  isAdv?: boolean;
  tip?: string;
}

/**
 * 在"风格化"材质模型(materialModel=1)下经代码验证为 100% 无视觉效果的参数键。
 * 这些值仍会被写入 uniform,只是 FRAG_WGSL_V4 的 Stylized 分支不消费它们(见 ADR-006)。
 * 不含粗糙度/金属度/F0 等——它们经环境反射通道仍有次要作用,标记会误导。
 */
const DEAD_IN_STYLIZED = new Set([
  'specStrength', 'specColorR', 'specColorG', 'specColorB',
  'curvatureScale', 'curvatureBoost',
]);

const SECTIONS: {
  title: string;
  sliders?: SliderDef[];
  colors?: ColorDef[];
}[] = [
  {
    title: 'V4 管线',
    sliders: [
      { key: 'shaderVersion', label: '渲染管线', min: 0, max: 1, step: 1, tip: '0 = 旧版 v3(gamma 空间) / 1 = 新版 v4(线性 + 色调映射)。用于新旧对比。' },
      { key: 'materialModel', label: '材质模型', min: 0, max: 1, step: 1, tip: '0 = PBR(宝石/血肉/植物/金属) / 1 = 风格化(手绘/纸板/少女,无物理高光)' },
      { key: 'tonemapMode',   label: '色调映射', min: 0, max: 2, step: 1, tip: '高光的滚落方式:0 = 无(会死白) / 1 = Reinhard / 2 = ACES(推荐,高光最有层次)' },
      { key: 'envStrength',   label: '环境反射', min: 0, max: 3, step: 0.05, tip: 'matcap 环境光泽。金属感/宝石感/釉面感的关键,从 0 慢慢加' },
      { key: 'envRoughFade',  label: '反射粗糙衰减', min: 0, max: 1, step: 0.01, isAdv: true, tip: '表面越粗糙,环境反射被削弱得越多' },
      { key: 'unpremultiply', label: '边缘修正',   min: 0, max: 1, step: 1, isAdv: true, tip: '反预乘 alpha,修复边缘暗圈。正常保持 1' },
      { key: 'rampSoftness',  label: '色阶柔化',   min: 0, max: 1, step: 0.01, isAdv: true, tip: '仅风格化模型:0 = 硬色阶(卡通描边感) / 1 = 平滑过渡' },
      { key: 'rampSteps',     label: '色阶数',     min: 1, max: 8, step: 1, isAdv: true, tip: '仅风格化模型:明暗分几档,2~3 档最有手绘感' },
    ],
  },
  {
    title: '资材调理',
    sliders: [
      { key: 'normalFlipX',  label: '法线翻转 X', min: 0, max: 1, step: 1, tip: '鼠标向左移、高光却向右跑 → 切到 1' },
      { key: 'normalFlipY',  label: '法线翻转 Y', min: 0, max: 1, step: 1, tip: '鼠标向上移、光照却向下倾 → 切到 1' },
      { key: 'normalBiasX',  label: '法线偏置 X', min: -0.3, max: 0.3, step: 0.005, tip: '校正推理法线的整体左右倾斜' },
      { key: 'normalBiasY',  label: '法线偏置 Y', min: -0.3, max: 0.3, step: 0.005, tip: '校正推理法线的整体上下倾斜。当前资材实测偏置约 +0.10,可从这里试' },
      { key: 'heightInvert', label: '高度反转',   min: 0, max: 1, step: 1, tip: '浮雕的凹凸感觉反了(该凸的凹)→ 切到 1' },
      { key: 'curvatureScale',    label: '曲率灵敏度', min: 0, max: 10, step: 0.1, isAdv: true, tip: '法线变化剧烈的边缘被判定为"棱角"的灵敏度(仅 PBR 模型生效,风格化模型下无效)' },
      { key: 'curvatureBoost',    label: '曲率增光',   min: 0, max: 5, step: 0.05, isAdv: true, tip: '棱角处的高光额外增强量(仅 PBR 模型生效,风格化模型下无效)' },
      { key: 'emissiveNoiseGain', label: '发光噪声增益', min: 0, max: 10, step: 0.1, isAdv: true, tip: '发光层噪声调制的总增益(旧版硬编码 5.0)' },
      { key: 'emissiveEdgeWidth', label: '发光边缘宽度', min: 0, max: 0.1, step: 0.001, isAdv: true, tip: '发光图案边缘的羽化宽度(旧版硬编码 0.015)' },
    ],
  },
  {
    title: '系统与基色',
    sliders: [
      { key: 'exposure',          label: '曝光',      min: 0, max: 5, step: 0.05, tip: '整体亮度,在色调映射之前作用' },
      { key: 'baseAlpha',         label: '整体透明度', min: 0, max: 1, step: 0.01 },
      { key: 'alphaClip',         label: '裁切阈值',  min: 0, max: 1, step: 0.01, isAdv: true, tip: '低于此透明度的像素直接丢弃' },
      { key: 'diffuseSaturation', label: '饱和度',    min: 0, max: 2, step: 0.05 },
    ],
    colors: [
      { label: '基色染色', keys: ['diffuseTintR', 'diffuseTintG', 'diffuseTintB'], tip: '整体乘在贴图颜色上的染色' }
    ]
  },
  {
    title: '交互与动态',
    sliders: [
      { key: 'lightOrbitSpeed',   label: '光源公转速度', min: 0, max: 2, step: 0.01, tip: '无鼠标时光源自动绕圈的速度' },
      { key: 'lightOrbitRadiusX', label: '公转半径 X',   min: 0, max: 2, step: 0.01, isAdv: true },
      { key: 'lightOrbitRadiusY', label: '公转半径 Y',   min: 0, max: 2, step: 0.01, isAdv: true },
      { key: 'mouseInfluence',    label: '鼠标影响',     min: 0, max: 1, step: 0.01, tip: '光照方向被鼠标位置牵引的程度' },
      { key: 'maskAnimSpeed',     label: '发光动画速度', min: 0, max: 5, step: 0.05 },
    ],
  },
  {
    title: '光照与表面',
    sliders: [
      { key: 'lightStrength',   label: '主光强度',   min: 0, max: 5, step: 0.1 },
      { key: 'lightHeight',     label: '光源高度',   min: 0, max: 5, step: 0.1, isAdv: true, tip: '光源 Z 高度:越低,掠射角越大、立体感越强' },
      { key: 'ambientStrength', label: '环境光强度', min: 0, max: 1, step: 0.01, tip: '无方向的底光,防止暗部死黑' },
      { key: 'diffuse',         label: '漫反射强度', min: 0, max: 3, step: 0.05 },
      { key: 'diffuseWrap',     label: '漫反射包裹', min: 0, max: 1, step: 0.05, isAdv: true, tip: '光绕到背光面的程度,值大显得柔软' },
      { key: 'bumpX',           label: '凹凸强度 X', min: 0, max: 5, step: 0.05, tip: '法线凹凸感的横向强度' },
      { key: 'bumpY',           label: '凹凸强度 Y', min: 0, max: 5, step: 0.05, isAdv: true },
      { key: 'parallax',        label: '视差',       min: 0, max: 0.1, step: 0.002, tip: '光移动时纹理的立体滑动量,过大会糊' },
      { key: 'ao',              label: '高度 AO',    min: 0, max: 1, step: 0.01, tip: '低洼处压暗。高度图不可靠时先归零' },
      { key: 'cavityStrength',  label: '缝隙阴影',   min: 0, max: 1, step: 0.01, isAdv: true },
    ],
    colors: [
      { label: '主光颜色',   keys: ['lightR', 'lightG', 'lightB'], isAdv: true },
      { label: '环境光颜色', keys: ['ambientR', 'ambientG', 'ambientB'], isAdv: true },
    ]
  },
  {
    title: 'PBR 材质',
    sliders: [
      { key: 'roughnessMin',      label: '粗糙度下限', min: 0, max: 1, step: 0.01, tip: '贴图粗糙度被重映射到 [下限,上限] 区间' },
      { key: 'roughnessMax',      label: '粗糙度上限', min: 0, max: 1, step: 0.01 },
      { key: 'roughnessContrast', label: '粗糙度对比', min: 0.1, max: 5, step: 0.1, isAdv: true },
      { key: 'roughnessBias',     label: '粗糙度偏移', min: -1, max: 1, step: 0.01, isAdv: true },
      { key: 'specStrength',      label: '高光强度',   min: 0, max: 10, step: 0.1, tip: '仅 PBR 模型生效,风格化模型下无物理高光' },
      { key: 'f0Dielectric',      label: 'F0 反射率',  min: 0, max: 1, step: 0.01, isAdv: true, tip: '非金属的基础反射率,常规 0.04' },
      { key: 'fresnelPower',      label: '菲涅尔幂',   min: 0.1, max: 10, step: 0.1, isAdv: true, tip: '边缘反射增强的收束程度' },
      { key: 'specAoMask',        label: '高光AO遮罩', min: 0, max: 1, step: 0.01, isAdv: true, tip: '低洼处抑制高光的程度' },
      { key: 'globalMetalness',   label: '全局金属度', min: 0, max: 1, step: 0.01, tip: '金属度总开关/乘数,金属反射带上物体本色' },
    ],
    colors: [
      { label: '高光颜色', keys: ['specColorR', 'specColorG', 'specColorB'], tip: '仅 PBR 模型生效,风格化模型下无物理高光' }
    ]
  },
  {
    title: '边缘光与 SSS',
    sliders: [
      { key: 'rimStrength', label: '边缘光强度', min: 0, max: 5, step: 0.05, tip: '轮廓处的描边光' },
      { key: 'rimPower',    label: '边缘光收束', min: 1, max: 10, step: 0.1, tip: '值越大,边缘光越贴着轮廓' },
      { key: 'sssStrength', label: 'SSS 强度',   min: 0, max: 5, step: 0.05, tip: '次表面散射:玉石/皮肉的透光感' },
    ],
    colors: [
      { label: '边缘光颜色', keys: ['rimColorR', 'rimColorG', 'rimColorB'] },
      { label: 'SSS 颜色',   keys: ['sssR', 'sssG', 'sssB'], isAdv: true },
    ]
  },
  {
    title: 'Mask 发光',
    sliders: [
      { key: 'maskIntensity',    label: '发光总强度', min: 0, max: 10, step: 0.05 },
      { key: 'maskBrightness',   label: '亮度',       min: -1, max: 1, step: 0.01, isAdv: true },
      { key: 'maskContrast',     label: '对比度',     min: 0.1, max: 5, step: 0.1, isAdv: true },
      { key: 'maskEdgeSoftness', label: '发光锐度', min: 0, max: 1, step: 0.01, tip: '实为亮度幂次曲线,数值越大发光核心越收缩、越锐利,不是边缘模糊(那是下面的"发光边缘宽度")' },
      { key: 'baseBlur',         label: '光晕模糊',   min: 0, max: 100, step: 1, tip: '发光层的高斯模糊半径,产生辉光扩散' },
      { key: 'bloomScale',       label: '光晕缩放',   min: 0.5, max: 2, step: 0.01, isAdv: true },
    ],
  },
  {
    title: '噪声与流动',
    sliders: [
      { key: 'noiseScale',    label: '噪声1 尺度', min: 0, max: 20, step: 0.1, tip: '0 = 关闭噪声调制' },
      { key: 'noiseScale2',   label: '噪声2 尺度', min: 0, max: 20, step: 0.1 },
      { key: 'noiseContrast', label: '噪声对比',   min: 0.1, max: 10, step: 0.1 },
      { key: 'noiseSpeedX',   label: '流速 X',     min: -0.5, max: 0.5, step: 0.005 },
      { key: 'noiseSpeedY',   label: '流速 Y',     min: -0.5, max: 0.5, step: 0.005 },
      { key: 'noiseBlend',    label: '混合模式',   min: 0, max: 1, step: 0.5, isAdv: true, tip: '0 = 相乘 / 0.5 = 插值 / 1 = 相加' },
    ],
  },
];

/** preset 切换的固定过渡时长(原为可输入的 TRANSITION 秒数,调参场景要即时反馈,已移除输入框) */
const PRESET_TRANSITION = 0.35;

const PANEL_STYLES = `
  #centerpiece-debug-panel {
    position: fixed; top: 16px; right: 16px; width: 372px; max-height: 94vh; overflow-y: auto;
    background: rgba(12, 12, 18, 0.95); backdrop-filter: blur(12px);
    border: 1px solid rgba(180, 140, 60, 0.4); border-radius: 12px;
    color: #e0d0b0; font-family: 'JetBrains Mono', monospace, sans-serif; font-size: 11px;
    z-index: 9999; user-select: none; box-shadow: 0 12px 48px rgba(0,0,0,0.6);
    scrollbar-width: thin; scrollbar-color: rgba(180, 140, 60, 0.4) transparent;
  }
  #centerpiece-debug-panel::-webkit-scrollbar { width: 4px; }
  #centerpiece-debug-panel::-webkit-scrollbar-thumb { background: rgba(180, 140, 60, 0.4); border-radius: 4px; }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: linear-gradient(90deg, rgba(180, 140, 60, 0.2), transparent);
    border-bottom: 1px solid rgba(180, 140, 60, 0.3); border-radius: 12px 12px 0 0;
    position: sticky; top: 0; background-color: rgba(12,12,18,0.98); z-index: 2;
  }
  .panel-title { font-weight: 800; letter-spacing: 0.1em; color: #fff; text-shadow: 0 0 8px rgba(180, 140, 60, 0.5); }
  .panel-controls { display: flex; gap: 8px; align-items: center; }
  .adv-toggle { cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 9px; opacity: 0.7; }
  .adv-toggle input { width: 10px; height: 10px; margin: 0; }
  .close-btn { cursor: pointer; opacity: 0.6; font-size: 20px; background: none; border: none; color: #d4b060; padding: 0 4px; }

  .toolbar { display: flex; gap: 8px; padding: 10px 16px 6px; align-items: center; }
  .search-box {
    flex: 1; background: rgba(0,0,0,0.35); border: 1px solid rgba(180,140,60,0.3);
    color: #e0d0b0; border-radius: 6px; padding: 5px 8px; font-family: inherit; font-size: 10px;
  }
  .search-box:focus { border-color: #d4b060; outline: none; }
  .ab-btn {
    background: rgba(180,140,60,0.15); border: 1px solid rgba(180,140,60,0.4);
    color: #d4b060; border-radius: 6px; padding: 5px 10px; font-size: 10px; font-weight: 800;
    cursor: pointer; white-space: nowrap;
  }
  .ab-btn:active, .ab-btn.holding { background: #d4b060; color: #000; }
  .hint-bar { padding: 0 16px 8px; font-size: 9px; opacity: 0.45; line-height: 1.5; }

  .preset-grid { padding: 6px 16px 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; border-bottom: 1px solid rgba(180,140,60,0.15); }
  .preset-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(180,140,60,0.2);
    border-radius: 6px; padding: 6px 8px; text-align: center; cursor: pointer; transition: all 0.2s;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }
  .preset-card:hover { background: rgba(180,140,60,0.1); border-color: rgba(180,140,60,0.4); }
  .preset-card.active { background: rgba(180,140,60,0.25); border-color: #d4b060; box-shadow: 0 0 10px rgba(180,140,60,0.2); }
  .preset-dot { width: 8px; height: 8px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
  .preset-label { font-size: 9px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }

  .collapsible-section { border-bottom: 1px solid rgba(180,140,60,0.1); }
  .section-header {
    padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; background: rgba(0,0,0,0.2); transition: background 0.2s;
  }
  .section-header:hover { background: rgba(180,140,60,0.05); }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.8; }
  .dirty-badge {
    display: inline-block; margin-left: 6px; padding: 0 5px; border-radius: 8px;
    background: rgba(212,176,96,0.25); color: #ffd685; font-size: 9px; font-weight: 800;
  }
  .dirty-badge:empty { display: none; }
  .section-chevron { transition: transform 0.3s; opacity: 0.5; }
  .collapsible-section.collapsed .section-chevron { transform: rotate(-90deg); }
  .section-content { padding: 4px 0 12px; display: block; }
  .collapsible-section.collapsed .section-content { display: none; }

  .row { display: flex; align-items: center; gap: 8px; padding: 3px 16px; min-height: 20px; }
  .label { width: 110px; opacity: 0.7; font-size: 10px; cursor: pointer; }
  .row.dirty > .label, .color-row.dirty .label { color: #ffd685; opacity: 1; font-weight: 700; }
  .row.dirty > .label::before { content: '●'; font-size: 7px; margin-right: 3px; vertical-align: 1px; }
  .input-range { flex: 1; accent-color: #d4b060; height: 3px; cursor: pointer; }
  .val-input {
    width: 44px; text-align: right; font-weight: bold; font-variant-numeric: tabular-nums;
    opacity: 0.9; background: rgba(0,0,0,0.3); border: 1px solid rgba(180,140,60,0.3);
    color: #e0d0b0; border-radius: 4px; padding: 2px 4px; font-family: inherit; font-size: 10px;
  }
  .val-input:focus { border-color: #d4b060; outline: none; background: rgba(0,0,0,0.5); }
  .val-input::-webkit-outer-spin-button, .val-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .color-row { padding: 4px 16px; }
  .color-header { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .color-swatch { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  .color-expand { display: none; padding: 4px 0 4px 8px; border-left: 2px solid rgba(180,140,60,0.2); margin-top: 4px; }
  .color-row.expanded .color-expand { display: block; }

  .hidden { display: none !important; }
  .row.model-dead, .color-row.model-dead { opacity: 0.32; }
  .row.model-dead > .label::after { content: ' 🚫'; }
  .color-row.model-dead .label::after { content: ' 🚫'; }
  .search-miss { display: none !important; }
  #centerpiece-debug-panel.searching .section-content { display: block !important; }
  #centerpiece-debug-panel.searching .preset-grid,
  #centerpiece-debug-panel.searching .hint-bar { display: none; }

  .action-bar { display: grid; grid-template-columns: 1fr 1fr 40px; gap: 8px; padding: 12px 16px; background: rgba(0,0,0,0.3); }
  .action-btn {
    background: rgba(180,140,60,0.15); border: 1px solid rgba(180,140,60,0.4);
    color: #d4b060; border-radius: 6px; padding: 8px; font-size: 10px; font-weight: 800;
    cursor: pointer; transition: all 0.2s;
  }
  .action-btn:hover { background: #d4b060; color: #000; }
  .reset-btn { font-size: 14px; }
`;

export class CenterpieceDebugPanel {
  private _el: HTMLElement | null = null;
  private _styleEl: HTMLStyleElement | null = null;
  private _visible = true;
  private _isAdv = false;
  private _decal!: CenterpieceDecal;
  private _activePreset = 'rubedo';
  private _onKey?: (e: KeyboardEvent) => void;
  private _sliderRefs: Map<string, { input: HTMLInputElement; valueEl: HTMLInputElement; row: HTMLElement }> = new Map();
  private _colorSwatches: Map<string, HTMLElement> = new Map();
  private _sections: HTMLElement[] = [];
  private _sectionBadges: Map<HTMLElement, HTMLElement> = new Map();
  private _selectRefs: Map<string, HTMLSelectElement> = new Map();
  /** 当前子阶段的 JSON 基线(不含草稿),用于改动高亮 / 双击恢复 / A-B 对比 */
  private _baseline: Record<string, any> = {};
  private _abSnapshot: Record<string, any> | null = null;

  constructor(decal: CenterpieceDecal) {
    if (!import.meta.env.DEV) return;
    this._decal = decal;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = PANEL_STYLES;
    document.head.appendChild(this._styleEl);
    this._el = document.createElement('div');
    this._el.id = 'centerpiece-debug-panel';
    this._refreshBaseline();
    this._build();
    document.body.appendChild(this._el);
    this._onKey = (e: KeyboardEvent) => { if (e.key === '`') this.toggle(); };
    window.addEventListener('keydown', this._onKey);

    const savedAdv = localStorage.getItem('centerpiece-debug-adv');
    if (savedAdv === 'true') this._setAdv(true);
  }

  // ── 基线管理 ───────────────────────────────────────────────────────────────

  private _refreshBaseline(): void {
    const personaName = this._getActivePersonaName();
    const base = getBasePresetsForPersona(personaName)[this._activePreset];
    this._baseline = base && Object.keys(base).length ? presetToParams(base as any) : {};
  }

  private _isDirty(key: string, params: any): boolean {
    const baseVal = this._baseline[key];
    if (baseVal === undefined || typeof baseVal === 'string') return false;
    return Math.abs((params[key] ?? 0) - baseVal) > 1e-4;
  }

  // ── 构建 ─────────────────────────────────────────────────────────────────

  private _build(): void {
    if (!this._el) return;
    this._el.innerHTML = '';
    const params = this._decal.getCurrentParams() as any;

    this._sliderRefs.clear();
    this._colorSwatches.clear();
    this._selectRefs.clear();
    this._sections = [];
    this._sectionBadges.clear();

    // Header
    const personaName = this._getActivePersonaName();
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">⚗ 材质调参 · ${personaName.toUpperCase()}</span>
      <div class="panel-controls">
        <label class="adv-toggle">
          <input type="checkbox" ${this._isAdv ? 'checked' : ''} id="adv-checkbox"> 高级
        </label>
        <button class="close-btn">×</button>
      </div>
    `;
    header.querySelector('#adv-checkbox')?.addEventListener('change', (e) => {
      this._setAdv((e.target as HTMLInputElement).checked);
    });
    header.querySelector('.close-btn')?.addEventListener('click', () => this.toggle());
    this._el.appendChild(header);

    // Toolbar: 搜索 + A/B 对比
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    const search = document.createElement('input');
    search.type = 'text'; search.className = 'search-box';
    search.placeholder = '🔍 搜索参数(中文或英文)…';
    search.addEventListener('input', () => this._applySearch(search.value.trim().toLowerCase()));
    const abBtn = document.createElement('button');
    abBtn.className = 'ab-btn';
    abBtn.textContent = '⇆ 按住看原版';
    abBtn.title = '按住:显示未修改的 JSON 基线效果;松开:回到你当前调的效果';
    abBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._abHoldStart(abBtn); });
    const abEnd = () => this._abHoldEnd(abBtn);
    abBtn.addEventListener('pointerup', abEnd);
    abBtn.addEventListener('pointerleave', abEnd);
    abBtn.addEventListener('pointercancel', abEnd);
    toolbar.appendChild(search);
    toolbar.appendChild(abBtn);
    this._el.appendChild(toolbar);

    const hint = document.createElement('div');
    hint.className = 'hint-bar';
    hint.textContent = '双击参数名 = 恢复该项默认 · 金色圆点 = 你改过的参数 · ` 键收起面板';
    this._el.appendChild(hint);

    // Preset cards
    const presetGrid = document.createElement('div');
    presetGrid.className = 'preset-grid';
    Object.keys(CENTERPIECE_PRESETS).forEach(key => {
      const preset = CENTERPIECE_PRESETS[key];
      if (!preset) return;
      const card = document.createElement('div');
      card.className = `preset-card${key === this._activePreset ? ' active' : ''}`;
      card.dataset['key'] = key;
      const dot = document.createElement('div');
      dot.className = 'preset-dot';
      const c = (preset as any).maskR_color || [1, 1, 1];
      dot.style.backgroundColor = `rgb(${c[0] * 255}, ${c[1] * 255}, ${c[2] * 255})`;
      const label = document.createElement('span');
      label.className = 'preset-label';
      let displayName = key.toUpperCase();
      if (preset.label) {
        const parts = preset.label.split('(');
        if (parts.length > 1) {
          const rightPart = parts[1];
          if (rightPart) displayName = rightPart.replace(')', '');
        } else {
          displayName = preset.label;
        }
      }
      label.textContent = displayName;
      card.appendChild(dot);
      card.appendChild(label);
      card.addEventListener('click', () => this._applyPreset(key));
      presetGrid.appendChild(card);
    });
    this._el.appendChild(presetGrid);

    // Anim mode
    const modeRow = document.createElement('div');
    modeRow.className = 'row';
    modeRow.innerHTML = `<span class="label">发光动画模式</span>`;
    const modeSelect = document.createElement('select');
    modeSelect.style.flex = '1'; modeSelect.style.background = '#000'; modeSelect.style.color = '#d4b060'; modeSelect.style.border = '1px solid #d4b06044';
    ['静止', '呼吸', '闪烁', '脉搏'].forEach((n, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx); opt.textContent = n;
      modeSelect.appendChild(opt);
    });
    modeSelect.value = String(params.maskAnimMode ?? 1);
    modeSelect.addEventListener('change', () => {
      this._decal.applyPreset({ maskAnimMode: parseInt(modeSelect.value, 10) } as any, 0);
      this._saveDraft();
    });
    modeRow.appendChild(modeSelect);
    this._el.appendChild(modeRow);

    // Sections
    SECTIONS.forEach((secDef, idx) => {
      const sec = document.createElement('div');
      sec.className = 'collapsible-section';
      sec.dataset['title'] = secDef.title;
      const secHead = document.createElement('div');
      secHead.className = 'section-header';
      secHead.innerHTML = `
        <span class="section-title">${secDef.title}<span class="dirty-badge"></span></span>
        <span class="section-chevron">▼</span>
      `;
      const secContent = document.createElement('div');
      secContent.className = 'section-content';

      secHead.addEventListener('click', () => {
        sec.classList.toggle('collapsed');
        this._saveCollapseState();
      });

      secDef.sliders?.forEach(def => secContent.appendChild(this._createSliderRow(def, params)));
      secDef.colors?.forEach(def => secContent.appendChild(this._createColorRow(def, params)));

      if (secDef.title === 'PBR 材质') {
        secContent.appendChild(this._buildHrbaRouting(params));
      }
      if (secDef.title === 'Mask 发光') {
        secContent.appendChild(this._buildMaskChannelBlock('R', params));
        secContent.appendChild(this._buildMaskChannelBlock('G', params));
        secContent.appendChild(this._buildMaskChannelBlock('B', params));
      }

      sec.appendChild(secHead);
      sec.appendChild(secContent);
      this._el!.appendChild(sec);
      this._sections.push(sec);
      const badge = secHead.querySelector('.dirty-badge') as HTMLElement;
      this._sectionBadges.set(sec, badge);

      // 默认:前三个分区展开,其余折叠(有保存的状态则以保存为准)
      if (idx >= 3) sec.classList.add('collapsed');
    });
    this._restoreCollapseState();

    // Actions
    const actions = document.createElement('div');
    actions.className = 'action-bar';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn'; copyBtn.textContent = '复制 JSON';
    copyBtn.title = '复制当前 Persona 完整配置(含三个子阶段),可直接粘贴给 AI';
    copyBtn.addEventListener('click', () => this._copyPersonaJson());
    const dlBtn = document.createElement('button');
    dlBtn.className = 'action-btn'; dlBtn.textContent = '下载 JSON';
    dlBtn.title = '下载当前 Persona 完整配置文件';
    dlBtn.addEventListener('click', () => this._exportPersonaJson());
    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn reset-btn'; resetBtn.textContent = '↺';
    resetBtn.title = '丢弃当前子阶段的全部修改,恢复 JSON 默认';
    resetBtn.addEventListener('click', () => this._resetDraft());

    actions.appendChild(copyBtn); actions.appendChild(dlBtn); actions.appendChild(resetBtn);
    this._el.appendChild(actions);

    this._updateVisibility();
    this._updateDirtyMarks();
    this._updateModelDimming(params.materialModel ?? 0);
  }

  // ── A/B 对比(按住看基线) ────────────────────────────────────────────────

  private _abHoldStart(btn: HTMLElement): void {
    if (this._abSnapshot || !Object.keys(this._baseline).length) return;
    this._abSnapshot = this._decal.getCurrentParams();
    btn.classList.add('holding');
    this._decal.applyPreset({ ...this._baseline } as any, 0);
  }

  private _abHoldEnd(btn: HTMLElement): void {
    if (!this._abSnapshot) return;
    this._decal.applyPreset({ ...this._abSnapshot } as any, 0);
    this._abSnapshot = null;
    btn.classList.remove('holding');
  }

  // ── 搜索过滤 ─────────────────────────────────────────────────────────────

  private _applySearch(query: string): void {
    if (!this._el) return;
    this._el.classList.toggle('searching', !!query);
    const rows = this._el.querySelectorAll<HTMLElement>('[data-search]');
    rows.forEach(row => {
      const hit = !query || (row.dataset['search'] || '').includes(query);
      row.classList.toggle('search-miss', !hit);
    });
    // 整个分区无命中则隐藏
    this._sections.forEach(sec => {
      if (!query) { sec.classList.remove('search-miss'); return; }
      const anyHit = !!sec.querySelector('[data-search]:not(.search-miss)');
      sec.classList.toggle('search-miss', !anyHit);
    });
  }

  // ── 折叠状态记忆 ──────────────────────────────────────────────────────────

  private _saveCollapseState(): void {
    const collapsed = this._sections
      .filter(s => s.classList.contains('collapsed'))
      .map(s => s.dataset['title'] || '');
    localStorage.setItem('centerpiece-debug-collapsed', JSON.stringify(collapsed));
  }

  private _restoreCollapseState(): void {
    const saved = localStorage.getItem('centerpiece-debug-collapsed');
    if (!saved) return;
    try {
      const collapsed: string[] = JSON.parse(saved);
      this._sections.forEach(sec => {
        sec.classList.toggle('collapsed', collapsed.includes(sec.dataset['title'] || ''));
      });
    } catch { /* 忽略损坏的存储 */ }
  }

  // ── HRBA / Mask 特殊块 ───────────────────────────────────────────────────

  private _buildHrbaRouting(params: any): HTMLElement {
    const hrbaRow = document.createElement('div');
    hrbaRow.className = 'row';
    hrbaRow.style.flexDirection = 'column';
    hrbaRow.style.alignItems = 'stretch';
    hrbaRow.style.gap = '8px';
    hrbaRow.style.padding = '8px 16px';
    hrbaRow.dataset['search'] = '金属度路由 透光路由 hrba route metalness sss transmission';
    hrbaRow.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span class="label" style="width: 120px;">金属度路由 (B)</span>
        <select id="hrba-b-route-select" style="flex: 1; max-width: 180px; background: #000; color: #d4b060; border: 1px solid rgba(180,140,60,0.3); border-radius: 4px; padding: 2px 4px; font-family: inherit; font-size: 10px;">
          <option value="0">关闭(用全局值)</option>
          <option value="1">读贴图 B 通道</option>
        </select>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span class="label" style="width: 120px;">透光路由 (A)</span>
        <select id="hrba-a-route-select" style="flex: 1; max-width: 180px; background: #000; color: #d4b060; border: 1px solid rgba(180,140,60,0.3); border-radius: 4px; padding: 2px 4px; font-family: inherit; font-size: 10px;">
          <option value="0">关闭</option>
          <option value="1">SSS(厚度遮罩)</option>
          <option value="2">透射(背光)</option>
        </select>
      </div>
    `;

    const bRouteSelect = hrbaRow.querySelector('#hrba-b-route-select') as HTMLSelectElement;
    bRouteSelect.value = String(params.hrbaB_route ?? 1);
    bRouteSelect.addEventListener('change', () => {
      const val = parseInt(bRouteSelect.value, 10);
      this._decal.applyPreset({ hrbaB_route: val, hrbaMetalnessEnabled: val } as any, 0);
      this._saveDraft();
    });

    const aRouteSelect = hrbaRow.querySelector('#hrba-a-route-select') as HTMLSelectElement;
    aRouteSelect.value = String(params.hrbaA_route ?? 0);
    aRouteSelect.addEventListener('change', () => {
      const val = parseInt(aRouteSelect.value, 10);
      this._decal.applyPreset({ hrbaA_route: val, hrbaSssEnabled: val > 0 ? 1 : 0 } as any, 0);
      this._saveDraft();
    });

    this._selectRefs.set('hrbaB_route', bRouteSelect);
    this._selectRefs.set('hrbaA_route', aRouteSelect);
    return hrbaRow;
  }

  private _buildMaskChannelBlock(ch: 'R'|'G'|'B', params: any): HTMLElement {
    const typeKey = `mask${ch}_effectType`;
    const isActive = (params[typeKey] ?? 0) > 0;

    const block = document.createElement('div');
    block.className = `collapsible-section${isActive ? '' : ' collapsed'}`;
    block.style.borderTop = '1px solid rgba(180,140,60,0.15)';
    block.style.background = 'rgba(0,0,0,0.15)';
    block.dataset['maskChannel'] = ch;

    const head = document.createElement('div');
    head.className = 'section-header';
    head.innerHTML = `
      <span class="section-title" style="color: #d4b060; font-size: 9px;">▼ Mask ${ch} 通道</span>
      <span class="section-chevron">▼</span>
    `;
    const content = document.createElement('div');
    content.className = 'section-content';
    content.style.paddingLeft = '8px';

    head.addEventListener('click', () => block.classList.toggle('collapsed'));

    const typeRow = document.createElement('div');
    typeRow.className = 'row';
    typeRow.dataset['search'] = `mask ${ch.toLowerCase()} 效果类型 自发光 染色 边缘光 emissive tint rim`;
    typeRow.innerHTML = `<span class="label">效果类型</span>`;
    const typeSelect = document.createElement('select');
    typeSelect.style.flex = '1';
    typeSelect.style.background = '#000';
    typeSelect.style.color = '#d4b060';
    typeSelect.style.border = '1px solid #d4b06044';
    typeSelect.style.fontFamily = 'inherit';
    typeSelect.style.fontSize = '10px';
    typeSelect.style.padding = '2px';

    const types = ['无', '自发光', '染色', '边缘光', 'SSS'];
    types.forEach((tName, val) => {
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = tName;
      typeSelect.appendChild(opt);
    });
    typeSelect.value = String(params[typeKey] ?? 0);
    typeSelect.addEventListener('change', () => {
      const val = parseInt(typeSelect.value, 10);
      this._decal.applyPreset({ [typeKey]: val } as any, 0);
      this._saveDraft();
    });

    this._selectRefs.set(typeKey, typeSelect);
    typeRow.appendChild(typeSelect);
    content.appendChild(typeRow);

    const colorKeys: [string, string, string] = [`mask${ch}_colorR`, `mask${ch}_colorG`, `mask${ch}_colorB`];
    content.appendChild(this._createColorRow({ label: '通道颜色', keys: colorKeys }, params));
    content.appendChild(this._createSliderRow({ key: `mask${ch}_strength`, label: '强度', min: 0, max: 5, step: 0.05 }, params));
    content.appendChild(this._createSliderRow({ key: `mask${ch}_noiseCoupling`, label: '噪声耦合', min: 0, max: 1, step: 0.01, tip: '发光被噪声流动调制的程度' }, params));

    block.appendChild(head);
    block.appendChild(content);
    return block;
  }

  // ── 基础行构建 ────────────────────────────────────────────────────────────

  private _createSliderRow(def: SliderDef, params: any): HTMLElement {
    const row = document.createElement('div');
    row.className = `row${def.isAdv ? ' adv-only' : ''}`;
    row.dataset['search'] = `${def.label} ${def.key}`.toLowerCase();
    row.dataset['paramKey'] = def.key;
    if (def.tip) row.title = def.tip;

    const label = document.createElement('span');
    label.className = 'label'; label.textContent = def.label;
    label.title = (def.tip ? def.tip + '\n' : '') + '双击恢复默认值';
    label.addEventListener('dblclick', () => this._resetParam(def.key));

    const input = document.createElement('input'); input.type = 'range'; input.className = 'input-range';
    input.min = String(def.min); input.max = String(def.max); input.step = String(def.step);
    const val = params[def.key] ?? 0;
    input.value = String(val);

    const valueEl = document.createElement('input');
    valueEl.type = 'number'; valueEl.className = 'val-input';
    valueEl.step = String(def.step); valueEl.value = Number(val).toFixed(2);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueEl.value = v.toFixed(2);
      this._decal.applyPreset({ [def.key]: v } as any, 0);
      this._updateColorSwatches();
      this._updateDirtyMarks();
      this._saveDraft();
    });

    valueEl.addEventListener('change', () => {
      let v = parseFloat(valueEl.value);
      if (isNaN(v)) v = parseFloat(input.value);
      v = Math.max(def.min, Math.min(def.max, v));
      valueEl.value = v.toFixed(2);
      input.value = String(v);
      this._decal.applyPreset({ [def.key]: v } as any, 0);
      this._updateColorSwatches();
      this._updateDirtyMarks();
      this._saveDraft();
    });

    this._sliderRefs.set(def.key, { input, valueEl, row });
    row.appendChild(label); row.appendChild(input); row.appendChild(valueEl);
    return row;
  }

  private _createColorRow(def: ColorDef, params: any): HTMLElement {
    const container = document.createElement('div');
    container.className = `color-row${def.isAdv ? ' adv-only' : ''}`;
    container.dataset['search'] = `${def.label} ${def.keys.join(' ')}`.toLowerCase();
    if (def.tip) container.title = def.tip;

    const head = document.createElement('div');
    head.className = 'color-header';
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    const label = document.createElement('span');
    label.className = 'label'; label.textContent = def.label;

    this._colorSwatches.set(def.keys.join(','), swatch);
    this._updateSwatch(swatch, def.keys, params);

    head.appendChild(swatch);
    head.appendChild(label);
    head.addEventListener('click', () => container.classList.toggle('expanded'));

    const expand = document.createElement('div');
    expand.className = 'color-expand';

    ['R', 'G', 'B'].forEach((channel, i) => {
      const key = def.keys[i] || '';
      expand.appendChild(this._createSliderRow({ key, label: channel, min: 0, max: 2, step: 0.01 }, params));
    });

    container.appendChild(head);
    container.appendChild(expand);
    return container;
  }

  // ── 改动高亮 / 单参数恢复 ─────────────────────────────────────────────────

  private _resetParam(key: string): void {
    const baseVal = this._baseline[key];
    if (baseVal === undefined || typeof baseVal === 'string') return;
    this._decal.applyPreset({ [key]: baseVal } as any, 0);
    const ref = this._sliderRefs.get(key);
    if (ref) {
      ref.input.value = String(baseVal);
      ref.valueEl.value = Number(baseVal).toFixed(2);
    }
    this._updateColorSwatches();
    this._updateDirtyMarks();
    this._saveDraft();
  }

  private _updateDirtyMarks(): void {
    const params = this._decal.getCurrentParams() as any;
    const dirtyPerSection = new Map<HTMLElement, number>();
    this._sliderRefs.forEach(({ row }, key) => {
      const dirty = this._isDirty(key, params);
      row.classList.toggle('dirty', dirty);
      if (dirty) {
        const sec = row.closest('.collapsible-section:not([data-mask-channel])') as HTMLElement | null;
        if (sec && this._sectionBadges.has(sec)) {
          dirtyPerSection.set(sec, (dirtyPerSection.get(sec) || 0) + 1);
        }
      }
    });
    this._sectionBadges.forEach((badge, sec) => {
      const n = dirtyPerSection.get(sec) || 0;
      badge.textContent = n > 0 ? String(n) : '';
    });
  }

  /** 风格化模型下,把经代码验证为 100% 无效的滑块视觉降权,避免用户怀疑面板卡死。 */
  private _updateModelDimming(materialModel: number): void {
    const isStylized = materialModel >= 0.5;
    this._sliderRefs.forEach(({ row }, key) => {
      if (DEAD_IN_STYLIZED.has(key)) row.classList.toggle('model-dead', isStylized);
    });
    this._colorSwatches.forEach((swatch, keysStr) => {
      const keys = keysStr.split(',');
      if (keys.every(k => DEAD_IN_STYLIZED.has(k))) {
        const container = swatch.closest('.color-row');
        container?.classList.toggle('model-dead', isStylized);
      }
    });
  }

  private _updateSwatch(swatch: HTMLElement, keys: string[], params: any): void {
    const k0 = keys[0] || 'lightR';
    const k1 = keys[1] || 'lightG';
    const k2 = keys[2] || 'lightB';
    const r = Math.min(255, (params[k0] ?? 0) * 255);
    const g = Math.min(255, (params[k1] ?? 0) * 255);
    const b = Math.min(255, (params[k2] ?? 0) * 255);
    swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }

  private _updateColorSwatches(): void {
    const params = this._decal.getCurrentParams() as any;
    this._colorSwatches.forEach((swatch, keysStr) => {
      this._updateSwatch(swatch, keysStr.split(','), params);
    });
  }

  private _setAdv(on: boolean): void {
    this._isAdv = on;
    localStorage.setItem('centerpiece-debug-adv', String(on));
    this._updateVisibility();
  }

  private _updateVisibility(): void {
    if (!this._el) return;
    this._el.querySelectorAll('.adv-only').forEach(el => {
      el.classList.toggle('hidden', !this._isAdv);
    });
  }

  private _applyPreset(key: string): void {
    const preset = CENTERPIECE_PRESETS[key];
    if (!preset) return;
    this._activePreset = key;

    const personaName = this._getActivePersonaName();
    localStorage.setItem(`centerpiece-active-subphase-${personaName}`, key);

    this._refreshBaseline();
    this._decal.applyPreset(presetToParams(preset), PRESET_TRANSITION);

    this._el?.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('active', (c as HTMLElement).dataset['key'] === key);
    });
    setTimeout(() => this.syncUI(), PRESET_TRANSITION * 1000 + 80);
  }

  syncUI(): void {
    const params = this._decal.getCurrentParams() as any;
    this._sliderRefs.forEach(({ input, valueEl }, key) => {
      const v = params[key] ?? 0;
      input.value = String(v);
      valueEl.value = Number(v).toFixed(2);
    });
    this._updateColorSwatches();
    this._updateDirtyMarks();
    this._updateModelDimming(params.materialModel ?? 0);

    if (this._selectRefs) {
      this._selectRefs.forEach((selectEl: HTMLSelectElement, key: string) => {
        const v = params[key] ?? 0;
        selectEl.value = String(v);
      });
    }

    if (this._el) {
      ['R', 'G', 'B'].forEach(ch => {
        const block = this._el!.querySelector(`[data-mask-channel="${ch}"]`) as HTMLElement;
        if (block) {
          const typeKey = `mask${ch}_effectType`;
          const isActive = (params[typeKey] ?? 0) > 0;
          block.classList.toggle('collapsed', !isActive);
        }
      });
    }
  }

  private _getActivePersonaName(): string {
    return personaBridge.getData()?.theme || 'default';
  }

  private _compilePersonaConfig(): any {
    const personaName = this._getActivePersonaName();
    const basePresets = getBasePresetsForPersona(personaName);
    const subKeys = ['rubedo', 'nigredo', 'albedo'];
    const result: Record<string, any> = {};

    subKeys.forEach(key => {
      const rawPreset = basePresets[key];
      const preset = rawPreset ? JSON.parse(JSON.stringify(rawPreset)) : {};
      const draftStr = localStorage.getItem(`centerpiece-preset-${personaName}-${key}`);
      if (draftStr) {
        try {
          const draftObj = JSON.parse(draftStr);
          Object.assign(preset, paramsToPreset(draftObj, preset as any));
        } catch (e) {
          console.error(`[presets] Failed parsing draft for export: ${key}`, e);
        }
      }
      result[key] = preset;
    });

    return result;
  }

  private _saveDraft(): void {
    if (this._abSnapshot) return; // A/B 对比按住期间不落草稿
    const personaName = this._getActivePersonaName();
    const key = this._activePreset;
    localStorage.setItem(`centerpiece-preset-${personaName}-${key}`, JSON.stringify(this._decal.getCurrentParams()));
  }

  private _exportPersonaJson(): void {
    const personaName = this._getActivePersonaName();
    const config = this._compilePersonaConfig();
    const str = JSON.stringify(config, null, 2);

    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${personaName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this._showNotification(`✓ 已下载 ${personaName}.json`);
  }

  private _copyPersonaJson(): void {
    const personaName = this._getActivePersonaName();
    const config = this._compilePersonaConfig();
    const str = JSON.stringify(config, null, 2);

    navigator.clipboard.writeText(str).then(() => {
      this._showNotification(`✓ 已复制 ${personaName}.json`);
    }).catch(err => {
      console.error('Failed to copy persona JSON:', err);
    });
  }

  private _resetDraft(): void {
    const personaName = this._getActivePersonaName();
    const key = this._activePreset;

    localStorage.removeItem(`centerpiece-preset-${personaName}-${key}`);
    loadPresetsForPersona(personaName);
    this._applyPreset(key);
    this._showNotification(`↺ 已恢复 ${personaName}.${key} 为 JSON 默认`);
  }

  public onPersonaChanged(personaName: string): void {
    this._activePreset = localStorage.getItem(`centerpiece-active-subphase-${personaName}`) || 'rubedo';
    this._refreshBaseline();
    this._build();
    this.syncUI();
  }

  private _showNotification(msg: string): void {
    const toast = document.createElement('div');
    toast.className = 'debug-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#d4b060',
      color: '#000',
      padding: '12px 24px',
      borderRadius: '8px',
      zIndex: '100000',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      fontWeight: 'bold',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      border: '1px solid #ffffffaa',
      opacity: '0',
      transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
      transform: 'translateY(12px) scale(0.95)'
    });

    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    }, 10);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px) scale(0.95)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  toggle(): void {
    if (!this._el) return;
    this._visible = !this._visible;
    this._el.style.display = this._visible ? 'block' : 'none';
  }

  destroy(): void {
    if (this._onKey) {
      window.removeEventListener('keydown', this._onKey);
    }
    this._el?.remove();
    this._styleEl?.remove();
    this._el = null;
    this._styleEl = null;
    this._sliderRefs.clear();
    this._selectRefs.clear();
  }
}
