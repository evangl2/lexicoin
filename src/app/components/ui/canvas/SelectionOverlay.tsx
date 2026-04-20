import React from 'react';
import { motion } from 'motion/react';
import type { ContentItem } from '@/app/types/CardContent';
import { useWheelStopPropagation } from '@/app/hooks/useWheelStopPropagation';
import { DynamicText } from '@/app/components/ui/text/DynamicText';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

export interface SelectionOverlayProps {
    items: ContentItem[];
    selectedId: string;
    onSelect: (item: ContentItem) => void;
    systemLang: Language;
    learningLang: Language;
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
    systemLang,
    learningLang,
    tokens
}) => {
    const prompts: Record<string, string> = {
        'en': 'SELECT DEFINITION',
        'zh-CN': '选择定义',
        'ja': '定義を選択',
        'fr': 'CHOISIR LA DÉFINITION',
        'de': 'DEFINITION WÄHLEN',
        'es': 'SELECCIONAR DEFINICIÓN',
        'it': 'SELEZIONA DEFINIZIONE',
        'pt': 'SELECIONAR DEFINIÇÃO'
    };

    const headerPrompt = prompts[systemLang] || prompts['en'] || '';
    const overlayRef = useWheelStopPropagation();

    return (
        <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[45] flex flex-col overflow-hidden rounded-[inherit] px-5 py-4"
            style={{
                backgroundColor: 'rgba(5, 5, 5, 0.94)',
                backdropFilter: 'blur(12px)',
                backgroundImage: 'var(--card-noise-texture)',
                backgroundBlendMode: 'overlay',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Elegant Header Area (Aligned with card header height) */}
            <div className="shrink-0 flex items-center justify-center mb-6 mt-6 relative">
                <div 
                    className="w-full max-w-[85%] h-10 flex items-center justify-center rounded-sm relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg, #2a2a2a 0%, #151515 100%)',
                        border: '1px solid var(--card-color-border-inner)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 10px rgba(0,0,0,0.5)'
                    }}
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'var(--card-noise-texture)' }} />
                    
                    <span 
                        className="relative z-10 text-[11px] font-bold tracking-[0.25rem] text-center px-4"
                        style={{
                            fontFamily: 'var(--card-font-label)',
                            color: 'var(--card-color-gold-bright)',
                            textShadow: '0 2px 4px rgba(0,0,0,1)',
                            letterSpacing: '0.3em'
                        }}
                    >
                        {headerPrompt}
                    </span>

                    <div className="absolute inset-x-0 top-0 h-px bg-white/5" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-black/40" />
                </div>
            </div>

            {/* Options List - Replicating Definition Box Style */}
            <div
                className="flex-1 overflow-y-auto px-1 py-1 space-y-4 back-scrollable"
                onWheel={(e) => e.stopPropagation()}
            >
                {items.map((item, index) => {
                    const isSelected = item.id === selectedId;
                    const displayDefinition = item.definitions[learningLang] || item.definitions['en'] || '';

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.1 }}
                            onClick={() => onSelect(item)}
                            className="relative p-5 group/item cursor-pointer transition-all duration-300 rounded-[0.375rem]"
                            style={{
                                background: isSelected
                                    ? 'var(--card-gradient-def-box-overlay), var(--card-color-gold-dark)'
                                    : 'var(--card-gradient-def-box-overlay), var(--card-color-def-box-bg)',
                                border: isSelected 
                                    ? '2px solid var(--card-color-gold-metallic)' 
                                    : '2px solid var(--card-color-border-outer)',
                                boxShadow: isSelected
                                    ? '0 0 25px rgba(212, 175, 55, 0.25), var(--card-shadow-def-box)'
                                    : 'var(--card-shadow-def-box)'
                            }}
                        >
                            {/* Index Badge - Alchemy style */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 opacity-40">
                                <span 
                                    className="text-[8px] font-bold tracking-widest"
                                    style={{ fontFamily: 'var(--card-font-label)', color: 'var(--card-color-gold-metallic)' }}
                                >
                                    ITEM {(index + 1).toString().padStart(2, '0')}
                                </span>
                            </div>

                            <p
                                className="text-[15px] font-sans leading-relaxed select-none pl-1 mt-2"
                                style={{
                                    color: isSelected ? 'var(--card-color-gold-bright)' : 'var(--card-color-text-primary)',
                                    fontFamily: 'var(--card-font-body)',
                                    lineHeight: '1.6',
                                    opacity: isSelected ? 1 : 0.9
                                }}
                            >
                                {displayDefinition}
                            </p>

                            {/* Hover Highlight */}
                            {!isSelected && (
                                <div className="absolute inset-0 border border-transparent group-hover/item:border-gold-metallic/30 rounded-[inherit] transition-colors pointer-events-none" />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Bottom Spacer/Footer Decoration */}
            <div className="h-14 shrink-0 flex flex-col items-center justify-center opacity-40 mb-2">
                <div className="flex items-center">
                    <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold-metallic" />
                    <div className="w-2 h-2 rotate-45 border border-gold-metallic mx-3" />
                    <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold-metallic" />
                </div>
            </div>
        </motion.div>
    );
};
