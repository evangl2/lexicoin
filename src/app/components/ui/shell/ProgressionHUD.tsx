/**
 * ProgressionHUD — 全局等级与经验条
 * 
 * 展示当前语言的学习进度，采用磨砂玻璃质感。
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@store/index';
import { selectLanguageLevelInfo } from '@store/selectors';
import { LEVEL_XP_THRESHOLDS } from '@/config/balance';
import { mapLanguageCode } from '@/app/utils/localization';
import { HUD_PROGRESS_BAR_SPRING } from '@/config/physics';

export const ProgressionHUD: React.FC = () => {
    const learningLang = useGameStore(s => s.player.settings.learningLang);
    const level      = useGameStore(s => s.player?.languageProgress?.[learningLang]?.level ?? 1);
    const xp         = useGameStore(s => s.player?.languageProgress?.[learningLang]?.xp ?? 0);
    const xpToNext   = useGameStore(s => s.player?.languageProgress?.[learningLang]?.xpToNextLevel ?? 100);
    const stamina    = useGameStore(s => s.player?.stamina ?? 300);
    const maxStamina = useGameStore(s => s.player?.maxStamina ?? 300);

    const progressInfo = React.useMemo(() => {
        const threshold = xpToNext || LEVEL_XP_THRESHOLDS[level - 1] || 100;
        return {
            level,
            xp,
            xpToNext: threshold,
            progress: Math.min(1.0, xp / threshold)
        };
    }, [level, xp, xpToNext]);

    // 获取语言显示名称或标志
    const langDisplay = mapLanguageCode(learningLang).toUpperCase();

    return (
        <div className="absolute top-6 left-6 z-50 flex items-center gap-4 pointer-events-none">
            {/* 等级徽标 */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative flex items-center justify-center w-14 h-14 rounded-xl backdrop-blur-xl border border-white/20 bg-white/5 shadow-2xl"
            >
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-white/40 leading-none mb-0.5">{langDisplay}</span>
                    <span className="text-xl font-black text-white leading-none tracking-tighter">{progressInfo.level}</span>
                </div>
                
                {/* CEFR 标签 */}
                <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 bg-indigo-500 rounded text-[9px] font-bold text-white shadow-lg">
                    A1 {/* TODO: 从配置中获取动态 CEFR */}
                </div>
            </motion.div>
            {/* 经验条容器 */}
            <div className="flex flex-col gap-1 w-48">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-medium text-white/60 tracking-widest uppercase">Experience</span>
                    <span className="text-[10px] font-mono text-white/40">{Math.floor(progressInfo.progress * 100)}%</span>
                </div>
                
                {/* 进度条背景 */}
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                    {/* 进度条填充 */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressInfo.progress * 100}%` }}
                        transition={{ type: 'spring', ...HUD_PROGRESS_BAR_SPRING }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    />
                </div>
            </div>

            {/* 体力条容器 */}
            <div className="flex flex-col gap-1 w-32 border-l border-white/10 pl-4">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-medium text-amber-500/60 tracking-widest uppercase">Stamina</span>
                    <span className="text-[10px] font-mono text-amber-500/40">{Math.floor(stamina)}</span>
                </div>
                
                {/* 进度条背景 */}
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                    {/* 进度条填充 */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stamina / maxStamina) * 100}%` }}
                        transition={{ type: 'spring', ...HUD_PROGRESS_BAR_SPRING }}
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 shadow-[0_0_8px_rgba(217,119,6,0.5)]"
                    />
                </div>
            </div>
        </div>
    );
};
