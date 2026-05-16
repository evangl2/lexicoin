import type { CenterpieceDecal } from './CenterpieceDecal';
import { CENTERPIECE_PRESETS, presetToParams } from './centerpiece-presets';

interface SliderDef { 
  key: string; 
  label: string; 
  min: number; 
  max: number; 
  step: number; 
  isAdv?: boolean; 
}

interface ColorDef {
  label: string;
  keys: [string, string, string]; // [R, G, B]
  isAdv?: boolean;
}

const SECTIONS: { 
  title: string; 
  sliders?: SliderDef[]; 
  colors?: ColorDef[]; 
}[] = [
  {
    title: 'SYSTEM & BASE',
    sliders: [
      { key: 'exposure',     label: 'Exposure',       min: 0,   max: 5,   step: 0.05 },
      { key: 'baseAlpha',    label: 'Base Alpha',     min: 0,   max: 1,   step: 0.01 },
      { key: 'alphaClip',    label: 'Alpha Clip',     min: 0,   max: 1,   step: 0.01, isAdv: true },
      { key: 'diffuseSaturation', label: 'Saturation',min: 0,   max: 2,   step: 0.05 },
      { key: 'normalFlipY',  label: 'Normal Flip Y',  min: 0,   max: 1,   step: 1, isAdv: true },
    ],
    colors: [
      { label: 'Diffuse Tint', keys: ['diffuseTintR', 'diffuseTintG', 'diffuseTintB'] }
    ]
  },
  {
    title: 'INTERACTION & DYNAMICS',
    sliders: [
      { key: 'lightOrbitSpeed',  label: 'Orbit Speed',  min: 0,   max: 2,   step: 0.01 },
      { key: 'lightOrbitRadiusX',label: 'Orbit Rad X',  min: 0,   max: 2,   step: 0.01, isAdv: true },
      { key: 'lightOrbitRadiusY',label: 'Orbit Rad Y',  min: 0,   max: 2,   step: 0.01, isAdv: true },
      { key: 'mouseInfluence',   label: 'Mouse Infl',   min: 0,   max: 1,   step: 0.01 },
      { key: 'maskAnimSpeed',    label: 'Anim Speed',   min: 0,   max: 5,   step: 0.05 },
    ],
  },
  {
    title: 'LIGHTING & SURFACE',
    sliders: [
      { key: 'lightStrength',  label: 'Main Light Str', min: 0,   max: 5,   step: 0.1 },
      { key: 'lightHeight',    label: 'Light Z-Height', min: 0,   max: 5,   step: 0.1, isAdv: true },
      { key: 'ambientStrength',label: 'Ambient Str',  min: 0,   max: 1,   step: 0.01 },
      { key: 'diffuse',        label: 'Diffuse',        min: 0,   max: 3,   step: 0.05 },
      { key: 'diffuseWrap',    label: 'Diffuse Wrap',   min: 0,   max: 1,   step: 0.05, isAdv: true },
      { key: 'bumpX',          label: 'Bump X',         min: 0,   max: 5,   step: 0.05 },
      { key: 'bumpY',          label: 'Bump Y',         min: 0,   max: 5,   step: 0.05, isAdv: true },
      { key: 'parallax',       label: 'Parallax',       min: 0,   max: 0.1, step: 0.002 },
      { key: 'ao',             label: 'Height AO',      min: 0,   max: 1,   step: 0.01 },
      { key: 'cavityStrength', label: 'Cavity Str',   min: 0,   max: 1,   step: 0.01, isAdv: true },
    ],
    colors: [
      { label: 'Light Color', keys: ['lightR', 'lightG', 'lightB'], isAdv: true },
      { label: 'Ambient Color', keys: ['ambientR', 'ambientG', 'ambientB'], isAdv: true },
    ]
  },
  {
    title: 'PBR PROPERTIES',
    sliders: [
      { key: 'roughnessMin', label: 'Rough Min',  min: 0,   max: 1,   step: 0.01 },
      { key: 'roughnessMax', label: 'Rough Max',  min: 0,   max: 1,   step: 0.01 },
      { key: 'roughnessContrast', label: 'Rough Contrast', min: 0.1, max: 5, step: 0.1, isAdv: true },
      { key: 'roughnessBias',     label: 'Rough Bias',     min: -1,  max: 1, step: 0.01, isAdv: true },
      { key: 'specStrength', label: 'Spec Strength',  min: 0,   max: 10,  step: 0.1  },
      { key: 'f0Dielectric', label: 'F0 Reflectivity',min: 0,   max: 1,   step: 0.01, isAdv: true },
      { key: 'fresnelPower', label: 'Fresnel Power',  min: 0.1, max: 10,  step: 0.1, isAdv: true },
      { key: 'specAoMask',   label: 'Spec AO Mask',   min: 0,   max: 1,   step: 0.01, isAdv: true },
    ],
    colors: [
      { label: 'Spec Color', keys: ['specColorR', 'specColorG', 'specColorB'] }
    ]
  },
  {
    title: 'RIM & SSS',
    sliders: [
      { key: 'rimStrength',  label: 'Rim Strength',   min: 0,   max: 5,   step: 0.05 },
      { key: 'rimPower',     label: 'Rim Power',      min: 1,   max: 10,  step: 0.1  },
      { key: 'sssStrength',  label: 'SSS Strength',   min: 0,   max: 1,   step: 0.01 },
    ],
    colors: [
      { label: 'Rim Color', keys: ['rimColorR', 'rimColorG', 'rimColorB'] },
      { label: 'SSS Color', keys: ['sssR', 'sssG', 'sssB'], isAdv: true },
    ]
  },
  {
    title: 'MASK EMISSIVE',
    sliders: [
      { key: 'maskIntensity',label: 'Base Intensity', min: 0,   max: 10,  step: 0.05 },
      { key: 'maskBrightness',label: 'Brightness',    min: -1,  max: 1,   step: 0.01, isAdv: true },
      { key: 'maskContrast', label: 'Contrast',       min: 0.1, max: 5,   step: 0.1, isAdv: true },
      { key: 'maskEdgeSoftness', label: 'Edge Softness', min: 0,   max: 1,   step: 0.01 },
      { key: 'baseBlur',     label: 'Base Blur',      min: 0,   max: 100, step: 1    },
      { key: 'bloomScale',   label: 'Bloom Scale',    min: 0.5, max: 2,   step: 0.01, isAdv: true },
      { key: 'maskGradient', label: 'Color Gradient', min: 0,   max: 1,   step: 0.01 },
    ],
    colors: [
      { label: 'Emissive Color 1', keys: ['maskColorR', 'maskColorG', 'maskColorB'] },
      { label: 'Emissive Color 2', keys: ['maskColor2R', 'maskColor2G', 'maskColor2B'] },
    ]
  },
  {
    title: 'NOISE & FLOW',
    sliders: [
      { key: 'noiseScale',   label: 'Noise 1 Scale',  min: 0,   max: 20,  step: 0.1  },
      { key: 'noiseScale2',  label: 'Noise 2 Scale',  min: 0,   max: 20,  step: 0.1  },
      { key: 'noiseContrast',label: 'Noise Contrast', min: 0.1, max: 10,  step: 0.1  },
      { key: 'noiseSpeedX',  label: 'Noise Speed X',  min: -0.5,max: 0.5, step: 0.005},
      { key: 'noiseSpeedY',  label: 'Noise Speed Y',  min: -0.5,max: 0.5, step: 0.005},
      { key: 'noiseBlend',   label: 'Noise Blend',    min: 0,   max: 1,   step: 0.5, isAdv: true },
    ],
  },
  {
    title: 'CHANNEL ROUTING',
    sliders: [
      { key: 'bMetalness',   label: 'B -> Metalness', min: 0,   max: 1,   step: 0.01 },
      { key: 'bAO',          label: 'B -> AO',        min: 0,   max: 1,   step: 0.01 },
      { key: 'bSSS',         label: 'B -> SSS',       min: 0,   max: 1,   step: 0.01 },
      { key: 'aMetalness',   label: 'A -> Metalness', min: 0,   max: 1,   step: 0.01 },
      { key: 'aAO',          label: 'A -> AO',        min: 0,   max: 1,   step: 0.01 },
      { key: 'aSSS',         label: 'A -> SSS',       min: 0,   max: 1,   step: 0.01 },
      { key: 'maskBWeight',  label: 'Read B (Mask)',  min: 0,   max: 1,   step: 0.01 },
      { key: 'maskAWeight',  label: 'Read A (Mask)',  min: 0,   max: 1,   step: 0.01 },
    ],
  },
];

const PANEL_STYLES = `
  #centerpiece-debug-panel {
    position: fixed; top: 16px; right: 16px; width: 360px; max-height: 94vh; overflow-y: auto;
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
  }
  .panel-title { font-weight: 800; letter-spacing: 0.1em; color: #fff; text-shadow: 0 0 8px rgba(180, 140, 60, 0.5); }
  .panel-controls { display: flex; gap: 8px; align-items: center; }
  .adv-toggle { cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 9px; opacity: 0.7; }
  .adv-toggle input { width: 10px; height: 10px; margin: 0; }
  .close-btn { cursor: pointer; opacity: 0.6; font-size: 20px; background: none; border: none; color: #d4b060; padding: 0 4px; }

  .preset-grid { padding: 10px 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; border-bottom: 1px solid rgba(180,140,60,0.15); }
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
  .section-chevron { transition: transform 0.3s; opacity: 0.5; }
  .collapsible-section.collapsed .section-chevron { transform: rotate(-90deg); }
  .section-content { padding: 4px 0 12px; display: block; }
  .collapsible-section.collapsed .section-content { display: none; }

  .row { display: flex; align-items: center; gap: 8px; padding: 3px 16px; min-height: 20px; }
  .label { width: 110px; opacity: 0.7; font-size: 10px; }
  .input-range { flex: 1; accent-color: #d4b060; height: 3px; cursor: pointer; }
  .val { width: 40px; text-align: right; font-weight: bold; font-variant-numeric: tabular-nums; opacity: 0.9; }

  .color-row { padding: 4px 16px; }
  .color-header { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .color-swatch { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
  .color-expand { display: none; padding: 4px 0 4px 8px; border-left: 2px solid rgba(180,140,60,0.2); margin-top: 4px; }
  .color-row.expanded .color-expand { display: block; }
  
  .hidden { display: none !important; }
  
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
  private _decal: CenterpieceDecal;
  private _activePreset = 'rubedo';
  private _duration = 1.0;
  private _onKey: (e: KeyboardEvent) => void;
  private _sliderRefs: Map<string, { input: HTMLInputElement; valueEl: HTMLElement }> = new Map();
  private _colorSwatches: Map<string, HTMLElement> = new Map();
  private _sections: HTMLElement[] = [];

  constructor(decal: CenterpieceDecal) {
    if (!import.meta.env.DEV) return;
    this._decal = decal;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = PANEL_STYLES;
    document.head.appendChild(this._styleEl);
    this._el = document.createElement('div');
    this._el.id = 'centerpiece-debug-panel';
    this._build();
    document.body.appendChild(this._el);
    this._onKey = (e: KeyboardEvent) => { if (e.key === '`') this.toggle(); };
    window.addEventListener('keydown', this._onKey);
    
    // Load preference
    const savedAdv = localStorage.getItem('centerpiece-debug-adv');
    if (savedAdv === 'true') this._setAdv(true);
  }

  private _build(): void {
    if (!this._el) return;
    this._el.innerHTML = '';
    const params = this._decal.getCurrentParams() as any;

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">⚗ CENTERPIECE PBR v3.0</span>
      <div class="panel-controls">
        <label class="adv-toggle">
          <input type="checkbox" ${this._isAdv ? 'checked' : ''} id="adv-checkbox"> ADV
        </label>
        <button class="close-btn">×</button>
      </div>
    `;
    header.querySelector('#adv-checkbox')?.addEventListener('change', (e) => {
      this._setAdv((e.target as HTMLInputElement).checked);
    });
    header.querySelector('.close-btn')?.addEventListener('click', () => this.toggle());
    this._el.appendChild(header);

    // Presets Grid
    const presetGrid = document.createElement('div');
    presetGrid.className = 'preset-grid';
    Object.entries(CENTERPIECE_PRESETS).forEach(([key, preset]) => {
      const card = document.createElement('div');
      card.className = `preset-card${key === this._activePreset ? ' active' : ''}`;
      card.dataset['key'] = key;
      const dot = document.createElement('div');
      dot.className = 'preset-dot';
      dot.style.backgroundColor = `rgb(${preset.maskColor[0]*255}, ${preset.maskColor[1]*255}, ${preset.maskColor[2]*255})`;
      const label = document.createElement('div');
      label.className = 'preset-label';
      label.textContent = key.toUpperCase();
      
      card.appendChild(dot);
      card.appendChild(label);
      card.addEventListener('click', () => this._applyPreset(key));
      presetGrid.appendChild(card);
    });
    this._el.appendChild(presetGrid);

    // Global settings (Duration, Mode)
    const globals = document.createElement('div');
    globals.className = 'row';
    globals.style.paddingTop = '8px';
    globals.innerHTML = `<span class="label">TRANSITION(s)</span>`;
    const durInput = document.createElement('input');
    durInput.type = 'number'; durInput.className = 'val'; durInput.style.width = '50px';
    durInput.style.background = 'transparent'; durInput.style.border = '1px solid rgba(180,140,60,0.3)';
    durInput.style.color = '#fff'; durInput.value = String(this._duration);
    durInput.addEventListener('input', () => this._duration = parseFloat(durInput.value) || 0);
    globals.appendChild(durInput);
    this._el.appendChild(globals);

    const modeRow = document.createElement('div');
    modeRow.className = 'row';
    modeRow.innerHTML = `<span class="label">ANIM MODE</span>`;
    const modeSelect = document.createElement('select');
    modeSelect.style.flex = '1'; modeSelect.style.background = '#000'; modeSelect.style.color = '#d4b060'; modeSelect.style.border = '1px solid #d4b06044';
    ['STATIC', 'BREATHE', 'BLINK', 'PULSE'].forEach((n, idx) => {
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
    SECTIONS.forEach(secDef => {
      const sec = document.createElement('div');
      sec.className = 'collapsible-section';
      const secHead = document.createElement('div');
      secHead.className = 'section-header';
      secHead.innerHTML = `
        <span class="section-title">${secDef.title}</span>
        <span class="section-chevron">▼</span>
      `;
      const secContent = document.createElement('div');
      secContent.className = 'section-content';
      
      secHead.addEventListener('click', () => {
        sec.classList.toggle('collapsed');
      });
      
      // Sliders
      secDef.sliders?.forEach(def => {
        const row = this._createSliderRow(def, params);
        secContent.appendChild(row);
      });
      
      // Colors
      secDef.colors?.forEach(def => {
        const row = this._createColorRow(def, params);
        secContent.appendChild(row);
      });
      
      sec.appendChild(secHead);
      sec.appendChild(secContent);
      this._el!.appendChild(sec);
      this._sections.push(sec);
    });

    // Actions
    const actions = document.createElement('div');
    actions.className = 'action-bar';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn'; copyBtn.textContent = 'COPY PRESET JS';
    copyBtn.addEventListener('click', () => this._exportParams());
    const dlBtn = document.createElement('button');
    dlBtn.className = 'action-btn'; dlBtn.textContent = 'EXPORT JSON';
    dlBtn.addEventListener('click', () => this._downloadJson());
    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn reset-btn'; resetBtn.textContent = '↺';
    resetBtn.addEventListener('click', () => this._applyPreset(this._activePreset));
    
    actions.appendChild(copyBtn); actions.appendChild(dlBtn); actions.appendChild(resetBtn);
    this._el.appendChild(actions);

    this._updateVisibility();
  }

  private _createSliderRow(def: SliderDef, params: any): HTMLElement {
    const row = document.createElement('div');
    row.className = `row${def.isAdv ? ' adv-only' : ''}`;
    const label = document.createElement('span'); label.className = 'label'; label.textContent = def.label;
    const input = document.createElement('input'); input.type = 'range'; input.className = 'input-range';
    input.min = String(def.min); input.max = String(def.max); input.step = String(def.step);
    const val = params[def.key] ?? 0;
    input.value = String(val);
    const valueEl = document.createElement('span'); valueEl.className = 'val'; valueEl.textContent = Number(val).toFixed(2);
    
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueEl.textContent = v.toFixed(2);
      this._decal.applyPreset({ [def.key]: v } as any, 0);
      this._updateColorSwatches(); // In case this is part of a color
      this._saveDraft();
    });
    
    this._sliderRefs.set(def.key, { input, valueEl });
    row.appendChild(label); row.appendChild(input); row.appendChild(valueEl);
    return row;
  }

  private _createColorRow(def: ColorDef, params: any): HTMLElement {
    const container = document.createElement('div');
    container.className = `color-row${def.isAdv ? ' adv-only' : ''}`;
    
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
      const key = def.keys[i];
      const sliderRow = this._createSliderRow({ key, label: channel, min: 0, max: 2, step: 0.01 }, params);
      expand.appendChild(sliderRow);
    });
    
    container.appendChild(head);
    container.appendChild(expand);
    return container;
  }

  private _updateSwatch(swatch: HTMLElement, keys: string[], params: any): void {
    const r = Math.min(255, (params[keys[0]] ?? 0) * 255);
    const g = Math.min(255, (params[keys[1]] ?? 0) * 255);
    const b = Math.min(255, (params[keys[2]] ?? 0) * 255);
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
    this._decal.applyPreset(presetToParams(preset), this._duration);
    
    this._el?.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('active', (c as HTMLElement).dataset['key'] === key);
    });
    
    setTimeout(() => this._syncUI(), Math.max(this._duration * 1000 + 50, 100));
  }

  private _syncUI(): void {
    const params = this._decal.getCurrentParams() as any;
    this._sliderRefs.forEach(({ input, valueEl }, key) => {
      const v = params[key] ?? 0;
      input.value = String(v);
      valueEl.textContent = Number(v).toFixed(2);
    });
    this._updateColorSwatches();
  }

  private _saveDraft(): void {
    localStorage.setItem('centerpiece-debug-draft', JSON.stringify(this._decal.getCurrentParams()));
  }

  private _exportParams(): void {
    const p = this._decal.getCurrentParams() as any;
    const lines = [
      `, { // CenterpiecePreset`,
      `  exposure: ${p.exposure?.toFixed(3)}, baseAlpha: ${p.baseAlpha?.toFixed(3)}, alphaClip: ${p.alphaClip?.toFixed(3)},`,
      `  diffuseTint: [${p.diffuseTintR?.toFixed(3)}, ${p.diffuseTintG?.toFixed(3)}, ${p.diffuseTintB?.toFixed(3)}],`,
      `  diffuseSaturation: ${p.diffuseSaturation?.toFixed(3)}, normalFlipY: ${p.normalFlipY}, lightHeight: ${p.lightHeight?.toFixed(3)},`,
      `  lightOrbitSpeed: ${p.lightOrbitSpeed?.toFixed(3)}, lightOrbitRadiusX: ${p.lightOrbitRadiusX?.toFixed(3)}, lightOrbitRadiusY: ${p.lightOrbitRadiusY?.toFixed(3)},`,
      `  mouseInfluence: ${p.mouseInfluence?.toFixed(3)}, lightColor: [${p.lightR?.toFixed(3)}, ${p.lightG?.toFixed(3)}, ${p.lightB?.toFixed(3)}],`,
      `  lightStrength: ${p.lightStrength?.toFixed(3)}, ambient: ${p.ambientStrength?.toFixed(3)}, ambientColor: [${p.ambientR?.toFixed(3)}, ${p.ambientG?.toFixed(3)}, ${p.ambientB?.toFixed(3)}],`,
      `  diffuse: ${p.diffuse?.toFixed(3)}, diffuseWrap: ${p.diffuseWrap?.toFixed(3)}, bumpX: ${p.bumpX?.toFixed(3)}, bumpY: ${p.bumpY?.toFixed(3)},`,
      `  parallax: ${p.parallax?.toFixed(4)}, ao: ${p.ao?.toFixed(3)}, cavityStrength: ${p.cavityStrength?.toFixed(3)},`,
      `  roughnessMin: ${p.roughnessMin?.toFixed(3)}, roughnessMax: ${p.roughnessMax?.toFixed(3)}, roughnessContrast: ${p.roughnessContrast?.toFixed(3)}, roughnessBias: ${p.roughnessBias?.toFixed(3)},`,
      `  specStrength: ${p.specStrength?.toFixed(3)}, specColor: [${p.specColorR?.toFixed(3)}, ${p.specColorG?.toFixed(3)}, ${p.specColorB?.toFixed(3)}],`,
      `  f0Dielectric: ${p.f0Dielectric?.toFixed(3)}, fresnelPower: ${p.fresnelPower?.toFixed(3)}, specAoMask: ${p.specAoMask?.toFixed(3)},`,
      `  rimStrength: ${p.rimStrength?.toFixed(3)}, rimPower: ${p.rimPower?.toFixed(3)}, rimColor: [${p.rimColorR?.toFixed(3)}, ${p.rimColorG?.toFixed(3)}, ${p.rimColorB?.toFixed(3)}],`,
      `  bWeights: [${p.bMetalness?.toFixed(3)}, ${p.bAO?.toFixed(3)}, ${p.bSSS?.toFixed(3)}],`,
      `  aWeights: [${p.aMetalness?.toFixed(3)}, ${p.aAO?.toFixed(3)}, ${p.aSSS?.toFixed(3)}],`,
      `  maskBWeight: ${p.maskBWeight?.toFixed(3)}, maskAWeight: ${p.maskAWeight?.toFixed(3)},`,
      `  maskAnimMode: ${p.maskAnimMode}, maskAnimSpeed: ${p.maskAnimSpeed?.toFixed(3)}, maskIntensity: ${p.maskIntensity?.toFixed(3)},`,
      `  maskColor: [${p.maskColorR?.toFixed(3)}, ${p.maskColorG?.toFixed(3)}, ${p.maskColorB?.toFixed(3)}],`,
      `  maskColor2: [${p.maskColor2R?.toFixed(3)}, ${p.maskColor2G?.toFixed(3)}, ${p.maskColor2B?.toFixed(3)}],`,
      `  maskGradient: ${p.maskGradient?.toFixed(3)}, maskBrightness: ${p.maskBrightness?.toFixed(3)}, maskContrast: ${p.maskContrast?.toFixed(3)}, maskEdgeSoftness: ${p.maskEdgeSoftness?.toFixed(3)},`,
      `  baseBlur: ${p.baseBlur?.toFixed(1)}, bloomScale: ${p.bloomScale?.toFixed(3)},`,
      `  maskNoiseTex: '${p.maskNoiseTex}', noiseScale: ${p.noiseScale?.toFixed(3)}, noiseScale2: ${p.noiseScale2?.toFixed(3)},`,
      `  noiseContrast: ${p.noiseContrast?.toFixed(3)}, noiseSpeedX: ${p.noiseSpeedX?.toFixed(4)}, noiseSpeedY: ${p.noiseSpeedY?.toFixed(4)}, noiseBlend: ${p.noiseBlend?.toFixed(3)},`,
      `}`,
    ];
    const str = lines.join('\n');
    console.log('%c[CenterpieceDebugPanel] Exported JS:', 'color: #d4b060; font-weight: bold;');
    console.log(str);
    navigator.clipboard.writeText(str).catch(() => {});
  }

  private _downloadJson(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this._decal.getCurrentParams(), null, 2));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `centerpiece-preset-${Date.now()}.json`);
    document.body.appendChild(dlNode);
    dlNode.click();
    dlNode.remove();
  }

  toggle(): void {
    if (!this._el) return;
    this._visible = !this._visible;
    this._el.style.display = this._visible ? 'block' : 'none';
  }

  destroy(): void {
    window.removeEventListener('keydown', this._onKey);
    this._el?.remove();
    this._styleEl?.remove();
    this._el = null;
    this._styleEl = null;
    this._sliderRefs.clear();
  }
}
