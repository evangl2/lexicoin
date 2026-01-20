/**
 * App Component - Main Application Entry
 * 
 * Root component that initializes all modules and renders the UI
 */

import React, { useEffect } from 'react';
import { useGameStore } from '@store/index';
import { WorldView } from '@ui/views/WorldView';
import { DevConsole } from '@ui/components/system/DevConsole';
import { NotificationSystem } from '@ui/components/system/NotificationSystem';
import { logger } from '@utils/logger';

// Import centralized module initialization
import { initializeModules } from '@core/init/moduleInit';

function App() {
    const viewMode = useGameStore(state => state.viewMode);
    const modulesReady = useGameStore(state => state.modulesReady);

    // Initialize all modules on mount
    useEffect(() => {
        const initializeApp = async () => {
            logger.info('Initializing Lexicoin...', undefined, 'App');

            try {
                // Use centralized module initialization
                await initializeModules();
                logger.info('✅ All modules initialized successfully', undefined, 'App');
            } catch (error) {
                logger.error('❌ Failed to initialize app', error, 'App');
            }
        };

        initializeApp();
    }, []);

    return (
        <div className="app-container">
            {/* Main View */}
            {viewMode === 'WORLD' && <WorldView />}

            {/* System Components */}
            <NotificationSystem />
            <DevConsole />
        </div>
    );
}

export default App;
