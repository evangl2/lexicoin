/**
 * LevelUpOverlay — 升级庆祝全屏遮罩
 * 
 * 监听 LEVEL_UP 消息，展示华丽的升级动画。
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { messageBus } from '@core/protocol/MessageBus';
import { useGameStore } from '@store/index';

interface LevelUpData {
    language: string;
    newLevel: number;
    previousLevel: number;
}

export const LevelUpOverlay: React.FC = () => {
    const [levelData, setLevelData] = useState<LevelUpData | null>(null);

    useEffect(() => {
        // 订阅升级消息
        // subscribe<T> 的 T 必须继承 BaseMessage
        const sub = messageBus.subscribe<any>('LEVEL_UP', (msg) => {
            setLevelData(msg.payload);
            
            // 3 秒后自动消失
            setTimeout(() => {
                setLevelData(null);
            }, 3500);
        });

        return () => messageBus.unsubscribe('LEVEL_UP', sub);
    }, []);

    return (
        <AnimatePresence>
            {levelData && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
                >
                    {/* 装饰性背景光效 */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)] animate-pulse" />
                    
                    <motion.div 
                        initial={{ scale: 0.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                        className="relative flex flex-col items-center"
                    >
                        {/* 升级徽标 */}
                        <div className="relative mb-8">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="absolute -inset-10 border border-white/10 rounded-full"
                            />
                            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 select-none">
                                {levelData.newLevel}
                            </div>
                            <div className="absolute top-0 right-0 px-2 py-1 bg-yellow-500 rounded text-[10px] font-bold text-black translate-x-1/2 -translate-y-1/2">
                                NEW LEVEL
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-4xl font-bold text-white tracking-widest uppercase">LEVEL UP</h2>
                            <p className="text-white/60 font-medium tracking-wide">
                                {levelData.language.toUpperCase()} Mastery Increased
                            </p>
                        </div>

                        {/* 过渡箭头 */}
                        <div className="mt-8 flex items-center gap-6 text-2xl font-mono text-white/40">
                            <span>{levelData.previousLevel}</span>
                            <span className="text-yellow-500">→</span>
                            <span className="text-white text-3xl font-bold">{levelData.newLevel}</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
