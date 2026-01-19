/**
 * WorldView - Main Game View
 * 
 * The primary canvas where players interact with senses
 */

import React from 'react';
import { useGameStore } from '@store/index';
import { TopBar } from '@ui/components/hud/TopBar';
import { Workbench } from '@ui/components/workbench/Workbench';
import { DeckDrawer } from '@ui/components/deck/DeckDrawer';
import './WorldView.css';

export const WorldView: React.FC = () => {
    const canvasView = useGameStore(state => state.canvasView);
    const senses = useGameStore(state => state.senses);
    const modulesReady = useGameStore(state => state.modulesReady);

    if (!modulesReady) {
        return (
            <div className="world-view loading">
                <div className="loading-spinner"></div>
                <p>Initializing Lexicoin...</p>
            </div>
        );
    }

    return (
        <div className="world-view">
            {/* HUD - Top Bar */}
            <TopBar />

            {/* Main Workbench Area */}
            <div className="pt-16 w-full h-full">
                <Workbench>
                    {/* Canvas Content */}
                    <div
                        className="canvas"
                        style={{
                            transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.scale})`,
                        }}
                    >
                        {/* Welcome Message */}
                        <div className="welcome-card">
                            <h1 className="title text-gradient">Welcome to Lexicoin</h1>
                            <p className="subtitle">语言炼金术 - Language Alchemy</p>
                            <div className="info">
                                <p>✨ 项目初始化完成</p>
                                <p>📦 已加载 {senses.length} 个词义</p>
                                <p>🎮 基础架构已就绪</p>
                                <p className="mt-4 text-amber-400">👇 点击下方的 Archive 或 Items 图标打开抽屉</p>
                            </div>
                        </div>
                    </div>
                </Workbench>
            </div>

            {/* Deck Drawer - Overlay */}
            <DeckDrawer />
        </div>
    );
};
