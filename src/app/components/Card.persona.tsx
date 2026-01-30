import React from 'react';
import { motion } from 'motion/react';

// --- DEFINITIONS & TOKENS ---

const definitions = {
  colors: {
    goldBase: "#C0A062",
    goldBright: "#F0D082",
    goldDark: "#A08855",
    goldDeep: "#A08042",
    
    obsidian: "#0a0a0a",
    obsidianDark: "#0e0e0e",
    obsidianDeep: "#050505",
    
    textLight: "#e5e5e5",
    textDim: "rgba(229, 229, 229, 0.9)",
  },
  gradients: {
    goldMetallic: "linear-gradient(135deg, #C0A062 0%, #F0D082 50%, #8B7355 100%)",
    goldText: "linear-gradient(to bottom, #F0D082, #A08042)",
    sheen: "linear-gradient(to right, transparent, rgba(240, 208, 130, 0.6), transparent)",
    backSheen: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
  },
  assets: {
    noiseTexture: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    deepPattern: `url("data:image/svg+xml,%3Csvg width='120' height='60' viewBox='0 0 120 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23A08855' stroke-width='0.8'%3E%3C!-- Salt --%3E%3Cg transform='translate(15,20)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Cpath d='M-6 0h12'/%3E%3C/g%3E%3C!-- Sulfur --%3E%3Cg transform='translate(45,20)'%3E%3Cpath d='M0 -6l5 10h-10z'/%3E%3Cpath d='M0 4v8M-4 8h8'/%3E%3C/g%3E%3C!-- Mercury --%3E%3Cg transform='translate(75,20)'%3E%3Cpath d='M-4 -8a4 4 0 0 0 8 0'/%3E%3Ccircle cx='0' cy='-3' r='4'/%3E%3Cpath d='M0 1v8M-4 5h8'/%3E%3C/g%3E%3C!-- Fire --%3E%3Cg transform='translate(105,20)'%3E%3Cpath d='M0 -6l6 10h-12z'/%3E%3C/g%3E%3C!-- Water --%3E%3Cg transform='translate(15,45)'%3E%3Cpath d='M0 6l-6 -10h12z'/%3E%3C/g%3E%3C!-- Earth --%3E%3Cg transform='translate(45,45)'%3E%3Cpath d='M0 6l-6 -10h12z'/%3E%3Cpath d='M-6 -2h12'/%3E%3C/g%3E%3C!-- Gold --%3E%3Cg transform='translate(75,45)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Ccircle cx='0' cy='0' r='1' fill='%23A08855'/%3E%3C/g%3E%3C!-- Lead --%3E%3Cg transform='translate(105,45)'%3E%3Cpath d='M0 -6v12M-4 2h8'/%3E%3Cpath d='M0 -6a3 3 0 0 1 3 -3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    backPattern: `url("data:image/svg+xml,%3Csvg width='120' height='60' viewBox='0 0 120 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C0A062' stroke-width='0.5' opacity='0.3'%3E%3C!-- Salt --%3E%3Cg transform='translate(15,20)'%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Cpath d='M-6 0h12'/%3E%3C/g%3E%3C!-- Sulfur --%3E%3Cg transform='translate(45,20)'%3E%3Cpath d='M0 -6l5 10h-10z'/%3E%3Cpath d='M0 4v8M-4 8h8'/%3E%3C/g%3E%3C!-- Mercury --%3E%3Cg transform='translate(75,20)'%3E%3Cpath d='M-4 -8a4 4 0 0 0 8 0'/%3E%3Ccircle cx='0' cy='-3' r='4'/%3E%3Cpath d='M0 1v8M-4 5h8'/%3E%3C/g%3E%3C!-- Fire --%3E%3Cg transform='translate(105,20)'%3E%3Cpath d='M0 -6l6 10h-12z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  }
};

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

    borderOuter: "rgba(192, 160, 98, 0.5)",
    borderInner: "rgba(192, 160, 98, 0.2)",
    borderSubtle: "rgba(192, 160, 98, 0.1)",
    borderHighlight: "rgba(240, 208, 130, 0.6)",
    
    selectionActive: "rgba(192, 160, 98, 0.2)",
  },
  typography: {
    label: {
      family: "'Cinzel', serif",
      gradient: definitions.gradients.goldText,
    },
    body: {
      family: "'Merriweather', serif",
      color: definitions.colors.goldBase,
    }
  },
  shadows: {
    base: "0 10px 20px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0,0,0,0.8)",
    hover: "0 30px 50px -10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(212, 175, 55, 0.2)",
    dragging: "0 40px 80px -15px rgba(0, 0, 0, 0.9)",
    expanded: "0 80px 140px -20px rgba(0, 0, 0, 1.0)",
    innerDepth: "inset 0 0 40px rgba(0,0,0,1)",
  }
};

// --- VISUAL COMPONENTS (The "Skin" Implementation) ---

const HermeticBackground = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] overflow-hidden z-0 mix-blend-overlay">
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
);

const AlchemicalCorners = () => (
  <div className="absolute inset-0 pointer-events-none z-20">
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor={definitions.colors.goldBright} />
           <stop offset="100%" stopColor={definitions.colors.goldDark} />
        </linearGradient>
      </defs>
    </svg>

    {[0, 1, 2, 3].map((i) => (
      <div key={i} className={`absolute w-10 h-10 ${
        i === 0 ? 'top-0 left-0' : 
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
);

const CrucibleFrame = () => (
   <>
      <div className="absolute inset-0 border rounded-sm pointer-events-none" style={{ borderColor: tokens.colors.borderInner }} />
      <div className="absolute inset-x-0 top-0 h-[1px] opacity-50" style={{ background: definitions.gradients.sheen }} />
      
      <div className="absolute top-0 inset-x-0 h-3 border-b flex justify-between px-2 items-end" style={{ borderColor: tokens.colors.borderInner }}>
         {[...Array(25)].map((_, i) => (
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
);

const SunMoonDivider = () => (
  <div className="relative flex items-center justify-center w-full mb-5 opacity-90">
    <div className="h-[1px] w-full max-w-[140px]" style={{ background: definitions.gradients.sheen }} />
    <div className="absolute flex items-center justify-center">
       <div className="w-3 h-3 rounded-full border flex items-center justify-center z-10" style={{ borderColor: definitions.colors.goldBright, backgroundColor: definitions.colors.obsidian, boxShadow: `0 0 10px rgba(240, 208, 130, 0.3)` }}>
          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: definitions.colors.goldBright, boxShadow: `0 0 4px ${definitions.colors.goldBright}` }} />
       </div>
       <div className="absolute -left-5 w-3 h-3 rounded-full border-l -rotate-45" style={{ borderColor: tokens.colors.borderHighlight }} />
       <div className="absolute -right-5 w-3 h-3 rounded-full border-r rotate-45" style={{ borderColor: tokens.colors.borderHighlight }} />
    </div>
  </div>
);

const BackTopDecoration = () => (
  <div className="w-full flex items-center justify-center mb-1 opacity-70">
    <div className="h-[1px] flex-1 mr-2" style={{ background: `linear-gradient(to right, transparent, ${tokens.colors.borderOuter}, transparent)` }} />
    <svg width="24" height="12" viewBox="0 0 24 12" style={{ color: definitions.colors.goldBase }}>
      <path d="M12 0L14 4L18 5L14 6L12 10L10 6L6 5L10 4L12 0Z" fill="currentColor" />
      <circle cx="2" cy="6" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="22" cy="6" r="1" fill="currentColor" opacity="0.6" />
    </svg>
    <div className="h-[1px] flex-1 ml-2" style={{ background: `linear-gradient(to right, transparent, ${tokens.colors.borderOuter}, transparent)` }} />
  </div>
);

const BackMiddleSeparator = () => (
  <div className="w-full flex items-center justify-center my-3 opacity-60">
    <div className="w-1.5 h-1.5 rotate-45 border bg-black/40" style={{ borderColor: definitions.colors.goldBase }} />
    <div className="h-[1px] w-full max-w-[80%] mx-2" style={{ backgroundColor: tokens.colors.borderInner }} />
    <div className="w-1.5 h-1.5 rotate-45 border bg-black/40" style={{ borderColor: definitions.colors.goldBase }} />
  </div>
);

// --- EXPORT ---

export const CardPersona = {
  identity: {
    name: "Default",
    theme: "Alchemy",
  },
  definitions,
  tokens,
  visuals: {
    Background: HermeticBackground,
    Corners: AlchemicalCorners,
    Frame: CrucibleFrame,
    Divider: SunMoonDivider,
    BackTop: BackTopDecoration,
    BackSeparator: BackMiddleSeparator,
  },
  physics: {
    springs: {
      smoothVelocity: { damping: 40, stiffness: 150, mass: 0.8 },
      mouseTilt: { damping: 50, stiffness: 120, mass: 1 },
      scale: { stiffness: 200, damping: 25, mass: 0.8 },
      flip: { stiffness: 150, damping: 20 },
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
