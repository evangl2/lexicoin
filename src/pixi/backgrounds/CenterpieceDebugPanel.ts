import type { CenterpieceDecal } from './CenterpieceDecal';
import { CENTERPIECE_PRESETS, presetToParams, paramsToPreset, loadPresetsForPersona, getBasePresetsForPersona } from './centerpiece-presets';
import { personaBridge } from '../bridges/PersonaBridge';
import { MATCAP_LIBRARY } from './matcap-registry';

interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** 感知曲线:>1 时滑块低值段更精细(值 = min + (max-min)·t^curve),用于粗糙度/曝光/模糊这类感知非线性参数 */
  curve?: number;
  isAdv?: boolean;
  tip?: string;
  visibleWhen?: (params: any) => boolean;
}

interface SliderRef {
  input: HTMLInputElement;
  valueEl: HTMLInputElement;
  row: HTMLElement;
  def: SliderDef;
}

/** 曲线滑块:参数值 → 滑块位置 [0,1] */
function valueToSliderPos(def: SliderDef, v: number): number {
  const t = (v - def.min) / (def.max - def.min);
  return Math.pow(Math.min(1, Math.max(0, t)), 1 / (def.curve ?? 1));
}

/** 曲线滑块:滑块位置 [0,1] → 参数值(不按 step 量化,否则低值段的曲线精细度会被 step 吃掉) */
function sliderPosToValue(def: SliderDef, pos: number): number {
  const v = def.min + (def.max - def.min) * Math.pow(pos, def.curve ?? 1);
  return parseFloat(v.toFixed(4));
}

/** 成对的区间滑块:拖动越过对方时把对方一起推走,禁止下限 > 上限的交叉状态 */
const RANGE_PAIRS: Record<string, { partner: string; role: 'min' | 'max' }> = {
  roughnessMin: { partner: 'roughnessMax', role: 'min' },
  roughnessMax: { partner: 'roughnessMin', role: 'max' },
};

interface ColorDef {
  label: string;
  keys: [string, string, string]; // [R, G, B]
  isAdv?: boolean;
  tip?: string;
  visibleWhen?: (params: any) => boolean;
}

interface SelectOption { value: number; label: string; }

interface SelectDef {
  key: string;
  label: string;
  options: SelectOption[];
  isAdv?: boolean;
  tip?: string;
  visibleWhen?: (params: any) => boolean;
}

interface ToggleDef {
  key: string;
  label: string;
  isAdv?: boolean;
  tip?: string;
  visibleWhen?: (params: any) => boolean;
}

interface SectionDef {
  title: string;
  selects?: SelectDef[];
  toggles?: ToggleDef[];
  sliders?: SliderDef[];
  colors?: ColorDef[];
}

/**
 * 在"风格化"材质模型(materialModel=1)下经代码验证为 100% 无视觉效果的参数键。
 * 这些值仍会被写入 uniform,只是 FRAG_WGSL_V4 的 Stylized 分支不消费它们(见 ADR-006)。
 * 不含粗糙度/金属度/F0/副光等——它们经环境反射/漫反射通道仍有效果,标记会误导。
 */
const DEAD_IN_STYLIZED = new Set([
  'specStrength', 'specColorR', 'specColorG', 'specColorB',
  'curvatureScale', 'curvatureBoost',
]);

// ─── 材质页(V4 管线 / 资材调理 / PBR / 发光 / 噪声) ───────────────────────────

const MATERIAL_SECTIONS: SectionDef[] = [
  {
    title: 'V4 管线',
    selects: [
      { key: 'shaderVersion', label: '渲染管线', options: [{ value: 0, label: '旧版 v3(gamma 空间)' }, { value: 1, label: '新版 v4(线性+色调映射)' }], tip: '用于新旧对比' },
      { key: 'materialModel', label: '材质模型', options: [{ value: 0, label: 'PBR 物理光照' }, { value: 1, label: '风格化手绘' }], tip: 'PBR = 宝石/血肉/植物/金属;风格化 = 手绘/纸板/少女(无物理高光)' },
      { key: 'tonemapMode', label: '色调映射', options: [{ value: 0, label: '无(会死白)' }, { value: 1, label: 'Reinhard' }, { value: 2, label: 'ACES(推荐)' }], tip: '高光的滚落方式' },
    ],
    sliders: [
      { key: 'envStrength', label: '环境反射', min: 0, max: 3, step: 0.05, curve: 2, tip: 'matcap 环境光泽。金属感/宝石感/釉面感的关键,从 0 慢慢加' },
      { key: 'envRoughFade', label: '反射粗糙衰减', min: 0, max: 1, step: 0.01, isAdv: true, tip: '表面越粗糙,环境反射被削弱得越多' },
      { key: 'envUniformity', label: '反射均匀度', min: 0, max: 1, step: 0.01, isAdv: true, tip: '0=物理正确(非金属只剩微弱反射) / 1=均匀放行。宝石/釉面等非金属材质调高更漂亮' },
      { key: 'ditherStrength', label: '去色带强度', min: 0, max: 2, step: 0.05, isAdv: true, tip: '消除暗部渐变色带的人眼不可见噪声,正常保持默认' },
      { key: 'rampSoftness', label: '色阶柔化', min: 0, max: 1, step: 0.01, isAdv: true, tip: '仅风格化模型:0=硬色阶(卡通描边感) / 1=平滑过渡(默认,需调低才看得出色阶数效果)' },
      { key: 'rampSteps', label: '色阶数', min: 1, max: 8, step: 1, isAdv: true, tip: '仅风格化模型:明暗分几档,2~3 档最有手绘感' },
    ],
    toggles: [
      { key: 'unpremultiply', label: '边缘修正', isAdv: true, tip: '反预乘 alpha,修复边缘暗圈。正常保持开启' },
    ],
  },
  {
    title: '资材调理',
    toggles: [
      { key: 'normalFlipX', label: '法线翻转 X', tip: '鼠标向左移、高光却向右跑 → 打开' },
      { key: 'normalFlipY', label: '法线翻转 Y', tip: '鼠标向上移、光照却向下倾 → 打开' },
      { key: 'heightInvert', label: '高度反转', tip: '浮雕的凹凸感觉反了(该凸的凹)→ 打开' },
    ],
    sliders: [
      { key: 'normalBiasX', label: '法线偏置 X', min: -0.3, max: 0.3, step: 0.005, tip: '校正推理法线的整体左右倾斜' },
      { key: 'normalBiasY', label: '法线偏置 Y', min: -0.3, max: 0.3, step: 0.005, tip: '校正推理法线的整体上下倾斜。当前资材实测偏置约 +0.10,可从这里试' },
      { key: 'curvatureScale', label: '曲率灵敏度', min: 0, max: 10, step: 0.1, isAdv: true, tip: '法线变化剧烈的边缘被判定为"棱角"的灵敏度(仅 PBR 模型生效,风格化模型下无效)' },
      { key: 'curvatureBoost', label: '曲率增光', min: 0, max: 5, step: 0.05, isAdv: true, tip: '棱角处的高光额外增强量(仅 PBR 模型生效,风格化模型下无效)' },
      { key: 'emissiveNoiseGain', label: '发光噪声增益', min: 0, max: 10, step: 0.1, isAdv: true, tip: '发光层噪声调制的总增益(旧版硬编码 5.0)' },
      { key: 'emissiveEdgeWidth', label: '发光边缘宽度', min: 0, max: 0.1, step: 0.001, isAdv: true, tip: '发光图案边缘的羽化宽度(旧版硬编码 0.015)' },
    ],
  },
  {
    title: '系统与基色',
    sliders: [
      { key: 'exposure', label: '曝光', min: 0, max: 5, step: 0.05, curve: 2, tip: '整体亮度,在色调映射之前作用' },
      { key: 'baseAlpha', label: '整体透明度', min: 0, max: 1, step: 0.01 },
      { key: 'alphaClip', label: '裁切阈值', min: 0, max: 1, step: 0.01, isAdv: true, tip: '低于此透明度的像素直接丢弃' },
      { key: 'diffuseSaturation', label: '饱和度', min: 0, max: 2, step: 0.05 },
    ],
    colors: [
      { label: '基色染色', keys: ['diffuseTintR', 'diffuseTintG', 'diffuseTintB'], tip: '整体乘在贴图颜色上的染色' },
    ],
  },
  {
    title: 'PBR 材质',
    sliders: [
      { key: 'roughnessMin', label: '粗糙度下限', min: 0, max: 1, step: 0.01, tip: '贴图粗糙度被重映射到 [下限,上限] 区间' },
      { key: 'roughnessMax', label: '粗糙度上限', min: 0, max: 1, step: 0.01 },
      { key: 'roughnessContrast', label: '粗糙度对比', min: 0.1, max: 5, step: 0.1, isAdv: true },
      { key: 'roughnessBias', label: '粗糙度偏移', min: -1, max: 1, step: 0.01, isAdv: true },
      { key: 'specStrength', label: '高光强度', min: 0, max: 10, step: 0.1, curve: 2, tip: '仅 PBR 模型生效,风格化模型下无物理高光' },
      { key: 'f0Dielectric', label: 'F0 反射率', min: 0, max: 1, step: 0.01, isAdv: true, tip: '非金属的基础反射率,常规 0.04' },
      { key: 'fresnelPower', label: '菲涅尔幂', min: 0.05, max: 3, step: 0.05, isAdv: true, tip: '边缘反射增强的收束程度。俯视视角下高值≈无效,越低越明显' },
      { key: 'specAoMask', label: '高光AO遮罩', min: 0, max: 1, step: 0.01, isAdv: true, tip: '低洼处同时抑制高光/边缘光/环境反射的程度' },
      { key: 'globalMetalness', label: '全局金属度', min: 0, max: 1, step: 0.01, tip: '金属度总开关/乘数,金属反射带上物体本色' },
    ],
    colors: [
      { label: '高光颜色', keys: ['specColorR', 'specColorG', 'specColorB'], tip: '仅 PBR 模型生效,风格化模型下无物理高光' },
    ],
  },
  {
    title: '边缘光与 SSS',
    sliders: [
      { key: 'rimStrength', label: '边缘光强度', min: 0, max: 5, step: 0.05, tip: '轮廓处的描边光' },
      { key: 'rimPower', label: '边缘光收束', min: 1, max: 10, step: 0.1, tip: '值越大,边缘光越贴着轮廓' },
      { key: 'sssStrength', label: 'SSS 强度', min: 0, max: 5, step: 0.05, tip: '次表面散射:玉石/皮肉的透光感' },
    ],
    colors: [
      { label: '边缘光颜色', keys: ['rimColorR', 'rimColorG', 'rimColorB'] },
      { label: 'SSS 颜色', keys: ['sssR', 'sssG', 'sssB'], isAdv: true },
    ],
  },
  {
    title: 'Mask 发光',
    selects: [
      { key: 'maskAnimMode', label: '发光动画模式', options: [{ value: 0, label: '静止' }, { value: 1, label: '呼吸' }, { value: 2, label: '闪烁' }, { value: 3, label: '脉搏' }] },
    ],
    sliders: [
      { key: 'maskIntensity', label: '发光总强度', min: 0, max: 10, step: 0.05, curve: 2, tip: '注意:与各通道强度相乘后被引擎钳制在 5,乘积超过 5 的部分拖了没变化' },
      { key: 'maskAnimDepth', label: '动画幅度', min: 0, max: 3, step: 0.05, tip: '1=现状,越低动画越接近静止,越高越剧烈' },
      { key: 'maskBrightness', label: '亮度', min: -1, max: 1, step: 0.01, isAdv: true },
      { key: 'maskContrast', label: '对比度', min: 0.1, max: 5, step: 0.1, isAdv: true },
      { key: 'maskEdgeSoftness', label: '发光锐度', min: 0, max: 1, step: 0.01, tip: '实为亮度幂次曲线,数值越大发光核心越收缩、越锐利,不是边缘模糊(那是下面的"发光边缘宽度")' },
      { key: 'baseBlur', label: '光晕模糊', min: 0, max: 100, step: 1, curve: 2, tip: '发光层的高斯模糊半径,产生辉光扩散' },
      { key: 'bloomScale', label: '光晕缩放', min: 0.5, max: 2, step: 0.01, isAdv: true },
    ],
  },
  {
    title: '噪声与流动',
    selects: [
      { key: 'noiseBlend', label: '混合模式', options: [{ value: 0, label: '相乘' }, { value: 0.5, label: '插值' }, { value: 1, label: '相加' }], isAdv: true, tip: '两层噪声的混合方式' },
    ],
    sliders: [
      { key: 'noiseScale', label: '噪声1 尺度', min: 0, max: 20, step: 0.1, tip: '0 = 关闭噪声调制' },
      { key: 'noiseScale2', label: '噪声2 尺度', min: 0, max: 20, step: 0.1 },
      { key: 'noiseContrast', label: '噪声对比', min: 0.1, max: 10, step: 0.1 },
      { key: 'noiseSpeedX', label: '流速 X', min: -0.5, max: 0.5, step: 0.005 },
      { key: 'noiseSpeedY', label: '流速 Y', min: -0.5, max: 0.5, step: 0.005 },
    ],
  },
];

// ─── 光照页(光源类型/驱动/副光/浮雕投影/摇曳/环境贴图) ────────────────────────

const LIGHT_SECTIONS: SectionDef[] = [
  {
    title: '光源类型与驱动',
    selects: [
      { key: 'lightType', label: '光源类型', options: [{ value: 0, label: '平行光(太阳)' }, { value: 1, label: '点光(火把)' }], tip: '平行光=整体统一朝向;点光=有位置,近亮远暗,高光随光源在表面滑动' },
      { key: 'lightDrive', label: '驱动方式', options: [{ value: 0, label: '固定' }, { value: 1, label: '自动公转' }, { value: 2, label: '跟随鼠标' }, { value: 3, label: '公转+鼠标混合(默认)' }] },
    ],
    sliders: [
      { key: 'fixedLightAngle', label: '固定方位角', min: 0, max: 360, step: 1, tip: '固定 + 平行光时生效', visibleWhen: p => p.lightDrive === 0 && p.lightType === 0 },
      { key: 'fixedLightX', label: '固定位置 X', min: -1, max: 1, step: 0.01, tip: '固定 + 点光时生效', visibleWhen: p => p.lightDrive === 0 && p.lightType === 1 },
      { key: 'fixedLightY', label: '固定位置 Y', min: -1, max: 1, step: 0.01, tip: '固定 + 点光时生效', visibleWhen: p => p.lightDrive === 0 && p.lightType === 1 },
      { key: 'lightOrbitSpeed', label: '公转速度', min: 0, max: 2, step: 0.01, visibleWhen: p => p.lightDrive === 1 || p.lightDrive === 3 },
      { key: 'lightOrbitRadiusX', label: '公转半径 X', min: 0, max: 2, step: 0.01, isAdv: true, visibleWhen: p => p.lightDrive === 1 || p.lightDrive === 3 },
      { key: 'lightOrbitRadiusY', label: '公转半径 Y', min: 0, max: 2, step: 0.01, isAdv: true, visibleWhen: p => p.lightDrive === 1 || p.lightDrive === 3 },
      { key: 'mouseInfluence', label: '鼠标混合比例', min: 0, max: 1, step: 0.01, tip: '公转与鼠标混合时,鼠标接管的比例', visibleWhen: p => p.lightDrive === 3 },
      { key: 'mouseRange', label: '鼠标灵敏度分母', min: 200, max: 3000, step: 50, isAdv: true, tip: '数值越小,鼠标移动同样距离时光照偏转越大', visibleWhen: p => p.lightDrive === 2 || p.lightDrive === 3 },
      { key: 'lightSmoothing', label: '光照跟随平滑', min: 0, max: 2, step: 0.02, tip: '0=瞬移(现状),越大光追鼠标越慢越柔', visibleWhen: p => p.lightDrive === 2 || p.lightDrive === 3 },
      { key: 'pointFalloffRadius', label: '点光衰减半径', min: 0.05, max: 2, step: 0.01, tip: '光照影响范围', visibleWhen: p => p.lightType === 1 },
      { key: 'pointFalloffCurve', label: '点光衰减曲线', min: 0.2, max: 8, step: 0.1, isAdv: true, tip: '大=追光硬边,小=油灯柔晕', visibleWhen: p => p.lightType === 1 },
    ],
  },
  {
    title: '光照与表面',
    selects: [
      { key: 'parallaxFollow', label: '视差跟随', options: [{ value: 0, label: '跟随光(现状)' }, { value: 1, label: '跟随鼠标' }], tip: '下方"视差"滑块的驱动来源' },
    ],
    sliders: [
      { key: 'lightStrength', label: '主光强度', min: 0, max: 5, step: 0.1 },
      { key: 'lightHeight', label: '光源高度', min: 0, max: 5, step: 0.1, isAdv: true, tip: '越低,掠射角越大、立体感越强' },
      { key: 'ambientStrength', label: '环境光强度', min: 0, max: 1, step: 0.01, tip: '无方向的底光,防止暗部死黑' },
      { key: 'diffuse', label: '漫反射强度', min: 0, max: 3, step: 0.05 },
      { key: 'diffuseWrap', label: '漫反射包裹', min: 0, max: 1, step: 0.05, isAdv: true, tip: '光绕到背光面的程度,值大显得柔软' },
      { key: 'bumpX', label: '凹凸强度 X', min: 0, max: 5, step: 0.05, tip: '法线凹凸感的横向强度' },
      { key: 'bumpY', label: '凹凸强度 Y', min: 0, max: 5, step: 0.05, isAdv: true },
      { key: 'parallax', label: '视差', min: 0, max: 0.1, step: 0.002, tip: '光/鼠标移动时纹理的立体滑动量,过大会糊;驱动来源见上方"视差跟随"' },
      { key: 'ao', label: '高度 AO', min: 0, max: 1, step: 0.01, tip: '低洼处压暗。高度图不可靠时先归零' },
      { key: 'cavityStrength', label: '深缝阴影', min: 0, max: 1, step: 0.01, isAdv: true, tip: '同时压暗底色与高光' },
    ],
    colors: [
      { label: '主光颜色', keys: ['lightR', 'lightG', 'lightB'], isAdv: true },
      { label: '环境光颜色', keys: ['ambientR', 'ambientG', 'ambientB'], isAdv: true },
    ],
  },
  {
    title: '副光',
    toggles: [
      { key: 'fillLightAutoOppose', label: '自动对位主光', tip: '开:副光自动待在主光对面,同高度' },
    ],
    sliders: [
      { key: 'fillLightStrength', label: '副光强度', min: 0, max: 3, step: 0.02, tip: '0=关(现状)' },
      { key: 'fillLightAngle', label: '副光方位角', min: 0, max: 360, step: 1, tip: '关闭自动对位时生效', visibleWhen: p => !p.fillLightAutoOppose },
    ],
    colors: [
      { label: '副光颜色', keys: ['fillLightColorR', 'fillLightColorG', 'fillLightColorB'], isAdv: true },
    ],
  },
  {
    title: '浮雕投影',
    sliders: [
      { key: 'reliefShadowStrength', label: '投影强度', min: 0, max: 1, step: 0.01, tip: '0=关(现状)' },
      { key: 'reliefShadowLength', label: '投影长度', min: 0, max: 0.1, step: 0.002, isAdv: true },
      { key: 'reliefShadowSoftness', label: '投影柔度', min: 0, max: 1, step: 0.01, isAdv: true },
    ],
  },
  {
    title: '摇曳与感应',
    sliders: [
      { key: 'lightFlickerAmp', label: '摇曳幅度', min: 0, max: 1, step: 0.01, tip: '0=关(现状),模拟火光颤动' },
      { key: 'lightFlickerSpeed', label: '摇曳速度', min: 0.1, max: 5, step: 0.05, isAdv: true },
      { key: 'hoverGlowRadius', label: '接近发光半径', min: 0, max: 500, step: 10, tip: '0=关(现状),世界单位;鼠标越靠近法阵中心发光越强' },
      { key: 'hoverGlowStrength', label: '接近发光强度', min: 0, max: 3, step: 0.05, isAdv: true },
    ],
  },
  {
    title: '环境贴图',
    // 特殊块:圆形缩略图网格,见 _buildMatcapGrid,不用 sliders/colors 表达
  },
];

const COMMON_MATERIAL_KEYS = ['exposure', 'diffuseSaturation', 'bumpX', 'specStrength', 'maskIntensity'];
const COMMON_LIGHT_KEYS = ['lightStrength', 'ambientStrength', 'envStrength', 'mouseRange'];

// ─── 参数隔离测试(临时工具页) ─────────────────────────────────────────────────
//
// 目的:一键把"其它所有参数"改成最适合观察某个目标参数的中性环境,
// 消除光源乱动/噪声流动/发光呼吸等干扰,让非专业用户也能看清单个参数在干什么。
// 进入测试前全量快照,退出时恢复;测试期间草稿写盘与撤销栈全部挂起,不污染调参数据。

interface IsolationTest {
  id: string;
  group: string;
  title: string;
  /** 测试目标:在测试页内直接给出这些滑块(必须能在 MATERIAL/LIGHT_SECTIONS 里找到定义) */
  targets: string[];
  /** 在基准环境之上的追加覆盖 */
  env?: Record<string, number>;
  /** 目标参数的起始值(让效果一进来就可见) */
  start?: Record<string, number>;
  /** 拖动目标滑块时的预期效果说明 */
  expect: string;
}

/**
 * 基准测试环境:固定单光源 + 关掉一切动态与叠加通道的"素模"状态。
 * 注意不触碰资材校正项(normalFlip/normalBias/heightInvert)——它们是per资材的标定,测试应尊重现状。
 */
const BASE_TEST_ENV: Record<string, number> = {
  shaderVersion: 1, materialModel: 0, tonemapMode: 2,
  exposure: 1.0, baseAlpha: 1, diffuseSaturation: 1,
  diffuseTintR: 1, diffuseTintG: 1, diffuseTintB: 1,
  lightType: 0, lightDrive: 0, fixedLightAngle: 45,
  lightStrength: 1.5, lightHeight: 1.0, lightR: 1, lightG: 1, lightB: 1,
  ambientStrength: 0.25, ambientR: 1, ambientG: 1, ambientB: 1,
  diffuse: 1.0, diffuseWrap: 0,
  bumpX: 1, bumpY: 1, parallax: 0, ao: 0, cavityStrength: 0,
  lightFlickerAmp: 0, fillLightStrength: 0, reliefShadowStrength: 0,
  hoverGlowRadius: 0,
  envStrength: 0, specStrength: 0, rimStrength: 0, sssStrength: 0,
  globalMetalness: 0, specAoMask: 0,
  curvatureScale: 0, curvatureBoost: 0,
  roughnessMin: 0.2, roughnessMax: 0.7, roughnessContrast: 1, roughnessBias: 0,
  maskIntensity: 0, baseBlur: 0, maskAnimMode: 0,
  noiseScale: 0, noiseScale2: 0, noiseSpeedX: 0, noiseSpeedY: 0,
};

/** 发光类测试共用的"压暗场景"环境 */
const DARK_SCENE = { ambientStrength: 0.05, diffuse: 0.25, lightStrength: 0.4 };

/**
 * 发光类测试共用:压暗场景 + 归一化发光链路。
 * 通道强度钉在 1(引擎把 总强度×通道强度 的乘积钳制在 5,预设通道强度偏高时,
 * 总强度滑块从 1 起就全程被钳平——这正是第一轮测试"1~10 没差别"的原因);
 * 噪声增益钉在 1(默认 5 会把发光推到过曝,任何调制都被白色淹没看不见)。
 */
const EMISSIVE_ENV = {
  ...DARK_SCENE,
  maskR_effectType: 1,
  maskR_strength: 1, maskG_strength: 1, maskB_strength: 1,
  maskR_noiseCoupling: 0, maskG_noiseCoupling: 0, maskB_noiseCoupling: 0,
  maskBrightness: 0, maskContrast: 1, maskEdgeSoftness: 0, emissiveEdgeWidth: 0.015,
  emissiveNoiseGain: 1, maskAnimSpeed: 2,
};

/** 诊断视图选项(uV4D.y → FRAG_WGSL_V4 的调试早退分支) */
const DIAG_VIEWS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: '关闭(正常渲染)', hint: '' },
  { value: 1, label: '高度图', hint: '应看到黑白浮雕纹理。一片纯灰或纯黑 = 高度通道没进 shader 或数据损坏。' },
  { value: 2, label: '视差驱动向量', hint: '在法阵上移动鼠标(需先进入「视差」测试,或把视差跟随设为鼠标),红绿颜色应随鼠标位置变化。颜色纹丝不动 = 鼠标数据没送到 shader,是管线 bug。' },
  { value: 3, label: '浮雕投影因子', hint: '先进入「浮雕投影」测试再切此视图:浮雕边缘应出现黑色条纹(被遮挡区域)。整片纯白 = 遮挡计算结果为零。' },
  { value: 4, label: '视差偏移量×20', hint: '先进入「视差」测试再切此视图:移动鼠标时红绿亮度应明显波动。全黑不动 = 视差偏移恒为零。' },
];

const ISOLATION_TESTS: IsolationTest[] = [
  // ── 光照与立体感 ──
  {
    id: 'bump', group: '光照与立体感', title: '凹凸强度',
    targets: ['bumpX', 'bumpY'],
    env: { lightHeight: 0.6, diffuse: 1.3 },
    expect: '拖高:表面浮雕的明暗对比增强,石刻感变深;拖到 0:整个表面变成一张平面贴纸。若凹凸方向感觉相反(该凸的地方凹下去),不是这里的问题,去「资材调理」开高度反转/法线翻转。',
  },
  {
    id: 'lightHeight', group: '光照与立体感', title: '光源高度',
    targets: ['lightHeight'],
    env: { bumpX: 2, bumpY: 2, specStrength: 1.5 },
    expect: '拖低:光贴着表面掠射,浮雕阴影拉长、立体感最强;拖高:光从头顶垂直照下,表面变平变亮。这是"傍晚斜阳"和"正午顶光"的区别。',
  },
  {
    id: 'parallax', group: '光照与立体感', title: '视差',
    targets: ['parallax'],
    env: { parallaxFollow: 1, mouseRange: 600, bumpX: 1.5, bumpY: 1.5 },
    start: { parallax: 0.05 },
    expect: '重要:鼠标停在这个面板上时,画布收不到鼠标位置,视差是冻结的——拖完滑块必须把鼠标移回法阵上左右横扫才能看到效果。正常应看到纹理随鼠标产生立体错位(高处动得多、低处动得少);已预置 0.05 起步。横扫仍纹丝不动才算真无效,请回报。',
  },
  {
    id: 'aoCavity', group: '光照与立体感', title: '高度 AO 与深缝阴影',
    targets: ['ao', 'cavityStrength'],
    env: { ambientStrength: 0.5, diffuse: 0.8 },
    start: { ao: 0.5 },
    expect: '拖高「高度 AO」:低洼和缝隙处变暗,体积感增强;「深缝阴影」进一步压暗最深的缝(连高光一起压)。若变暗的位置不对(凸起处反而变暗),说明高度图不可靠,应归零弃用。',
  },
  {
    id: 'reliefShadow', group: '光照与立体感', title: '浮雕投影',
    targets: ['reliefShadowStrength', 'reliefShadowLength', 'reliefShadowSoftness'],
    env: { lightHeight: 0.4, bumpX: 1.5, bumpY: 1.5 },
    start: { reliefShadowStrength: 1.0, reliefShadowLength: 0.06 },
    expect: '浮雕凸起的背光一侧应拖出一条小投影,像午后阳光下的石刻。「强度」=影子深浅,「长度」=影子拖多远,「柔度」=影子边缘的虚实。已按最大可见度起步(强度 1、长度 0.06)。这个效果要求高度图在短距离内有陡峭落差:若拉满仍看不到影子,结论是当前高度图坡度太平缓,此功能对这套资材无意义,不必再调。',
  },
  {
    id: 'diffuseWrap', group: '光照与立体感', title: '漫反射包裹',
    targets: ['diffuseWrap'],
    env: { ambientStrength: 0.05, diffuse: 1.2, lightHeight: 0.8 },
    expect: '环境光已压到接近 0。拖高:光"绕"到背光面,明暗交界变柔,材质显得像布料/蜡/皮肤;拖到 0:背光面死黑,显得硬(石头/金属)。',
  },
  // ── 高光与反射(PBR) ──
  {
    id: 'roughness', group: '高光与反射(PBR)', title: '粗糙度区间',
    targets: ['roughnessMin', 'roughnessMax'],
    env: { specStrength: 4, envStrength: 1.5, envRoughFade: 1, lightHeight: 0.6 },
    start: { roughnessMin: 0.05, roughnessMax: 0.4 },
    expect: '两个滑块把贴图的粗糙度重映射到 [下限,上限]。同时盯两个东西:高光斑(低=锐利小亮点,高=散成大片柔光)和 matcap 环境光泽(反射粗糙衰减已拉满,粗糙度越高环境反射消失得越彻底)。把上下限一起拖到 0.9 以上:两者都应基本消失。若全程变化仍轻微,说明贴图粗糙度通道本身接近纯色,重映射自然做不出戏。',
  },
  {
    id: 'spec', group: '高光与反射(PBR)', title: '高光强度',
    targets: ['specStrength'],
    env: { diffuse: 0.6, roughnessMin: 0.15, roughnessMax: 0.5 },
    start: { specStrength: 2 },
    expect: '漫反射已调暗以突出高光。画面上应有一个明确的高光亮斑,拖动时只有亮斑的亮度在变、其余不动。完全看不到亮斑?本测试已强制 PBR 模型,那就检查资材的粗糙度通道是否全白。',
  },
  {
    id: 'fresnel', group: '高光与反射(PBR)', title: '菲涅尔与 F0',
    targets: ['fresnelPower', 'f0Dielectric'],
    env: { envStrength: 2, envUniformity: 1, specStrength: 1, roughnessMin: 0.05, roughnessMax: 0.3 },
    start: { fresnelPower: 0.3 },
    expect: '菲涅尔=物体边缘比正面更反光的物理现象。已把菲涅尔幂预置到最低档 0.3(边缘反光带最宽)。「菲涅尔幂」拖高:反光带收窄到几乎消失。「F0 反射率」从 0.04 拖到 1:整体基础反射大幅抬升,像镀了层膜。说明:本项目是俯视视角,法线大多正对镜头,菲涅尔天生就弱——"效果别扭/轻微"很大程度是物理事实,不是坏了;它主要在法线倾斜剧烈的浮雕边缘起作用。',
  },
  {
    id: 'metalness', group: '高光与反射(PBR)', title: '全局金属度',
    targets: ['globalMetalness'],
    env: { envStrength: 1.5, specStrength: 2, roughnessMin: 0.1, roughnessMax: 0.45, hrbaB_route: 0, hrbaMetalnessEnabled: 0 },
    expect: '从 0 拖到 1:漫反射颜色逐渐变暗、环境反射逐渐带上物体本色——这就是石头变金属的过程。贴图金属度路由已临时关闭,此滑块全权控制。',
  },
  {
    id: 'env', group: '高光与反射(PBR)', title: '环境反射(matcap)',
    targets: ['envStrength', 'envUniformity'],
    env: { specStrength: 0, roughnessMin: 0.05, roughnessMax: 0.3, globalMetalness: 0.5 },
    expect: '物理高光已关闭,只剩环境反射通道。「环境反射」从 0 拖高:表面浮现 matcap 环境光泽(釉面/宝石感)。「均匀度」拖到 1:非金属区域也全额吃到反射,更华丽但物理不正确。可去「环境贴图」分区换 matcap 对比。',
  },
  // ── 轮廓与透光 ──
  {
    id: 'rim', group: '轮廓与透光', title: '边缘光',
    targets: ['rimStrength', 'rimPower'],
    env: { ambientStrength: 0.08, diffuse: 0.5, lightStrength: 0.8 },
    start: { rimStrength: 1.5 },
    expect: '场景已调暗。物体轮廓应出现一圈描边光。「强度」控制亮度;「收束」拖高光圈变细、紧贴轮廓,拖低光圈往内部漫开。',
  },
  {
    id: 'sss', group: '轮廓与透光', title: '次表面散射(SSS)',
    targets: ['sssStrength'],
    env: { hrbaA_route: 1, hrbaSssEnabled: 1, ambientStrength: 0.1, diffuse: 0.6 },
    start: { sssStrength: 2 },
    expect: 'SSS=光从物体内部透出来的感觉(玉石/耳垂/血肉)。拖高:薄的部位应透出 SSS 颜色。贴图 A 通道已临时路由为 SSS 厚度遮罩;若毫无变化,说明当前资材 A 通道没有厚度数据,该参数对这套资材无意义。',
  },
  // ── 发光层 ──
  {
    id: 'maskIntensity', group: '发光层', title: '发光总强度',
    targets: ['maskIntensity'],
    env: { ...EMISSIVE_ENV },
    start: { maskIntensity: 1 },
    expect: '场景已压暗、通道强度已归一。拖动:发光图案整体亮暗,0~5 全程应有变化。5 以上无变化是引擎钳制(总强度×通道强度的乘积上限 5),属正常。第一轮测试"1~10 没差别"就是因为预设通道强度偏高,乘积从 1 起就顶到了钳制,这次已修正。',
  },
  {
    id: 'bloom', group: '发光层', title: '光晕(辉光扩散)',
    targets: ['baseBlur', 'bloomScale'],
    env: { ...EMISSIVE_ENV, maskIntensity: 2 },
    start: { baseBlur: 40 },
    expect: '「光晕模糊」拖到 0:发光变成硬边贴纸;拖高:边缘向外扩散出柔和辉光(霓虹感)。「光晕缩放」0.5~2 直接缩放辉光层大小,应非常显眼。注意:模糊半径按镜头缩放折算,镜头拉得很远时整体都小,请先放大镜头再拖。若放大后拖「光晕缩放」仍无任何变化,请回报——那说明辉光层可能整个没在渲染,是管线问题。',
  },
  {
    id: 'noiseFlow', group: '发光层', title: '噪声流动',
    targets: ['noiseScale', 'noiseContrast', 'noiseSpeedX', 'noiseSpeedY'],
    env: { ...EMISSIVE_ENV, maskIntensity: 1.5, maskR_noiseCoupling: 1, noiseScale2: 3.5, noiseBlend: 0.5 },
    start: { noiseScale: 6, noiseSpeedX: 0.05, noiseSpeedY: 0.03 },
    expect: '发光图案上应有缓慢流动的明暗斑纹(暗斑是噪声"咬"出来的洞)。「尺度」=斑纹粗细,「对比」=明暗反差,「流速」=流动方向快慢;尺度拖到 0 = 彻底关闭噪声,发光变均匀。第一轮看不见是因为噪声增益默认 5 把发光推到全面过曝,斑纹全被白光淹了;本环境已把增益归一。',
  },
  {
    id: 'maskEdge', group: '发光层', title: '发光锐度与边缘',
    targets: ['maskEdgeSoftness', 'emissiveEdgeWidth'],
    env: { ...EMISSIVE_ENV, maskIntensity: 1.5 },
    expect: '「发光锐度」拖高:发光核心收缩、变锐利(它是亮度幂次,不是模糊);「发光边缘宽度」控制图案边缘的羽化,数值很小,一点点拖。注意:这两个都只对 Mask 图里有灰度过渡的区域起作用,若 Mask 图案本身是非黑即白的硬边图形,几乎看不出变化——那是资材特性,不是参数坏了。',
  },
  {
    id: 'breath', group: '发光层', title: '呼吸动画幅度',
    targets: ['maskAnimDepth'],
    env: { ...EMISSIVE_ENV, maskIntensity: 1.5, maskAnimMode: 1 },
    expect: '发光动画已设为「呼吸」,通道强度已归一(第一轮无变化是因为强度乘积顶到钳制上限,呼吸的起伏全被削平了)。拖到 0:完全静止;1:标准起伏;3:剧烈到接近熄灭再亮起。盯着看 5 秒以上,呼吸周期约 4~8 秒。',
  },
  // ── 风格化与全局 ──
  {
    id: 'ramp', group: '风格化与全局', title: '风格化色阶',
    targets: ['rampSteps', 'rampSoftness'],
    env: { materialModel: 1, diffuse: 1.2, ambientStrength: 0.15 },
    start: { rampSoftness: 0.15, rampSteps: 3 },
    expect: '已切到风格化手绘模型。「色阶数」=明暗分几档,2~3 档最有手绘感;「柔化」拖高档与档之间的过渡变平滑,拖到 1 就完全看不出分档了(所以柔化已先调低)。',
  },
  {
    id: 'exposure', group: '风格化与全局', title: '曝光与色调映射',
    targets: ['exposure'],
    env: { specStrength: 2, envStrength: 1 },
    expect: '整体亮度,作用在色调映射之前。拖高:画面变亮,但最亮处应被 ACES 平滑"滚落"而不是糊成死白。想看什么叫死白,去「V4 管线」把色调映射切成「无」再拖一次曝光。',
  },
];

function findSliderDef(key: string): SliderDef | undefined {
  for (const sec of [...MATERIAL_SECTIONS, ...LIGHT_SECTIONS]) {
    const found = sec.sliders?.find(s => s.key === key);
    if (found) return found;
  }
  return undefined;
}

/** preset 切换的固定过渡时长(调参场景要即时反馈,不用可输入的秒数) */
const PRESET_TRANSITION = 0.35;

const PANEL_STYLES = `
  #centerpiece-debug-panel {
    position: fixed; top: 16px; right: 16px; width: 380px; max-height: 94vh; overflow-y: auto;
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

  .tab-bar { display: flex; gap: 4px; padding: 8px 16px 0; }
  .tab-btn {
    flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(180,140,60,0.2);
    border-bottom: none; color: #e0d0b0; opacity: 0.55; padding: 6px 4px; font-size: 10px; font-weight: 700;
    cursor: pointer; border-radius: 6px 6px 0 0; font-family: inherit; transition: all 0.15s;
  }
  .tab-btn:hover { opacity: 0.85; }
  .tab-btn.active { opacity: 1; background: rgba(180,140,60,0.18); border-color: rgba(180,140,60,0.5); }
  .tab-content { display: block; }
  .tab-content.hidden-tab { display: none; }
  .tab-placeholder { padding: 32px 16px; text-align: center; opacity: 0.5; font-size: 11px; line-height: 1.7; }

  .toolbar { display: flex; gap: 6px; padding: 10px 16px 6px; align-items: center; }
  .search-box {
    flex: 1; min-width: 0; background: rgba(0,0,0,0.35); border: 1px solid rgba(180,140,60,0.3);
    color: #e0d0b0; border-radius: 6px; padding: 5px 8px; font-family: inherit; font-size: 10px;
  }
  .search-box:focus { border-color: #d4b060; outline: none; }
  .icon-btn, .ab-btn {
    background: rgba(180,140,60,0.15); border: 1px solid rgba(180,140,60,0.4);
    color: #d4b060; border-radius: 6px; padding: 5px 9px; font-size: 12px; font-weight: 800;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
  }
  .icon-btn:hover, .ab-btn:hover { background: rgba(180,140,60,0.3); }
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
  .common-section { background: rgba(180,140,60,0.05); }
  .section-header {
    padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; background: rgba(0,0,0,0.2); transition: background 0.2s;
  }
  .section-header:hover { background: rgba(180,140,60,0.05); }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.8; cursor: pointer; }
  .section-actions { display: flex; align-items: center; gap: 8px; }
  .sec-reset-btn {
    background: none; border: none; color: #d4b060; opacity: 0.45; cursor: pointer; font-size: 12px; padding: 0 2px;
  }
  .sec-reset-btn:hover { opacity: 1; }
  .dirty-badge {
    display: inline-block; margin-left: 6px; padding: 0 5px; border-radius: 8px;
    background: rgba(212,176,96,0.25); color: #ffd685; font-size: 9px; font-weight: 800;
  }
  .dirty-badge:empty { display: none; }
  .section-chevron { transition: transform 0.3s; opacity: 0.5; cursor: pointer; }
  .collapsible-section.collapsed .section-chevron { transform: rotate(-90deg); }
  .section-content { padding: 4px 0 12px; display: block; }
  .collapsible-section.collapsed .section-content { display: none; }

  .row { display: flex; align-items: center; gap: 8px; padding: 3px 16px; min-height: 20px; }
  .label { width: 110px; opacity: 0.7; font-size: 10px; cursor: pointer; }
  .row.dirty > .label, .color-row.dirty .label { color: #ffd685; opacity: 1; font-weight: 700; }
  .row.dirty > .label::before { content: '●'; font-size: 7px; margin-right: 3px; vertical-align: 1px; }
  .input-range { flex: 1; accent-color: #d4b060; height: 3px; cursor: pointer; }
  .val-input {
    width: 50px; text-align: right; font-weight: bold; font-variant-numeric: tabular-nums;
    opacity: 0.9; background: rgba(0,0,0,0.3); border: 1px solid rgba(180,140,60,0.3);
    color: #e0d0b0; border-radius: 4px; padding: 2px 4px; font-family: inherit; font-size: 10px;
  }
  .val-input:focus { border-color: #d4b060; outline: none; background: rgba(0,0,0,0.5); }
  .val-input::-webkit-outer-spin-button, .val-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

  .toggle-checkbox { width: 15px; height: 15px; accent-color: #d4b060; cursor: pointer; margin-left: auto; }

  .select-input {
    flex: 1; background: #000; color: #d4b060; border: 1px solid rgba(180,140,60,0.3);
    border-radius: 4px; padding: 3px 4px; font-family: inherit; font-size: 10px;
  }

  .color-row { padding: 4px 16px; }
  .color-header { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .color-swatch {
    width: 22px; height: 18px; padding: 0; border-radius: 4px; background: none;
    border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;
  }
  .color-swatch::-webkit-color-swatch-wrapper { padding: 0; }
  .color-swatch::-webkit-color-swatch { border: none; border-radius: 3px; }
  .icon-btn.pin-active { background: #d4b060; color: #000; }
  .color-expand { display: none; padding: 4px 0 4px 8px; border-left: 2px solid rgba(180,140,60,0.2); margin-top: 4px; }
  .color-row.expanded .color-expand { display: block; }

  .hidden { display: none !important; }
  .cond-hidden { display: none !important; }
  .row.model-dead, .color-row.model-dead { opacity: 0.32; }
  .row.model-dead > .label::after { content: ' 🚫'; }
  .color-row.model-dead .label::after { content: ' 🚫'; }
  .search-miss { display: none !important; }
  #centerpiece-debug-panel.searching .section-content { display: block !important; }
  #centerpiece-debug-panel.searching .preset-grid,
  #centerpiece-debug-panel.searching .hint-bar { display: none; }

  .matcap-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 8px 16px 12px; }
  .matcap-item {
    aspect-ratio: 1; border-radius: 50%; border: 2px solid rgba(180,140,60,0.25);
    background-size: cover; background-position: center; cursor: pointer; transition: all 0.15s;
  }
  .matcap-item:hover { border-color: rgba(180,140,60,0.6); transform: scale(1.06); }
  .matcap-item.active { border-color: #d4b060; box-shadow: 0 0 8px rgba(212,176,96,0.6); }
  .matcap-hint { grid-column: 1 / -1; font-size: 9px; opacity: 0.5; line-height: 1.5; padding: 4px 0; }

  .action-bar { display: grid; grid-template-columns: 1fr 1fr 40px; gap: 8px; padding: 12px 16px; background: rgba(0,0,0,0.3); }
  .action-btn {
    background: rgba(180,140,60,0.15); border: 1px solid rgba(180,140,60,0.4);
    color: #d4b060; border-radius: 6px; padding: 8px; font-size: 10px; font-weight: 800;
    cursor: pointer; transition: all 0.2s;
  }
  .action-btn:hover { background: #d4b060; color: #000; }
  .reset-btn { font-size: 14px; }

  .confirm-strip {
    display: flex; align-items: center; gap: 8px; padding: 12px 16px;
    background: rgba(180,40,40,0.15); border-top: 1px solid rgba(220,80,80,0.4);
  }
  .confirm-text { flex: 1; font-size: 10px; color: #ffb0b0; }
  .confirm-yes, .confirm-no {
    border: 1px solid rgba(220,80,80,0.5); border-radius: 4px; padding: 5px 10px; font-size: 10px; font-weight: 800;
    cursor: pointer; font-family: inherit;
  }
  .confirm-yes { background: #d44; color: #fff; }
  .confirm-no { background: transparent; color: #e0d0b0; }

  .test-intro { padding: 10px 16px; font-size: 10px; opacity: 0.65; line-height: 1.7; }
  .test-intro b { color: #ffd685; }
  .test-group-title { padding: 10px 16px 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #d4b060; opacity: 0.85; }
  .test-card {
    margin: 0 16px 6px; padding: 7px 10px; background: rgba(255,255,255,0.03);
    border: 1px solid rgba(180,140,60,0.2); border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .test-card:hover { background: rgba(180,140,60,0.12); border-color: rgba(180,140,60,0.5); }
  .test-card-title { font-size: 11px; font-weight: 700; color: #e0d0b0; }
  .test-card-targets { font-size: 9px; opacity: 0.5; margin-top: 2px; }
  .test-active-head { padding: 10px 16px 6px; }
  .test-active-title { font-size: 12px; font-weight: 800; color: #ffd685; }
  .test-expect {
    margin: 0 16px 10px; padding: 10px 12px; background: rgba(180,140,60,0.08);
    border-left: 3px solid #d4b060; border-radius: 0 6px 6px 0;
    font-size: 10px; line-height: 1.8; color: #e8dcc0;
  }
  .test-env-note { margin: 8px 16px 0; font-size: 9px; opacity: 0.5; line-height: 1.6; }
  .test-exit-bar { display: flex; gap: 8px; padding: 10px 16px 14px; }
  .test-exit-bar .action-btn { flex: 1; }
`;

type TabKey = 'material' | 'light' | 'layer' | 'perform' | 'test';

export class CenterpieceDebugPanel {
  private _el: HTMLElement | null = null;
  private _styleEl: HTMLStyleElement | null = null;
  private _visible = true;
  private _isAdv = false;
  private _decal!: CenterpieceDecal;
  private _activePreset = 'rubedo';
  private _activeTab: TabKey = 'material';
  private _onKey?: (e: KeyboardEvent) => void;
  private _sliderRefs: Map<string, SliderRef[]> = new Map();
  private _toggleRefs: Map<string, Array<{ checkbox: HTMLInputElement; row: HTMLElement }>> = new Map();
  private _selectRefs: Map<string, HTMLSelectElement[]> = new Map();
  /** 颜色行引用:取色器 + 强度滑块 + 强度数值框,key 为 RGB 三键 join(',') */
  private _colorRefs: Map<string, { container: HTMLElement; colorInput: HTMLInputElement; intInput: HTMLInputElement; intVal: HTMLInputElement }> = new Map();
  private _sections: HTMLElement[] = [];
  private _sectionBadges: Map<HTMLElement, HTMLElement> = new Map();
  private _conditionalRows: Array<{ el: HTMLElement; test: (params: any) => boolean }> = [];
  /** 当前子阶段的 JSON 基线(不含草稿),用于改动高亮 / 双击恢复 / A-B 对比 / 分区重置 */
  private _baseline: Record<string, any> = {};
  private _abSnapshot: Record<string, any> | null = null;
  /** 📌 手动存的 A/B 对比快照;为 null 时 ⇆ 回退到与 JSON 基线对比 */
  private _abStored: Record<string, any> | null = null;
  private _pinBtn: HTMLElement | null = null;
  /** 撤销环形栈(50 步),每次滑块/下拉/开关/预设提交前推入 */
  private _undoStack: Record<string, any>[] = [];
  /** 草稿写盘防抖定时器(滑块拖动时避免每帧 JSON.stringify + localStorage 写入) */
  private _draftTimer: number | null = null;
  /** preset 过渡结束后的 syncUI 定时器,destroy 时需取消 */
  private _presetTimer: number | null = null;
  /** 各 Mask 通道上次的 effectType,用于只在类型变化时自动展开/收起(不打断用户手动展开) */
  private _lastMaskTypes: Record<string, number> = {};
  /** 参数隔离测试:进入测试前的完整参数快照;非 null 即处于测试模式(草稿/撤销/AB 全部挂起) */
  private _testSnapshot: Record<string, any> | null = null;
  private _activeTestId: string | null = null;
  private _testTabEl: HTMLElement | null = null;
  /** 测试页临时创建的滑块引用,退出/重建时须从 _sliderRefs 摘除 */
  private _testRowRefs: Array<{ key: string; ref: SliderRef }> = [];

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
    this._onKey = (e: KeyboardEvent) => {
      // 焦点在输入控件里时不抢按键:搜索框里要能打反引号,数值框里 Ctrl+Z 应做文本撤销
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === '`') { this.toggle(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this._undo();
      }
    };
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

  // ── 撤销 ─────────────────────────────────────────────────────────────────

  private _pushUndo(): void {
    if (!this._decal || this._testSnapshot) return; // 测试模式:环境是临时的,不进撤销栈
    const snap = this._decal.getCurrentParams();
    // 与栈顶相同则不推:避免"点了滑块没拖"占掉撤销步,Ctrl+Z 时表现为按一下没反应
    const top = this._undoStack[this._undoStack.length - 1];
    if (top && JSON.stringify(top) === JSON.stringify(snap)) return;
    this._undoStack.push(snap);
    if (this._undoStack.length > 50) this._undoStack.shift();
  }

  private _undo(): void {
    if (this._testSnapshot) { this._showNotification('测试模式下不可撤销,请先退出测试'); return; }
    const snap = this._undoStack.pop();
    if (!snap) { this._showNotification('已到最早步骤,无法继续撤销'); return; }
    this._decal.applyPreset({ ...snap } as any, 0);
    this.syncUI();
    this._saveDraft();
    this._showNotification(`↶ 已撤销(还可撤销 ${this._undoStack.length} 步)`);
  }

  // ── 条件显示 ─────────────────────────────────────────────────────────────

  private _applyVisibilityRules(): void {
    if (!this._decal) return;
    const params = this._decal.getCurrentParams() as any;
    this._conditionalRows.forEach(({ el, test }) => {
      let visible = true;
      try { visible = !!test(params); } catch { visible = true; }
      el.classList.toggle('cond-hidden', !visible);
    });
  }

  // ── 构建 ─────────────────────────────────────────────────────────────────

  private _build(): void {
    if (!this._el) return;
    this._el.innerHTML = '';
    const params = this._decal.getCurrentParams() as any;

    this._sliderRefs.clear();
    this._toggleRefs.clear();
    this._selectRefs.clear();
    this._colorRefs.clear();
    this._sections = [];
    this._sectionBadges.clear();
    this._conditionalRows = [];

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

    // Tabs
    this._el.appendChild(this._buildTabBar());

    // Toolbar: 搜索 + 撤销 + A/B 对比
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    const search = document.createElement('input');
    search.type = 'text'; search.className = 'search-box';
    search.placeholder = '🔍 搜索参数(中文或英文)…';
    search.addEventListener('input', () => this._applySearch(search.value.trim().toLowerCase()));
    const undoBtn = document.createElement('button');
    undoBtn.className = 'icon-btn';
    undoBtn.textContent = '↶';
    undoBtn.title = '撤销上一步(Ctrl+Z),最多 50 步';
    undoBtn.addEventListener('click', () => this._undo());
    const pinBtn = document.createElement('button');
    pinBtn.className = `icon-btn${this._abStored ? ' pin-active' : ''}`;
    pinBtn.textContent = '📌';
    pinBtn.title = '把当前效果存为对比快照;之后按住 ⇆ 即与它对比。再点一次覆盖旧快照';
    pinBtn.addEventListener('click', () => this._pinSnapshot());
    this._pinBtn = pinBtn;
    const abBtn = document.createElement('button');
    abBtn.className = 'ab-btn';
    abBtn.textContent = '⇆';
    abBtn.title = '按住:显示对比快照(未用 📌 存过时,显示 JSON 基线);松开:回到当前效果';
    abBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._abHoldStart(abBtn); });
    const abEnd = () => this._abHoldEnd(abBtn);
    abBtn.addEventListener('pointerup', abEnd);
    abBtn.addEventListener('pointerleave', abEnd);
    abBtn.addEventListener('pointercancel', abEnd);
    toolbar.appendChild(search);
    toolbar.appendChild(undoBtn);
    toolbar.appendChild(pinBtn);
    toolbar.appendChild(abBtn);
    this._el.appendChild(toolbar);

    const hint = document.createElement('div');
    hint.className = 'hint-bar';
    hint.textContent = '双击参数名=恢复该项默认 · 金色圆点=你改过的参数 · Ctrl+Z=撤销 · 📌=存A/B快照 · `=收起面板';
    this._el.appendChild(hint);

    // Preset cards(persona 子阶段,跨页签共享)
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

    // 材质页
    const materialTab = document.createElement('div');
    materialTab.className = 'tab-content';
    materialTab.dataset['tabContent'] = 'material';
    materialTab.appendChild(this._buildCommonSection('材质常用', COMMON_MATERIAL_KEYS, params));
    this._renderSections(MATERIAL_SECTIONS, materialTab, params);
    this._el.appendChild(materialTab);

    // 光照页
    const lightTab = document.createElement('div');
    lightTab.className = 'tab-content';
    lightTab.dataset['tabContent'] = 'light';
    lightTab.appendChild(this._buildCommonSection('光照常用', COMMON_LIGHT_KEYS, params));
    this._renderSections(LIGHT_SECTIONS, lightTab, params);
    this._el.appendChild(lightTab);

    // 图层页(占位,第二包实施)
    const layerTab = document.createElement('div');
    layerTab.className = 'tab-content';
    layerTab.dataset['tabContent'] = 'layer';
    layerTab.innerHTML = `<div class="tab-placeholder">图层系统(符文环层 / 尘埃粒子层)<br>在第二包实施,敬请期待。</div>`;
    this._el.appendChild(layerTab);

    // 演出页(占位,第二包实施)
    const performTab = document.createElement('div');
    performTab.className = 'tab-content';
    performTab.dataset['tabContent'] = 'perform';
    performTab.innerHTML = `<div class="tab-placeholder">演出编辑(快照步骤单 + 试放)<br>在第二包实施,敬请期待。</div>`;
    this._el.appendChild(performTab);

    // 测试页(临时:参数隔离测试)
    const testTab = document.createElement('div');
    testTab.className = 'tab-content';
    testTab.dataset['tabContent'] = 'test';
    this._testTabEl = testTab;
    this._testRowRefs = [];
    this._renderTestContent();
    this._el.appendChild(testTab);

    this._restoreCollapseState();

    // Actions + 全量重置确认条
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

    const confirmStrip = document.createElement('div');
    confirmStrip.className = 'confirm-strip hidden';
    confirmStrip.innerHTML = `
      <span class="confirm-text">确定丢弃全部修改?</span>
      <button class="confirm-yes">确定</button>
      <button class="confirm-no">取消</button>
    `;
    resetBtn.addEventListener('click', () => {
      actions.classList.add('hidden');
      confirmStrip.classList.remove('hidden');
    });
    confirmStrip.querySelector('.confirm-yes')?.addEventListener('click', () => {
      confirmStrip.classList.add('hidden');
      actions.classList.remove('hidden');
      this._resetDraft();
    });
    confirmStrip.querySelector('.confirm-no')?.addEventListener('click', () => {
      confirmStrip.classList.add('hidden');
      actions.classList.remove('hidden');
    });

    actions.appendChild(copyBtn); actions.appendChild(dlBtn); actions.appendChild(resetBtn);
    this._el.appendChild(actions);
    this._el.appendChild(confirmStrip);

    this._updateVisibility();
    this._updateDirtyMarks();
    this._updateModelDimming(params.materialModel ?? 0);
    this._applyVisibilityRules();
    this._syncMatcapGrid(params);

    const savedTab = localStorage.getItem('centerpiece-debug-tab') as TabKey | null;
    this._activeTab = savedTab && ['material', 'light', 'layer', 'perform', 'test'].includes(savedTab) ? savedTab : 'material';
    this._switchTab(this._activeTab);
  }

  // ── 页签 ─────────────────────────────────────────────────────────────────

  private _buildTabBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    const tabs: { key: TabKey; label: string }[] = [
      { key: 'material', label: '材质' },
      { key: 'light', label: '光照' },
      { key: 'layer', label: '图层' },
      { key: 'perform', label: '演出' },
      { key: 'test', label: '🧪测试' },
    ];
    tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.className = `tab-btn${this._activeTab === t.key ? ' active' : ''}`;
      btn.textContent = t.label;
      btn.dataset['tab'] = t.key;
      btn.addEventListener('click', () => this._switchTab(t.key));
      bar.appendChild(btn);
    });
    return bar;
  }

  private _switchTab(tab: TabKey): void {
    this._activeTab = tab;
    if (!this._el) return;
    this._el.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset['tab'] === tab);
    });
    this._el.querySelectorAll('.tab-content').forEach(c => {
      (c as HTMLElement).classList.toggle('hidden-tab', (c as HTMLElement).dataset['tabContent'] !== tab);
    });
    localStorage.setItem('centerpiece-debug-tab', tab);
  }

  // ── 常用区(引用同一 key 的第二行,不受条件显示影响) ─────────────────────────

  private _buildCommonSection(title: string, keys: string[], params: any): HTMLElement {
    const sec = document.createElement('div');
    sec.className = 'collapsible-section common-section';
    const head = document.createElement('div');
    head.className = 'section-header';
    head.innerHTML = `<span class="section-title">⭐ ${title}</span><span class="section-chevron">▼</span>`;
    head.addEventListener('click', () => sec.classList.toggle('collapsed'));
    const content = document.createElement('div');
    content.className = 'section-content';
    keys.forEach(key => {
      const def = findSliderDef(key);
      if (!def) return;
      content.appendChild(this._createSliderRow({ ...def, visibleWhen: undefined }, params));
    });
    sec.appendChild(head);
    sec.appendChild(content);
    return sec;
  }

  // ── 分区渲染 ─────────────────────────────────────────────────────────────

  private _renderSections(sections: SectionDef[], container: HTMLElement, params: any): void {
    sections.forEach((secDef, idx) => {
      const sec = document.createElement('div');
      sec.className = 'collapsible-section';
      sec.dataset['title'] = secDef.title;
      const secHead = document.createElement('div');
      secHead.className = 'section-header';
      secHead.innerHTML = `
        <span class="section-title">${secDef.title}<span class="dirty-badge"></span></span>
        <span class="section-actions">
          <button class="sec-reset-btn" title="恢复本区默认值">↺</button>
          <span class="section-chevron">▼</span>
        </span>
      `;
      const secContent = document.createElement('div');
      secContent.className = 'section-content';

      const toggleCollapse = () => { sec.classList.toggle('collapsed'); this._saveCollapseState(); };
      secHead.querySelector('.section-title')?.addEventListener('click', toggleCollapse);
      secHead.querySelector('.section-chevron')?.addEventListener('click', toggleCollapse);
      secHead.querySelector('.sec-reset-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._resetSection(secDef);
      });

      secDef.selects?.forEach(def => secContent.appendChild(this._createSelectRow(def, params)));
      secDef.toggles?.forEach(def => secContent.appendChild(this._createToggleRow(def, params)));
      secDef.sliders?.forEach(def => secContent.appendChild(this._createSliderRow(def, params)));
      secDef.colors?.forEach(def => secContent.appendChild(this._createColorRow(def, params)));

      if (secDef.title === 'PBR 材质') secContent.appendChild(this._buildHrbaRouting(params));
      if (secDef.title === 'Mask 发光') {
        secContent.appendChild(this._buildMaskChannelBlock('R', params));
        secContent.appendChild(this._buildMaskChannelBlock('G', params));
        secContent.appendChild(this._buildMaskChannelBlock('B', params));
      }
      if (secDef.title === '环境贴图') secContent.appendChild(this._buildMatcapGrid(params));

      sec.appendChild(secHead);
      sec.appendChild(secContent);
      container.appendChild(sec);
      this._sections.push(sec);
      const badge = secHead.querySelector('.dirty-badge') as HTMLElement;
      this._sectionBadges.set(sec, badge);

      // 默认:每个页签的前三个分区展开,其余折叠(有保存的状态则以保存为准)
      if (idx >= 3) sec.classList.add('collapsed');
    });
  }

  private _sectionKeys(secDef: SectionDef): string[] {
    const keys: string[] = [];
    secDef.selects?.forEach(s => keys.push(s.key));
    secDef.toggles?.forEach(t => keys.push(t.key));
    secDef.sliders?.forEach(s => keys.push(s.key));
    secDef.colors?.forEach(c => keys.push(...c.keys));
    return keys;
  }

  private _resetSection(secDef: SectionDef): void {
    const keys = this._sectionKeys(secDef);
    const patch: Record<string, any> = {};
    let any = false;
    keys.forEach(k => {
      const baseVal = this._baseline[k];
      if (baseVal !== undefined && typeof baseVal !== 'string') { patch[k] = baseVal; any = true; }
    });
    if (!any) return;
    this._pushUndo();
    this._decal.applyPreset(patch as any, 0);
    this.syncUI();
    this._saveDraft();
    this._showNotification(`↺ 已恢复「${secDef.title}」为默认`);
  }

  // ── A/B 对比(按住看快照,📌 可存任意时刻,不存则回退到 JSON 基线) ─────────────

  private _pinSnapshot(): void {
    if (this._testSnapshot) { this._showNotification('测试模式下不可存快照,请先退出测试'); return; }
    this._abStored = this._decal.getCurrentParams();
    this._pinBtn?.classList.add('pin-active');
    this._showNotification('📌 已存对比快照,按住 ⇆ 与它对比');
  }

  private _clearPinnedSnapshot(): void {
    this._abStored = null;
    this._pinBtn?.classList.remove('pin-active');
  }

  private _abHoldStart(btn: HTMLElement): void {
    if (this._abSnapshot || this._testSnapshot) return;
    const ref = this._abStored ?? this._baseline;
    if (!Object.keys(ref).length) return;
    this._abSnapshot = this._decal.getCurrentParams();
    btn.classList.add('holding');
    const apply: Record<string, any> = { ...ref };
    // 贴图路径与当前一致时剔除,避免按住/松开时触发无谓的异步纹理重载闪烁
    delete apply['maskNoiseTex'];
    if (apply['envTex'] === (this._abSnapshot as any).envTex) delete apply['envTex'];
    this._decal.applyPreset(apply as any, 0);
  }

  private _abHoldEnd(btn: HTMLElement): void {
    if (!this._abSnapshot) return;
    const back: Record<string, any> = { ...this._abSnapshot };
    delete back['maskNoiseTex'];
    if (back['envTex'] === (this._decal.getCurrentParams() as any).envTex) delete back['envTex'];
    this._abSnapshot = null;
    this._decal.applyPreset(back as any, 0);
    btn.classList.remove('holding');
    // 按住期间被拦掉的草稿写盘在这里补一次,保证最后一次改动不丢
    this._saveDraft();
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
    // 遍历所有分区(含 ⭐常用区与 Mask 通道子块,它们不在 _sections 里),没有命中的整块隐藏
    this._el.querySelectorAll<HTMLElement>('.collapsible-section').forEach(sec => {
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

  // ── HRBA / Mask / Matcap 特殊块 ──────────────────────────────────────────

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
        <select id="hrba-b-route-select" class="select-input" style="max-width: 180px;">
          <option value="0">关闭(用全局值)</option>
          <option value="1">读贴图 B 通道</option>
        </select>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span class="label" style="width: 120px;">透光路由 (A)</span>
        <select id="hrba-a-route-select" class="select-input" style="max-width: 180px;">
          <option value="0">关闭</option>
          <option value="1">SSS(厚度遮罩)</option>
          <option value="2">透射(背光)</option>
        </select>
      </div>
    `;

    const bRouteSelect = hrbaRow.querySelector('#hrba-b-route-select') as HTMLSelectElement;
    bRouteSelect.value = String(params.hrbaB_route ?? 1);
    bRouteSelect.addEventListener('change', () => {
      this._pushUndo();
      const val = parseInt(bRouteSelect.value, 10);
      this._decal.applyPreset({ hrbaB_route: val, hrbaMetalnessEnabled: val } as any, 0);
      this._updateDirtyMarks();
      this._saveDraft();
    });

    const aRouteSelect = hrbaRow.querySelector('#hrba-a-route-select') as HTMLSelectElement;
    aRouteSelect.value = String(params.hrbaA_route ?? 0);
    aRouteSelect.addEventListener('change', () => {
      this._pushUndo();
      const val = parseInt(aRouteSelect.value, 10);
      this._decal.applyPreset({ hrbaA_route: val, hrbaSssEnabled: val > 0 ? 1 : 0 } as any, 0);
      this._updateDirtyMarks();
      this._saveDraft();
    });

    this._pushSelectRef('hrbaB_route', bRouteSelect);
    this._pushSelectRef('hrbaA_route', aRouteSelect);
    return hrbaRow;
  }

  private _buildMaskChannelBlock(ch: 'R' | 'G' | 'B', params: any): HTMLElement {
    const typeKey = `mask${ch}_effectType`;
    const isActive = (params[typeKey] ?? 0) > 0;
    this._lastMaskTypes[ch] = params[typeKey] ?? 0;

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
    typeSelect.className = 'select-input';

    const types = ['无', '自发光', '染色', '边缘光', 'SSS'];
    types.forEach((tName, val) => {
      const opt = document.createElement('option');
      opt.value = String(val);
      opt.textContent = tName;
      typeSelect.appendChild(opt);
    });
    typeSelect.value = String(params[typeKey] ?? 0);
    typeSelect.addEventListener('change', () => {
      this._pushUndo();
      const val = parseInt(typeSelect.value, 10);
      this._decal.applyPreset({ [typeKey]: val } as any, 0);
      this._updateDirtyMarks();
      this._saveDraft();
    });

    this._pushSelectRef(typeKey, typeSelect);
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

  private _buildMatcapGrid(params: any): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'matcap-grid';
    wrap.dataset['search'] = '环境贴图 matcap 反射球 环境反射';

    const entries: { name: string; url: string }[] = [{ name: '默认(程序生成)', url: '' }, ...MATCAP_LIBRARY];
    const currentTex = params.envTex || '';

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = `matcap-item${entry.url === currentTex ? ' active' : ''}`;
      item.title = entry.name;
      if (entry.url) {
        item.style.backgroundImage = `url(${entry.url})`;
      } else {
        item.style.background = 'radial-gradient(circle at 35% 30%, #fff, #556 60%, #101014)';
      }
      item.addEventListener('click', () => {
        this._pushUndo();
        this._decal.applyPreset({ envTex: entry.url } as any, 0);
        this._saveDraft();
        wrap.querySelectorAll('.matcap-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
      wrap.appendChild(item);
    });

    if (MATCAP_LIBRARY.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'matcap-hint';
      hint.textContent = '把 PNG/JPG/WebP 放进 src/assets/matcaps/ 文件夹,刷新页面后这里会自动出现缩略图。';
      wrap.appendChild(hint);
    }

    return wrap;
  }

  private _syncMatcapGrid(params: any): void {
    const grid = this._el?.querySelector('.matcap-grid');
    if (!grid) return;
    const currentTex = params.envTex || '';
    const items = grid.querySelectorAll('.matcap-item');
    items.forEach((el, idx) => {
      const url = idx === 0 ? '' : (MATCAP_LIBRARY[idx - 1]?.url ?? '');
      el.classList.toggle('active', url === currentTex);
    });
  }

  // ── 参数隔离测试(临时工具页) ──────────────────────────────────────────────

  private _renderTestContent(): void {
    const body = this._testTabEl;
    if (!body) return;
    this._clearTestRows();
    body.innerHTML = '';

    const active = this._activeTestId ? ISOLATION_TESTS.find(t => t.id === this._activeTestId) : undefined;

    if (!active) {
      const intro = document.createElement('div');
      intro.className = 'test-intro';
      intro.innerHTML = '选一个测试:面板会<b>一键把其它参数设成最适合观察该参数的环境</b>(固定光源、关噪声、关发光呼吸等),并告诉你拖动时预期看到什么。退出测试后一切恢复原状,不污染你的调参草稿。';
      body.appendChild(intro);
      body.appendChild(this._buildDiagBlock());

      let lastGroup = '';
      ISOLATION_TESTS.forEach(test => {
        if (test.group !== lastGroup) {
          lastGroup = test.group;
          const g = document.createElement('div');
          g.className = 'test-group-title';
          g.textContent = test.group;
          body.appendChild(g);
        }
        const card = document.createElement('div');
        card.className = 'test-card';
        const targetLabels = test.targets.map(k => findSliderDef(k)?.label ?? k).join(' · ');
        const title = document.createElement('div');
        title.className = 'test-card-title';
        title.textContent = test.title;
        const targets = document.createElement('div');
        targets.className = 'test-card-targets';
        targets.textContent = targetLabels;
        card.appendChild(title);
        card.appendChild(targets);
        card.addEventListener('click', () => this._enterTest(test));
        body.appendChild(card);
      });
      return;
    }

    // 激活态:标题 + 预期说明 + 目标滑块 + 退出按钮
    const head = document.createElement('div');
    head.className = 'test-active-head';
    head.innerHTML = `<span class="test-active-title">🧪 ${active.title}</span>`;
    body.appendChild(head);

    const expect = document.createElement('div');
    expect.className = 'test-expect';
    expect.textContent = active.expect;
    body.appendChild(expect);

    const params = this._decal.getCurrentParams() as any;
    active.targets.forEach(key => {
      const def = findSliderDef(key);
      if (!def) return;
      const row = this._createSliderRow({ ...def, isAdv: false, visibleWhen: undefined }, params);
      const refs = this._sliderRefs.get(key);
      const ref = refs?.[refs.length - 1];
      if (ref) this._testRowRefs.push({ key, ref });
      body.appendChild(row);
    });

    const note = document.createElement('div');
    note.className = 'test-env-note';
    note.textContent = '测试期间其它页签显示的是测试环境的数值;撤销、A/B 对比与草稿保存已暂停,退出后自动还原。';
    body.appendChild(note);

    body.appendChild(this._buildDiagBlock());

    const bar = document.createElement('div');
    bar.className = 'test-exit-bar';
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'action-btn';
    restoreBtn.textContent = '退出并恢复原状';
    restoreBtn.addEventListener('click', () => this._exitTest(false));
    const keepBtn = document.createElement('button');
    keepBtn.className = 'action-btn';
    keepBtn.textContent = '保留目标值退出';
    keepBtn.title = '只保留上方目标滑块的当前值写入草稿,其余参数恢复进入测试前的状态';
    keepBtn.addEventListener('click', () => this._exitTest(true));
    bar.appendChild(restoreBtn);
    bar.appendChild(keepBtn);
    body.appendChild(bar);
  }

  private _enterTest(test: IsolationTest): void {
    if (this._testSnapshot) this._exitTest(false);
    // 先把仍在防抖中的草稿落盘,避免测试期间被挂起而丢掉进入前的最后一次改动
    if (this._draftTimer !== null) {
      window.clearTimeout(this._draftTimer);
      this._draftTimer = null;
      this._flushDraft();
    }
    this._testSnapshot = this._decal.getCurrentParams();
    this._activeTestId = test.id;
    this._decal.applyPreset({ ...BASE_TEST_ENV, ...test.env, ...test.start } as any, 0);
    this.syncUI();
    this._renderTestContent();
  }

  private _exitTest(keepTargets: boolean): void {
    const snap = this._testSnapshot;
    if (!snap) return;
    const restore: Record<string, any> = { ...snap };
    // 贴图路径未被测试改动,重放会触发一次无谓的纹理重载
    delete restore['maskNoiseTex'];
    delete restore['envTex'];
    if (keepTargets && this._activeTestId) {
      const test = ISOLATION_TESTS.find(t => t.id === this._activeTestId);
      const cur = this._decal.getCurrentParams() as any;
      test?.targets.forEach(k => { restore[k] = cur[k]; });
    }
    this._testSnapshot = null;
    this._activeTestId = null;
    this._decal.applyPreset(restore as any, 0);
    this.syncUI();
    this._renderTestContent();
    if (keepTargets) {
      this._saveDraft();
      this._showNotification('✓ 已保留目标参数,其余已恢复');
    } else {
      this._showNotification('↺ 测试环境已恢复');
    }
  }

  /** 诊断视图选择器:直读 V4 shader 中间量,区分"参数没进 shader"和"计算结果为零" */
  private _buildDiagBlock(): HTMLElement {
    const wrap = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = '🔬 诊断视图';
    label.title = '把 shader 内部的中间计算结果直接画到法阵上,排查"拖了没反应"的参数';
    const sel = document.createElement('select');
    sel.className = 'select-input';
    DIAG_VIEWS.forEach(opt => {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      sel.appendChild(o);
    });
    const hint = document.createElement('div');
    hint.className = 'test-env-note';
    const cur = Number((this._decal.getCurrentParams() as any).debugView ?? 0);
    sel.value = String(cur);
    hint.textContent = DIAG_VIEWS.find(o => o.value === cur)?.hint ?? '';
    sel.addEventListener('change', () => {
      const v = parseInt(sel.value, 10);
      this._decal.applyPreset({ debugView: v } as any, 0);
      hint.textContent = DIAG_VIEWS.find(o => o.value === v)?.hint ?? '';
    });
    row.appendChild(label);
    row.appendChild(sel);
    wrap.appendChild(row);
    wrap.appendChild(hint);
    return wrap;
  }

  private _clearTestRows(): void {
    this._testRowRefs.forEach(({ key, ref }) => {
      const arr = this._sliderRefs.get(key);
      if (!arr) return;
      const i = arr.indexOf(ref);
      if (i >= 0) arr.splice(i, 1);
    });
    this._testRowRefs = [];
  }

  // ── 基础行构建 ────────────────────────────────────────────────────────────

  private _pushSelectRef(key: string, sel: HTMLSelectElement): void {
    const refs = this._selectRefs.get(key) ?? [];
    refs.push(sel);
    this._selectRefs.set(key, refs);
  }

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

    const curved = (def.curve ?? 1) !== 1;
    const input = document.createElement('input'); input.type = 'range'; input.className = 'input-range';
    if (curved) {
      input.min = '0'; input.max = '1'; input.step = '0.001';
    } else {
      input.min = String(def.min); input.max = String(def.max); input.step = String(def.step);
    }
    const val = params[def.key] ?? 0;
    input.value = curved ? String(valueToSliderPos(def, val)) : String(val);

    const valueEl = document.createElement('input');
    valueEl.type = 'number'; valueEl.className = 'val-input';
    valueEl.step = String(def.step); valueEl.value = Number(val).toFixed(3);

    // 应用参数值:同步同 key 的所有滑块;区间配对(如粗糙度上下限)越过对方时把对方一起推走
    const applyValue = (v: number) => {
      this._syncSliderValue(def.key, v);
      const patch: Record<string, number> = { [def.key]: v };
      const pair = RANGE_PAIRS[def.key];
      if (pair) {
        const partnerVal = (this._decal.getCurrentParams() as any)[pair.partner] ?? 0;
        if ((pair.role === 'min' && v > partnerVal) || (pair.role === 'max' && v < partnerVal)) {
          patch[pair.partner] = v;
          this._syncSliderValue(pair.partner, v);
        }
      }
      this._decal.applyPreset(patch as any, 0);
      this._updateColorSwatches();
      this._updateDirtyMarks();
      this._applyVisibilityRules();
      this._saveDraft();
    };

    input.addEventListener('pointerdown', () => this._pushUndo());
    input.addEventListener('input', () => {
      const raw = parseFloat(input.value);
      applyValue(curved ? sliderPosToValue(def, raw) : raw);
    });

    valueEl.addEventListener('change', () => {
      this._pushUndo();
      let v = parseFloat(valueEl.value);
      if (isNaN(v)) v = curved ? sliderPosToValue(def, parseFloat(input.value)) : parseFloat(input.value);
      v = Math.max(def.min, Math.min(def.max, v));
      applyValue(v);
    });

    const refs = this._sliderRefs.get(def.key) ?? [];
    refs.push({ input, valueEl, row, def });
    this._sliderRefs.set(def.key, refs);

    if (def.visibleWhen) this._conditionalRows.push({ el: row, test: def.visibleWhen });

    row.appendChild(label); row.appendChild(input); row.appendChild(valueEl);
    return row;
  }

  private _createToggleRow(def: ToggleDef, params: any): HTMLElement {
    const row = document.createElement('div');
    row.className = `row${def.isAdv ? ' adv-only' : ''}`;
    row.dataset['search'] = `${def.label} ${def.key}`.toLowerCase();
    row.dataset['paramKey'] = def.key;
    if (def.tip) row.title = def.tip;

    const label = document.createElement('span');
    label.className = 'label'; label.textContent = def.label;
    label.title = (def.tip ? def.tip + '\n' : '') + '双击恢复默认值';
    label.addEventListener('dblclick', () => this._resetParam(def.key));

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle-checkbox';
    checkbox.checked = (params[def.key] ?? 0) > 0.5;

    checkbox.addEventListener('change', () => {
      this._pushUndo();
      const v = checkbox.checked ? 1 : 0;
      this._decal.applyPreset({ [def.key]: v } as any, 0);
      this._updateDirtyMarks();
      this._updateModelDimming((this._decal.getCurrentParams() as any).materialModel ?? 0);
      this._applyVisibilityRules();
      this._saveDraft();
    });

    const refs = this._toggleRefs.get(def.key) ?? [];
    refs.push({ checkbox, row });
    this._toggleRefs.set(def.key, refs);

    if (def.visibleWhen) this._conditionalRows.push({ el: row, test: def.visibleWhen });

    row.appendChild(label); row.appendChild(checkbox);
    return row;
  }

  private _createSelectRow(def: SelectDef, params: any): HTMLElement {
    const row = document.createElement('div');
    row.className = `row${def.isAdv ? ' adv-only' : ''}`;
    row.dataset['search'] = `${def.label} ${def.key} ${def.options.map(o => o.label).join(' ')}`.toLowerCase();
    row.dataset['paramKey'] = def.key;
    if (def.tip) row.title = def.tip;

    const label = document.createElement('span');
    label.className = 'label'; label.textContent = def.label;
    if (def.tip) label.title = def.tip;

    const select = document.createElement('select');
    select.className = 'select-input';
    def.options.forEach(opt => {
      const o = document.createElement('option');
      o.value = String(opt.value);
      o.textContent = opt.label;
      select.appendChild(o);
    });
    select.value = String(params[def.key] ?? def.options[0]?.value ?? 0);

    select.addEventListener('change', () => {
      this._pushUndo();
      const v = parseFloat(select.value);
      this._decal.applyPreset({ [def.key]: v } as any, 0);
      this._updateDirtyMarks();
      this._updateModelDimming((this._decal.getCurrentParams() as any).materialModel ?? 0);
      this._applyVisibilityRules();
      this._saveDraft();
    });

    this._pushSelectRef(def.key, select);
    if (def.visibleWhen) this._conditionalRows.push({ el: row, test: def.visibleWhen });

    row.appendChild(label); row.appendChild(select);
    return row;
  }

  private _createColorRow(def: ColorDef, params: any): HTMLElement {
    const container = document.createElement('div');
    container.className = `color-row${def.isAdv ? ' adv-only' : ''}`;
    container.dataset['search'] = `${def.label} ${def.keys.join(' ')}`.toLowerCase();
    if (def.tip) container.title = def.tip;

    const head = document.createElement('div');
    head.className = 'color-header';
    // 色板即取色器:点击直接打开系统取色对话框;实际参数 = 取色器颜色(归一化) × 强度
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-swatch';
    colorInput.title = '点击取色。颜色本身的明暗会自动折算进右侧展开里的「强度」';
    const label = document.createElement('span');
    label.className = 'label'; label.textContent = def.label;

    head.appendChild(colorInput);
    head.appendChild(label);
    head.addEventListener('click', () => container.classList.toggle('expanded'));

    const expand = document.createElement('div');
    expand.className = 'color-expand';

    // 强度行(不是 shader 参数,是取色器颜色的 HDR 乘数;等于 RGB 三分量的最大值)
    const intRow = document.createElement('div');
    intRow.className = 'row';
    const intLabel = document.createElement('span');
    intLabel.className = 'label'; intLabel.textContent = '强度';
    intLabel.title = '颜色整体乘数(RGB 最大分量)。取色器管色相,这里管亮度,可超过 1';
    const intInput = document.createElement('input');
    intInput.type = 'range'; intInput.className = 'input-range';
    intInput.min = '0'; intInput.max = '2'; intInput.step = '0.01';
    const intVal = document.createElement('input');
    intVal.type = 'number'; intVal.className = 'val-input'; intVal.step = '0.01';
    intRow.appendChild(intLabel); intRow.appendChild(intInput); intRow.appendChild(intVal);
    expand.appendChild(intRow);

    const applyPicked = (intensity: number) => {
      const hex = colorInput.value;
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      const patch: Record<string, number> = {};
      def.keys.forEach((key, i) => {
        const v = (rgb[i] ?? 0) * intensity;
        patch[key] = v;
        this._syncSliderValue(key, v);
      });
      this._decal.applyPreset(patch as any, 0);
      this._updateColorSwatches();
      this._updateDirtyMarks();
      this._saveDraft();
    };

    // 打开取色对话框前先存撤销点;取色过程中 input 连续触发,只应用不推栈
    colorInput.addEventListener('click', (e) => { e.stopPropagation(); this._pushUndo(); });
    colorInput.addEventListener('input', () => {
      // 强度=0 时任何颜色乘出来都是黑,选色器等于白选;用户点取色器的意图就是"要看见这个颜色",
      // 强度已经趴在 0 附近就顺手拉回可见量级,不让这里变成静默失效的陷阱
      let intensity = parseFloat(intInput.value);
      if (!(intensity > 0.05)) {
        intensity = 1;
        intInput.value = '1';
        intVal.value = '1.00';
      }
      applyPicked(intensity);
    });
    intInput.addEventListener('pointerdown', () => this._pushUndo());
    intInput.addEventListener('input', () => {
      intVal.value = Number(intInput.value).toFixed(2);
      applyPicked(parseFloat(intInput.value));
    });
    intVal.addEventListener('change', () => {
      this._pushUndo();
      let k = parseFloat(intVal.value);
      if (isNaN(k)) k = parseFloat(intInput.value);
      k = Math.max(0, Math.min(2, k));
      intInput.value = String(k);
      intVal.value = k.toFixed(2);
      applyPicked(k);
    });

    ['R', 'G', 'B'].forEach((channel, i) => {
      const key = def.keys[i] || '';
      expand.appendChild(this._createSliderRow({ key, label: channel, min: 0, max: 2, step: 0.01 }, params));
    });

    container.appendChild(head);
    container.appendChild(expand);

    this._colorRefs.set(def.keys.join(','), { container, colorInput, intInput, intVal });
    this._syncColorRef(def.keys.join(','), params);

    if (def.visibleWhen) this._conditionalRows.push({ el: container, test: def.visibleWhen });

    return container;
  }

  // ── 改动高亮 / 单参数恢复 / 多引用同步 ───────────────────────────────────────

  private _setSliderRef(ref: SliderRef, v: number): void {
    const curved = (ref.def.curve ?? 1) !== 1;
    ref.input.value = curved ? String(valueToSliderPos(ref.def, v)) : String(v);
    ref.valueEl.value = Number(v).toFixed(3);
  }

  private _syncSliderValue(key: string, v: number): void {
    const refs = this._sliderRefs.get(key);
    if (!refs) return;
    refs.forEach(ref => this._setSliderRef(ref, v));
  }

  private _resetParam(key: string): void {
    const baseVal = this._baseline[key];
    if (baseVal === undefined || typeof baseVal === 'string') return;
    this._pushUndo();
    this._decal.applyPreset({ [key]: baseVal } as any, 0);
    this._syncSliderValue(key, baseVal);
    this._updateColorSwatches();
    this._updateDirtyMarks();
    this._applyVisibilityRules();
    this._saveDraft();
  }

  private _updateDirtyMarks(): void {
    const params = this._decal.getCurrentParams() as any;
    const dirtyPerSection = new Map<HTMLElement, number>();
    const mark = (row: HTMLElement, key: string) => {
      const dirty = this._isDirty(key, params);
      row.classList.toggle('dirty', dirty);
      if (dirty) {
        const sec = row.closest('.collapsible-section:not([data-mask-channel])') as HTMLElement | null;
        if (sec && this._sectionBadges.has(sec)) {
          dirtyPerSection.set(sec, (dirtyPerSection.get(sec) || 0) + 1);
        }
      }
    };
    this._sliderRefs.forEach((refs, key) => refs.forEach(({ row }) => mark(row, key)));
    this._toggleRefs.forEach((refs, key) => refs.forEach(({ row }) => mark(row, key)));
    // 下拉框同样参与改动高亮;HRBA 一行里有两个下拉,按行做"或"合并,避免后算的键覆盖前一个的结果
    const selectRowDirty = new Map<HTMLElement, boolean>();
    this._selectRefs.forEach((refs, key) => refs.forEach(sel => {
      const row = sel.closest('.row') as HTMLElement | null;
      if (!row) return;
      selectRowDirty.set(row, (selectRowDirty.get(row) ?? false) || this._isDirty(key, params));
    }));
    selectRowDirty.forEach((dirty, row) => {
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
    this._sliderRefs.forEach((refs, key) => {
      if (DEAD_IN_STYLIZED.has(key)) refs.forEach(({ row }) => row.classList.toggle('model-dead', isStylized));
    });
    this._colorRefs.forEach((ref, keysStr) => {
      const keys = keysStr.split(',');
      if (keys.every(k => DEAD_IN_STYLIZED.has(k))) {
        ref.container.classList.toggle('model-dead', isStylized);
      }
    });
  }

  /** 把参数值分解为"归一化颜色 × 强度"回写取色器与强度滑块;正在操作的控件不回写,避免拖动中被抢值 */
  private _syncColorRef(keysStr: string, params: any): void {
    const ref = this._colorRefs.get(keysStr);
    if (!ref) return;
    const vals = keysStr.split(',').map(k => Number(params[k] ?? 0));
    const m = Math.max(vals[0] ?? 0, vals[1] ?? 0, vals[2] ?? 0);
    if (document.activeElement !== ref.intInput && document.activeElement !== ref.intVal) {
      ref.intInput.value = String(Math.min(2, m));
      ref.intVal.value = m.toFixed(2);
    }
    if (document.activeElement !== ref.colorInput) {
      // m≈0 时色相无从谈起(除以 0),色板如实显示纯黑——不留上一次选色的残影,
      // 否则色板看着"还是那个颜色"但实际输出早已是黑,会让人误以为选色器失效了
      const hex = m > 1e-4
        ? '#' + vals.map(v => Math.round(Math.min(1, v / m) * 255).toString(16).padStart(2, '0')).join('')
        : '#000000';
      ref.colorInput.value = hex;
    }
  }

  private _updateColorSwatches(): void {
    const params = this._decal.getCurrentParams() as any;
    this._colorRefs.forEach((_ref, keysStr) => this._syncColorRef(keysStr, params));
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
    if (this._testSnapshot) this._exitTest(false); // 切子阶段前先退出测试并还原
    this._clearPinnedSnapshot(); // 快照属于旧子阶段,跨阶段对比没有意义
    this._pushUndo();
    this._activePreset = key;

    const personaName = this._getActivePersonaName();
    localStorage.setItem(`centerpiece-active-subphase-${personaName}`, key);

    this._refreshBaseline();
    this._decal.applyPreset(presetToParams(preset), PRESET_TRANSITION);

    this._el?.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('active', (c as HTMLElement).dataset['key'] === key);
    });
    if (this._presetTimer !== null) window.clearTimeout(this._presetTimer);
    this._presetTimer = window.setTimeout(() => {
      this._presetTimer = null;
      this.syncUI();
    }, PRESET_TRANSITION * 1000 + 80);
  }

  syncUI(): void {
    // 生产构建下构造器早退,_decal 未赋值;decal 侧仍会调用本方法,必须防护
    if (!this._el) return;
    const params = this._decal.getCurrentParams() as any;
    this._sliderRefs.forEach((refs, key) => {
      const v = params[key] ?? 0;
      refs.forEach(ref => this._setSliderRef(ref, v));
    });
    this._toggleRefs.forEach((refs, key) => {
      const v = (params[key] ?? 0) > 0.5;
      refs.forEach(({ checkbox }) => { checkbox.checked = v; });
    });
    this._selectRefs.forEach((refs, key) => {
      const v = String(params[key] ?? 0);
      refs.forEach(sel => { sel.value = v; });
    });
    this._updateColorSwatches();
    this._updateDirtyMarks();
    this._updateModelDimming(params.materialModel ?? 0);
    this._applyVisibilityRules();
    this._syncMatcapGrid(params);

    // 只在 effectType 发生变化时自动展开/收起 Mask 通道块;
    // 否则用户手动展开"无"类型通道调颜色时,拖任意滑块触发的 syncUI 会把块又收起来
    ['R', 'G', 'B'].forEach(ch => {
      const typeKey = `mask${ch}_effectType`;
      const cur = params[typeKey] ?? 0;
      if (this._lastMaskTypes[ch] === cur) return;
      this._lastMaskTypes[ch] = cur;
      const block = this._el!.querySelector(`[data-mask-channel="${ch}"]`) as HTMLElement;
      if (block) block.classList.toggle('collapsed', !(cur > 0));
    });
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
    if (this._abSnapshot || this._testSnapshot) return; // A/B 对比按住期间、参数隔离测试期间不落草稿
    if (this._draftTimer !== null) window.clearTimeout(this._draftTimer);
    this._draftTimer = window.setTimeout(() => {
      this._draftTimer = null;
      this._flushDraft();
    }, 150);
  }

  private _flushDraft(): void {
    if (!this._decal || this._abSnapshot || this._testSnapshot) return;
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
    this._pushUndo();
    const personaName = this._getActivePersonaName();
    const key = this._activePreset;

    localStorage.removeItem(`centerpiece-preset-${personaName}-${key}`);
    loadPresetsForPersona(personaName);
    this._applyPreset(key);
    this._showNotification(`↺ 已恢复 ${personaName}.${key} 为 JSON 默认`);
  }

  public onPersonaChanged(personaName: string): void {
    if (!this._el) return; // 生产构建下面板未初始化
    // Persona 切换时 decal 已自行加载新参数,旧快照失效,直接丢弃测试状态(不回放)
    this._testSnapshot = null;
    this._activeTestId = null;
    this._testRowRefs = [];
    this._abStored = null;
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
      setTimeout(() => toast.remove(), 300);
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
    if (this._presetTimer !== null) {
      window.clearTimeout(this._presetTimer);
      this._presetTimer = null;
    }
    if (this._draftTimer !== null) {
      // 还有没写盘的草稿:立即落盘,别丢最后一次改动
      window.clearTimeout(this._draftTimer);
      this._draftTimer = null;
      this._flushDraft();
    }
    this._el?.remove();
    this._styleEl?.remove();
    this._el = null;
    this._styleEl = null;
    this._sliderRefs.clear();
    this._toggleRefs.clear();
    this._selectRefs.clear();
    this._colorRefs.clear();
    this._sectionBadges.clear();
    this._sections = [];
    this._conditionalRows = [];
    this._undoStack = [];
    this._abSnapshot = null;
    this._abStored = null;
    this._pinBtn = null;
    this._testSnapshot = null;
    this._activeTestId = null;
    this._testTabEl = null;
    this._testRowRefs = [];
  }
}
