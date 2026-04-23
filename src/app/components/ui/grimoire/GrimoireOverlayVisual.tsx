/**
 * GrimoireOverlayVisual.tsx
 * 
 * 职责：渲染全屏魔典界面的外壳和布局。
 * 组合左页与右页。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { GrimoireEntity } from '@/types/index';
import { GrimoireLeftPage } from './GrimoireLeftPage';
import { GrimoireRightPage } from './GrimoireRightPage';

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
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-lg p-8"
            >
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* The Physical Book / Manuscript */}
                <motion.div
                    initial={{ scale: 0.9, y: 20, rotateX: 10 }}
                    transition={{ type: "spring", damping: 20, stiffness: 150 }}
                    animate={{ scale: 1, y: 0, rotateX: 0 }}
                    className="relative w-full max-w-5xl aspect-[1.4/1] bg-[#2a241e] rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex border border-[#4a3e35]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GrimoireLeftPage
                        grimoire={grimoire}
                        displayLang={displayLang}
                        onToggleLang={onToggleLang}
                    />

                    <GrimoireRightPage
                        grimoire={grimoire}
                        displayLang={displayLang}
                        isEvaluating={isEvaluating}
                        isFailing={isFailing}
                        submitting={submitting}
                        onSubmit={onSubmit}
                        onArchive={onArchive}
                    />

                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors z-20"
                    >
                        <X size={20} className="text-[#3e2723]" />
                    </button>
                    
                    {/* Error Toast (Optional internal display) */}
                    {error && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-900/80 text-red-100 text-xs rounded-lg border border-red-500/50 backdrop-blur-md z-50">
                            {error}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
});

GrimoireOverlayVisual.displayName = 'GrimoireOverlayVisual';
