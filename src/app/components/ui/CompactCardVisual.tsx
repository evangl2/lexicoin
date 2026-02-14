import React from 'react';
import { motion } from 'motion/react';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import { DynamicVisual } from '@/app/components/ui/DynamicVisual';
import { TieredText } from '@/app/utils/TieredText';

/**
 * CompactMode variants:
 * - 'repository': Miniature version of the standard card.
 * - 'icon': Square visual thumbnail with durability.
 * - 'word': Long bar showing word and durability.
 */
export type CompactMode = 'repository' | 'icon' | 'word';

export interface CompactCardVisualProps {
    mode: CompactMode;
    learningData: LanguageDisplayData;
    senseInfo: SenseInfo;
    visual: VisualData;
    persona: any;
    isActive?: boolean;
}

export const CompactCardVisual: React.FC<CompactCardVisualProps> = React.memo(({
    mode,
    learningData,
    senseInfo,
    visual,
    persona: Persona,
    isActive = false,
}) => {
    const { word, level } = learningData;
    const { durability, ontology } = senseInfo;

    // --- COMPONENT REUSE (Strictly from Persona) ---
    const Background = Persona.visuals.Background;
    const TextureOverlay = Persona.visuals.TextureOverlay;
    const Corners = Persona.visuals.Corners;
    const ScrapLabel = Persona.visuals.ScrapLabel;
    const DurabilityBar = Persona.visuals.DurabilityBar;

    // --- RENDER HELPERS ---

    // 1. Repository Mode: Full detailed miniature
    const renderRepository = () => (
        <div className="relative w-full h-full flex flex-col p-2 isolate">
            {/* Visual background watermark */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity overflow-hidden pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center scale-105 -translate-y-[5%]">
                    <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
                </div>
            </div>

            {/* Header: Difficulty (ScrapLabel) */}
            <div className="relative z-30 flex justify-end items-start w-full">
                {ScrapLabel ? (
                    <div className="drop-shadow-lg p-1">
                        <ScrapLabel>{level}</ScrapLabel>
                    </div>
                ) : (
                    <div className="p-1 drop-shadow-md">
                        <span
                            className="text-xs font-bold tracking-widest"
                            style={{
                                fontFamily: Persona.tokens.typography.label.family,
                                color: Persona.tokens.colors.textHighlight,
                                background: Persona.tokens.typography.label.gradient,
                                WebkitBackgroundClip: Persona.tokens.typography.label.gradient ? 'text' : undefined,
                                WebkitTextFillColor: Persona.tokens.typography.label.gradient ? 'transparent' : undefined,
                            }}
                        >
                            {level}
                        </span>
                    </div>
                )}
            </div>

            {/* Center: Main Word (Dynamic Tiered Text) */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-20 pointer-events-none w-full px-1">
                <TieredText
                    text={word}
                    style={{
                        fontFamily: Persona.tokens.typography.label.family,
                        color: Persona.tokens.colors.textHighlight,
                        // gradient handled by TieredText prop or style? TieredText supports gradient prop.
                        // But here we use backgroundImage for text clip. TieredText supports style override.
                        backgroundImage: Persona.tokens.typography.label.gradient,
                        WebkitBackgroundClip: Persona.tokens.typography.label.gradient ? 'text' : undefined,
                        WebkitTextFillColor: Persona.tokens.typography.label.gradient ? 'transparent' : undefined,
                        textShadow: `0 2px 10px ${Persona.tokens.colors.bgDeep}`,
                    }}
                />
            </div>

            {/* Footer: Durability & Ontology */}
            <div className="relative z-20 mt-auto flex flex-col gap-1.5 w-full">
                {ontology && (
                    <div className="flex justify-start">
                        <span
                            className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full border"
                            style={{
                                backgroundColor: Persona.tokens.colors.bgDeep,
                                borderColor: Persona.tokens.colors.borderSubtle,
                                color: Persona.tokens.colors.textSecondary,
                                fontFamily: Persona.tokens.typography.label.family,
                            }}
                        >
                            {ontology}
                        </span>
                    </div>
                )}
                {DurabilityBar && (
                    <div className="w-full transform scale-y-[1.5] origin-bottom opacity-90">
                        <DurabilityBar progress={durability} />
                    </div>
                )}
            </div>
        </div>
    );

    // 2. Icon Mode: Square visual only
    const renderIcon = () => (
        <div className="relative w-full h-full flex flex-col isolate">
            {/* SVG Image - static but colorful */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
                {/* We use standard blend modes but keep opacity high to maintain color */}
                <div className="w-full h-full scale-125">
                    <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
                </div>
            </div>
            {/* Durability at bottom */}
            <div className="absolute bottom-1 left-1 right-1 z-20">
                {DurabilityBar && (
                    <div className="w-full transform scale-y-[1.5] origin-bottom opacity-80">
                        <DurabilityBar progress={durability} />
                    </div>
                )}
            </div>
        </div>
    );

    // 3. Word Mode: Horizontal Bar
    // 3. Word Mode: Horizontal Bar
    const renderWord = () => (
        <div className="relative w-full h-full flex items-center justify-center isolate group">
            {/* Word Centered (Dynamic Tiered Text) */}
            <div className="relative z-20 flex items-center justify-center px-2 pb-1 w-full h-full">
                <TieredText
                    text={word}
                    style={{
                        fontFamily: Persona.tokens.typography.label.family,
                        color: Persona.tokens.colors.textHighlight,
                        backgroundImage: Persona.tokens.typography.label.gradient,
                        WebkitBackgroundClip: Persona.tokens.typography.label.gradient ? 'text' : undefined,
                        WebkitTextFillColor: Persona.tokens.typography.label.gradient ? 'transparent' : undefined,
                    }}
                />
            </div>

            {/* Durability at Absolute Bottom (Full Width) */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px] z-30 opacity-80 group-hover:opacity-100 transition-opacity">
                {DurabilityBar && (
                    <div className="w-full h-full">
                        <DurabilityBar progress={durability} />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            className="relative w-full h-full overflow-hidden select-none"
            style={{
                borderRadius: mode === 'word' ? '6px' : Persona.tokens.layout.radius,
                backgroundColor: Persona.tokens.colors.bgFront,
                boxShadow: mode === 'word' ? 'none' : `inset 0 0 0 ${Persona.tokens.layout.borderThin || '1px'} ${Persona.tokens.colors.borderOuter}`,
                border: mode === 'word' ? `${Persona.tokens.layout.borderThin || '1px'} solid ${Persona.tokens.colors.borderSubtle}` : 'none',
            }}
        >
            {/* --- UNDERLAY LAYERS --- */}
            {mode === 'repository' && Background && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <Background />
                </div>
            )}
            {mode === 'repository' && TextureOverlay && (
                <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none">
                    <TextureOverlay />
                </div>
            )}


            {/* --- MAIN MODE RENDER --- */}
            {mode === 'repository' && renderRepository()}
            {mode === 'icon' && renderIcon()}
            {mode === 'word' && renderWord()}

            {/* Active/Hover Highlight */}
            {(isActive) && (
                <div
                    className="absolute inset-0 z-[60] pointer-events-none border-2 rounded-[inherit] ring-4 ring-offset-0 animate-pulse"
                    style={{
                        borderColor: Persona.tokens.colors.highlight,
                        boxShadow: `0 0 15px ${Persona.tokens.colors.highlight}, inset 0 0 5px ${Persona.tokens.colors.highlight}`
                    }}
                />
            )}
        </div>
    );
});

CompactCardVisual.displayName = 'CompactCardVisual';
