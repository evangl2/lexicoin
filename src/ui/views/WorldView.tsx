/**
 * WorldView - Main Game View
 * 
 * The primary canvas where players interact with senses
 */

import React from 'react';
import { useGameStore } from '@store/index';
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
                    </div>
                </div>
            </div>
        </div>
    );
};
