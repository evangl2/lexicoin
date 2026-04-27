import React from 'react';

// --- 1. DEFINITIONS: The Raw Materials ---
// These are the primitive values (colors, gradients, assets) used throughout the system.

const definitions = {
  colors: {
    goldBase: "#C0A062",
    goldBright: "#F0D082",
    goldDark: "#A08855",
    goldDeep: "#A08042",
    goldMetallic: "#D4AF37", // Classic metallic gold
    champagne: "#F7E7CE", // Alchemy Champagne Gold

    obsidian: "#0a0a0a",
    obsidianDark: "#0e0e0e",
    obsidianDeep: "#050505",

    textLight: "#e5e5e5",
    textDim: "rgba(229, 229, 229, 0.9)",

    // Feedback Colors
    cyan: "#ffffff", // Changed to White per feedback (Albedo)
    cyanGlow: "rgba(255, 255, 255, 0.4)",
    goldGlow: "rgba(255, 215, 0, 0.4)",
  },
  gradients: {
    goldMetallic: "linear-gradient(135deg, #C0A062 0%, #F0D082 50%, #8B7355 100%)",
    goldText: "linear-gradient(to bottom, #F0D082, #A08042)",
    sheen: "linear-gradient(to right, transparent, rgba(240, 208, 130, 0.6), transparent)",
    backSheen: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
    definitionBoxOverlay: "linear-gradient(135deg, rgba(192, 160, 98, 0.03) 0%, transparent 50%, rgba(0, 0, 0, 0.2) 100%)",
  },
  assets: {
    noiseTexture: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    deepPattern: `url("data:image/svg+xml,%3Csvg width='240' height='120' viewBox='0 0 240 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='mysticGlow'%3E%3CfeGaussianBlur stdDeviation='0.3' result='blur'/%3E%3CfeMerge%3E%3CfeMergeNode in='blur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cg fill='none' stroke='%23A08855' stroke-width='0.7' opacity='0.8' filter='url(%23mysticGlow)'%3E%3C!-- Row 1 (Y=20) --%3E%3Cg transform='translate(15,20)'%3E%3Ccircle cx='0' cy='0' r='5.5'/%3E%3Cpath d='M-5.5 0h11'/%3E%3Cpath d='M-2 -2l4 4M2 -2l-4 4' stroke-width='0.4'/%3E%3C/g%3E%3C!-- Salt --%3E%3Cg transform='translate(45,20)'%3E%3Cpath d='M0 -7l6 10h-12z'/%3E%3Cpath d='M0 3v6M-4 6h8'/%3E%3Ccircle cx='0' cy='6' r='1' fill='%23A08855'/%3E%3C/g%3E%3C!-- Sulfur --%3E%3Cg transform='translate(75,20)'%3E%3Cpath d='M-4 -8c0 0 0 4 4 4s4 -4 4 -4'/%3E%3Ccircle cx='0' cy='-3' r='4'/%3E%3Cpath d='M0 1v8M-3 5h6M-2 8h4'/%3E%3C/g%3E%3C!-- Mercury --%3E%3Cg transform='translate(105,20)'%3E%3Cpath d='M0 -7l7 11h-14z'/%3E%3Ccircle cx='0' cy='-1' r='1.5' fill='%23A08855'/%3E%3C/g%3E%3C!-- Fire --%3E%3Cg transform='translate(135,20)'%3E%3Cpath d='M0 -7l7 11h-14z'/%3E%3Cpath d='M-7 -2h14'/%3E%3Cpath d='M-2 -4h4' stroke-width='0.4'/%3E%3C/g%3E%3C!-- Air --%3E%3Cg transform='translate(165,20)'%3E%3Cpath d='M0 7l-7 -11h14z'/%3E%3Ccircle cx='0' cy='0' r='2'/%3E%3C/g%3E%3C!-- Water --%3E%3Cg transform='translate(195,20)'%3E%3Cpath d='M0 7l-7 -11h14z'/%3E%3Cpath d='M-7 -2h14'/%3E%3Cpath d='M-2 -5h4' stroke-width='0.4'/%3E%3C/g%3E%3C!-- Earth --%3E%3Cg transform='translate(225,20)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23A08855'/%3E%3Ccircle cx='0' cy='0' r='3.5' stroke-dasharray='1 2'/%3E%3C/g%3E%3C!-- Gold --%3E%3C!-- Row 2 (Y=60) --%3E%3Cg transform='translate(15,60)'%3E%3Cpath d='M-3 -7v14M-3 3h6'/%3E%3Cpath d='M-3 -7a4 4 0 0 1 4 -4'/%3E%3Ccircle cx='1' cy='-11' r='1.2' fill='%23A08855'/%3E%3C/g%3E%3C!-- Lead --%3E%3Cg transform='translate(45,60)'%3E%3Ccircle cx='0' cy='-2' r='5'/%3E%3Cpath d='M0 3v8M-4 7h8'/%3E%3Cpath d='M-2 11h4' stroke-width='0.4'/%3E%3C/g%3E%3C!-- Copper --%3E%3Cg transform='translate(75,60)'%3E%3Ccircle cx='0' cy='2' r='5'/%3E%3Cpath d='M4 -3l6 -6M5 -9h4v4'/%3E%3Ccircle cx='0' cy='2' r='1.5' opacity='0.5'/%3E%3C/g%3E%3C!-- Iron --%3E%3Cg transform='translate(105,60)'%3E%3Cpath d='M3 -7a7 7 0 1 0 0 14a6 6 0 0 1 0 -14'/%3E%3Ccircle cx='2' cy='0' r='1'/%3E%3C/g%3E%3C!-- Silver --%3E%3Cg transform='translate(135,60)'%3E%3Cpath d='M-4 -4l8 0l-8 8l8 0'/%3E%3Ccircle cx='0' cy='0' r='2.5'/%3E%3Cpath d='M0 -2.5v-3' stroke-width='0.4'/%3E%3C/g%3E%3C!-- Tin --%3E%3Cg transform='translate(165,60)'%3E%3Ccircle cx='0' cy='2' r='5'/%3E%3Cpath d='M0 -3v-7M-4 -7h8'/%3E%3Ccircle cx='0' cy='-10' r='1' fill='%23A08855'/%3E%3C/g%3E%3C!-- Antimony --%3E%3Cg transform='translate(195,60)'%3E%3Cpath d='M-5 -5l10 10M5 -5l-10 10'/%3E%3Ccircle cx='0' cy='0' r='3.5'/%3E%3Ccircle cx='0' cy='-5' r='1'/%3E%3Ccircle cx='0' cy='5' r='1'/%3E%3C/g%3E%3C!-- Arsenic --%3E%3Cg transform='translate(225,60)'%3E%3Cpath d='M-4 -6c0 0 0 4 4 4s4 -4 4 -4v8c0 0 0 4 -4 4s-4 -4 -4 -4z'/%3E%3Ccircle cx='0' cy='0' r='1.5' fill='%23A08855'/%3E%3C/g%3E%3C!-- Bismuth --%3E%3C!-- Row 3 (Y=100) --%3E%3Cg transform='translate(15,100)'%3E%3Cpath d='M-5 -5l10 10M5 -5l-10 10'/%3E%3Ccircle cx='0' cy='0' r='3.5'/%3E%3Cpath d='M0 -6v12M-6 0h12' stroke-width='0.3' opacity='0.4'/%3E%3C/g%3E%3Cg transform='translate(45,100)'%3E%3Cpath d='M-6 0h12M0 -6v12' stroke-dasharray='2 1'/%3E%3Ccircle cx='0' cy='0' r='5'/%3E%3C/g%3E%3Cg transform='translate(75,100)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Cpath d='M-4 -4l8 8M4 -4l-8 8'/%3E%3Ccircle cx='0' cy='0' r='2' fill='%23A08855'/%3E%3C/g%3E%3Cg transform='translate(105,100)'%3E%3Ccircle cx='0' cy='0' r='5'/%3E%3Cpath d='M-5 0a5 5 0 0 1 10 0'/%3E%3Ccircle cx='0' cy='0' r='1' fill='%23A08855'/%3E%3C/g%3E%3Cg transform='translate(135,100)'%3E%3Cpath d='M-5 -5h10v10h-10z' transform='rotate(45)'/%3E%3Ccircle cx='0' cy='0' r='1.5'/%3E%3C/g%3E%3Cg transform='translate(165,100)'%3E%3Cpath d='M-6 4l6 -8l6 8z'/%3E%3Cpath d='M0 -4v8' stroke-width='0.4'/%3E%3C/g%3E%3Cg transform='translate(195,100)'%3E%3Cpath d='M-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' stroke-dasharray='1 1'/%3E%3Ccircle cx='0' cy='0' r='0.5' fill='%23A08855'/%3E%3C/g%3E%3Cg transform='translate(225,100)'%3E%3Cpath d='M-5 0h10M0 -5v10'/%3E%3Ccircle cx='-5' cy='0' r='1'/%3E%3Ccircle cx='5' cy='0' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    backPattern: `url("data:image/svg+xml,%3Csvg width='120' height='60' viewBox='0 0 120 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C0A062' stroke-width='0.5' opacity='0.3'%3E%3C!-- Salt --%3E%3Cg transform='translate(15,20)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Cpath d='M-6 0h12'/%3E%3C/g%3E%3C!-- Sulfur --%3E%3Cg transform='translate(45,20)'%3E%3Cpath d='M0 -6l5 10h-10z'/%3E%3Cpath d='M0 4v8M-4 8h8'/%3E%3C/g%3E%3C!-- Mercury --%3E%3Cg transform='translate(75,20)'%3E%3Cpath d='M-4 -8a4 4 0 0 0 8 0'/%3E%3Ccircle cx='0' cy='-3' r='4'/%3E%3Cpath d='M0 1v8M-4 5h8'/%3E%3C/g%3E%3C!-- Fire --%3E%3Cg transform='translate(105,20)'%3E%3Cpath d='M0 -6l6 10h-12z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  }
};

// --- 2. SEMANTIC TOKENS: The Design Decisions ---
// These tokens map raw materials to specific functional purposes in the UI.

const tokens = {
  layout: {
    radius: "22px",
    borderWidth: "2px",
    borderThin: "1px",
  },
  colors: {
    bgFront: definitions.colors.obsidian,
    bgBack: definitions.colors.obsidianDark,
    bgDeep: definitions.colors.obsidianDeep,
    bgPanel: "rgba(0, 0, 0, 0.1)",
    bgOverlay: "rgba(14, 14, 14, 0.98)",

    textPrimary: definitions.colors.textLight,
    textSecondary: definitions.colors.goldBase,
    textMuted: "rgba(192, 160, 98, 0.7)",
    textHighlight: definitions.colors.goldBright,
    textChampagne: definitions.colors.champagne,

    borderOuter: "rgba(192, 160, 98, 0.5)",
    borderInner: "rgba(192, 160, 98, 0.2)",
    borderSubtle: "rgba(192, 160, 98, 0.1)",
    borderHighlight: "rgba(240, 208, 130, 0.6)",

    selectionActive: "rgba(192, 160, 98, 0.2)",
    scrollbarThumb: "rgba(212, 175, 55, 0.5)", // Original gold semi-transparent

    // Legacy/Metallic Fallbacks
    goldMetallic: definitions.colors.goldMetallic,
    goldBright: definitions.colors.goldBright,
    goldDeep: definitions.colors.goldDeep,

    // Back Face Specifics
    selectionBackend: "rgba(5, 5, 5, 0.96)",
    selectionItemActive: "rgba(192, 160, 98, 0.12)",
    selectionItemInactive: "rgba(255, 255, 255, 0.02)",
    definitionBoxBg: "rgba(10, 10, 10, 0.6)",
    flavorBoxBg: "rgba(0, 0, 0, 0.4)",
  },
  feedback: {
    merge: {
      color: definitions.colors.cyan, // White
      glow: `0 0 20px ${definitions.colors.cyanGlow}, inset 0 0 10px ${definitions.colors.cyanGlow}`,
      // Conjunction Rune: Two Intersecting Circles/Rings + Vertical Line
      svg: {
        // Ring 1 (Top Center 12,9 R5) + Ring 2 (Bottom Center 12,15 R5)
        // M12 4... defines outer/inner ring paths. M11 4... defines vertical line.
        path: "M12 4a5 5 0 1 0 0 10 5 5 0 1 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 1 1 0-6zm0 4a5 5 0 1 0 0 10 5 5 0 1 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 1 1 0-6z",
        secondaryPath: "M11.5 3h1v18h-1z", // Vertical Line
      }
    },
    split: {
      color: definitions.colors.goldBright,
      glow: `0 0 20px ${definitions.colors.goldGlow}, inset 0 0 10px ${definitions.colors.goldGlow}`,
      // Separation Rune (Alchemical): "The Cracked Core"
      // Detailed: A solid inner gold core (R=7) split horizontally, contained by a fine, dashed orbital ring (R=11).
      svg: {
        // Inner: Split Solid Circle (Radius 7 -> D=14)
        // M5 11... Upper Half. M5 13... Lower Half.
        path: "M5 11 A7 7 0 0 1 19 11 Z M5 13 A7 7 0 0 0 19 13 Z",

        // Outer: Fine Dashed Ring (Radius 11 -> D=22)
        strokePath: "M12 1 A11 11 0 1 0 12 23 A11 11 0 1 0 12 1 Z",
        strokeWidth: "0.8",  // Fine alchemical line
        strokeDash: "2 3",   // Dotted/Stippled effect
      }
    }
  },
  typography: {
    /**
     * Label Font (Card Titles - Front & Back)
     * Alchemical aesthetic with multilingual support
     * - Cinzel: Elegant serif for Latin scripts (en, fr, de, es, it, pt)
     * - Noto Serif SC/JP: Elegant serif for Chinese & Japanese
     */
    label: {
      family: "'Cinzel', 'Noto Serif SC', 'Noto Serif JP', 'PingFang SC', 'Hiragino Mincho ProN', 'Songti SC', 'Microsoft YaHei', 'SimSun', 'MS Mincho', serif",
      gradient: definitions.gradients.goldText,
    },
    /**
     * Body Font (Definition & Flavor Text)
     * Readable with multilingual support
     * - Merriweather: Clear serif for Latin scripts
     * - Noto Sans SC/JP: Clean sans-serif for Chinese & Japanese
     */
    body: {
      family: "'Merriweather', 'Noto Sans SC', 'Noto Sans JP', 'PingFang SC', 'Hiragino Sans', 'Microsoft YaHei', 'SimHei', 'MS Gothic', sans-serif",
      color: definitions.colors.goldBase,
    },
    /**
     * Custom tiers for the dominant card title (Learning Language Word)
     */
    mainWordTiers: [
      { id: 'word-xl', fontSize: 40, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'XL (<10)' },
      { id: 'word-lg', fontSize: 34, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'LG (10-15)' },
      { id: 'word-md', fontSize: 28, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'MD (15-20)' },
      { id: 'word-sm', fontSize: 22, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 0.95, label: 'SM (20-30)' },
      { id: 'word-xs', fontSize: 18, lineHeight: 1.2, tracking: '0.1em', weight: 700, opacity: 0.9, label: 'XS (> 30)' },
    ],
  },
  shadows: {
    base: "0 10px 20px -5px rgba(0, 0, 0, 0.6)",
    hover: "0 30px 50px -10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(212, 175, 55, 0.2)",
    dragging: "0 40px 80px -15px rgba(0, 0, 0, 0.9)",
    expanded: "0 80px 140px -20px rgba(0, 0, 0, 1.0)",
    innerDepth: "inset 0 0 40px rgba(0,0,0,1)",

    definitionBox: "inset 0 1px 0 0 rgba(240, 208, 130, 0.1), inset 0 -1px 0 0 rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4)",
    flavorBox: "inset 0 1px 0 0 rgba(240, 208, 130, 0.05), inset 0 -1px 0 0 rgba(0, 0, 0, 0.3), 0 1px 4px rgba(0, 0, 0, 0.3)",
    selectionGlow: "0 0 25px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(240, 208, 130, 0.15)",
  }
};

// --- 3. VISUAL COMPONENTS: The Skin Implementation ---
// Reusable visual elements that consume the tokens above.

const HermeticBackground = React.memo(() => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.1] overflow-hidden z-0">
    <svg viewBox="0 0 400 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={definitions.colors.goldBase} stopOpacity="0.8" />
          <stop offset="100%" stopColor={definitions.colors.goldBase} stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="200" y1="0" x2="200" y2="600" stroke={definitions.colors.goldBase} strokeWidth="0.5" strokeDasharray="2 4" />

      <g transform="translate(200, 300)">
        <circle r="180" fill="none" stroke={definitions.colors.goldBase} strokeWidth="0.5" />
        <circle r="175" fill="none" stroke={definitions.colors.goldBase} strokeWidth="0.2" strokeDasharray="10 5" />

        <path d="M0 -180 L155.88 90 H-155.88 Z" fill="none" stroke={definitions.colors.goldBase} strokeWidth="0.5" opacity="0.6" />
        <path d="M0 180 L-155.88 -90 H155.88 Z" fill="none" stroke={definitions.colors.goldBase} strokeWidth="0.5" opacity="0.6" />

        <rect x="-120" y="-120" width="240" height="240" transform="rotate(45)" fill="none" stroke={definitions.colors.goldBase} strokeWidth="0.3" />

        <ellipse rx="80" ry="220" fill="none" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(30)" />
        <ellipse rx="80" ry="220" fill="none" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(-30)" />
      </g>
    </svg>
  </div>
));

const RepeatingSymbolBackground = React.memo(() => (
  <div
    className="absolute inset-0 opacity-[0.15] pointer-events-none"
    style={{
      backgroundImage: definitions.assets.deepPattern,
      backgroundSize: '280px 140px',
      backgroundPosition: '-8px 0'
    }}
  />
));

const CORNER_INDICES = [0, 1, 2, 3];

const AlchemicalCorners = React.memo(() => (
  <div className="absolute inset-0 pointer-events-none z-20">
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={definitions.colors.goldBright} />
          <stop offset="100%" stopColor={definitions.colors.goldDark} />
        </linearGradient>
      </defs>
    </svg>

    {CORNER_INDICES.map((i) => (
      <div key={i} className={`absolute w-10 h-10 ${i === 0 ? 'top-0 left-0' :
        i === 1 ? 'top-0 right-0 transform scale-x-[-1]' :
          i === 2 ? 'bottom-0 left-0 transform scale-y-[-1]' :
            'bottom-0 right-0 transform scale-[-1]'
        }`}>
        <svg viewBox="0 0 40 40" className="w-full h-full overflow-visible">
          <path d="M2 2 L35 2 L2 35 Z" fill="url(#cornerGrad)" fillOpacity="0.05" stroke="url(#cornerGrad)" strokeWidth="0.5" />
          <circle cx="8" cy="8" r="1.5" fill={definitions.colors.goldBright} />
          <path d="M2 14 H14" stroke={definitions.colors.goldBase} strokeWidth="0.5" />
          <path d="M14 2 V14" stroke={definitions.colors.goldBase} strokeWidth="0.5" />
          <circle cx="20" cy="5" r="1" fill={definitions.colors.goldBase} opacity="0.5" />
          <circle cx="5" cy="20" r="1" fill={definitions.colors.goldBase} opacity="0.5" />
        </svg>
      </div>
    ))}
  </div>
));

const FRAME_TICKS = [...Array(25)];

const CrucibleFrame = React.memo(() => (
  <>
    <div className="absolute inset-0 border rounded-sm pointer-events-none" style={{ borderColor: tokens.colors.borderInner }} />
    <div className="absolute inset-x-0 top-0 h-[1px] opacity-50" style={{ background: definitions.gradients.sheen }} />

    <div className="absolute top-0 inset-x-0 h-3 border-b flex justify-between px-2 items-end" style={{ borderColor: tokens.colors.borderInner }}>
      {FRAME_TICKS.map((_, i) => (
        <div key={i} className={`w-[1px] ${i % 5 === 0 ? 'h-2 opacity-50' : 'h-1 opacity-20'}`} style={{ backgroundColor: definitions.colors.goldBase }} />
      ))}
    </div>

    <div className="absolute top-1/2 left-0 -translate-y-1/2 h-2/3 w-1 border-l border-t border-b" style={{ borderColor: tokens.colors.borderOuter }} />
    <div className="absolute top-1/2 right-0 -translate-y-1/2 h-2/3 w-1 border-r border-t border-b" style={{ borderColor: tokens.colors.borderOuter }} />

    <div className="absolute bottom-1.5 right-3 flex space-x-1 opacity-40 mix-blend-screen">
      <svg width="60" height="6" viewBox="0 0 60 6">
        <path d="M0 6 L5 0 L10 6 M15 3 H25 M30 0 V6 M35 0 L40 6 M45 3 H55" fill="none" stroke={definitions.colors.goldBright} strokeWidth="1" />
      </svg>
    </div>

    <div className="absolute -top-[1px] left-1/4 w-1 h-1 rounded-full" style={{ backgroundColor: tokens.colors.borderOuter }} />
    <div className="absolute -top-[1px] right-1/4 w-1 h-1 rounded-full" style={{ backgroundColor: tokens.colors.borderOuter }} />
  </>
));



const AlchemyDurabilityBar = React.memo(({ progress }: { progress: number }) => (
  <div className="w-full flex justify-center items-end pb-[1px]">
    <div
      className="h-[2px] transition-all duration-500 ease-out"
      style={{
        width: `${progress}%`,
        background: definitions.gradients.goldMetallic,
        boxShadow: `0 0 8px ${definitions.colors.goldBright}, 0 0 4px ${definitions.colors.goldBase}`
      }}
    />
  </div>
));

// --- 4. EXPORT: The Persona Bundle ---

export const DefaultCardPersona = {
  identity: {
    name: "Default",
    theme: "Alchemy",
  },
  definitions,
  tokens,
  visuals: {
    Background: RepeatingSymbolBackground,
    Corners: AlchemicalCorners,
    Frame: CrucibleFrame,
    Divider: null,
    BackTop: null,
    BackSeparator: null,
    DurabilityBar: AlchemyDurabilityBar,
    ScrapLabel: null, // Placeholder for other personas
    TextureOverlay: null, // Placeholder for other personas
  },
  physics: {
    springs: {
      smoothVelocity: { damping: 40, stiffness: 150, mass: 0.8 },
      mouseTilt: { damping: 50, stiffness: 120, mass: 1 },
      scale: { stiffness: 260, damping: 22, mass: 0.8 },
      flip: { stiffness: 220, damping: 24 },
    },
    tilt: {
      velocityRange: [-1500, 1500],
      rotateY: [-20, 20],
      rotateX: [20, -20],
      rotateZ: [-3, 3],
    },
    inspection: {
      tiltFactor: 15,
    },
    glare: {
      opacityCap: 0.5,
      color: "rgba(255, 236, 179, 0.2)",
    }
  }
};
