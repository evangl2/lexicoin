/**
 * PlatformAdapter - Cross-Platform Adaptation Module
 * 
 * Handles platform detection, viewport management, input abstraction,
 * and system calls for different environments (web, desktop)
 */

import { logger } from '@utils/logger';

export type Platform = 'WEB' | 'DESKTOP' | 'UNKNOWN';

export interface ViewportInfo {
    width: number;
    height: number;
    dpr: number;  // Device pixel ratio
    orientation: 'portrait' | 'landscape';
    safeArea: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface InputCapabilities {
    touch: boolean;
    mouse: boolean;
    keyboard: boolean;
    gamepad: boolean;
}

class PlatformAdapter {
    private static instance: PlatformAdapter;
    private platform: Platform;
    private viewportInfo: ViewportInfo;
    private inputCapabilities: InputCapabilities;
    private resizeObserver?: ResizeObserver;

    private constructor() {
        this.platform = this.detectPlatform();
        this.viewportInfo = this.getViewportInfo();
        this.inputCapabilities = this.detectInputCapabilities();

        this.setupViewportObserver();
        logger.info(`PlatformAdapter initialized (${this.platform})`, undefined, 'PlatformAdapter');
    }

    static getInstance(): PlatformAdapter {
        if (!PlatformAdapter.instance) {
            PlatformAdapter.instance = new PlatformAdapter();
        }
        return PlatformAdapter.instance;
    }

    /**
     * Detect the current platform
     */
    private detectPlatform(): Platform {
        // Check if running in Electron or similar desktop environment
        if (typeof window !== 'undefined') {
            // @ts-ignore - Check for Electron
            if (window.electron || window.require) {
                return 'DESKTOP';
            }

            // Check for web environment
            if (window.document) {
                return 'WEB';
            }
        }

        return 'UNKNOWN';
    }

    /**
     * Get current viewport information
     */
    private getViewportInfo(): ViewportInfo {
        if (typeof window === 'undefined') {
            return {
                width: 1920,
                height: 1080,
                dpr: 1,
                orientation: 'landscape',
                safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
            };
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const orientation = width > height ? 'landscape' : 'portrait';

        // Get safe area insets (for notches, etc.)
        const computedStyle = getComputedStyle(document.documentElement);
        const safeArea = {
            top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
            right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
            bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
            left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
        };

        return { width, height, dpr, orientation, safeArea };
    }

    /**
     * Detect available input capabilities
     */
    private detectInputCapabilities(): InputCapabilities {
        if (typeof window === 'undefined') {
            return { touch: false, mouse: true, keyboard: true, gamepad: false };
        }

        return {
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            mouse: matchMedia('(pointer: fine)').matches,
            keyboard: true, // Assume keyboard is always available
            gamepad: 'getGamepads' in navigator,
        };
    }

    /**
     * Setup viewport resize observer
     */
    private setupViewportObserver(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('resize', () => {
            this.viewportInfo = this.getViewportInfo();
            logger.debug('Viewport updated', this.viewportInfo, 'PlatformAdapter');
        });

        window.addEventListener('orientationchange', () => {
            this.viewportInfo = this.getViewportInfo();
            logger.debug('Orientation changed', this.viewportInfo, 'PlatformAdapter');
        });
    }

    /**
     * Get current platform
     */
    getPlatform(): Platform {
        return this.platform;
    }

    /**
     * Check if running on web
     */
    isWeb(): boolean {
        return this.platform === 'WEB';
    }

    /**
     * Check if running on desktop
     */
    isDesktop(): boolean {
        return this.platform === 'DESKTOP';
    }

    /**
     * Get viewport information
     */
    getViewport(): ViewportInfo {
        return { ...this.viewportInfo };
    }

    /**
     * Get input capabilities
     */
    getInputCapabilities(): InputCapabilities {
        return { ...this.inputCapabilities };
    }

    /**
     * Check if device has touch support
     */
    hasTouch(): boolean {
        return this.inputCapabilities.touch;
    }

    /**
     * Check if device has mouse support
     */
    hasMouse(): boolean {
        return this.inputCapabilities.mouse;
    }

    /**
     * System call: Request fullscreen
     */
    async requestFullscreen(): Promise<boolean> {
        if (typeof document === 'undefined' || !document.documentElement.requestFullscreen) {
            logger.warn('Fullscreen not supported', undefined, 'PlatformAdapter');
            return false;
        }

        try {
            await document.documentElement.requestFullscreen();
            logger.info('Entered fullscreen', undefined, 'PlatformAdapter');
            return true;
        } catch (error) {
            logger.error('Failed to enter fullscreen', error, 'PlatformAdapter');
            return false;
        }
    }

    /**
     * System call: Exit fullscreen
     */
    async exitFullscreen(): Promise<boolean> {
        if (typeof document === 'undefined' || !document.exitFullscreen) {
            return false;
        }

        try {
            await document.exitFullscreen();
            logger.info('Exited fullscreen', undefined, 'PlatformAdapter');
            return true;
        } catch (error) {
            logger.error('Failed to exit fullscreen', error, 'PlatformAdapter');
            return false;
        }
    }

    /**
     * System call: Copy to clipboard
     */
    async copyToClipboard(text: string): Promise<boolean> {
        if (typeof navigator === 'undefined' || !navigator.clipboard) {
            logger.warn('Clipboard API not supported', undefined, 'PlatformAdapter');
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            logger.debug('Copied to clipboard', { length: text.length }, 'PlatformAdapter');
            return true;
        } catch (error) {
            logger.error('Failed to copy to clipboard', error, 'PlatformAdapter');
            return false;
        }
    }

    /**
     * System call: Open external URL
     */
    openExternalURL(url: string): boolean {
        if (typeof window === 'undefined') {
            return false;
        }

        try {
            window.open(url, '_blank', 'noopener,noreferrer');
            logger.debug('Opened external URL', { url }, 'PlatformAdapter');
            return true;
        } catch (error) {
            logger.error('Failed to open external URL', error, 'PlatformAdapter');
            return false;
        }
    }

    /**
     * Get optimal canvas resolution based on device
     */
    getOptimalCanvasResolution(): { width: number; height: number } {
        const { width, height, dpr } = this.viewportInfo;

        // Limit DPR to avoid excessive memory usage
        const effectiveDpr = Math.min(dpr, 2);

        return {
            width: Math.floor(width * effectiveDpr),
            height: Math.floor(height * effectiveDpr),
        };
    }

    /**
     * Check if reduced motion is preferred
     */
    prefersReducedMotion(): boolean {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Check if dark mode is preferred
     */
    prefersDarkMode(): boolean {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

// Export singleton instance
export const platformAdapter = PlatformAdapter.getInstance();
export default platformAdapter;
