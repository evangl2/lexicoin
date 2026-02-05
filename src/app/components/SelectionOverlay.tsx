import React from 'react';
import { motion } from 'motion/react';
import type { ContentItem } from '@/app/types/CardContent';
import { useWheelStopPropagation } from '@/app/hooks/useWheelStopPropagation';

export interface SelectionOverlayProps {
    items: ContentItem[];
    selectedId: string;
    onSelect: (item: ContentItem) => void;
    onClose: () => void;
    lang: string;
    tokens: any;
}

/**
 * Selection overlay component for choosing card definitions.
 * Displays a full-screen modal with alchemy-themed aesthetics.
 */
export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
    items,
    selectedId,
    onSelect,
    onClose,
    lang,
    tokens
}) => {
    const overlayRef = useWheelStopPropagation();

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-50 flex flex-col overflow-hidden"
            style={{
                backgroundColor: tokens.colors.selectionBackend || 'rgba(5, 5, 5, 0.96)',
                backdropFilter: 'blur(12px)',
                backgroundImage: tokens.assets?.textures?.backPattern || 'none',
                backgroundSize: '120px 60px',
                backgroundPosition: 'center',
                backgroundBlendMode: 'overlay'
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Alchemy pattern overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: tokens.assets?.textures?.backPattern || 'none',
                    backgroundSize: '120px 60px'
                }}
            />

            {/* Header with alchemy decorations */}
            <div className="flex items-center justify-center px-5 h-[5%] min-h-[32px] shrink-0 border-b relative"
                style={{ borderColor: tokens.colors.borderSubtle }}
            >
                <h3
                    className="text-sm font-serif tracking-wider text-center relative z-10"
                    style={{
                        color: tokens.colors.textHighlight,
                        fontFamily: tokens.typography.label.family,
                        backgroundImage: tokens.gradients?.primary || `linear-gradient(to bottom, ${tokens.colors.goldBright}, ${tokens.colors.goldDeep})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                        letterSpacing: '0.1em'
                    }}
                >
                    <span className="opacity-70 mx-2">✧</span>
                    SELECT DEFINITION
                    <span className="opacity-70 mx-2">✧</span>
                </h3>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-3 p-1 rounded transition-all duration-200 hover:bg-white/10"
                    style={{ color: tokens.colors.textSecondary }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 0 10px rgba(212, 175, 55, 0.3)`;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Options List */}
            <div
                className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 back-scrollable"
                onWheel={(e) => e.stopPropagation()}
            >
                {items.map((item, index) => {
                    const isSelected = item.id === selectedId;
                    return (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="relative p-4 pr-3 rounded cursor-pointer transition-all duration-200"
                            style={{
                                backgroundColor: isSelected
                                    ? tokens.colors.selectionItemActive || 'rgba(192, 160, 98, 0.12)'
                                    : tokens.colors.selectionItemInactive || 'rgba(255, 255, 255, 0.02)',
                                border: `1.5px solid ${isSelected ? tokens.colors.goldMetallic : tokens.colors.borderSubtle}`,
                                boxShadow: isSelected
                                    ? tokens.shadows.selectionGlow || `0 0 25px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(240, 208, 130, 0.15)`
                                    : 'inset 0 1px 0 rgba(240, 208, 130, 0.03)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = tokens.colors.borderOuter;
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                                    e.currentTarget.style.borderColor = tokens.colors.borderSubtle;
                                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(240, 208, 130, 0.03)';
                                }
                            }}
                        >
                            {/* Number badge */}
                            <div
                                className="absolute top-4 left-3 w-5 h-5 flex items-center justify-center pointer-events-none select-none"
                                style={{
                                    fontFamily: tokens.typography.label.family,
                                    color: tokens.colors.goldMetallic,
                                    opacity: 0.5
                                }}
                            >
                                <span className="text-[10px] font-bold">{index + 1}</span>
                            </div>

                            {/* Text content */}
                            <p
                                className="text-base font-sans leading-relaxed select-none pl-6 pr-1 indent-3"
                                style={{
                                    color: tokens.colors.textPrimary,
                                    fontFamily: tokens.typography.body.family,
                                    lineHeight: '1.65',
                                    letterSpacing: '0.01em'
                                }}
                            >
                                {lang === 'zh' ? item.zh : item.en}
                            </p>

                            {/* Selected indicator glow */}
                            {isSelected && (
                                <div
                                    className="absolute inset-0 rounded pointer-events-none"
                                    style={{
                                        boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.1)',
                                        animation: 'pulse 2s ease-in-out infinite'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom decorative line */}
            <div className="h-px mx-5 mb-4" style={{
                background: `linear-gradient(to right, transparent, ${tokens.colors.borderOuter}, transparent)`,
                opacity: 0.3
            }} />
        </motion.div>
    );
};
