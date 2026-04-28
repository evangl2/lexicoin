/**
 * App Component - Main Application Entry
 *
 * 当前处于 PixiJS v8 重写期间（见 docs/refactor-pixi/roadmap.md）。
 * 仅保留 DevConsole 作为系统入口；NotificationSystem 等 UI 待新画布完成后重新接入。
 */

import { useEffect, useState } from 'react';
import { DevConsole } from '@/app/components/system/DevConsole';
import { logger } from '@utils/logger';

import { initializeModules } from '@core/init/moduleInit';

import CanvasApp from './app/App';

function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            logger.info('Initializing Lexicoin...', undefined, 'App');
            try {
                await initializeModules();
                logger.info('✅ All modules initialized successfully', undefined, 'App');
                setIsReady(true);
            } catch (error) {
                logger.error('❌ Failed to initialize app', error, 'App');
            }
        };

        initializeApp();
    }, []);

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-black text-gold-500 font-serif">
                <div className="animate-pulse">Initializing Lexicoin...</div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <CanvasApp />
            <DevConsole />
        </div>
    );
}

export default App;
