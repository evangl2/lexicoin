/**
 * App Component - Main Application Entry
 * 
 * Root component that initializes all modules and renders the new Canvas-based UI
 */

import { useEffect } from 'react';
import { DevConsole } from '@/app/components/system/DevConsole';
import { NotificationSystem } from '@/app/components/system/NotificationSystem';
import { logger } from '@utils/logger';

// Import centralized module initialization
import { initializeModules } from '@core/init/moduleInit';

// Import the new Canvas UI
import CanvasApp from './app/App';

function App() {

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
            {/* Main Canvas UI from reference frontend */}
            <CanvasApp />

            {/* System Components */}
            <NotificationSystem />
            <DevConsole />
        </div>
    );
}

export default App;
