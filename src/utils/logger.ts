/**
 * Logger Utility
 * 
 * Centralized logging system with levels and configurable output
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
    level: LogLevel;
    message: string;
    data?: any;
    timestamp: number;
    source?: string;
}

class Logger {
    private static instance: Logger;
    private logHistory: LogEntry[] = [];
    private maxHistorySize: number = 200;
    private enabledLevels: Set<LogLevel>;
    private isDevelopment: boolean;

    private constructor() {
        this.isDevelopment = import.meta.env.DEV;
        this.enabledLevels = new Set(['INFO', 'WARN', 'ERROR']);

        // Enable DEBUG in development
        if (this.isDevelopment) {
            this.enabledLevels.add('DEBUG');
        }
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    debug(message: string, data?: any, source?: string): void {
        this.log('DEBUG', message, data, source);
    }

    info(message: string, data?: any, source?: string): void {
        this.log('INFO', message, data, source);
    }

    warn(message: string, data?: any, source?: string): void {
        this.log('WARN', message, data, source);
    }

    error(message: string, data?: any, source?: string): void {
        this.log('ERROR', message, data, source);
    }

    private log(level: LogLevel, message: string, data?: any, source?: string): void {
        if (!this.enabledLevels.has(level)) {
            return;
        }

        const entry: LogEntry = {
            level,
            message,
            data,
            timestamp: Date.now(),
            source,
        };

        // Add to history
        this.logHistory.push(entry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory = this.logHistory.slice(-this.maxHistorySize);
        }

        // Console output
        const prefix = source ? `[${source}]` : '';
        const formattedMessage = `${prefix} ${message}`;

        switch (level) {
            case 'DEBUG':
                console.debug(formattedMessage, data ?? '');
                break;
            case 'INFO':
                console.info(formattedMessage, data ?? '');
                break;
            case 'WARN':
                console.warn(formattedMessage, data ?? '');
                break;
            case 'ERROR':
                console.error(formattedMessage, data ?? '');
                break;
        }
    }

    /**
     * Get log history
     */
    getHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    /**
     * Clear log history
     */
    clearHistory(): void {
        this.logHistory = [];
    }

    /**
     * Set enabled log levels
     */
    setEnabledLevels(levels: LogLevel[]): void {
        this.enabledLevels = new Set(levels);
    }
}

// Export singleton instance
export const logger = Logger.getInstance();
export default logger;
