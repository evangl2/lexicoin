import type { CenterpieceDecal } from './CenterpieceDecal';
import { CENTERPIECE_PRESETS, presetToParams } from './centerpiece-presets';

interface SliderDef { key: string; label: string; min: number; max: number; step: number; }

const SLIDER_GROUPS: { title: string; sliders: SliderDef[] }[] = [
  {
    title: 'SYSTEM & BASE',
    sliders: [
      { key: 'alphaClip',    label: 'Alpha Clip',     min: 0,   max: 1,   step: 0.01 },
      { key: 'diffuseTintR', label: 'Tint R',         min: 0,   max: 2,   step: 0.01 },
      { key: 'diffuseTintG', label: 'Tint G',         min: 0,   max: 2,   step: 0.01 },
      { key: 'diffuseTintB', label: 'Tint B',         min: 0,   max: 2,   step: 0.01 },
      { key: 'normalFlipY',  label: 'Normal Flip Y',  min: 0,   max: 1,   step: 1 },
      { key: 'lightHeight',  label: 'Light Height(Z)',min: 0,   max: 5,   step: 0.1 },
    ],
  },
  {
    title: 'LIGHT & STRUCTURE',
    sliders: [
      { key: 'ambientStrength', label: 'Ambient Str', min: 0,   max: 1,   step: 0.01 },
      { key: 'ambientR',     label: 'Ambient R',      min: 0,   max: 2,   step: 0.01 },
      { key: 'ambientG',     label: 'Ambient G',      min: 0,   max: 2,   step: 0.01 },
      { key: 'ambientB',     label: 'Ambient B',      min: 0,   max: 2,   step: 0.01 },
      { key: 'diffuse',      label: 'Diffuse',        min: 0,   max: 3,   step: 0.05 },
      { key: 'bump',         label: 'Bump',           min: 0,   max: 5,   step: 0.05 },
      { key: 'parallax',     label: 'Parallax',       min: 0,   max: 0.1, step: 0.002 },
      { key: 'ao',           label: 'Height AO',      min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'ROUGHNESS',
    sliders: [
      { key: 'roughnessMin', label: 'Roughness Min',  min: 0,   max: 1,   step: 0.01 },
      { key: 'roughnessMax', label: 'Roughness Max',  min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'GGX SPECULAR',
    sliders: [
      { key: 'specStrength', label: 'Spec Strength',  min: 0,   max: 10,  step: 0.1  },
      { key: 'f0Dielectric', label: 'F0 Reflectivity',min: 0,   max: 1,   step: 0.01 },
      { key: 'fresnelPower', label: 'Fresnel Power',  min: 0.1, max: 10,  step: 0.1  },
      { key: 'specAoMask',   label: 'Spec AO Mask',   min: 0,   max: 1,   step: 0.01 },
      { key: 'specColorR',   label: 'Spec R',         min: 0,   max: 1,   step: 0.01 },
      { key: 'specColorG',   label: 'Spec G',         min: 0,   max: 1,   step: 0.01 },
      { key: 'specColorB',   label: 'Spec B',         min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'RIM LIGHT',
    sliders: [
      { key: 'rimStrength',  label: 'Rim Strength',   min: 0,   max: 5,   step: 0.05 },
      { key: 'rimPower',     label: 'Rim Power',      min: 1,   max: 10,  step: 0.1  },
      { key: 'rimColorR',    label: 'Rim R',          min: 0,   max: 1,   step: 0.01 },
      { key: 'rimColorG',    label: 'Rim G',          min: 0,   max: 1,   step: 0.01 },
      { key: 'rimColorB',    label: 'Rim B',          min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'CHANNEL B (Weights)',
    sliders: [
      { key: 'bMetalness',   label: 'B → Metalness',  min: 0,   max: 1,   step: 0.01 },
      { key: 'bAO',          label: 'B → AO',         min: 0,   max: 1,   step: 0.01 },
      { key: 'bSSS',         label: 'B → SSS',        min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'CHANNEL A (Weights)',
    sliders: [
      { key: 'aMetalness',   label: 'A → Metalness',  min: 0,   max: 1,   step: 0.01 },
      { key: 'aAO',          label: 'A → AO',         min: 0,   max: 1,   step: 0.01 },
      { key: 'aSSS',         label: 'A → SSS',        min: 0,   max: 1,   step: 0.01 },
    ],
  },
  {
    title: 'MASK EMISSIVE',
    sliders: [
      { key: 'maskBWeight',  label: 'Read B Channel', min: 0,   max: 1,   step: 0.01 },
      { key: 'maskAWeight',  label: 'Read A Channel', min: 0,   max: 1,   step: 0.01 },
      { key: 'maskIntensity',label: 'Base Intensity', min: 0,   max: 5,   step: 0.05 },
      { key: 'maskColorR',   label: 'Mask R',         min: 0,   max: 2,   step: 0.01 },
      { key: 'maskColorG',   label: 'Mask G',         min: 0,   max: 2,   step: 0.01 },
      { key: 'maskColorB',   label: 'Mask B',         min: 0,   max: 2,   step: 0.01 },
      { key: 'baseBlur',     label: 'Base Blur',      min: 0,   max: 50,  step: 1    },
      { key: 'noiseScale',   label: 'Noise Scale',    min: 0,   max: 20,  step: 0.1  },
      { key: 'noiseContrast',label: 'Noise Contrast', min: 0.1, max: 5,   step: 0.1  },
      { key: 'noiseSpeedX',  label: 'Noise Speed X',  min: -0.2,max: 0.2, step: 0.005},
      { key: 'noiseSpeedY',  label: 'Noise Speed Y',  min: -0.2,max: 0.2, step: 0.005},
    ],
  },
];

const PANEL_STYLES = `
  #centerpiece-debug-panel {
    position: fixed; top: 16px; right: 16px; width: 320px; max-height: 90vh; overflow-y: auto;
    background: rgba(10, 10, 14, 0.92); backdrop-filter: blur(8px);
    border: 1px solid rgba(180, 140, 60, 0.4); border-radius: 8px;
    color: #d4b060; font-family: 'JetBrains Mono', monospace, sans-serif; font-size: 11px;
    z-index: 9999; user-select: none;
  }
  #centerpiece-debug-panel .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: rgba(180, 140, 60, 0.12);
    border-bottom: 1px solid rgba(180, 140, 60, 0.3); cursor: grab;
  }
  #centerpiece-debug-panel .panel-title { font-weight: bold; letter-spacing: 0.05em; }
  #centerpiece-debug-panel .panel-close { cursor: pointer; opacity: 0.6; font-size: 14px; background: none; border: none; color: #d4b060; }
  #centerpiece-debug-panel .preset-bar { padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid rgba(180,140,60,0.15); }
  #centerpiece-debug-panel .preset-btn { background: rgba(180,140,60,0.12); border: 1px solid rgba(180,140,60,0.35); color: #d4b060; border-radius: 4px; padding: 2px 8px; font-size: 10px; cursor: pointer; }
  #centerpiece-debug-panel .preset-btn.active { background: rgba(180,140,60,0.35); }
  #centerpiece-debug-panel .duration-row { display: flex; align-items: center; gap: 6px; padding: 4px 12px; }
  #centerpiece-debug-panel .duration-input { width: 48px; background: rgba(255,255,255,0.06); border: 1px solid rgba(180,140,60,0.3); color: #d4b060; border-radius: 3px; }
  #centerpiece-debug-panel .custom-select-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; border-bottom: 1px solid rgba(180,140,60,0.15); }
  #centerpiece-debug-panel .custom-select { flex: 1; background: rgba(0,0,0,0.3); border: 1px solid rgba(180,140,60,0.3); color: #d4b060; padding: 2px 4px; border-radius: 4px; margin-left: 8px; }
  #centerpiece-debug-panel .section-title { padding: 6px 12px 2px; font-size: 9px; letter-spacing: 0.1em; opacity: 0.5; text-transform: uppercase; background: rgba(0,0,0,0.2); }
  #centerpiece-debug-panel .slider-row { display: flex; align-items: center; gap: 6px; padding: 2px 12px; }
  #centerpiece-debug-panel .slider-label { width: 110px; opacity: 0.75; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #centerpiece-debug-panel .slider-input { flex: 1; accent-color: #d4b060; cursor: pointer; }
  #centerpiece-debug-panel .slider-value { width: 36px; text-align: right; opacity: 0.9; }
  #centerpiece-debug-panel .action-bar { display: flex; gap: 6px; padding: 8px 12px; border-top: 1px solid rgba(180,140,60,0.15); }
  #centerpiece-debug-panel .action-btn { flex: 1; background: rgba(180,140,60,0.12); border: 1px solid rgba(180,140,60,0.35); color: #d4b060; border-radius: 4px; padding: 4px 6px; font-size: 10px; cursor: pointer; }
`;

export class CenterpieceDebugPanel {
  private _el: HTMLElement | null = null;
  private _styleEl: HTMLStyleElement | null = null;
  private _visible = true;
  private _decal: CenterpieceDecal;
  private _activePreset = 'rubedo';
  private _duration = 1.0;
  private _onKey: (e: KeyboardEvent) => void;
  private _sliderRefs: Map<string, { input: HTMLInputElement; valueEl: HTMLElement }> = new Map();
  private _animModeSelect: HTMLSelectElement | null = null;
  private _noiseTexSelect: HTMLSelectElement | null = null;

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
  }

  private _build(): void {
    if (!this._el) return;
    const params = this._decal.getCurrentParams() as any;

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span class="panel-title">⚗ Centerpiece PBR v2.0</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close'; closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.toggle());
    header.appendChild(closeBtn);
    this._el.appendChild(header);

    const presetBar = document.createElement('div');
    presetBar.className = 'preset-bar';
    Object.entries(CENTERPIECE_PRESETS).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = `preset-btn${key === this._activePreset ? ' active' : ''}`;
      btn.textContent = key; btn.dataset['presetKey'] = key;
      btn.addEventListener('click', () => this._applyPreset(key));
      presetBar.appendChild(btn);
    });
    
    const draftBtn = document.createElement('button');
    draftBtn.className = 'preset-btn'; draftBtn.textContent = 'draft-autosave';
    draftBtn.addEventListener('click', () => {
      const draftJson = localStorage.getItem('centerpiece-debug-draft');
      if (draftJson) {
        try {
          const parsed = JSON.parse(draftJson);
          this._decal.applyPreset(parsed, this._duration);
          this._activePreset = 'draft';
          this._el?.querySelectorAll('.preset-btn').forEach(b => (b as HTMLElement).classList.remove('active'));
          draftBtn.classList.add('active');
          setTimeout(() => this._syncUI(), Math.max(this._duration * 1000 + 50, 100));
        } catch (e) { console.error(e); }
      }
    });
    presetBar.appendChild(draftBtn);
    this._el.appendChild(presetBar);

    const durationRow = document.createElement('div');
    durationRow.className = 'duration-row';
    durationRow.innerHTML = `<span class="duration-label">Transition (s):</span>`;
    const durationInput = document.createElement('input');
    durationInput.type = 'number'; durationInput.className = 'duration-input';
    durationInput.value = String(this._duration);
    durationInput.addEventListener('input', () => { this._duration = parseFloat(durationInput.value) || 1.0; });
    durationRow.appendChild(durationInput);
    this._el.appendChild(durationRow);

    // Anim Mode
    const animRow = document.createElement('div');
    animRow.className = 'custom-select-row';
    animRow.innerHTML = `<span>Anim Mode</span>`;
    this._animModeSelect = document.createElement('select');
    this._animModeSelect.className = 'custom-select';
    ['Static', 'Breathe', 'Blink', 'Pulse'].forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx); opt.textContent = name;
      this._animModeSelect!.appendChild(opt);
    });
    this._animModeSelect.value = String(params.maskAnimMode ?? 1);
    this._animModeSelect.addEventListener('change', () => {
      const v = parseInt(this._animModeSelect!.value, 10);
      this._decal.applyPreset({ maskAnimMode: v } as any, 0);
      this._saveDraft();
    });
    animRow.appendChild(this._animModeSelect);
    this._el.appendChild(animRow);

    // Noise Texture
    const texRow = document.createElement('div');
    texRow.className = 'custom-select-row';
    texRow.innerHTML = `<span>Noise Tex</span>`;
    this._noiseTexSelect = document.createElement('select');
    this._noiseTexSelect.className = 'custom-select';
    const textures = [
      '/assets/canvas/textures/noise/Melt 14 - 512x512.png',
      '/assets/canvas/textures/noise/Smoke.png', // Just an example
    ];
    textures.forEach(path => {
      const opt = document.createElement('option');
      opt.value = path; opt.textContent = path.split('/').pop();
      this._noiseTexSelect!.appendChild(opt);
    });
    this._noiseTexSelect.addEventListener('change', () => {
      this._decal.loadMaskNoiseTexture(this._noiseTexSelect!.value);
      this._saveDraft();
    });
    texRow.appendChild(this._noiseTexSelect);
    this._el.appendChild(texRow);

    SLIDER_GROUPS.forEach(group => {
      const title = document.createElement('div');
      title.className = 'section-title'; title.textContent = group.title;
      this._el!.appendChild(title);

      group.sliders.forEach(def => {
        const row = document.createElement('div');
        row.className = 'slider-row';
        const label = document.createElement('span'); label.className = 'slider-label'; label.textContent = def.label;
        const input = document.createElement('input'); input.type = 'range'; input.className = 'slider-input';
        input.min = String(def.min); input.max = String(def.max); input.step = String(def.step);
        const rawVal = params[def.key] ?? 0;
        input.value = String(rawVal);
        const valueEl = document.createElement('span'); valueEl.className = 'slider-value'; valueEl.textContent = Number(rawVal).toFixed(2);

        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          valueEl.textContent = v.toFixed(2);
          this._decal.applyPreset({ [def.key]: v } as any, 0);
          this._saveDraft();
        });

        this._sliderRefs.set(def.key, { input, valueEl });
        row.appendChild(label); row.appendChild(input); row.appendChild(valueEl);
        this._el!.appendChild(row);
      });
    });

    const actionBar = document.createElement('div');
    actionBar.className = 'action-bar';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn'; exportBtn.textContent = 'Copy JS';
    exportBtn.addEventListener('click', () => this._exportParams());
    const dlJsonBtn = document.createElement('button');
    dlJsonBtn.className = 'action-btn'; dlJsonBtn.textContent = 'Download JSON';
    dlJsonBtn.addEventListener('click', () => this._downloadJson());
    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn'; resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => this._applyPreset(this._activePreset));

    actionBar.appendChild(exportBtn); actionBar.appendChild(dlJsonBtn); actionBar.appendChild(resetBtn);
    this._el.appendChild(actionBar);
  }

  private _saveDraft(): void {
    const p = this._decal.getCurrentParams() as any;
    if (this._noiseTexSelect) p.maskNoiseTex = this._noiseTexSelect.value;
    localStorage.setItem('centerpiece-debug-draft', JSON.stringify(p));
  }

  private _applyPreset(key: string): void {
    const preset = CENTERPIECE_PRESETS[key];
    if (!preset) return;
    this._activePreset = key;
    const p = presetToParams(preset);
    this._decal.applyPreset(p, this._duration);
    
    this._el?.querySelectorAll('.preset-btn').forEach(btn => {
      (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset['presetKey'] === key);
    });

    const syncDelay = Math.max(this._duration * 1000 + 50, 100);
    setTimeout(() => this._syncUI(), syncDelay);
  }

  private _syncUI(): void {
    const params = this._decal.getCurrentParams() as any;
    this._sliderRefs.forEach(({ input, valueEl }, key) => {
      const v = params[key] ?? 0;
      input.value = String(v);
      valueEl.textContent = Number(v).toFixed(2);
    });
    if (this._animModeSelect) this._animModeSelect.value = String(params.maskAnimMode ?? 1);
    if (this._noiseTexSelect && params.maskNoiseTex) {
      this._noiseTexSelect.value = params.maskNoiseTex;
    }
  }

  private _exportParams(): void {
    const p = this._decal.getCurrentParams() as any;
    const texStr = this._noiseTexSelect ? `\n  maskNoiseTex: '${this._noiseTexSelect.value}',` : '';
    
    const lines = [
      `, { // satisfies CenterpiecePreset`,
      `  alphaClip: ${p.alphaClip?.toFixed(3)},`,
      `  diffuseTint: [${p.diffuseTintR?.toFixed(3)}, ${p.diffuseTintG?.toFixed(3)}, ${p.diffuseTintB?.toFixed(3)}],`,
      `  normalFlipY: ${p.normalFlipY},`,
      `  lightHeight: ${p.lightHeight?.toFixed(3)},`,
      `  ambient: ${p.ambientStrength?.toFixed(3)},`,
      `  ambientColor: [${p.ambientR?.toFixed(3)}, ${p.ambientG?.toFixed(3)}, ${p.ambientB?.toFixed(3)}],`,
      `  diffuse: ${p.diffuse?.toFixed(3)},`,
      `  bump: ${p.bump?.toFixed(3)},`,
      `  parallax: ${p.parallax?.toFixed(4)},`,
      `  ao: ${p.ao?.toFixed(3)},`,
      `  roughnessMin: ${p.roughnessMin?.toFixed(3)},`,
      `  roughnessMax: ${p.roughnessMax?.toFixed(3)},`,
      `  specStrength: ${p.specStrength?.toFixed(3)},`,
      `  specColor: [${p.specColorR?.toFixed(3)}, ${p.specColorG?.toFixed(3)}, ${p.specColorB?.toFixed(3)}],`,
      `  f0Dielectric: ${p.f0Dielectric?.toFixed(3)},`,
      `  fresnelPower: ${p.fresnelPower?.toFixed(3)},`,
      `  specAoMask: ${p.specAoMask?.toFixed(3)},`,
      `  rimStrength: ${p.rimStrength?.toFixed(3)},`,
      `  rimPower: ${p.rimPower?.toFixed(3)},`,
      `  rimColor: [${p.rimColorR?.toFixed(3)}, ${p.rimColorG?.toFixed(3)}, ${p.rimColorB?.toFixed(3)}],`,
      `  bWeights: [${p.bMetalness?.toFixed(3)}, ${p.bAO?.toFixed(3)}, ${p.bSSS?.toFixed(3)}],`,
      `  aWeights: [${p.aMetalness?.toFixed(3)}, ${p.aAO?.toFixed(3)}, ${p.aSSS?.toFixed(3)}],`,
      `  maskBWeight: ${p.maskBWeight?.toFixed(3)},`,
      `  maskAWeight: ${p.maskAWeight?.toFixed(3)},`,
      `  maskAnimMode: ${p.maskAnimMode},`,
      `  maskIntensity: ${p.maskIntensity?.toFixed(3)},`,
      `  maskColor: [${p.maskColorR?.toFixed(3)}, ${p.maskColorG?.toFixed(3)}, ${p.maskColorB?.toFixed(3)}],`,
      `  baseBlur: ${p.baseBlur?.toFixed(1)},`,
      `  noiseScale: ${p.noiseScale?.toFixed(3)},`,
      `  noiseContrast: ${p.noiseContrast?.toFixed(3)},`,
      `  noiseSpeedX: ${p.noiseSpeedX?.toFixed(4)},`,
      `  noiseSpeedY: ${p.noiseSpeedY?.toFixed(4)},` + texStr,
      `}`,
    ];
    const str = lines.join('\n');
    console.log('%c[CenterpieceDebugPanel] Copied Preset JS:', 'color: #d4b060; font-weight: bold; font-size: 12px;');
    console.log(str);
    navigator.clipboard.writeText(str).catch(() => {});
  }

  private _downloadJson(): void {
    const p = this._decal.getCurrentParams() as any;
    if (this._noiseTexSelect) p.maskNoiseTex = this._noiseTexSelect.value;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `centerpiece-${Date.now()}.json`);
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
