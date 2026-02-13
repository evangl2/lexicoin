import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';
import { DynamicVisual } from '@/app/components/ui/DynamicVisual';

// Breakpoints for "Smart Scaling"
// > 180px: Normal (Detail)
// 100px - 180px: Small (Compact)
// < 100px: Tiny (Iconic)

export interface CompactCardVisualProps {
    /**
     * Learning language display data
     */
    learningData: LanguageDisplayData;

    /**
     * Semantic metadata
     */
    senseInfo: SenseInfo;

    /**
     * Visual asset data
     */
    visual: VisualData;

    /**
     * The Persona object (Skin)
     * CRITICAL: We strictly reuse components from this object.
     */
    persona: any;

    /**
     * Forced width for scaling calculations.
     * If not provided, assumes "Small" context by default or requires external sizing.
     * Used to determine layout mode (Normal/Small/Tiny).
     */
    width?: number;
    height?: number;

    /**
     * Optional interactivity
     */
    isActive?: boolean;
}

export const CompactCardVisual = React.memo<CompactCardVisualProps>(({
    learningData,
    senseInfo,
    visual,
    persona: Persona,
    width = 150, // Default to "Small" if not specified
    isActive = false,
}) => {
    const { word, level } = learningData;
    const { durability, ontology } = senseInfo;

    // --- 1. DETERMINE LAYOUT MODE ---
    const layoutMode = useMemo(() => {
        if (width < 100) return 'TINY';
        if (width < 180) return 'SMALL';
        return 'NORMAL';
    }, [width]);

    // --- 2. SCALE FACTORS ---
    // We use these to scale specific elements without changing their layout flow too much
    const contentScale = layoutMode === 'TINY' ? 0.8 : 1;

    // --- 3. DYNAMIC COMPONENT RESOLUTION ---
    // Fallback to default visuals if persona doesn't have them (though it should)
    const Background = Persona.visuals.Background || (() => <div className="bg-gray-800" />);
    const TextureOverlay = Persona.visuals.TextureOverlay;
    const Corners = Persona.visuals.Corners;
    const ScrapLabel = Persona.visuals.ScrapLabel; // Usually holds level/difficulty
    const DurabilityBar = Persona.visuals.DurabilityBar; // The fancy bar

    // --- 4. RENDER ---
    return (
        <div
            className="relative w-full h-full overflow-hidden isolate select-none"
            style={{
                borderRadius: Persona.tokens.layout.radius,
                // Use Persona background color as base
                backgroundColor: Persona.tokens.colors.bgFront,
                // High-fidelity border reuse
                boxShadow: `inset 0 0 0 1px ${Persona.tokens.colors.borderOuter}`,
            }}
        >
            {/* ================= BACKGROUND LAYER ================= */}
            {/* Direct Component Reuse: Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Background />
            </div>

            {/* Direct Component Reuse: Texture */}
            {TextureOverlay && (
                <div className="absolute inset-0 z-0 opacity-50 mix-blend-overlay pointer-events-none">
                    <TextureOverlay />
                </div>
            )}

            {/* Direct Component Reuse: Corners */}
            {/* We scale corners down slightly in tiny mode to avoid crowding */}
            {Corners && (
                <div className="absolute inset-0 z-50 pointer-events-none" style={{ transform: layoutMode === 'TINY' ? 'scale(0.7)' : 'none' }}>
                    <Corners />
                </div>
            )}

            {/* ================= VISUAL LAYER ================= */}
            {/* 
         In Compact Mode, the visual is a static "Ambience" or "Thumbnail".
         We force disable animations and use mix-blend modes to blend it with the card.
         Position: Centered, covering most of the card.
      */}
            {layoutMode !== 'TINY' && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none overflow-hidden"
                    style={{
                        opacity: 0.8,
                        // Blend mode helps integration (looks like a watermark/projection)
                        mixBlendMode: 'luminosity',
                        transform: 'scale(1.2) translateY(-10%)', // Slight zoom to fill
                    }}
                >
                    <DynamicVisual
                        code={visual.payload}
                        fallbackElement={word}
                        isActive={false} // Force Static
                    // We might need to pass specific flags to DynamicVisual to force non-animated SVG keyframes if supported
                    />
                </div>
            )}

            {/* ================= CONTENT LAYER ================= */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-2">

                {/* TOP: Header / Level */}
                <div className="w-full flex justify-between items-start">
                    {/* Difficulty Badge - Hide in Tiny mode unless critical? Keep for now but scale. */}
                    {layoutMode !== 'TINY' && ScrapLabel && (
                        <div style={{ transform: 'scale(0.7) translate(-20%, -20%)', transformOrigin: 'top left' }}>
                            <ScrapLabel>{level}</ScrapLabel>
                        </div>
                    )}

                    {/* Ontology Badge - Only in Normal mode */}
                    {layoutMode === 'NORMAL' && (
                        <div
                            className="text-[8px] uppercase tracking-widest font-bold opacity-70 border px-1 rounded-full bg-black/20 backdrop-blur-sm"
                            style={{
                                borderColor: Persona.tokens.colors.borderSubtle,
                                color: Persona.tokens.colors.textLabel,
                                fontFamily: Persona.tokens.typography.label.family,
                            }}
                        >
                            {ontology}
                        </div>
                    )}
                </div>

                {/* CENTER: Word */}
                {/* The most important element. Always visible. */}
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <h2
                        className="text-center font-black leading-none drop-shadow-md pb-[0.2em]"
                        style={{
                            fontFamily: Persona.tokens.typography.label.family,
                            color: Persona.tokens.colors.textHighlight,
                            // Smart Typography Sizing based on container width
                            fontSize: width * 0.18, // 18% of container width approx
                            // Clip background to text if gradient provided
                            backgroundImage: Persona.tokens.typography.label.gradient,
                            WebkitBackgroundClip: Persona.tokens.typography.label.gradient ? 'text' : undefined,
                            WebkitTextFillColor: Persona.tokens.typography.label.gradient ? 'transparent' : undefined,
                            // Add a glow for readability over visual
                            textShadow: `0 2px 10px ${Persona.tokens.colors.bgDeep}`,
                        }}
                    >
                        {word}
                    </h2>
                </div>

                {/* BOTTOM: Durability */}
                {/* Direct Component Reuse: DurabilityBar */}
                <div className="w-full mt-auto relative z-40">
                    {layoutMode !== 'TINY' && DurabilityBar ? (
                        <div style={{
                            transform: 'scaleY(0.8)',
                            transformOrigin: 'bottom',
                            opacity: 0.9
                        }}>
                            <DurabilityBar progress={durability} />
                        </div>
                    ) : (
                        // Fallback for Tiny mode or missing component: simple line
                        layoutMode !== 'TINY' && (
                            <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${durability}%`,
                                        backgroundColor: Persona.tokens.colors.goldMetallic
                                    }}
                                />
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ================= INTERACTION OVERLAY ================= */}
            {/* Highlight border on active/hover */}
            {isActive && (
                <div
                    className="absolute inset-0 z-50 pointer-events-none border-2 rounded-[inherit]"
                    style={{ borderColor: Persona.tokens.colors.highlight }}
                />
            )}
        </div>
    );
});

CompactCardVisual.displayName = 'CompactCardVisual';
