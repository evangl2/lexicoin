import React from 'react';
import { motion } from 'motion/react';

// --- 1. DEFINITIONS: The Raw Materials ---
// These are the core color palette and asset definitions.

const definitions = {
  colors: {
    goldBase: "#D4AF37",
    goldBright: "#F0D082",
    goldDim: "rgba(212, 175, 55, 0.6)",
    goldMedium: "rgba(212, 175, 55, 0.4)",
    goldStrong: "rgba(212, 175, 55, 0.8)",
    goldFaint: "rgba(212, 175, 55, 0.2)",
    goldTrace: "rgba(212, 175, 55, 0.05)",

    obsidian: "#0a0a0a",
    obsidianDark: "#0e0e0e",
    obsidianDeep: "#050505",
    obsidianPanel: "rgba(5, 5, 5, 0.95)",

    textDim: "#888888",
    textMuted: "#555555",
    textBright: "#F0D082",
  },
  gradients: {
    goldMetallic: "linear-gradient(135deg, #C0A062 0%, #F0D082 50%, #8B7355 100%)",
    goldText: "linear-gradient(to bottom, #F0D082, #A08042)",
    sheen: "linear-gradient(to right, transparent, rgba(240, 208, 130, 0.6), transparent)",
    void: "radial-gradient(circle at center, transparent 0%, #000 100%)",
    goldRadialSubtle: "radial-gradient(circle at center, rgba(212,175,55,0.15) 0%, transparent 70%)",
  },
  assets: {
    noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
  }
};

// --- 2. SEMANTIC TOKENS: The Design Decisions ---
// These tokens govern layout, behavior, and component-specific styling.

const tokens = {
  layout: {
    menuWidth: "80vw",
    menuHeight: "260px",
    headerHeight: "3.5rem", // h-14
    tabHeight: "4rem", // h-16
    cornerRadius: "1rem", // rounded-2xl
    dockOffset: "87px",
  },
  colors: {
    bgGlass: definitions.colors.obsidianPanel,
    bgDeep: definitions.colors.obsidianDeep,

    borderBase: definitions.colors.goldDim,
    borderFaint: definitions.colors.goldFaint,
    borderTrace: definitions.colors.goldTrace,
    borderHighlight: definitions.colors.goldBright,

    textLabel: definitions.colors.textDim,
    textActive: definitions.colors.textBright,
    textMuted: definitions.colors.textMuted,

    highlight: definitions.colors.goldBase,
    iconDefault: definitions.colors.textMuted,
    iconActive: definitions.colors.goldBright,
  },
  typography: {
    label: {
      family: "'Cinzel', serif",
      tracking: "0.2em",
      size: "10px",
    },
    rune: {
      family: "serif",
      size: "24px",
    }
  },
  shadows: {
    glow: "0 0 50px rgba(0,0,0,0.8)",
    glowGold: "0 0 15px rgba(212,175,55,1)",
    glowGoldSoft: "0 0 8px rgba(212,175,55,0.4)",
    panel: "0 0 40px rgba(0,0,0,0.8)",
  },
  dock: {
    layout: {
      bottomPosition: "3rem", // equivalent to bottom-12
      baseWidth: 1600,
      paddingX: "2.5rem", // px-10
      paddingY: "1.5rem", // py-6
      gap: "2.5rem", // gap-10
      nodeSize: "2.25rem", // w-9 h-9
    },
    behavior: {
      fadeDelay: 3000,
      scaleMin: 0.6,
      scaleMax: 1.3,
    },
    style: {
      blurStrength: "10px",
      rimInset: "3px",
      accentInset: "-2px",
      sideAccentWidth: "0.25rem",
      sideAccentHeight: "2rem",
      radialOpacity: 0.6,
    },
    metrics: {
      ringInnerInset: "-6px",
      ringOuterInset: "-14px",
      tickHeight: "0.5rem",
      tickOffset: "-20px",
      runeOffset: "-3rem", // -top-12
      labelOffset: "-2.5rem", // -bottom-10
      iconSize: 18,
      activeScale: 1.6,
      iconActiveScale: 1.1,
    }
  },
  animations: {
    spinSlow: "spin 120s linear infinite",
    spinMedium: "spin 60s linear infinite reverse",
    spinFast: "spin 4s linear infinite",
    spinRune: "spin 12s linear infinite reverse",
  }
};

// --- 3. VISUAL COMPONENTS: The Skin Implementation ---

const BackgroundVisuals = React.memo(() => (
  <>
    <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#0d0d0d] to-[#050505]" />
    <div className="absolute inset-[-50%] opacity-[0.15] mix-blend-screen pointer-events-none animate-[spin_120s_linear_infinite]"
      style={{ backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 4deg, ${definitions.colors.goldBase} 4.1deg, transparent 4.2deg)` }}
    />
    <div className="absolute inset-0 opacity-[0.1] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/20 via-transparent to-transparent" />
    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: definitions.assets.noise }} />
  </>
));

const AlchemyGeometricOverlay = React.memo(() => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
    <div className="w-[600px] h-[600px] rounded-full border border-[#D4AF37]/30" />
    <div className="absolute w-[450px] h-[450px] rounded-full border-2 border-dashed border-[#D4AF37]/20 animate-[spin_60s_linear_infinite_reverse]" />
  </div>
));

const DecorativeCorners = React.memo(() => (
  <>
    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#D4AF37]/40 rounded-tl-md" />
    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#D4AF37]/40 rounded-tr-md" />
    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#D4AF37]/40 rounded-bl-md" />
    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#D4AF37]/40 rounded-br-md" />
  </>
));

const SymmetryLines = React.memo(() => (
  <>
    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#D4AF37]/50 to-transparent shadow-[0_0_8px_#D4AF37]" />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#0a0a0a] rotate-45 border border-[#D4AF37] shadow-[0_0_10px_#D4AF37,inset_0_0_5px_#D4AF37] z-10">
      <div className="absolute inset-0.5 bg-[#D4AF37] opacity-80" />
    </div>
  </>
));

const DockBackdropVisual = React.memo(({ isActive }: { isActive: boolean }) => {
  // Alchemy Symbols for floating particles
  // Memoize the particle configuration to prevent random jumping on re-renders
  const particles = React.useMemo(() => {
    const runes = ["🜂", "🜄", "🜃", "🜁", "☉", "☾", "♃", "♄", "♀", "♂", "☿", "🜍", "🜔", "🜏", "🜊", "🜋"];
    return runes.map((rune) => ({
      char: rune,
      left: 30 + Math.random() * 40,
      top: 50 + Math.random() * 20,
      fontSize: 12 + Math.random() * 24,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      yTarget: -100 - Math.random() * 200,
      xTarget: (Math.random() - 0.5) * 100,
      rotateTarget: Math.random() * 360
    }));
  }, []);

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[720px] h-[720px] pointer-events-none z-[-1] flex items-center justify-center">

      {/* 1. Deep Void Atmosphere */}
      <motion.div
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 rounded-full blur-[80px]"
        style={{
          background: `radial-gradient(circle at center, ${definitions.colors.goldTrace} 0%, transparent 60%)`
        }}
      />

      {/* 2. Floating Alchemy Runes (The "Float") */}
      <div className="absolute inset-0 overflow-visible">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute text-[#D4AF37] select-none font-serif"
            initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
            animate={{
              opacity: isActive ? [0, 0.4, 0] : 0,
              y: isActive ? p.yTarget : 0,
              x: p.xTarget,
              scale: isActive ? [0.5, 1, 0.5] : 0.5,
              rotate: isActive ? p.rotateTarget : 0
            }}
            transition={{
              default: {
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeInOut"
              },
              opacity: {
                duration: isActive ? p.duration : 1,
                delay: isActive ? p.delay : 3,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut"
              }
            }}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: `${p.fontSize}px`,
              textShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
            }}
          >
            {p.char}
          </motion.div>
        ))}
      </div>

      {/* 3. The Grand Transmutation Circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
        animate={{
          opacity: isActive ? 1 : 0,
          scale: isActive ? 1 : 0.6,
          rotate: isActive ? 360 : 0
        }}
        transition={isActive ? {
          opacity: { duration: 1 },
          scale: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] },
          rotate: { duration: 180, ease: "linear", repeat: Infinity }
        } : {
          opacity: { duration: 1 },
          scale: { duration: 1 },
          rotate: { duration: 0 } // Stop rotation immediately on exit
        }}
        className="absolute inset-[140px]"
      >
        <svg viewBox="0 0 800 800" className="w-full h-full opacity-70 mix-blend-screen overflow-visible">
          <defs>
            <linearGradient id="mysticGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B7355" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B7355" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Complex Outer Text Ring */}
          <path id="textPath" d="M 400 400 m -350, 0 a 350,350 0 1,1 700,0 a 350,350 0 1,1 -700,0" fill="none" />
          <text fill="#D4AF37" fontSize="12" letterSpacing="10" opacity="0.6">
            <textPath href="#textPath" startOffset="0%">
              IGNIS • AER • AQUA • TERRA • QUINTESSENTIA • TRANSMUTATIO • AETERNA •
            </textPath>
          </text>

          {/* Geometric Structure */}
          <g stroke="url(#mysticGold)" fill="none" strokeWidth="1">
            <circle cx="400" cy="400" r="340" strokeDasharray="10 5" opacity="0.5" />
            <circle cx="400" cy="400" r="320" strokeWidth="2" opacity="0.3" />

            {/* 7-Pointed Star (Heptagram) - Highly Mystical */}
            <path d="M400 80 L522 334 L714 263 L574 466 L680 669 L454 570 L400 800 L346 570 L120 669 L226 466 L86 263 L278 334 Z"
              opacity="0.2" strokeWidth="0.5" />

            {/* Interlocking Triangles */}
            <path d="M400 150 L616 525 L184 525 Z" opacity="0.4" />
            <path d="M400 650 L184 275 L616 275 Z" opacity="0.4" />

            {/* Central Eye/Sun */}
            <circle cx="400" cy="400" r="50" strokeWidth="2" stroke="#F0D082" opacity="0.8">
              <animate attributeName="r" values="50;55;50" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="400" cy="400" r="10" fill="#F0D082" opacity="0.6" />
          </g>
        </svg>
      </motion.div>

      {/* 4. Rising Energy Columns */}
      <motion.div
        animate={{ opacity: isActive ? 0.3 : 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-[600px] bg-gradient-to-t from-transparent via-[#D4AF37] to-transparent blur-[1px]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent blur-[1px]" />
      </motion.div>
    </div>
  );
});

// --- 4. EXPORT: The Persona Bundle ---

export const DefaultInterfacePersona = {
  identity: {
    name: "Default Interface",
    theme: "Alchemy",
  },
  definitions,
  tokens,
  visuals: {
    BackgroundVisuals,
    AlchemyGeometricOverlay,
    DecorativeCorners,
    SymmetryLines,
    DockBackdropVisual,
  }
};
