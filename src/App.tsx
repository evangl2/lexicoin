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

// Import modules for initialization
import { messageBus } from '@core/protocol/MessageBus';
import { storageManager } from '@core/storage/StorageManager';
import { senseModule } from '@modules/sense/SenseModule';

function App() {
    const viewMode = useGameStore(state => state.viewMode);
    const setModulesReady = useGameStore(state => state.setModulesReady);
    const setSenses = useGameStore(state => state.setSenses);

    // Initialize modules on mount
    useEffect(() => {
        const initializeApp = async () => {
            logger.info('Initializing Lexicoin...', undefined, 'App');

            try {
                // Load persisted data
                const savedSenses = await storageManager.loadSenses();
                if (savedSenses.length > 0) {
                    senseModule.loadSenses(savedSenses);
                    setSenses(savedSenses);
                    logger.info(`Loaded ${savedSenses.length} senses from storage`, undefined, 'App');
                }

                // Subscribe to sense changes
                messageBus.subscribe('SENSE_CREATED', (message) => {
                    const sense = message.payload;
                    setSenses(senseModule.getAllSenses());
                    logger.debug('Sense created, updating store', { id: sense.id }, 'App');
                });

                // Mark modules as ready
                setModulesReady(true);
                logger.info('All modules initialized successfully', undefined, 'App');
            } catch (error) {
                logger.error('Failed to initialize app', error, 'App');
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
