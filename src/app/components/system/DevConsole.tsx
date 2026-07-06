/**
 * DevConsole - 唯一的系统级调试入口(Stage A 决策,见 docs/refactor-pixi/roadmap.md)
 *
 * 六个页签,按职责合并自旧版八个页签:
 * - 总线(Bus): 消息流 + 遥测 + 手动注入(旧 Messages/Telemetry/Inject 三合一,共享同一屏)
 * - 状态(State): Zustand store 检视
 * - 数据(Data): Dexie 表健康 + 视觉补拉 + 危险区(清空/出厂重置)
 * - 日志(Logs): logger 历史
 * - 作弊(Cheat): 体力/等级/资源,仅 DEV 可见
 * - 引擎(Engine): 渲染器/世界尺寸/调试覆盖层 + Centerpiece 调参面板开关
 *
 * 滚动架构(2026-07-06 重设计,勿回退):
 * 整个内容区只有一个滚动容器 `.dev-console-body`,页签内容一律是普通块级流,
 * 不允许再出现"内层 flex:1 + overflow-y:auto"的嵌套滚动——上一版就是这样叠了三层,
 * 加上消息流每秒 scrollIntoView 自动回卷,用户滚上去立刻被拽回,体感为"无法滚动"。
 * 消息/日志一律最新在最上,从根上取消 auto-scroll 的存在必要。
 *
 * 与 CenterpieceDebugPanel(src/pixi/backgrounds/CenterpieceDebugPanel.ts)分工:
 * 本文件管数据层/系统面(store、总线、Dexie、渲染器),调参面板管材质视觉参数。
 * 两者通过 DebugPanelBridge 互通,不合并成一个组件——它们的生命周期归属不同
 * (本文件归 React 树,调参面板归 CenterpieceDecal 的 Pixi 生命周期)。
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { useGameStore } from '@store/index';
import { useShallow } from 'zustand/react/shallow';
import { platformAdapter } from '@core/platform/PlatformAdapter';
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
import { getPixiApp } from '@/pixi/core/globalApp';
import { debugPanelBridge } from '@/pixi/bridges/DebugPanelBridge';
import { GRID_CELL_W, GRID_CELL_H, WORLD_W, WORLD_H } from '@/config/canvas';
import { AI_MODELS } from '@/config/constants';
import { getPersonaList } from '@/app/components/persona/registry';
import './DevConsole.css';

type TabType = 'bus' | 'state' | 'data' | 'logs' | 'cheat' | 'engine';

const IS_DEV = import.meta.env.DEV;

function copyJson(value: unknown): void {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2)).catch(() => {
        // 剪贴板权限被拒时静默失败,不值得为调试小工具打断用户
    });
}

const CopyButton: React.FC<{ value: unknown }> = ({ value }) => (
    <button className="copy-btn" onClick={() => copyJson(value)} title="复制完整 JSON">
        📋
    </button>
);

const StateInspector: React.FC = () => {
    // useShallow: 只在这几个字段变化时重渲染,避免 deckState/audio 等无关字段抖动全树
    const store = useGameStore(useShallow(s => ({
        player: s.player,
        activePersona: s.activePersona,
        personaResonance: s.personaResonance,
        inventory: s.inventory,
        senses: s.senses,
        constructions: s.constructions,
    })));

    return (
        <div className="pane">
            <section className="state-section">
                <div className="state-section-head">
                    <h4>🎮 Player State</h4>
                    <CopyButton value={store.player} />
                </div>
                <pre>{JSON.stringify(store.player, null, 2)}</pre>
            </section>

            <section className="state-section">
                <div className="state-section-head">
                    <h4>🎭 Persona Progression</h4>
                    <CopyButton value={{ activePersona: store.activePersona, personaResonance: store.personaResonance }} />
                </div>
                <p className="section-caption">游戏进度 Persona(CHILD/GARDENER/ALCHEMIST),非画布皮肤 —— 画布皮肤在顶部工具条切换</p>
                <div className="state-grid">
                    <div>Active: {store.activePersona || 'None'}</div>
                    <div>Resonance: {JSON.stringify(store.personaResonance, null, 2)}</div>
                </div>
            </section>

            <section className="state-section">
                <div className="state-section-head">
                    <h4>🎒 Inventory ({store.inventory.length})</h4>
                    <CopyButton value={store.inventory} />
                </div>
                <pre>{JSON.stringify(store.inventory, null, 2)}</pre>
            </section>

            <section className="state-section">
                <div className="state-section-head">
                    <h4>📚 Senses ({store.senses.length})</h4>
                    <CopyButton value={store.senses} />
                </div>
                <div className="sense-list">
                    {store.senses.slice(0, 10).map(sense => (
                        <div key={sense.id} className="sense-item">
                            {sense.word.en} - {sense.meaning.en}
                        </div>
                    ))}
                    {store.senses.length > 10 && (
                        <div className="more-indicator">
                            ... and {store.senses.length - 10} more(完整数据用上方复制按钮)
                        </div>
                    )}
                </div>
            </section>

            <section className="state-section">
                <div className="state-section-head">
                    <h4>🏗️ Constructions ({store.constructions.length})</h4>
                    <CopyButton value={store.constructions} />
                </div>
                <pre>{JSON.stringify(store.constructions.slice(0, 5), null, 2)}</pre>
                {store.constructions.length > 5 && (
                    <div className="more-indicator">... and {store.constructions.length - 5} more(完整数据用上方复制按钮)</div>
                )}
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
    );
};

interface TableCounts {
    senses: number;
    visuals: number;
    devices: number;
    cardInventory: number;
    synthesisLog: number;
    canvasPositions: number;
}

export const DevConsole: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTabState] = useState<TabType>(() => {
        const saved = localStorage.getItem('devconsole-active-tab') as TabType | null;
        const valid: TabType[] = ['bus', 'state', 'data', 'logs', 'cheat', 'engine'];
        return saved && valid.includes(saved) && (saved !== 'cheat' || IS_DEV) ? saved : 'bus';
    });
    const setActiveTab = (tab: TabType) => {
        setActiveTabState(tab);
        localStorage.setItem('devconsole-active-tab', tab);
    };
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [telemetry, setTelemetry] = useState(messageBus.getTelemetry());
    const [subscriptions, setSubscriptions] = useState(messageBus.getSubscriptions());
    const [logs, setLogs] = useState<any[]>([]);
    const [logFilter, setLogFilter] = useState('');
    const clearAllGrimoires = useGameStore(s => s.clearAllGrimoires);
    const uiTheme = useGameStore(s => s.uiTheme);
    const setUiTheme = useGameStore(s => s.setUiTheme);
    const activeModelId = useGameStore(s => s.activeModelId);
    const setActiveModelId = useGameStore(s => s.setActiveModelId);
    const [messageFilter, setMessageFilter] = useState('');
    const [isPaused, setIsPaused] = useState(false);
    const [isRefetching, setIsRefetching] = useState(false);
    const [refetchResult, setRefetchResult] = useState<string | null>(null);
    const player = useGameStore(s => s.player);
    const updateLanguageProgress = useGameStore(s => s.updateLanguageProgress);
    const regenerateStamina = useGameStore(s => s.regenerateStamina);
    const updatePlayer = useGameStore(s => s.updatePlayer);
    const [cheatStamina, setCheatStamina] = useState(100);
    const [cheatLevel, setCheatLevel] = useState(1);
    const [tableCounts, setTableCounts] = useState<TableCounts | null>(null);
    const [worldW, setWorldW] = useState(WORLD_W);
    const [worldH, setWorldH] = useState(WORLD_H);
    const [debugPanelAvailable, setDebugPanelAvailable] = useState(debugPanelBridge.isAvailable());
    const customTypeRef = useRef<HTMLInputElement>(null);
    const customPayloadRef = useRef<HTMLTextAreaElement>(null);

    // Shift+D 开关控制台(悬浮按钮 title 一直这么承诺,此前没实现);Esc 单独关闭,不用等 Shift+D 二次触发
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setIsOpen(false); return; }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            if (e.shiftKey && e.key.toLowerCase() === 'd') setIsOpen(prev => !prev);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Centerpiece 调参面板是否已就绪(仅 DEV 构建下面板会真正初始化)
    useEffect(() => debugPanelBridge.onAvailabilityChange(setDebugPanelAvailable), []);

    // 总线页签:轮询消息日志(旧版用 subscribe('*') 监听,但 MessageBus 从不派发通配符,
    // 这个"实时消息流"从未收到过消息;总线本就维护 100 条环形日志,轮询它才是有效实现)
    // 与遥测共用同一个 1s 定时器,且只在"总线"页签打开时才跑,不占用其它页签的渲染预算。
    // 注意:这里绝不允许任何形式的自动滚动——渲染时最新消息排最上,轮询只更新数据。
    useEffect(() => {
        if (!isOpen || activeTab !== 'bus' || isPaused) return;
        const tick = () => {
            setMessages(messageBus.getMessageLog().slice(-100));
            setTelemetry(messageBus.getTelemetry());
            setSubscriptions(messageBus.getSubscriptions());
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isOpen, activeTab, isPaused]);

    // 日志页签:只在该页签打开时轮询,避免像旧版那样不管在哪个页签都每秒重渲染整个控制台
    useEffect(() => {
        if (!isOpen || activeTab !== 'logs' || isPaused) return;
        const tick = () => setLogs(logger.getHistory().slice(-100));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isOpen, activeTab, isPaused]);

    const refreshTableCounts = useCallback(async () => {
        const [senses, visuals, devices, cardInventory, synthesisLog, canvasPositions] = await Promise.all([
            db.senses.count(), db.visuals.count(), db.devices.count(),
            db.cardInventory.count(), db.synthesisLog.count(), db.canvasPositions.count(),
        ]);
        setTableCounts({ senses, visuals, devices, cardInventory, synthesisLog, canvasPositions });
    }, []);

    // 数据页签打开时拉一次表行数,不常驻轮询(行数变化不需要秒级实时性)
    useEffect(() => {
        if (!isOpen || activeTab !== 'data') return;
        refreshTableCounts();
    }, [isOpen, activeTab, refreshTableCounts]);

    const clearMessages = () => {
        setMessages([]);
        messageBus.clearLog();
    };

    const clearLogs = () => {
        setLogs([]);
        logger.clearHistory();
    };

    const clearTelemetryData = () => {
        messageBus.clearTelemetry();
        setTelemetry(messageBus.getTelemetry());
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
            refreshTableCounts();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setRefetchResult(`❌ Error: ${msg}`);
            logger.error(`❌ Refetch Failed: ${msg}`, err, 'DevConsole');
        } finally {
            setIsRefetching(false);
        }
    };

    const applyWorldSize = () => {
        // 自动吸附到最近的"偶数"格子倍数,确保中心对齐
        const snappedW = Math.round(worldW / (GRID_CELL_W * 2)) * (GRID_CELL_W * 2);
        const snappedH = Math.round(worldH / (GRID_CELL_H * 2)) * (GRID_CELL_H * 2);
        setWorldW(snappedW);
        setWorldH(snappedH);
        DebugSystem.setWorldSize(snappedW, snappedH);
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

    // 最新在最上:滚动位置停在顶部就永远能看到最新消息,不需要任何自动滚动
    const displayMessages = messages
        .filter(msg => !messageFilter || msg.type.toLowerCase().includes(messageFilter.toLowerCase()))
        .slice()
        .reverse();

    const displayLogs = logs
        .filter(log => !logFilter || log.message.toLowerCase().includes(logFilter.toLowerCase()))
        .slice()
        .reverse();

    const personaOptions = getPersonaList();

    return (
        <div className="dev-console">
            <div className="dev-console-header">
                <h3>🛠️ Developer Console</h3>
                <div className="dev-console-header-controls">
                    <label className="header-select-label">
                        <span>皮肤</span>
                        <select value={uiTheme} onChange={(e) => setUiTheme(e.target.value)}>
                            {personaOptions.map(p => (
                                <option key={p.name} value={p.name}>{p.displayName}</option>
                            ))}
                        </select>
                    </label>
                    <label className="header-select-label">
                        <span>模型</span>
                        <select value={activeModelId} onChange={(e) => setActiveModelId(e.target.value)}>
                            {AI_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="dev-console-controls">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={isPaused ? 'paused' : ''}
                        title={isPaused ? '恢复轮询' : '暂停轮询(冻结消息/日志方便阅读)'}
                    >
                        {isPaused ? '▶️' : '⏸️'}
                    </button>
                    <button onClick={() => setIsOpen(false)} title="关闭(Esc)">✕</button>
                </div>
            </div>

            <div className="dev-console-tabs">
                <button className={activeTab === 'bus' ? 'active' : ''} onClick={() => setActiveTab('bus')}>
                    📨 总线
                </button>
                <button className={activeTab === 'state' ? 'active' : ''} onClick={() => setActiveTab('state')}>
                    🗂️ 状态
                </button>
                <button className={activeTab === 'data' ? 'active' : ''} onClick={() => setActiveTab('data')}>
                    💾 数据
                </button>
                <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>
                    📝 日志
                </button>
                {IS_DEV && (
                    <button className={activeTab === 'cheat' ? 'active' : ''} onClick={() => setActiveTab('cheat')}>
                        🎮 作弊
                    </button>
                )}
                <button className={activeTab === 'engine' ? 'active' : ''} onClick={() => setActiveTab('engine')}>
                    ⚙️ 引擎
                </button>
            </div>

            {/* 唯一的滚动容器。页签内容全部是普通块级流,禁止内层再开 overflow-y(state-section pre 的
                局部 max-height 小滚动框除外)。onWheel stopPropagation 是保险:防止未来有人往
                window 上挂 wheel 处理器(游戏侧常见)时把控制台的滚动一起吞掉。 */}
            <div className="dev-console-body" onWheel={(e) => e.stopPropagation()}>
                {/* 总线页签:消息流 + 遥测 + 注入 */}
                {activeTab === 'bus' && (
                    <>
                        <div className="tab-toolbar">
                            <input
                                type="text"
                                placeholder="Filter messages..."
                                value={messageFilter}
                                onChange={(e) => setMessageFilter(e.target.value)}
                                className="filter-input"
                            />
                            <span className="toolbar-hint">最新在最上 · {displayMessages.length} 条</span>
                            <button onClick={clearMessages} className="clear-btn">
                                Clear
                            </button>
                        </div>
                        <div className="message-stream">
                            {displayMessages.length === 0 && (
                                <div className="empty-hint">
                                    还没有消息。总线消息会在游戏动作发生时出现;也可以去下方「Manual Injection」手动注入一条试试。
                                </div>
                            )}
                            {displayMessages.map((msg) => (
                                <div key={msg.id} className="message-item">
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
                        </div>

                        <div className="bus-section-divider">
                            <h4>📊 Telemetry</h4>
                            <button onClick={clearTelemetryData} className="clear-btn">Clear</button>
                        </div>
                        <div className="telemetry-dashboard">
                            <section className="telemetry-section">
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
                                        {telemetry.map((data, idx) => (
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
                                        {Array.from(subscriptions.entries()).map(([type, count], idx) => (
                                            <tr key={idx}>
                                                <td>{type}</td>
                                                <td>{count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>
                        </div>

                        <div className="bus-section-divider">
                            <h4>💉 Manual Injection</h4>
                        </div>
                        <div className="inject-panel">
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
                                <input
                                    type="text"
                                    placeholder="Message Type (e.g., CUSTOM_EVENT)"
                                    ref={customTypeRef}
                                    className="inject-input"
                                />
                                <textarea
                                    placeholder='Payload JSON (e.g., {"key": "value"})'
                                    ref={customPayloadRef}
                                    className="inject-textarea"
                                    rows={3}
                                />
                                <button
                                    onClick={() => {
                                        const typeInput = customTypeRef.current;
                                        const payloadInput = customPayloadRef.current;
                                        if (!typeInput || !payloadInput) return;
                                        try {
                                            const payload = JSON.parse(payloadInput.value || '{}');
                                            injectMessage(typeInput.value, payload);
                                            typeInput.value = '';
                                            payloadInput.value = '';
                                        } catch {
                                            alert('Invalid JSON payload');
                                        }
                                    }}
                                    className="inject-btn"
                                >
                                    Inject Custom Message
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* 状态页签 */}
                {activeTab === 'state' && <StateInspector />}

                {/* 数据页签:Dexie 表健康 + 视觉补拉 + 危险区 */}
                {activeTab === 'data' && (
                    <div className="pane">
                        <div className="section-head-row">
                            <h4 className="pane-title">💾 Dexie 表健康</h4>
                            <button className="action-btn small" onClick={refreshTableCounts}>🔄 刷新</button>
                        </div>
                        {tableCounts ? (
                            <div className="table-counts-grid">
                                {Object.entries(tableCounts).map(([name, count]) => (
                                    <div key={name} className="table-count-card">
                                        <div className="table-count-name">{name}</div>
                                        <div className="table-count-value">{count}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="section-caption">加载中…</p>
                        )}

                        <h4 className="pane-title" style={{ marginTop: 24 }}>🔄 视觉资产</h4>
                        <button
                            className="action-btn"
                            onClick={handleRefetchVisuals}
                            disabled={isRefetching}
                        >
                            {isRefetching ? '⏳ Fetching...' : '🔄 Refetch Missing Visuals'}
                        </button>
                        <p className="section-caption">仅回填数据层;画面刷新依赖的听者在 Stage F 卡片系统落地后回归运行链。</p>
                        {refetchResult && (
                            <p className="action-result">{refetchResult}</p>
                        )}

                        {IS_DEV && (
                            <>
                                <h4 className="pane-title danger" style={{ marginTop: 24 }}>⚠️ Danger Zone</h4>
                                <p className="warning-text">
                                    These actions are destructive and cannot be undone. 仅 DEV 构建可见。
                                </p>
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
                                <br />
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
                            </>
                        )}
                    </div>
                )}

                {/* 日志页签 */}
                {activeTab === 'logs' && (
                    <>
                        <div className="tab-toolbar">
                            <input
                                type="text"
                                placeholder="Filter logs..."
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                className="filter-input"
                            />
                            <span className="toolbar-hint">最新在最上 · {displayLogs.length} 条</span>
                            <button onClick={clearLogs} className="clear-btn">
                                Clear
                            </button>
                        </div>
                        <div className="log-stream">
                            {displayLogs.length === 0 && (
                                <div className="empty-hint">还没有日志。</div>
                            )}
                            {displayLogs.map((log, idx) => (
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
                    </>
                )}

                {/* 作弊页签:仅 DEV 构建注册,生产构建下 tab 按钮本身也不渲染 */}
                {IS_DEV && activeTab === 'cheat' && (
                    <div className="pane">
                        <section className="cheat-section">
                            <h4>⚡ Stamina Control</h4>
                            <div className="cheat-row">
                                <input
                                    type="number"
                                    value={cheatStamina}
                                    onChange={e => setCheatStamina(parseInt(e.target.value) || 0)}
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
                                    onChange={e => setCheatLevel(parseInt(e.target.value) || 1)}
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
                            <h4>🎒 Resource Cheat</h4>
                            <div className="cheat-presets">
                                <button onClick={() => updatePlayer({ echoCharges: 10 })}>Set 10 Echo Charges</button>
                            </div>
                        </section>
                    </div>
                )}

                {/* 引擎页签:渲染器/世界尺寸/调试覆盖层 + 调参面板开关 */}
                {activeTab === 'engine' && (
                    <div className="pane">
                        <section className="debug-section boxed">
                            <h5>⚙️ Renderer & Backend</h5>
                            <div className="engine-row">
                                <span>Active Backend:</span>
                                <strong className="backend-badge">
                                    {DebugSystem.getActualRendererType()}
                                </strong>
                            </div>
                            <div className="engine-caption">
                                Preference: {DebugSystem.getRendererPreference().toUpperCase()}
                            </div>
                            <button
                                onClick={() => {
                                    const next = DebugSystem.getRendererPreference() === 'webgpu' ? 'webgl' : 'webgpu';
                                    DebugSystem.setRendererPreference(next);
                                }}
                                className="action-btn"
                                style={{ width: '100%' }}
                            >
                                🔄 Switch to {DebugSystem.getRendererPreference() === 'webgpu' ? 'WebGL' : 'WebGPU'} & Reload
                            </button>
                            <button
                                onClick={() => {
                                    const cur = localStorage.getItem('pixi-antialias') !== 'false';
                                    localStorage.setItem('pixi-antialias', String(!cur));
                                    window.location.reload();
                                }}
                                className="action-btn"
                                style={{ width: '100%', marginTop: '8px' }}
                            >
                                Antialias: {localStorage.getItem('pixi-antialias') !== 'false' ? 'ON' : 'OFF'}(点击切换并重载)
                            </button>
                        </section>

                        <section className="debug-section">
                            <h5>🎨 材质调参面板</h5>
                            <button
                                className="action-btn"
                                style={{ width: '100%' }}
                                disabled={!debugPanelAvailable}
                                title={debugPanelAvailable ? '开合 CenterpieceDebugPanel(快捷键 ` )' : '面板尚未就绪:背景/法阵尚未加载,或当前是生产构建'}
                                onClick={() => debugPanelBridge.toggle()}
                            >
                                {debugPanelAvailable ? '开合调参面板 ( ` )' : '调参面板未就绪'}
                            </button>
                            <p className="section-caption">面板是独立浮窗,由 CenterpieceDecal 的 Pixi 生命周期管理;这里只是发现入口,不改变它的归属。</p>
                        </section>

                        {IS_DEV && (
                            <>
                                <section className="debug-section">
                                    <h5>🌍 World Size Controls</h5>
                                    <div className="engine-inputs">
                                        <div className="input-group">
                                            <span className="input-label">Width</span>
                                            <input
                                                type="number"
                                                value={worldW}
                                                onChange={e => setWorldW(parseInt(e.target.value) || WORLD_W)}
                                                className="engine-num-input"
                                            />
                                        </div>
                                        <div className="input-group">
                                            <span className="input-label">Height</span>
                                            <input
                                                type="number"
                                                value={worldH}
                                                onChange={e => setWorldH(parseInt(e.target.value) || WORLD_H)}
                                                className="engine-num-input"
                                            />
                                        </div>
                                        <button onClick={applyWorldSize} className="apply-btn">
                                            Apply Size
                                        </button>
                                    </div>
                                    <p className="section-caption">默认值取自 config/canvas.ts 的 WORLD_W/WORLD_H,不再是硬编码的旧值。</p>
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
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
