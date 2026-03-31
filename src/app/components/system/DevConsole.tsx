/**
 * DevConsole - Enhanced Developer Console
 * 
 * Advanced debug panel with:
 * - Real-time message stream viewer
 * - State inspector with JSON viewer
 * - Telemetry dashboard
 * - Manual event injection
 * - Log filtering and search
 */

import React, { useState, useEffect, useRef } from 'react';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { useGameStore } from '@store/index';
import { platformAdapter } from '@core/platform/PlatformAdapter';
import { personaModule } from '@modules/persona/PersonaModule';
import { itemModule } from '@modules/item/ItemModule';
import { reviewModule } from '@modules/review/ReviewModule';
import { libraryModule } from '@modules/library/LibraryModule';
import { senseRepository } from '@core/storage/SenseRepository';
import { visualRepository } from '@core/storage/VisualRepository';
import { INITIAL_SENSES } from '@schemas/data/initialSenses';
import { ALL_INITIAL_VISUALS } from '@schemas/data/InitialItem';
import { db } from '@core/storage/db';
import type { BaseMessage } from '@app-types/protocol';
import './DevConsole.css';

type TabType = 'messages' | 'state' | 'telemetry' | 'inject' | 'logs' | 'system';

const StateInspector: React.FC = () => {
    // Get all store state - moved here to prevent re-renders in main console
    const store = useGameStore();

    return (
        <div className="tab-content">
            <div className="state-inspector">
                <section className="state-section">
                    <h4>🎮 Player State</h4>
                    <pre>{JSON.stringify(store.player, null, 2)}</pre>
                </section>

                <section className="state-section">
                    <h4>🎭 Persona State</h4>
                    <div className="state-grid">
                        <div>Active: {store.activePersona || 'None'}</div>
                        <div>Resonance: {JSON.stringify(store.personaResonance, null, 2)}</div>
                    </div>
                </section>

                <section className="state-section">
                    <h4>🎒 Inventory ({store.inventory.length})</h4>
                    <pre>{JSON.stringify(store.inventory, null, 2)}</pre>
                </section>

                <section className="state-section">
                    <h4>📚 Senses ({store.senses.length})</h4>
                    <div className="sense-list">
                        {store.senses.slice(0, 10).map(sense => (
                            <div key={sense.id} className="sense-item">
                                {sense.word.en} - {sense.meaning.en}
                            </div>
                        ))}
                        {store.senses.length > 10 && (
                            <div className="more-indicator">
                                ... and {store.senses.length - 10} more
                            </div>
                        )}
                    </div>
                </section>

                <section className="state-section">
                    <h4>🏗️ Constructions ({store.constructions.length})</h4>
                    <pre>{JSON.stringify(store.constructions.slice(0, 5), null, 2)}</pre>
                </section>

                <section className="state-section">
                    <h4>📱 Platform Info</h4>
                    <pre>{JSON.stringify({
                        platform: platformAdapter.getPlatform(),
                        viewport: platformAdapter.getViewport(),
                        hasTouch: platformAdapter.hasTouch(),
                        hasMouse: platformAdapter.hasMouse(),
                    }, null, 2)}</pre>
                </section>
            </div>
        </div>
    );
};

export const DevConsole: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('messages');
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [logFilter, setLogFilter] = useState('');
    const [messageFilter, setMessageFilter] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Real-time message subscription
    useEffect(() => {
        if (!isOpen || isPaused) return;

        const unsubscribe = messageBus.subscribe('*' as any, (message) => {
            setMessages(prev => [...prev.slice(-99), message]);
        });

        return unsubscribe;
    }, [isOpen, isPaused]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    // Update logs periodically
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setLogs(logger.getHistory().slice(-100));
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    const clearMessages = () => {
        setMessages([]);
        messageBus.clearLog();
    };

    const clearLogs = () => {
        setLogs([]);
        logger.clearHistory();
    };

    const getTelemetry = () => {
        return messageBus.getTelemetry();
    };

    const getSubscriptions = () => {
        return messageBus.getSubscriptions();
    };

    const injectMessage = (type: string, payload: any) => {
        messageBus.send(type, payload, 'DevConsole');
    };

    if (!isOpen) {
        return (
            <button
                className="dev-console-toggle"
                onClick={() => setIsOpen(true)}
                title="Open Developer Console (Shift+D)"
            >
                🛠️
            </button>
        );
    }

    const filteredMessages = messages.filter(msg =>
        !messageFilter || msg.type.toLowerCase().includes(messageFilter.toLowerCase())
    );

    const filteredLogs = logs.filter(log =>
        !logFilter || log.message.toLowerCase().includes(logFilter.toLowerCase())
    );

    return (
        <div className="dev-console">
            <div className="dev-console-header">
                <h3>🛠️ Developer Console</h3>
                <div className="dev-console-controls">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={isPaused ? 'paused' : ''}
                        title={isPaused ? 'Resume' : 'Pause'}
                    >
                        {isPaused ? '▶️' : '⏸️'}
                    </button>
                    <button onClick={() => setIsOpen(false)}>✕</button>
                </div>
            </div>

            <div className="dev-console-tabs">
                <button
                    className={activeTab === 'messages' ? 'active' : ''}
                    onClick={() => setActiveTab('messages')}
                >
                    📨 Messages ({messages.length})
                </button>
                <button
                    className={activeTab === 'state' ? 'active' : ''}
                    onClick={() => setActiveTab('state')}
                >
                    🗂️ State
                </button>
                <button
                    className={activeTab === 'telemetry' ? 'active' : ''}
                    onClick={() => setActiveTab('telemetry')}
                >
                    📊 Telemetry
                </button>
                <button
                    className={activeTab === 'inject' ? 'active' : ''}
                    onClick={() => setActiveTab('inject')}
                >
                    💉 Inject
                </button>
                <button
                    className={activeTab === 'logs' ? 'active' : ''}
                    onClick={() => setActiveTab('logs')}
                >
                    📝 Logs ({logs.length})
                </button>
                <button
                    className={activeTab === 'system' ? 'active' : ''}
                    onClick={() => setActiveTab('system')}
                >
                    ⚠️ System
                </button>
            </div>

            <div className="dev-console-content">
                {/* Messages Tab */}
                {activeTab === 'messages' && (
                    <div className="tab-content">
                        <div className="tab-toolbar">
                            <input
                                type="text"
                                placeholder="Filter messages..."
                                value={messageFilter}
                                onChange={(e) => setMessageFilter(e.target.value)}
                                className="filter-input"
                            />
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={autoScroll}
                                    onChange={(e) => setAutoScroll(e.target.checked)}
                                />
                                Auto-scroll
                            </label>
                            <button onClick={clearMessages} className="clear-btn">
                                Clear
                            </button>
                        </div>
                        <div className="message-stream">
                            {filteredMessages.map((msg, idx) => (
                                <div key={idx} className="message-item">
                                    <span className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="message-type">{msg.type}</span>
                                    <span className="message-source">{msg.source}</span>
                                    <details className="message-payload">
                                        <summary>Payload</summary>
                                        <pre>{JSON.stringify(msg.payload, null, 2)}</pre>
                                    </details>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}

                {/* State Inspector Tab */}
                {activeTab === 'state' && <StateInspector />}

                {/* Telemetry Tab */}
                {activeTab === 'telemetry' && (
                    <div className="tab-content">
                        <div className="telemetry-dashboard">
                            <section className="telemetry-section">
                                <h4>📊 Message Telemetry</h4>
                                <table className="telemetry-table">
                                    <thead>
                                        <tr>
                                            <th>Message Type</th>
                                            <th>Count</th>
                                            <th>Avg Time (ms)</th>
                                            <th>Errors</th>
                                            <th>Last</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getTelemetry().map((data, idx) => (
                                            <tr key={idx}>
                                                <td>{data.messageType}</td>
                                                <td>{data.count}</td>
                                                <td>{data.averageProcessingTime.toFixed(2)}</td>
                                                <td className={data.errorCount > 0 ? 'error' : ''}>
                                                    {data.errorCount}
                                                </td>
                                                <td>{new Date(data.lastTimestamp).toLocaleTimeString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>

                            <section className="telemetry-section">
                                <h4>📡 Active Subscriptions</h4>
                                <table className="subscriptions-table">
                                    <thead>
                                        <tr>
                                            <th>Message Type</th>
                                            <th>Subscribers</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(getSubscriptions().entries()).map(([type, count], idx) => (
                                            <tr key={idx}>
                                                <td>{type}</td>
                                                <td>{count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </div>
                )}

                {/* Inject Tab */}
                {activeTab === 'inject' && (
                    <div className="tab-content">
                        <div className="inject-panel">
                            <h4>💉 Manual Event Injection</h4>
                            <p className="inject-description">
                                Inject custom messages into the MessageBus for testing
                            </p>

                            <div className="inject-presets">
                                <button onClick={() => injectMessage('SENSE_CREATED', { id: 'test-sense' })}>
                                    Inject SENSE_CREATED
                                </button>
                                <button onClick={() => injectMessage('PERSONA_ACTIVATED', { personaId: 'LOGICIAN' })}>
                                    Activate LOGICIAN
                                </button>
                                <button onClick={() => injectMessage('ITEM_ADDED', { itemId: 'test-item', quantity: 1 })}>
                                    Add Test Item
                                </button>
                                <button onClick={() => injectMessage('ACHIEVEMENT_UNLOCKED', { achievementId: 'test-achievement' })}>
                                    Unlock Achievement
                                </button>
                            </div>

                            <div className="inject-custom">
                                <h5>Custom Message</h5>
                                <input
                                    type="text"
                                    placeholder="Message Type (e.g., CUSTOM_EVENT)"
                                    id="custom-type"
                                    className="inject-input"
                                />
                                <textarea
                                    placeholder='Payload JSON (e.g., {"key": "value"})'
                                    id="custom-payload"
                                    className="inject-textarea"
                                    rows={5}
                                />
                                <button
                                    onClick={() => {
                                        const typeInput = document.getElementById('custom-type') as HTMLInputElement;
                                        const payloadInput = document.getElementById('custom-payload') as HTMLTextAreaElement;
                                        try {
                                            const payload = JSON.parse(payloadInput.value || '{}');
                                            injectMessage(typeInput.value, payload);
                                            typeInput.value = '';
                                            payloadInput.value = '';
                                        } catch (e) {
                                            alert('Invalid JSON payload');
                                        }
                                    }}
                                    className="inject-btn"
                                >
                                    Inject Custom Message
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="tab-content">
                        <div className="tab-toolbar">
                            <input
                                type="text"
                                placeholder="Filter logs..."
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                className="filter-input"
                            />
                            <button onClick={clearLogs} className="clear-btn">
                                Clear
                            </button>
                        </div>
                        <div className="log-stream">
                            {filteredLogs.map((log, idx) => (
                                <div key={idx} className={`log-item log-${log.level.toLowerCase()}`}>
                                    <span className="log-time">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="log-level">{log.level}</span>
                                    <span className="log-source">{log.source}</span>
                                    <span className="log-message">{log.message}</span>
                                    {log.data && (
                                        <details className="log-data">
                                            <summary>Data</summary>
                                            <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                        </details>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                    <div className="tab-content">
                        <div className="system-panel">
                            <h4>⚠️ Danger Zone</h4>
                            <p className="warning-text">
                                These actions are destructive and cannot be undone.
                            </p>

                            <div className="system-actions">
                                <button
                                    className="danger-btn"
                                    onClick={async () => {
                                        if (confirm('Are you SURE you want to factory reset? This will wipe ALL progress, custom senses, and current state.')) {
                                            try {
                                                logger.warn('Initiating Factory Reset...', undefined, 'DevConsole');

                                                // 1. Reset Repositories
                                                await senseRepository.reset(INITIAL_SENSES);
                                                await visualRepository.reset(ALL_INITIAL_VISUALS);

                                                // 2. Clear other DB tables
                                                await db.gameData.clear();
                                                await db.canvasPositions.clear();
                                                await db.devices.clear();
                                                await db.cardInventory.clear();
                                                await db.synthesisLog.clear();

                                                // 3. Force reload to reset in-memory state
                                                window.location.reload();
                                            } catch (e) {
                                                logger.error('Factory Reset Failed', e, 'DevConsole');
                                                alert('Reset failed. Check logs.');
                                            }
                                        }
                                    }}
                                >
                                    💥 Restore Initial State
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
