/**
 * DevConsole - Developer Console
 * 
 * Debug panel for viewing MessageBus activity and module status
 */

import React, { useState, useEffect } from 'react';
import { messageBus } from '@core/protocol/MessageBus';
import { logger } from '@utils/logger';
import { useGameStore } from '@store/index';
import './DevConsole.css';

export const DevConsole: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const senses = useGameStore(state => state.senses);
    const player = useGameStore(state => state.player);

    useEffect(() => {
        // Update messages periodically
        const interval = setInterval(() => {
            if (isOpen) {
                setMessages(messageBus.getMessageLog().slice(-20));
                setLogs(logger.getHistory().slice(-20));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                className="dev-console-toggle"
                onClick={() => setIsOpen(true)}
                title="Open Developer Console"
            >
                🛠️
            </button>
        );
    }

    return (
        <div className="dev-console">
            <div className="dev-console-header">
                <h3>Developer Console</h3>
                <button onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="dev-console-content">
                {/* Module Status */}
                <section className="dev-section">
                    <h4>Module Status</h4>
                    <div className="status-grid">
                        <div className="status-item">
                            <span className="label">Senses:</span>
                            <span className="value">{senses.length}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">Player Level:</span>
                            <span className="value">{player.level}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">XP:</span>
                            <span className="value">{player.xp}/{player.xpToNextLevel}</span>
                        </div>
                    </div>
                </section>

                {/* MessageBus Activity */}
                <section className="dev-section">
                    <h4>MessageBus (Last 20)</h4>
                    <div className="message-list">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="message-item">
                                <span className="message-type">{msg.type}</span>
                                <span className="message-source">{msg.source}</span>
                                <span className="message-time">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Logs */}
                <section className="dev-section">
                    <h4>Logs (Last 20)</h4>
                    <div className="log-list">
                        {logs.map((log, idx) => (
                            <div key={idx} className={`log-item log-${log.level.toLowerCase()}`}>
                                <span className="log-level">{log.level}</span>
                                <span className="log-message">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
