// --- DARK ALCHEMY THEME DEFINITION: Canvas Persona ---
// This file defines the "world" background and interactions.

// --- 1. DEFINITIONS: The Raw Materials ---

const definitions = {
  colors: {
    // The Void (Background)
    voidBase: '#0a0502',       // Deepest bronze/black
    voidHighlight: '#b45309',  // Oxidized copper
    voidGold: '#f59e0b',       // Burning gold
    voidGlow: '#d97706',       // Amber glow

    // Atmosphere
    atmosphereStart: '#603813',
    atmosphereMid: '#2e1a05',

    // Metals
    goldMetallic: '#D4AF37',   // Classic Gold

    // The World (Playable)
    bg: '#0c0a09',             // Stone-950
    surfaceBase: '#292524',    // Stone-800
    gridBase: '#44403c',       // Stone-700
    gridHighlight: '#d97706',  // Amber-600
    border: '#78350f',         // Amber-900 (Frame)
  }
};

const { colors } = definitions;

// --- 2. ASSET GENERATORS: Procedural Textures ---

// 1. Heavy Metal Texture Filter (Physical bumps)
const metalFilterSVG = encodeURIComponent(`
  <svg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'>
    <filter id='metalBump'>
      <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
      <feComponentTransfer>
         <feFuncA type='linear' slope='0.6'/> 
      </feComponentTransfer>
      <feDiffuseLighting lighting-color='#d97706' surfaceScale='2'>
        <feDistantLight azimuth='45' elevation='25'/>
      </feDiffuseLighting>
    </filter>
    <rect width='100%' height='100%' filter='url(#metalBump)' opacity='0.7'/>
  </svg>
`);

// 2. The "Forbidden Script" (Background Text Noise)
const scriptPatternSVG = encodeURIComponent(`
  <svg width='500' height='500' viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'>
    <defs>
       <pattern id='glyphRow' width='100' height='20' patternUnits='userSpaceOnUse'>
           <path d='M5 10l5-5l5 5 M20 5v10 M35 5h10v10h-10z M60 5c5 0 5 10 0 10 M80 5l10 10 M90 5l-10 10' 
                 stroke='${colors.voidGold}' stroke-width='1.5' fill='none' stroke-linecap='square' opacity='0.5'/>
       </pattern>
    </defs>
    <rect width='500' height='500' fill='url(#glyphRow)' opacity='0.15'/>
    <!-- Larger Faint Circles to group text -->
    <circle cx='250' cy='250' r='200' fill='none' stroke='${colors.voidGold}' stroke-width='1' opacity='0.05'/>
    <path d='M 0 0 L 500 500 M 500 0 L 0 500' stroke='${colors.voidGold}' stroke-width='1' opacity='0.05'/>
  </svg>
`);

// 3. The "Alchemical Constellations" (Dense interconnected symbols)
const constellationsSVG = encodeURIComponent(`
  <svg width='800' height='800' viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg'>
    <g fill='none' stroke='${colors.voidGold}' stroke-width='1.5' opacity='0.4'>
       <!-- Defs for reuse -->
       <defs>
           <symbol id="sym-mercury" viewBox="0 0 20 20">
               <circle cx="10" cy="14" r="3" />
               <path d="M 10 11 L 10 7 M 7 9 L 13 9" />
               <path d="M 7 5 Q 10 8 13 5" />
           </symbol>
           <symbol id="sym-salt" viewBox="0 0 20 20">
               <circle cx="10" cy="10" r="5" />
               <path d="M 5 10 L 15 10" />
           </symbol>
           <symbol id="sym-triangle" viewBox="0 0 20 20">
               <path d="M 10 5 L 15 15 L 5 15 Z" />
           </symbol>
           <symbol id="sym-moon" viewBox="0 0 20 20">
               <path d="M 12 5 A 5 5 0 1 1 12 15 A 3 3 0 1 0 12 5" fill="currentColor"/>
           </symbol>
       </defs>

       <!-- Network Lines connecting sectors -->
       <path d="M 100 100 L 200 300 L 100 500 L 400 400 Z" stroke-dasharray="4,4" opacity="0.5"/>
       <path d="M 600 100 L 500 300 L 700 500" stroke-dasharray="2,2" opacity="0.5"/>
       <circle cx="400" cy="400" r="300" stroke-width="0.5" stroke-dasharray="10,5"/>

       <!-- Distributed Symbols -->
       <use href="#sym-mercury" x="180" y="280" width="40" height="40" />
       <use href="#sym-salt" x="380" y="380" width="40" height="40" />
       <use href="#sym-triangle" x="580" y="100" width="40" height="40" />
       <use href="#sym-moon" x="100" y="480" width="40" height="40" />
       <use href="#sym-mercury" x="600" y="600" width="40" height="40" />
       <use href="#sym-triangle" x="300" y="600" width="40" height="40" transform="rotate(180 320 620)"/> <!-- Water -->
       
       <!-- Orbital text paths -->
       <path id="curve1" d="M 200 400 Q 400 100 600 400" stroke="transparent" />
       <text font-size="10" fill="${colors.voidGold}" letter-spacing="4">
           <textPath href="#curve1" startOffset="50%">TRANSMUTATIO • ELEMENTUM • AETERNA</textPath>
       </text>
       
       <!-- Geometric Connectors -->
       <circle cx="100" cy="100" r="5" fill="${colors.voidHighlight}" stroke="none"/>
       <circle cx="200" cy="300" r="5" fill="${colors.voidHighlight}" stroke="none"/>
       <circle cx="600" cy="100" r="5" fill="${colors.voidHighlight}" stroke="none"/>
       <circle cx="700" cy="500" r="5" fill="${colors.voidHighlight}" stroke="none"/>
    </g>
  </svg>
`);

// 4. The "Grand Mechanism" (Enhanced with Zodiac/Runes)
const grandMechanismSVG = encodeURIComponent(`
  <svg width='1000' height='1000' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'>
    <g stroke='${colors.voidGold}' fill='none'>
      <!-- Outer Gear Teeth -->
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(0 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(45 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(90 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(135 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(180 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(225 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(270 500 500)' fill='${colors.voidBase}' />
      <path d='M 500 20 L 520 50 L 500 60 L 480 50 Z' transform='rotate(315 500 500)' fill='${colors.voidBase}' />

      <!-- Outer Ring -->
      <circle cx='500' cy='500' r='480' stroke-width='2' opacity='0.6'/>
      <circle cx='500' cy='500' r='460' stroke-width='1' stroke-dasharray='10,10' opacity='0.4'/>
      
      <!-- The Zodiac/Symbol Ring -->
      <circle cx='500' cy='500' r='380' stroke-width='40' stroke='${colors.voidHighlight}' opacity='0.1'/>
      <!-- Mock Symbols on ring -->
      <path d='M 500 130 L 500 150 M 490 140 L 510 140' stroke-width='2'/> <!-- Top -->
      <circle cx='500' cy='870' r='10' /> <!-- Bottom -->
      <rect x='860' y='490' width='20' height='20' /> <!-- Right -->
      <path d='M 140 500 L 120 520 L 160 520 Z' /> <!-- Left -->
      
      <!-- Sacred Geometry: 6-pointed Star -->
      <path d='M 500 100 L 846 700 L 154 700 Z' stroke-width='2' opacity='0.4'/>
      <path d='M 500 900 L 154 300 L 846 300 Z' stroke-width='2' opacity='0.4'/>
      
      <!-- Inner Runes -->
      <circle cx='500' cy='500' r='250' stroke-width='1' opacity='0.5'/>
      <circle cx='500' cy='500' r='230' stroke-width='8' stroke='${colors.voidHighlight}' opacity='0.2'/>
      
      <!-- Planetary Orbits -->
      <ellipse cx='500' cy='500' rx='400' ry='100' stroke-width='1' opacity='0.3' transform='rotate(45 500 500)'/>
      <ellipse cx='500' cy='500' rx='400' ry='100' stroke-width='1' opacity='0.3' transform='rotate(-45 500 500)'/>
      
      <!-- Eye of Truth -->
      <path d='M 400 500 Q 500 400 600 500 Q 500 600 400 500' stroke-width='2' opacity='0.8'/>
      <circle cx='500' cy='500' r='30' fill='${colors.voidHighlight}' opacity='0.5' stroke='none'/>
    </g>
  </svg>
`);

// --- 3. EXPORT: The Persona Bundle ---

export const DefaultCanvasPersona = {
  id: 'dark-alchemy',
  tokens: {
    colors: colors,
    assets: {
      metalFilter: `data:image/svg+xml;charset=utf-8,${metalFilterSVG}`,
      scriptPattern: `data:image/svg+xml;charset=utf-8,${scriptPatternSVG}`,
      constellations: `data:image/svg+xml;charset=utf-8,${constellationsSVG}`,
      grandMechanism: `data:image/svg+xml;charset=utf-8,${grandMechanismSVG}`,
    },
    // Visual Logic / Constants
    layout: {
      overscrollX: 300,
      overscrollY: 150,
      worldW: 16000,
      worldH: 10000,
    },
    // Decorative Component Definitions (e.g. Corner Rune structure)
    decorations: {
      cornerRuneColor: colors.gridHighlight,
    },
    geometry: {
      hexagram: {
        triangleUp: "50,10 90,80 10,80",
        triangleDown: "50,90 90,20 10,20",
        innerCircle: { cx: 50, cy: 50, r: 25 },
        lines: [
          { x1: 50, y1: 10, x2: 50, y2: 90 },
          { x1: 10, y1: 80, x2: 90, y2: 20 },
          { x1: 90, y1: 80, x2: 10, y2: 20 }
        ]
      },
      centralArray: {
        outerSquare: { x: 35, y: 35, width: 30, height: 30 }, // Rotated one
        innerSquare: { x: 35, y: 35, width: 30, height: 30 },
        centerCircle: { cx: 50, cy: 50, r: 10 }
      }
    },
    ui: {
      controlButton: {
        background: `linear-gradient(135deg, ${colors.surfaceBase}CC, ${colors.bg}E6)`, // Dark stone, high opacity
        border: `${colors.border}`,
        borderHover: `${colors.gridHighlight}`,
        text: colors.goldMetallic,
        shadow: `0 4px 12px ${colors.voidBase}80`,
        hoverShadow: `0 0 15px ${colors.voidGlow}60`,
        backdropBlur: '4px',
      }
    }
  }
};
