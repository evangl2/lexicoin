import React from 'react';
import { motion } from 'motion/react';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import { DynamicVisual } from '@/app/components/ui/visual/DynamicVisual';
import { TieredText } from '@/app/components/ui/text/TieredText';

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

    const Background   = Persona.visuals.Background;
    const TextureOverlay = Persona.visuals.TextureOverlay;
    const Corners      = Persona.visuals.Corners;
    const ScrapLabel   = Persona.visuals.ScrapLabel;
    const DurabilityBar = Persona.visuals.DurabilityBar;

    // --- RENDER HELPERS ---

    const renderRepository = () => (
        <div className="relative w-full h-full flex flex-col p-2 isolate">
            {/* Visual background watermark */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity overflow-hidden pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center scale-105 -translate-y-[5%]">
                    <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
                </div>
            </div>

            {/* Header: Difficulty */}
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
                                fontFamily: 'var(--card-font-label)',
                                color: 'var(--card-color-text-highlight)',
                                background: 'var(--card-gradient-label-text)',
                                WebkitBackgroundClip: 'var(--card-gradient-label-text)' ? 'text' : undefined,
                                WebkitTextFillColor: 'var(--card-gradient-label-text)' ? 'transparent' : undefined,
                            }}
                        >
                            {level}
                        </span>
                    </div>
                )}
            </div>

            {/* Center: Main Word */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-20 pointer-events-none w-full px-1">
                <TieredText
                    text={word}
                    style={{
                        fontFamily: 'var(--card-font-label)',
                        color: 'var(--card-color-text-highlight)',
                        backgroundImage: 'var(--card-gradient-label-text)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 10px var(--card-color-bg-deep)',
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
                                backgroundColor: 'var(--card-color-bg-deep)',
                                borderColor: 'var(--card-color-border-subtle)',
                                color: 'var(--card-color-text-secondary)',
                                fontFamily: 'var(--card-font-label)',
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

    const renderIcon = () => (
        <div className="relative w-full h-full flex flex-col isolate">
            <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
                <div className="w-full h-full scale-125">
                    <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
                </div>
            </div>
            <div className="absolute bottom-1 left-1 right-1 z-20">
                {DurabilityBar && (
                    <div className="w-full transform scale-y-[1.5] origin-bottom opacity-80">
                        <DurabilityBar progress={durability} />
                    </div>
                )}
            </div>
        </div>
    );

    const renderWord = () => (
        <div className="relative w-full h-full flex items-center justify-center isolate group">
            <div className="relative z-20 flex items-center justify-center px-2 pb-1 w-full h-full">
                <TieredText
                    text={word}
                    style={{
                        fontFamily: 'var(--card-font-label)',
                        color: 'var(--card-color-text-highlight)',
                        backgroundImage: 'var(--card-gradient-label-text)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                />
            </div>
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
                borderRadius: mode === 'word' ? '6px' : 'var(--card-radius)',
                backgroundColor: 'var(--card-color-bg-front)',
                boxShadow: mode === 'word' ? 'none' : `inset 0 0 0 var(--card-border-thin) var(--card-color-border-outer)`,
                border: mode === 'word' ? `var(--card-border-thin) solid var(--card-color-border-subtle)` : 'none',
            }}
        >
            {/* Underlay layers */}
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

            {mode === 'repository' && renderRepository()}
            {mode === 'icon'       && renderIcon()}
            {mode === 'word'       && renderWord()}

            {isActive && (
                <div
                    className="absolute inset-0 z-[60] pointer-events-none border-2 rounded-[inherit] ring-4 ring-offset-0 animate-pulse"
                    style={{
                        borderColor: 'var(--card-color-gold-metallic)',
                        boxShadow: '0 0 15px var(--card-color-gold-metallic), inset 0 0 5px var(--card-color-gold-metallic)',
                    }}
                />
            )}
        </div>
    );
});

CompactCardVisual.displayName = 'CompactCardVisual';
