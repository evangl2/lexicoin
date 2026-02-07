/**
 * DEFAULT PERSONA BUNDLE
 * 
 * "Alchemist" Theme - Deep Dark Gold Alchemy Style
 * 
 * This is the complete default Persona; all other skins fallback to values from here.
 * 
 * Export Structure:
 * - DefaultPersona: Complete PersonaBundle
 * - DefaultCardPersona: Card Configuration
 * - DefaultCanvasPersona: Canvas Configuration  
 * - DefaultInterfacePersona: Interface Configuration
 */

import type {
    PersonaBundle,
    CardPersona,
    CanvasPersona,
    InterfacePersona
} from '@/app/types/persona.types';

// Import from existing files
import { DefaultCardPersona as LegacyCardPersona } from './Card.persona.default';
import { DefaultCanvasPersona as LegacyCanvasPersona } from './Canvas.persona.default';
import { DefaultInterfacePersona as LegacyInterfacePersona } from './Interface.persona.default';

import { DefaultVoidAtmosphere } from './visuals/canvas/DefaultVoidAtmosphere';
import { DefaultMetalTexture } from './visuals/canvas/DefaultMetalTexture';
import { DefaultScriptNoise } from './visuals/canvas/DefaultScriptNoise';
import { DefaultSacredGeometry } from './visuals/canvas/DefaultSacredGeometry';
import { DefaultTransmutationCircle } from './visuals/canvas/DefaultTransmutationCircle';
import { DefaultCornerGears } from './visuals/canvas/DefaultCornerGears';
import { DefaultEdgeRunes } from './visuals/canvas/DefaultEdgeRunes';
import { DefaultGridSystem } from './visuals/canvas/DefaultGridSystem';
import { DefaultCornerRune } from './visuals/canvas/DefaultCornerRune';

// ==================== SHARED PALETTE ====================

/**
 * Shared Palette - Alchemist Theme
 */
const sharedPalette = {
    colors: {
        // Core Colors
        primary: '#D4AF37',         // Metal Gold
        primaryDark: '#A08042',
        primaryLight: '#F0D082',
        accent: '#C0A062',          // Alchemy Gold

        // Background Colors
        bgVoid: '#000000',
        bgBase: '#0a0a0a',
        bgSurface: '#0e0e0e',
        bgElevated: '#141414',
        bgOverlay: 'rgba(14, 14, 14, 0.98)',
        bgGlass: 'rgba(10, 10, 10, 0.85)',

        // Text Colors
        textPrimary: '#e5e5e5',
        textSecondary: '#C0A062',
        textMuted: 'rgba(192, 160, 98, 0.7)',
        textHighlight: '#F0D082',
        textOnPrimary: '#0a0a0a',

        // Border Colors
        borderStrong: 'rgba(192, 160, 98, 0.6)',
        borderBase: 'rgba(192, 160, 98, 0.4)',
        borderSubtle: 'rgba(192, 160, 98, 0.2)',
        borderFaint: 'rgba(192, 160, 98, 0.1)',
    },
    gradients: {
        primary: 'linear-gradient(135deg, #C0A062 0%, #F0D082 50%, #8B7355 100%)',
        text: 'linear-gradient(to bottom, #F0D082, #A08042)',
        sheen: 'linear-gradient(to right, transparent, rgba(240, 208, 130, 0.6), transparent)',
        backdrop: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
        radialSubtle: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.03) 0%, transparent 50%)',
    },
};

/**
 * Shared Typography Configuration
 * 
 * Font Stacks optimized for all 8 supported languages:
 * - Latin scripts: en, fr, de, es, it, pt
 * - CJK scripts: zh-CN (Simplified Chinese), ja (Japanese)
 * 
 * Strategy:
 * - Label (Titles): Alchemical aesthetic with Cinzel for Latin + Noto Serif for CJK
 * - Body (Definition/Flavor): Readable with Merriweather for Latin + Noto Sans for CJK
 */
const sharedTypography = {
    fonts: {
        /**
         * Heading Font Stack (Decorative, Alchemical)
         * - Cinzel: Classical, serif-based for Latin scripts (en, fr, de, es, it, pt)
         * - Noto Serif SC: Elegant serif for Simplified Chinese (zh-CN)
         * - Noto Serif JP: Elegant serif for Japanese (ja)
         * - System fallbacks for safety
         */
        heading: "'Cinzel', 'Noto Serif SC', 'Noto Serif JP', 'SimSun', 'MS Mincho', serif",

        /**
         * Label Font Stack (Card Front/Back Titles - Alchemical Aesthetic)
         * Same as heading - used for learningLanguage and systemLanguage on card faces
         */
        label: "'Cinzel', 'Noto Serif SC', 'Noto Serif JP', 'SimSun', 'MS Mincho', serif",

        /**
         * Body Font Stack (Readable, for definitions and flavor text)
         * - Merriweather: Highly readable serif for Latin scripts
         * - Noto Sans SC: Clean sans-serif for Simplified Chinese
         * - Noto Sans JP: Clean sans-serif for Japanese
         * - System fallbacks for safety
         */
        body: "'Merriweather', 'Noto Sans SC', 'Noto Sans JP', 'SimHei', 'MS Gothic', sans-serif",

        /**
         * Monospace (for code/debug, not used in cards)
         */
        mono: "'Fira Code', 'Consolas', monospace",

        /**
         * Decorative Font (ornamental UI elements)
         */
        decorative: "'Cinzel Decorative', 'Noto Serif SC', serif",
    },
    sizes: {
        xs: '10px',
        sm: '12px',
        base: '14px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
    },
    tracking: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.1em',
        widest: '0.3em',
    },
};

// ==================== SHARED LAYOUT ====================

const sharedLayout = {
    radius: {
        none: '0',
        sm: '4px',
        base: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
        card: '22px',
        button: '4px',
        panel: '16px',
    },
    borders: {
        thin: '1px',
        base: '2px',
        thick: '4px',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        base: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
    },
};

// ==================== SHARED EFFECTS ====================

const sharedEffects = {
    shadows: {
        none: 'none',
        base: '0 10px 20px -5px rgba(0, 0, 0, 0.6)',
        hover: '0 30px 50px -10px rgba(0, 0, 0, 0.8), 0 0 15px rgba(212, 175, 55, 0.2)',
        dragging: '0 40px 80px -15px rgba(0, 0, 0, 0.9)',
        elevated: '0 80px 140px -20px rgba(0, 0, 0, 1.0)',
        inner: 'inset 0 0 40px rgba(0, 0, 0, 1)',
        glow: '0 0 20px rgba(212, 175, 55, 0.5)',
        glowSoft: '0 0 10px rgba(212, 175, 55, 0.3)',
    },
    glows: {
        primary: '0 0 20px rgba(212, 175, 55, 0.5)',
        accent: '0 0 15px rgba(192, 160, 98, 0.4)',
        soft: '0 0 8px rgba(240, 208, 130, 0.3)',
    },
    blur: {
        none: '0',
        sm: '4px',
        base: '8px',
        lg: '16px',
        backdrop: '12px',
    },
};

// ==================== SHARED MOTION ====================

const sharedMotion = {
    springs: {
        smooth: { damping: 40, stiffness: 150, mass: 0.8 },
        snappy: { damping: 25, stiffness: 200, mass: 0.8 },
        bouncy: { damping: 15, stiffness: 150, mass: 0.5 },
        mouseTilt: { damping: 50, stiffness: 120, mass: 1 },
        flip: { damping: 20, stiffness: 150, mass: 1 },
    },
    durations: {
        instant: 0,
        fast: 150,
        normal: 300,
        slow: 500,
    },
    physics: {
        velocityRange: [-1500, 1500] as [number, number],
        rotateYRange: [-25, 25] as [number, number],
        rotateXRange: [-15, 15] as [number, number],
        rotateZRange: [-5, 5] as [number, number],
        glareOpacityCap: 0.4,
        glareColor: 'rgba(255, 255, 255, 0.4)',
    },
    animations: {
        spinSlow: 'spin 20s linear infinite',
        spinMedium: 'spin 10s linear infinite',
        spinFast: 'spin 3s linear infinite',
        spinRune: 'spin-reverse 15s linear infinite',
        pulse: 'pulse 2s ease-in-out infinite',
    }
};

// ==================== CARD PERSONA ====================

export const DefaultCardPersona: CardPersona = {
    identity: {
        name: 'default',
        displayName: '炼金术士',
        theme: 'Alchemy',
        version: '1.0.0',
    },
    palette: sharedPalette,
    typography: sharedTypography,
    layout: sharedLayout,
    effects: sharedEffects,
    motion: sharedMotion,
    slots: {
        Background: LegacyCardPersona.visuals.Background,
        Corners: LegacyCardPersona.visuals.Corners,
        Frame: LegacyCardPersona.visuals.Frame,
        Divider: LegacyCardPersona.visuals.Divider,
        DurabilityBar: LegacyCardPersona.visuals.DurabilityBar,
        BackTopDecoration: LegacyCardPersona.visuals.BackTop,
        BackSeparator: LegacyCardPersona.visuals.BackSeparator,
        TextureOverlay: null,
        ScrapLabel: null,
    },
    assets: {
        textures: {
            noise: LegacyCardPersona.definitions.assets.noiseTexture,
            pattern: LegacyCardPersona.definitions.assets.deepPattern,
            backPattern: LegacyCardPersona.definitions.assets.backPattern,
        },
    },
};

// ==================== CANVAS PERSONA ====================

export const DefaultCanvasPersona: CanvasPersona = {
    identity: {
        name: 'default',
        displayName: '炼金术士',
        theme: 'Dark Alchemy',
        version: '1.0.0',
    },
    palette: {
        ...sharedPalette,
        colors: {
            ...sharedPalette.colors,
            bgVoid: '#0a0502', // Deepest bronze/black (Legacy voidBase)
        }
    },
    effects: sharedEffects,
    slots: {
        // Canvas Visual Components (Imported from Legacy, can be replaced by actual components later)
        VoidAtmosphere: DefaultVoidAtmosphere,
        MetalTexture: DefaultMetalTexture,
        ScriptNoise: DefaultScriptNoise,
        TransmutationCircle: DefaultTransmutationCircle,
        SacredGeometry: DefaultSacredGeometry,
        // Integrated into TransmutationCircle or unused
        InnerMechanics: null,
        CornerGears: DefaultCornerGears,
        EdgeRunes: DefaultEdgeRunes,
        GridSystem: DefaultGridSystem,
        CornerRune: DefaultCornerRune,
    },
    assets: {
        textures: {
            metal: LegacyCanvasPersona.tokens.assets.metalFilter,
            script: LegacyCanvasPersona.tokens.assets.scriptPattern,
            constellations: LegacyCanvasPersona.tokens.assets.constellations,
            mechanism: LegacyCanvasPersona.tokens.assets.grandMechanism,
        },
    },
    geometry: LegacyCanvasPersona.tokens.geometry,
    decorations: LegacyCanvasPersona.tokens.decorations,
};

// ==================== INTERFACE PERSONA ====================

export const DefaultInterfacePersona: InterfacePersona = {
    identity: {
        name: 'default',
        displayName: '炼金术士',
        theme: 'Alchemy',
        version: '1.0.0',
    },
    palette: sharedPalette,
    typography: sharedTypography,
    layout: sharedLayout,
    effects: sharedEffects,
    motion: sharedMotion,
    slots: {
        DockBackdrop: LegacyInterfacePersona.visuals.DockBackdropVisual,
        BackgroundVisuals: LegacyInterfacePersona.visuals.BackgroundVisuals,
        GeometricOverlay: LegacyInterfacePersona.visuals.AlchemyGeometricOverlay,
        DecorativeCorners: LegacyInterfacePersona.visuals.DecorativeCorners,
        SymmetryLines: LegacyInterfacePersona.visuals.SymmetryLines,
    },
    assets: {
        textures: {},
    },
    dock: {
        layout: {
            bottomPosition: LegacyInterfacePersona.tokens.dock.layout.bottomPosition,
            baseWidth: LegacyInterfacePersona.tokens.dock.layout.baseWidth,
            nodeSize: 36, // 2.25rem = 36px (from nodeSize: "2.25rem")
            nodeGap: LegacyInterfacePersona.tokens.dock.layout.gap,
        },
        metrics: {
            scaleMin: LegacyInterfacePersona.tokens.dock.behavior.scaleMin,
            scaleMax: LegacyInterfacePersona.tokens.dock.behavior.scaleMax,
            activeScale: LegacyInterfacePersona.tokens.dock.metrics.activeScale,
            iconSize: LegacyInterfacePersona.tokens.dock.metrics.iconSize,
        },
        behavior: {
            fadeDelay: LegacyInterfacePersona.tokens.dock.behavior.fadeDelay,
            showDuration: 300, // Default animation duration
        },
        style: {
            blurStrength: '12px',
            rimInset: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            accentInset: 'inset 0 0 20px 0 rgba(0, 0, 0, 0.5)',
            sideAccentWidth: '2px',
            sideAccentHeight: '60%',
            radialOpacity: 0.6,
        }
    },
    interfaceLayout: {
        menuWidth: LegacyInterfacePersona.tokens.layout.menuWidth,
        menuHeight: LegacyInterfacePersona.tokens.layout.menuHeight,
        headerHeight: LegacyInterfacePersona.tokens.layout.headerHeight,
        tabHeight: LegacyInterfacePersona.tokens.layout.tabHeight,
        dockOffset: LegacyInterfacePersona.tokens.layout.dockOffset,
    },
};

// ==================== FULL PERSONA BUNDLE ====================

export const DefaultPersona: PersonaBundle = {
    card: DefaultCardPersona,
    canvas: DefaultCanvasPersona,
    interface: DefaultInterfacePersona,
};


export { LegacyCardPersona, LegacyCanvasPersona, LegacyInterfacePersona };
