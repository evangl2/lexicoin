import type { CenterpieceDecal } from './CenterpieceDecal';
import { CENTERPIECE_PRESETS, presetToParams, loadPresetsForPersona, getBasePresetsForPersona, paramsToPreset } from './centerpiece-presets';
import { personaBridge } from '../bridges/PersonaBridge';

interface SliderDef { 
  key: string; 
  label: string; 
  min: number; 
  max: number; 
  step: number; 
  isAdv?: boolean; 
  options?: string[]; // If present, renders as premium button group instead of slider
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
      { key: 'metalness',    label: 'Metalness',      min: 0,   max: 1,   step: 0.01 },
      { key: 'roughnessMin', label: 'Rough Min',      min: 0,   max: 1,   step: 0.01 },
      { key: 'roughnessMax', label: 'Rough Max',      min: 0,   max: 1,   step: 0.01 },
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
    title: 'RIM & SSS (PBR)',
    sliders: [
      { key: 'rimStrength',  label: 'Rim Strength',   min: 0,   max: 5,   step: 0.05 },
      { key: 'rimPower',     label: 'Rim Power',      min: 1,   max: 10,  step: 0.1  },
      { key: 'sssStrength',  label: 'SSS Strength',   min: 0,   max: 5,   step: 0.05 },
    ],
    colors: [
      { label: 'Rim Color', keys: ['rimColorR', 'rimColorG', 'rimColorB'] },
      { label: 'SSS Color', keys: ['sssR', 'sssG', 'sssB'] },
    ]
  },
  {
    title: 'MASK CHANNEL R (HEIGHT)',
    sliders: [
      { key: 'maskR_effectType', label: 'Effect Type', min: 0, max: 3, step: 1, options: ['Emissive', 'Tint', 'Rim', 'SSS'] },
      { key: 'maskR_strength',   label: 'Strength',    min: 0, max: 5, step: 0.05 },
      { key: 'maskR_noiseCoupling', label: 'Noise Coupling', min: 0, max: 1, step: 0.01 },
    ],
    colors: [
      { label: 'Channel R Color', keys: ['maskR_colorR', 'maskR_colorG', 'maskR_colorB'] }
    ]
  },
  {
    title: 'MASK CHANNEL G (ROUGHNESS)',
    sliders: [
      { key: 'maskG_effectType', label: 'Effect Type', min: 0, max: 3, step: 1, options: ['Emissive', 'Tint', 'Rim', 'SSS'] },
      { key: 'maskG_strength',   label: 'Strength',    min: 0, max: 5, step: 0.05 },
      { key: 'maskG_noiseCoupling', label: 'Noise Coupling', min: 0, max: 1, step: 0.01 },
    ],
    colors: [
      { label: 'Channel G Color', keys: ['maskG_colorR', 'maskG_colorG', 'maskG_colorB'] }
    ]
  },
  {
    title: 'MASK CHANNEL B (BAKED AO)',
    sliders: [
      { key: 'maskB_effectType', label: 'Effect Type', min: 0, max: 3, step: 1, options: ['Emissive', 'Tint', 'Rim', 'SSS'] },
      { key: 'maskB_strength',   label: 'Strength',    min: 0, max: 5, step: 0.05 },
      { key: 'maskB_noiseCoupling', label: 'Noise Coupling', min: 0, max: 1, step: 0.01 },
    ],
    colors: [
      { label: 'Channel B Color', keys: ['maskB_colorR', 'maskB_colorG', 'maskB_colorB'] }
    ]
  },
  {
    title: 'MASK GLOBAL CONFIG',
    sliders: [
      { key: 'baseBlur',     label: 'Base Blur',      min: 0,   max: 100, step: 1    },
      { key: 'bloomScale',   label: 'Bloom Scale',    min: 0.5, max: 2,   step: 0.01, isAdv: true },
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
  
  .action-bar { display: grid; grid-template-columns: 1fr 1fr 40px; gap: 8px; padding: 12px 16px; background: rgba(0,0,0,0.3); }
  .action-btn { 
    background: rgba(180,140,60,0.15); border: 1px solid rgba(180, 140, 60, 0.4); 
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
  private _duration = 1.0;
  private _onKey?: (e: KeyboardEvent) => void;
  private _sliderRefs: Map<string, { input: HTMLInputElement; valueEl: HTMLInputElement }> = new Map();
  private _selectRefs: Map<string, HTMLElement> = new Map();
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
    const personaName = this._getActivePersonaName();
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">⚗ PBR: ${personaName.toUpperCase()}</span>
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
      if (!preset) return;
      const card = document.createElement('div');
      card.className = `preset-card${key === this._activePreset ? ' active' : ''}`;
      card.dataset['key'] = key;
      const dot = document.createElement('div');
      dot.className = 'preset-dot';
      
      const r = preset.maskR_color ? preset.maskR_color[0] : 0.5;
      const g = preset.maskR_color ? preset.maskR_color[1] : 0.5;
      const b = preset.maskR_color ? preset.maskR_color[2] : 0.5;
      dot.style.backgroundColor = `rgb(${r*255}, ${g*255}, ${b*255})`;
      
      const label = document.createElement('div');
      label.className = 'preset-label';
      
      let displayName = key.toUpperCase();
      if (preset.label) {
        if (preset.label.includes('(')) {
          const parts = preset.label.split('(');
          const rightPart = parts[1];
          if (rightPart) {
            displayName = rightPart.replace(')', '');
          }
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
      
      // Sliders & Selection rows
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
    copyBtn.className = 'action-btn'; copyBtn.textContent = 'COPY CONFIG';
    copyBtn.title = 'Copy complete Persona JSON config with all subphases';
    copyBtn.addEventListener('click', () => this._copyPersonaJson());
    const dlBtn = document.createElement('button');
    dlBtn.className = 'action-btn'; dlBtn.textContent = 'DOWNLOAD JSON';
    dlBtn.title = 'Download complete Persona JSON file';
    dlBtn.addEventListener('click', () => this._exportPersonaJson());
    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn reset-btn'; resetBtn.textContent = '↺';
    resetBtn.title = 'Reset active subphase draft back to JSON defaults';
    resetBtn.addEventListener('click', () => this._resetDraft());
    
    actions.appendChild(copyBtn); actions.appendChild(dlBtn); actions.appendChild(resetBtn);
    this._el.appendChild(actions);

    this._updateVisibility();
  }

  private _createSliderRow(def: SliderDef, params: any): HTMLElement {
    if (def.options) {
      const row = document.createElement('div');
      row.className = `row${def.isAdv ? ' adv-only' : ''}`;
      const label = document.createElement('span'); label.className = 'label'; label.textContent = def.label;
      
      const btnGroup = document.createElement('div');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '4px';
      btnGroup.style.flex = '1';
      
      const activeVal = params[def.key] ?? 0;
      def.options.forEach((optName, idx) => {
        const btn = document.createElement('button');
        btn.textContent = optName.toUpperCase();
        btn.style.flex = '1';
        btn.style.fontSize = '8px';
        btn.style.padding = '4px 2px';
        btn.style.border = '1px solid rgba(180, 140, 60, 0.4)';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s';
        
        const updateBtnStyle = (val: number) => {
          if (val === idx) {
            btn.style.background = 'rgba(180, 140, 60, 0.4)';
            btn.style.color = '#fff';
            btn.style.borderColor = '#d4b060';
          } else {
            btn.style.background = 'rgba(0, 0, 0, 0.2)';
            btn.style.color = '#e0d0b0';
            btn.style.borderColor = 'rgba(180, 140, 60, 0.2)';
          }
        };
        
        updateBtnStyle(activeVal);
        
        btn.addEventListener('click', () => {
          this._decal.applyPreset({ [def.key]: idx } as any, 0);
          // Refresh all buttons in this group
          Array.from(btnGroup.children).forEach((childBtn, cIdx) => {
            if (childBtn instanceof HTMLButtonElement) {
              if (cIdx === idx) {
                childBtn.style.background = 'rgba(180, 140, 60, 0.4)';
                childBtn.style.color = '#fff';
                childBtn.style.borderColor = '#d4b060';
              } else {
                childBtn.style.background = 'rgba(0, 0, 0, 0.2)';
                childBtn.style.color = '#e0d0b0';
                childBtn.style.borderColor = 'rgba(180, 140, 60, 0.2)';
              }
            }
          });
          this._saveDraft();
        });
        
        btnGroup.appendChild(btn);
      });
      
      this._selectRefs.set(def.key, btnGroup);
      row.appendChild(label); row.appendChild(btnGroup);
      return row;
    }

    const row = document.createElement('div');
    row.className = `row${def.isAdv ? ' adv-only' : ''}`;
    const label = document.createElement('span'); label.className = 'label'; label.textContent = def.label;
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
      this._updateColorSwatches(); // In case this is part of a color
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
      const key = def.keys[i] || '';
      const sliderRow = this._createSliderRow({ key, label: channel, min: 0, max: 2, step: 0.01 }, params);
      expand.appendChild(sliderRow);
    });
    
    container.appendChild(head);
    container.appendChild(expand);
    return container;
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
    
    this._decal.applyPreset(presetToParams(preset), this._duration);
    
    this._el?.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('active', (c as HTMLElement).dataset['key'] === key);
    });
    setTimeout(() => this.syncUI(), Math.max(this._duration * 1000 + 50, 100));
  }

  syncUI(): void {
    const params = this._decal.getCurrentParams() as any;
    this._sliderRefs.forEach(({ input, valueEl }, key) => {
      const v = params[key] ?? 0;
      if (input && valueEl) {
        input.value = String(v);
        valueEl.value = Number(v).toFixed(2);
      }
    });
    this._selectRefs.forEach((btnGroup, key) => {
      const activeVal = params[key] ?? 0;
      Array.from(btnGroup.children).forEach((childBtn, idx) => {
        if (childBtn instanceof HTMLButtonElement) {
          if (idx === activeVal) {
            childBtn.style.background = 'rgba(180, 140, 60, 0.4)';
            childBtn.style.color = '#fff';
            childBtn.style.borderColor = '#d4b060';
          } else {
            childBtn.style.background = 'rgba(0, 0, 0, 0.2)';
            childBtn.style.color = '#e0d0b0';
            childBtn.style.borderColor = 'rgba(180, 140, 60, 0.2)';
          }
        }
      });
    });
    this._updateColorSwatches();
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
    
    this._showNotification(`✓ ${personaName}.json downloaded!`);
  }

  private _copyPersonaJson(): void {
    const personaName = this._getActivePersonaName();
    const config = this._compilePersonaConfig();
    const str = JSON.stringify(config, null, 2);
    
    navigator.clipboard.writeText(str).then(() => {
      this._showNotification(`✓ ${personaName}.json copied!`);
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
    this._showNotification(`↺ Reset ${personaName}.${key} draft to JSON defaults`);
  }

  public onPersonaChanged(personaName: string): void {
    this._activePreset = localStorage.getItem(`centerpiece-active-subphase-${personaName}`) || 'rubedo';
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
