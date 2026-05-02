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
import { useShallow } from 'zustand/react/shallow';
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
import { visualRegistry } from '@core/registries/VisualRegistry';
import { supabase } from '@core/infra/supabaseClient';
import type { VisualEntry } from '@schemas/schemas/SenseEntity.schema';
import type { BaseMessage } from '@app-types/protocol';
import { DebugSystem } from '@/pixi/systems/DebugSystem';
import { worldSystem } from '@/pixi/systems/WorldSystem';
import { getPixiApp } from '@/pixi/core/app';
import './DevConsole.css';

type TabType = 'messages' | 'state' | 'telemetry' | 'inject' | 'logs' | 'system' | 'cheat' | 'debug';

const StateInspector: React.FC = () => {
    // Get all store state - moved here to prevent re-renders in main console
    // useShallow: only re-render when these 6 fields change (not deckState, audio, etc.)
    const store = useGameStore(useShallow(s => ({
        player: s.player,
        activePersona: s.activePersona,
        personaResonance: s.personaResonance,
        inventory: s.inventory,
        senses: s.senses,
        constructions: s.constructions,
    })));

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
    const setSenses = useGameStore(s => s.setSenses);
    const setFeatureFlag = useGameStore(s => s.setFeatureFlag);
    const clearAllGrimoires = useGameStore(s => s.clearAllGrimoires);
    const uiTheme = useGameStore(s => s.uiTheme);
    const setUiTheme = useGameStore(s => s.setUiTheme);
    const [messageFilter, setMessageFilter] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchResult, setRefetchResult] = useState<string | null>(null);
    const player = useGameStore(s => s.player);
    const updateLanguageProgress = useGameStore(s => s.updateLanguageProgress);
    const regenerateStamina = useGameStore(s => s.regenerateStamina);
    const updatePlayer = useGameStore(s => s.updatePlayer);
    const [cheatStamina, setCheatStamina] = useState(100);
    const [cheatLevel, setCheatLevel] = useState(1);
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

    const handleRefetchVisuals = async () => {
        setIsRefetching(true);
        setRefetchResult(null);
        logger.info('🚀 Starting refetch for missing visuals...', undefined, 'DevConsole');
        
        try {
            // 1. Get current senses from IndexedDB (same source as useCardManager)
            const currentSenses = await senseRepository.getAll();

            // 2. Identify missing or failed UIDs
            const missingUids = currentSenses
                .map(s => s.uid)
                .filter(uid => {
                    const entry = visualRegistry.get(uid);
                    // Refetch if:
                    // - Not in registry at all
                    // - In registry but payload is missing or is the 'failed' placeholder
                    return !entry || !entry.payload || entry.payload === 'VISUAL_GENERATION_FAILED';
                });

            if (missingUids.length === 0) {
                setRefetchResult('✅ All visuals are already loaded.');
                logger.info('✅ No missing visuals found on current senses.', undefined, 'DevConsole');
                return;
            }

            logger.info(`🔍 Found ${missingUids.length} potential missing visuals. Checking Supabase...`, undefined, 'DevConsole');

            // 3. Fetch from Supabase
            const { data, error } = await supabase
                .from('sense_visuals')
                .select('sense_id, id, payload, meta')
                .in('sense_id', missingUids)
                .eq('id', 'default');

            if (error) throw error;

            if (!data || data.length === 0) {
                setRefetchResult('ℹ️ No backfilled visuals found in DB yet.');
                return;
            }

            // 4. Update Registry & Repository & Notify via MessageBus
            // Note: useCardManager listens to ASSET_LOADED and will update the React UI.
            let succeeded = 0;
            for (const row of data) {
                if (row.meta?.status === 'failed') continue;
                if (!row.payload || row.payload === 'VISUAL_GENERATION_FAILED') continue;
                
                const entry: VisualEntry = {
                    uid: row.sense_id,
                    id: row.id,
                    payload: row.payload,
                    meta: row.meta,
                };
                
                // Persist & Cache
                await visualRepository.upsert(entry);
                // Propagate! This triggers the re-render in useCardManager
                messageBus.send('ASSET_LOADED', entry, 'DevConsole');
                succeeded++;
            }

            setRefetchResult(
                `Checked ${missingUids.length} UIDs. Successfully refetched ${succeeded} ✅`
            );
            logger.info(`✅ Refetch complete. ${succeeded} assets updated and propagated.`, undefined, 'DevConsole');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setRefetchResult(`❌ Error: ${msg}`);
            logger.error(`❌ Refetch Failed: ${msg}`, err, 'DevConsole');
        } finally {
            setIsRefetching(false);
        }
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
                <button
                    className={activeTab === 'debug' ? 'active' : ''}
                    onClick={() => setActiveTab('debug')}
                >
                    🛠️ Debug
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
                                <button onClick={() => injectMessage('PERSONA_ACTIVATED', { personaId: 'CHILD' })}>
                                    Activate CHILD
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
                            <h4>🚩 Feature Flags</h4>
                            <div className="system-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: '24px', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <span>Persona (WC)</span>
                                    <select
                                        value={uiTheme}
                                        onChange={(e) => setUiTheme(e.target.value)}
                                        style={{ background: '#1a1a2e', color: '#ccc', border: '1px solid #444', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}
                                    >
                                        <option value="default">default (Alchemy)</option>
                                        <option value="cyberpunk">cyberpunk</option>
                                    </select>
                                    <span style={{ opacity: 0.5, fontSize: '11px' }}>current: {uiTheme}</span>
                                </label>
                            </div>

                            <h4>⚠️ Danger Zone</h4>
                            <p className="warning-text">
                                These actions are destructive and cannot be undone.
                            </p>

                            <div className="system-actions" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <button
                                    className="action-btn"
                                    onClick={handleRefetchVisuals}
                                    disabled={isRefetching}
                                >
                                    {isRefetching ? '⏳ Fetching...' : '🔄 Refetch Missing Visuals'}
                                </button>
                                {refetchResult && (
                                    <p className="action-result">{refetchResult}</p>
                                )}
                                
                                <div style={{ height: '24px' }} />
                                
                                <button
                                    className="danger-btn"
                                    onClick={() => {
                                        if (confirm('Are you SURE you want to clear all active Grimoires? Cards inside will return to repository.')) {
                                            clearAllGrimoires();
                                        }
                                    }}
                                    style={{ marginBottom: '12px', background: '#442222', borderColor: '#663333' }}
                                >
                                    🧹 Clear All Canvas Grimoires
                                </button>

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
                {/* Cheat Tab */}
                {activeTab === 'cheat' && (
                    <div className="tab-content">
                        <div className="cheat-panel">
                            <section className="cheat-section">
                                <h4>⚡ Stamina Control</h4>
                                <div className="cheat-row">
                                    <input 
                                        type="number" 
                                        value={cheatStamina} 
                                        onChange={e => setCheatStamina(parseInt(e.target.value))}
                                        className="cheat-input"
                                    />
                                    <button onClick={() => updatePlayer({ stamina: cheatStamina })}>Set Exact</button>
                                    <button onClick={() => regenerateStamina(1000)}>Refill Max</button>
                                </div>
                                <div className="cheat-presets">
                                    <button onClick={() => updatePlayer({ stamina: Math.max(0, player.stamina - 10) })}>-10</button>
                                    <button onClick={() => updatePlayer({ stamina: Math.min(player.maxStamina, player.stamina + 10) })}>+10</button>
                                    <button onClick={() => updatePlayer({ stamina: 0 })}>Empty</button>
                                </div>
                            </section>

                            <section className="cheat-section">
                                <h4>🆙 Progression Control</h4>
                                <div className="cheat-row">
                                    <div className="lang-target">
                                        Target: <strong>{player.settings.learningLang}</strong>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={cheatLevel} 
                                        onChange={e => setCheatLevel(parseInt(e.target.value))}
                                        className="cheat-input"
                                        placeholder="Level"
                                    />
                                    <button onClick={() => updateLanguageProgress(player.settings.learningLang, { level: cheatLevel })}>Set Level</button>
                                </div>
                                <div className="cheat-presets">
                                    <button onClick={() => {
                                        const currentXP = player.languageProgress[player.settings.learningLang]?.xp || 0;
                                        updateLanguageProgress(player.settings.learningLang, { xp: currentXP + 100 });
                                    }}>Add 100 XP</button>
                                    <button onClick={() => {
                                        updateLanguageProgress(player.settings.learningLang, { level: 1, xp: 0 });
                                    }}>Reset Progress</button>
                                </div>
                            </section>

                            <section className="cheat-section">
                                <h4>🖼 PixiJS Renderer</h4>
                                <div className="cheat-presets">
                                    <button onClick={() => {
                                        const cur = localStorage.getItem('pixi-antialias') !== 'false'
                                        localStorage.setItem('pixi-antialias', String(!cur))
                                        window.location.reload()
                                    }}>
                                        Antialias: {localStorage.getItem('pixi-antialias') !== 'false' ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                            </section>

                            <section className="cheat-section">
                                <h4>🎒 Resource Cheat</h4>
                                <div className="cheat-presets">
                                    <button onClick={() => updatePlayer({ echoCharges: 10 })}>Set 10 Echo Charges</button>
                                    <button disabled style={{ opacity: 0.5 }}>Unlock All Archetypes (Coming Soon)</button>
                                </div>
                            </section>
                        </div>
                    </div>
                )}
                {/* Debug Tab */}
                {activeTab === 'debug' && (
                    <div className="tab-content">
                        <div className="debug-panel">
                            <h4>🛠️ PixiJS Debug System</h4>
                            
                            <section className="debug-section">
                                <h5>🌍 World Size Controls</h5>
                                <div className="debug-row" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <div className="input-group">
                                        <span style={{ fontSize: '11px', opacity: 0.6 }}>Width</span>
                                        <input 
                                            type="number" 
                                            id="debug-world-w"
                                            defaultValue={8000}
                                            style={{ width: '80px', background: '#111', border: '1px solid #333', color: '#fff', padding: '4px' }}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <span style={{ fontSize: '11px', opacity: 0.6 }}>Height</span>
                                        <input 
                                            type="number" 
                                            id="debug-world-h"
                                            defaultValue={4000}
                                            style={{ width: '80px', background: '#111', border: '1px solid #333', color: '#fff', padding: '4px' }}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const w = parseInt((document.getElementById('debug-world-w') as HTMLInputElement).value);
                                            const h = parseInt((document.getElementById('debug-world-h') as HTMLInputElement).value);
                                            DebugSystem.setWorldSize(w, h);
                                        }}
                                        style={{ padding: '4px 12px', background: '#334466', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Apply Size
                                    </button>
                                </div>
                            </section>

                            <section className="debug-section">
                                <h5>👁️ View Overlays</h5>
                                <label className="debug-toggle">
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={localStorage.getItem('LEXI_DEBUG_VISUALS') === 'true'}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            localStorage.setItem('LEXI_DEBUG_VISUALS', String(val));
                                            if (worldSystem.viewport) {
                                                DebugSystem.setVisualsEnabled(worldSystem.contentLayer!, val);
                                            }
                                        }}
                                    />
                                    <span>World Visuals (Grid & Reference)</span>
                                </label>

                                <label className="debug-toggle">
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={localStorage.getItem('LEXI_DEBUG_HUD') === 'true'}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            localStorage.setItem('LEXI_DEBUG_HUD', String(val));
                                            const app = getPixiApp();
                                            if (app) {
                                                DebugSystem.setHUDEnabled(app.stage, val);
                                            }
                                        }}
                                    />
                                    <span>Camera HUD (LOD & Pos)</span>
                                </label>

                                <label className="debug-toggle">
                                    <input 
                                        type="checkbox" 
                                        defaultChecked={localStorage.getItem('LEXI_DEBUG_MOCK_CARD') === 'true'}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            localStorage.setItem('LEXI_DEBUG_MOCK_CARD', String(val));
                                            if (worldSystem.contentLayer) {
                                                DebugSystem.setMockCardEnabled(worldSystem.contentLayer, val);
                                            }
                                        }}
                                    />
                                    <span>Mock Card Reference (250x350)</span>
                                </label>
                            </section>

                            <section className="debug-section" style={{ marginTop: '24px' }}>
                                <h4>📊 Performance Tips</h4>
                                <ul style={{ fontSize: '12px', opacity: 0.7, paddingLeft: '16px' }}>
                                    <li>Visuals use Graphics strokes; keep off during screen recording.</li>
                                    <li>HUD updates on ticker, optimized to skip when hidden.</li>
                                    <li>Settings persist in LocalStorage across refreshes.</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
