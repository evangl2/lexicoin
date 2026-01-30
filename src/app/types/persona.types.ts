/**
 * PERSONA TYPE SYSTEM
 * 
 * Defines the interface contract for all Persona design points.
 * Uses Partial<T> and undefined checks for optionality.
 * 
 * Design Point Categories:
 * 1. IDENTITY   - Basic Identity
 * 2. PALETTE    - Colors & Gradients
 * 3. TYPOGRAPHY - Fonts & Sizes
 * 4. LAYOUT     - Metrics & Spacing
 * 5. EFFECTS    - Visual Effects (Shadows, Glows, Blurs)
 * 6. MOTION     - Animation Parameters (Springs, Durations, Physics)
 * 7. SLOTS      - Optional Visual Components
 * 8. ASSETS     - Assets (Textures, Patterns)
 */

import React from 'react';

// ==================== UTILITY TYPES ====================

/**
 * DeepPartial - Recursive Optional Type
 * Used for customizing Personas, defining only the differences from Default.
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object
    ? T[P] extends React.FC<any>
    ? T[P] | null  // React component can be null (indicating disabled)
    : DeepPartial<T[P]>
    : T[P];
};

/**
 * Spring Configuration Type
 */
export interface SpringConfig {
    damping: number;
    stiffness: number;
    mass: number;
}

// ==================== 1. IDENTITY ====================

export interface PersonaIdentity {
    /** Unique Identifier, e.g., "default", "cyberpunk" */
    name: string;
    /** Display Name, e.g., "Alchemist", "Cyberpunk" */
    displayName: string;
    /** Theme Description */
    theme: string;
    /** Version Number */
    version: string;
    /** Author (Used for user customization) */
    author?: string;
}

// ==================== 2. PALETTE ====================

export interface PaletteColors {
    // Core Colors
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;

    // Background Colors
    bgVoid: string;
    bgBase: string;
    bgSurface: string;
    bgElevated: string;
    bgOverlay: string;
    bgGlass: string;

    // Text Colors
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textHighlight: string;
    textOnPrimary: string;

    // Border Colors
    borderStrong: string;
    borderBase: string;
    borderSubtle: string;
    borderFaint: string;
}

export interface PaletteGradients {
    primary: string;
    text: string;
    sheen: string;
    backdrop: string;
    radialSubtle: string;
}

export interface PersonaPalette {
    colors: PaletteColors;
    gradients: PaletteGradients;
}

// ==================== 3. TYPOGRAPHY ====================

export interface TypographyFonts {
    heading: string;
    body: string;
    mono?: string;
    decorative?: string;
}

export interface TypographySizes {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
}

export interface TypographyTracking {
    tight: string;
    normal: string;
    wide: string;
    widest: string;
}

export interface PersonaTypography {
    fonts: TypographyFonts;
    sizes: TypographySizes;
    tracking: TypographyTracking;
}

// ==================== 4. LAYOUT ====================

export interface LayoutRadius {
    none: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    full: string;
    card: string;
    button: string;
    panel: string;
}

export interface LayoutBorders {
    thin: string;
    base: string;
    thick: string;
}

export interface LayoutSpacing {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface PersonaLayout {
    radius: LayoutRadius;
    borders: LayoutBorders;
    spacing: LayoutSpacing;
}

// ==================== 5. EFFECTS ====================

export interface EffectsShadows {
    none: string;
    base: string;
    hover: string;
    dragging: string;
    elevated: string;
    inner: string;
    glow: string;
    glowSoft: string;
}

export interface EffectsGlows {
    primary: string;
    accent: string;
    soft: string;
}

export interface EffectsBlur {
    none: string;
    sm: string;
    base: string;
    lg: string;
    backdrop: string;
}

export interface PersonaEffects {
    shadows: EffectsShadows;
    glows: EffectsGlows;
    blur: EffectsBlur;
}

// ==================== 6. MOTION ====================

export interface MotionSprings {
    /** Smooth Transition */
    smooth: SpringConfig;
    /** Fast Response */
    snappy: SpringConfig;
    /** Bouncy Feedback */
    bouncy: SpringConfig;
    /** Mouse Tilt */
    mouseTilt: SpringConfig;
    /** Flip Animation */
    flip: SpringConfig;
}

export interface MotionDurations {
    instant: number;
    fast: number;
    normal: number;
    slow: number;
}

export interface MotionPhysics {
    /** Velocity Range [min, max] */
    velocityRange: [number, number];
    /** Y-Axis Rotation Range */
    rotateYRange: [number, number];
    /** X-Axis Rotation Range */
    rotateXRange: [number, number];
    /** Z-Axis Rotation Range */
    rotateZRange: [number, number];
    /** Glare Opacity Cap */
    glareOpacityCap: number;
    /** Glare Color */
    glareColor: string;
}

export interface MotionAnimations {
    spinSlow: string;
    spinMedium: string;
    spinFast: string;
    spinRune: string;
    pulse: string;
}

export interface PersonaMotion {
    springs: MotionSprings;
    durations: MotionDurations;
    physics: MotionPhysics;
    animations: MotionAnimations;
}

// ==================== 7. SLOTS (Optional Visual Components) ====================

/**
 * Slot System Design Principles:
 * 1. All Slots are optional (?: syntax)
 * 2. Check existence when rendering, skip if missing
 * 3. Slot can be set to null for explicit disable
 * 4. Persona can add custom Slots (customSlots)
 */

// Base Slot Type
export type SlotComponent<P = object> = React.FC<P>;

// Common Slot Props
export interface ProgressSlotProps {
    progress: number;
}

export interface ActiveSlotProps {
    isActive: boolean;
}

export interface LabelSlotProps {
    children: React.ReactNode;
    color?: string;
}

export interface PositionSlotProps {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    color: string;
}

// Card Visual Slots
export interface CardSlots {
    /** Background Layer */
    Background?: SlotComponent | null;
    /** Texture Overlay */
    TextureOverlay?: SlotComponent | null;
    /** Corner Decoration */
    Corners?: SlotComponent | null;
    /** Frame Border */
    Frame?: SlotComponent | null;
    /** Content Divider */
    Divider?: SlotComponent | null;
    /** Durability Bar */
    DurabilityBar?: SlotComponent<ProgressSlotProps> | null;
    /** Back Top Decoration */
    BackTopDecoration?: SlotComponent | null;
    /** Back Separator */
    BackSeparator?: SlotComponent | null;
    /** Scrap Label (For special skins) */
    ScrapLabel?: SlotComponent<LabelSlotProps> | null;
    /** Custom Extension Slots */
    customSlots?: Record<string, SlotComponent<any>>;
}

// Canvas Visual Slots
export interface CanvasSlots {
    /** Void Atmosphere */
    VoidAtmosphere?: SlotComponent | null;
    /** Metal Texture */
    MetalTexture?: SlotComponent | null;
    /** Script Noise */
    ScriptNoise: React.FC<{ x: any; y: any }> | null;
    TransmutationCircle: React.FC<{ rotateSlow: any; rotateReverse: any }> | null;
    SacredGeometry: React.FC | null;
    InnerMechanics: React.FC | null;
    CornerGears: React.FC<{ rotateSlow: any; rotateReverse: any }> | null;
    EdgeRunes: React.FC | null;
    GridSystem: React.FC<{ scale: any; width: number; height: number }> | null;
    CornerRune: React.FC<{ position: string; color: string }>;
    /** Custom Extension Slots */
    customSlots?: Record<string, SlotComponent<any>>;
}

// Interface Visual Slots
export interface InterfaceSlots {
    /** Dock Backdrop */
    DockBackdrop?: SlotComponent<ActiveSlotProps> | null;
    /** Background Visuals */
    BackgroundVisuals?: SlotComponent | null;
    /** Geometric Overlay */
    GeometricOverlay?: SlotComponent | null;
    /** Decorative Corners */
    DecorativeCorners?: SlotComponent | null;
    /** Symmetry Lines */
    SymmetryLines?: SlotComponent | null;
    /** Custom Extension Slots */
    customSlots?: Record<string, SlotComponent<any>>;
}

// ==================== 8. ASSETS ====================

export interface PersonaAssets {
    textures: {
        /** Noise Texture */
        noise?: string;
        /** Pattern Texture */
        pattern?: string;
        /** Back Pattern */
        backPattern?: string;
        /** Metal Texture */
        metal?: string;
        /** Script Pattern */
        script?: string;
        /** Constellations */
        constellations?: string;
        /** Mechanical Parts */
        mechanism?: string;
    };

    svgFilters?: {
        metalBump?: string;
        glow?: string;
    };

    /** Custom Assets */
    custom?: Record<string, string>;
}

// ==================== CANVAS Specific Config ====================

export interface CanvasGeometry {
    hexagram: {
        triangleUp: string;
        triangleDown: string;
        innerCircle: { cx: number; cy: number; r: number };
        lines: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    };
    centralArray: {
        outerSquare: { x: number; y: number; width: number; height: number };
        innerSquare: { x: number; y: number; width: number; height: number };
        centerCircle: { cx: number; cy: number; r: number };
    };
}

export interface CanvasDecorations {
    cornerRuneColor: string;
}

// ==================== INTERFACE Specific Config ====================

export interface DockConfig {
    layout: {
        bottomPosition: string;
        baseWidth: number;
        nodeSize: number;
        nodeGap: string;
    };
    metrics: {
        scaleMin: number;
        scaleMax: number;
        activeScale: number;
        iconSize: number;
    };
    behavior: {
        fadeDelay: number;
        showDuration: number;
    };
    style: {
        blurStrength: string;
        rimInset: string;
        accentInset: string;
        sideAccentWidth: string;
        sideAccentHeight: string;
        radialOpacity: number;
    };
}

export interface InterfaceLayoutConfig {
    menuWidth: string;
    menuHeight: string;
    headerHeight: string;
    tabHeight: string;
    dockOffset: string;
}

// ==================== COMPLETE PERSONA TYPES ====================

export interface CardPersona {
    identity: PersonaIdentity;
    palette: PersonaPalette;
    typography: PersonaTypography;
    layout: PersonaLayout;
    effects: PersonaEffects;
    motion: PersonaMotion;
    slots: CardSlots;
    assets: PersonaAssets;
}

export interface CanvasPersona {
    identity: PersonaIdentity;
    palette: PersonaPalette;
    effects: PersonaEffects;
    slots: CanvasSlots;
    assets: PersonaAssets;
    geometry: CanvasGeometry;
    decorations: CanvasDecorations;
}

export interface InterfacePersona {
    identity: PersonaIdentity;
    palette: PersonaPalette;
    typography: PersonaTypography;
    layout: PersonaLayout;
    effects: PersonaEffects;
    motion: PersonaMotion;
    slots: InterfaceSlots;
    assets: PersonaAssets;
    dock: DockConfig;
    interfaceLayout: InterfaceLayoutConfig;
}

// ==================== FULL PERSONA BUNDLE ====================

export interface PersonaBundle {
    card: CardPersona;
    canvas: CanvasPersona;
    interface: InterfacePersona;
}

// ==================== PARTIAL TYPES (FOR CUSTOM SKINS) ====================

export type PartialCardPersona = DeepPartial<CardPersona>;
export type PartialCanvasPersona = DeepPartial<CanvasPersona>;
export type PartialInterfacePersona = DeepPartial<InterfacePersona>;
export type PartialPersonaBundle = DeepPartial<PersonaBundle>;
