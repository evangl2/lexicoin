/**
 * TopBar - HUD Component
 * 
 * Fixed top bar with glassmorphism effect
 * Displays player stats and control buttons
 */

import React from 'react';
import { useGameStore } from '@store/index';

export const TopBar: React.FC = () => {
    const player = useGameStore(state => state.player);

    const handleDebug = () => {
        console.log('=== DEBUG INFO ===');
        console.log('Player:', player);
        console.log('Level:', player.level);
        console.log('XP:', `${player.xp}/${player.xpToNextLevel}`);
        console.log('Phase:', player.phase);
    };

    const handleSettings = () => {
        console.log('Settings clicked - to be implemented');
    };

    // Calculate XP percentage for progress bar
    const xpPercentage = (player.xp / player.xpToNextLevel) * 100;

    return (
        <div className="fixed top-0 left-0 right-0 h-16 bg-black/30 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
            {/* Left Side - Player Info */}
            <div className="flex items-center gap-6">
                {/* Level Display */}
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
                        {player.level}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-sm font-semibold">Level {player.level}</span>
                        <span className="text-white/60 text-xs">{player.phase}</span>
                    </div>
                </div>

                {/* XP Progress Bar */}
                <div className="flex flex-col gap-1 min-w-[200px]">
                    <div className="flex justify-between items-center">
                        <span className="text-white/80 text-xs font-medium">XP</span>
                        <span className="text-white/60 text-xs">{player.xp} / {player.xpToNextLevel}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                            style={{ width: `${xpPercentage}%` }}
                        />
                    </div>
                </div>

                {/* HP/MP Indicators */}
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-white/80 text-xs font-mono">{player.hp}/{player.maxHp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-white/80 text-xs font-mono">{player.mp}/{player.maxMp}</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Controls */}
            <div className="flex items-center gap-3">
                {/* Debug Button */}
                <button
                    onClick={handleDebug}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30"
                >
                    Debug
                </button>

                {/* Settings Button */}
                <button
                    onClick={handleSettings}
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/30 flex items-center justify-center"
                    title="Settings"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
};
