/**
 * GrimoireOverlayVisual.tsx
 * 
 * 职责：渲染全屏魔典交互界面。
 * 包含：翻开的书本背景、左页（叙事）、右页（槽位与动作）。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Languages } from 'lucide-react';
import { GrimoireEntity } from '@/types/index';
import { GrimoireLeftPage } from './GrimoireLeftPage';
import { GrimoireRightPage } from './GrimoireRightPage';
import { getGrimoirePersona } from '@/app/components/persona/grimoire';

interface GrimoireOverlayVisualProps {
    grimoire: GrimoireEntity;
    displayLang: 'learning' | 'system';
    submitting: boolean;
    isEvaluating: boolean;
    isFailing: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: () => void;
    onArchive: () => void;
    onToggleLang: () => void;
}

export const GrimoireOverlayVisual: React.FC<GrimoireOverlayVisualProps> = React.memo(({
    grimoire,
    displayLang,
    submitting,
    isEvaluating,
    isFailing,
    error,
    onClose,
    onSubmit,
    onArchive,
    onToggleLang
}) => {
    const persona = getGrimoirePersona(grimoire.personaId);
    const { tokens, visuals } = persona;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-md"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[60]"
                >
                    <X size={24} />
                </button>

                {/* Language Toggle */}
                <button
                    onClick={onToggleLang}
                    className="absolute top-8 right-24 flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[60]"
                >
                    <Languages size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{displayLang}</span>
                </button>

                {/* Main Book Container */}
                <motion.div
                    initial={{ scale: 0.9, y: 20, rotateX: 10 }}
                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                    exit={{ scale: 0.9, y: 20, rotateX: 10 }}
                    className={`relative w-full max-w-6xl aspect-[1.4/1] flex rounded-xl overflow-hidden ${tokens.shadows.overlay}`}
                    style={{ perspective: '1000px' }}
                >
                    {/* Left Page */}
                    <GrimoireLeftPage
                        grimoire={grimoire}
                        displayLang={displayLang}
                        persona={persona}
                    />

                    {/* Book Spine (Internal) */}
                    <div className={`w-12 h-full ${tokens.colors.spineBase} relative z-20 flex flex-col justify-between py-12 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]`}>
                        <div className="w-full h-[1px] bg-white/5" />
                        <div className="w-full h-[1px] bg-white/5" />
                        <div className="w-full h-[1px] bg-white/5" />
                        <div className="w-full h-[1px] bg-white/5" />
                    </div>

                    {/* Right Page */}
                    <GrimoireRightPage
                        grimoire={grimoire}
                        displayLang={displayLang}
                        isEvaluating={isEvaluating}
                        isFailing={isFailing}
                        submitting={submitting}
                        onSubmit={onSubmit}
                        onArchive={onArchive}
                        persona={persona}
                    />

                    {/* Page Texture Overlays (Global) */}
                    <visuals.PageTexture />
                </motion.div>

                {/* Error Banner */}
                {error && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full font-bold shadow-xl flex items-center gap-3 z-[70]"
                    >
                        <span className="text-sm">{error}</span>
                        <button onClick={onSubmit} className="underline text-xs opacity-80 hover:opacity-100">Retry</button>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
});

GrimoireOverlayVisual.displayName = 'GrimoireOverlayVisual';
