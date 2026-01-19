/**
 * AssetManager - Resource Distribution Module
 * 
 * Manages lazy loading of language-specific assets
 * Handles images, fonts, audio, and data files
 */

import { logger } from '@utils/logger';
import { messageBus } from '@core/protocol/MessageBus';
import type { AssetDescriptor, AssetType, Language, LoadingState } from '@types/index';

class AssetManager {
    private static instance: AssetManager;
    private assets: Map<string, AssetDescriptor>;
    private loadingPromises: Map<string, Promise<void>>;

    private constructor() {
        this.assets = new Map();
        this.loadingPromises = new Map();
        logger.info('AssetManager initialized', undefined, 'AssetManager');
    }

    static getInstance(): AssetManager {
        if (!AssetManager.instance) {
            AssetManager.instance = new AssetManager();
        }
        return AssetManager.instance;
    }

    /**
     * Register an asset
     */
    registerAsset(descriptor: Omit<AssetDescriptor, 'state'>): void {
        const asset: AssetDescriptor = {
            ...descriptor,
            state: 'IDLE',
        };
        this.assets.set(descriptor.id, asset);
        logger.debug(`Asset registered: ${descriptor.id}`, descriptor, 'AssetManager');
    }

    /**
     * Load an asset
     */
    async loadAsset(assetId: string): Promise<void> {
        const asset = this.assets.get(assetId);
        if (!asset) {
            logger.error(`Asset not found: ${assetId}`, undefined, 'AssetManager');
            throw new Error(`Asset not found: ${assetId}`);
        }

        // If already loaded, return immediately
        if (asset.state === 'LOADED') {
            return;
        }

        // If currently loading, wait for existing promise
        if (this.loadingPromises.has(assetId)) {
            return this.loadingPromises.get(assetId);
        }

        // Start loading
        const loadPromise = this.performLoad(asset);
        this.loadingPromises.set(assetId, loadPromise);

        try {
            await loadPromise;
        } finally {
            this.loadingPromises.delete(assetId);
        }
    }

    /**
     * Perform the actual loading
     */
    private async performLoad(asset: AssetDescriptor): Promise<void> {
        asset.state = 'LOADING';
        logger.debug(`Loading asset: ${asset.id}`, asset, 'AssetManager');

        try {
            // Simulate asset loading based on type
            // TODO: Implement actual loading logic
            switch (asset.type) {
                case 'IMAGE':
                    await this.loadImage(asset.url);
                    break;
                case 'AUDIO':
                    await this.loadAudio(asset.url);
                    break;
                case 'FONT':
                    await this.loadFont(asset.url);
                    break;
                case 'DATA':
                    await this.loadData(asset.url);
                    break;
            }

            asset.state = 'LOADED';
            logger.info(`Asset loaded: ${asset.id}`, undefined, 'AssetManager');

            // Notify via MessageBus
            await messageBus.send('ASSET_LOADED', asset, 'AssetManager');
        } catch (error) {
            asset.state = 'ERROR';
            asset.error = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to load asset: ${asset.id}`, error, 'AssetManager');

            // Notify error via MessageBus
            await messageBus.send('ASSET_ERROR', {
                assetId: asset.id,
                error: asset.error,
            }, 'AssetManager');

            throw error;
        }
    }

    /**
     * Load image
     */
    private async loadImage(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    /**
     * Load audio
     */
    private async loadAudio(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => reject(new Error(`Failed to load audio: ${url}`));
            audio.src = url;
        });
    }

    /**
     * Load font
     */
    private async loadFont(url: string): Promise<void> {
        // TODO: Implement font loading
        logger.warn('Font loading not yet implemented', { url }, 'AssetManager');
    }

    /**
     * Load data file (JSON, etc.)
     */
    private async loadData(url: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${url}`);
        }
        await response.json();
    }

    /**
     * Load all assets for a specific language
     */
    async loadLanguageAssets(language: Language): Promise<void> {
        const languageAssets = Array.from(this.assets.values())
            .filter(asset => asset.language === language);

        logger.info(`Loading ${languageAssets.length} assets for language: ${language}`, undefined, 'AssetManager');

        await Promise.all(
            languageAssets.map(asset => this.loadAsset(asset.id))
        );
    }

    /**
     * Get asset state
     */
    getAssetState(assetId: string): LoadingState | undefined {
        return this.assets.get(assetId)?.state;
    }

    /**
     * Get all assets
     */
    getAllAssets(): AssetDescriptor[] {
        return Array.from(this.assets.values());
    }
}

// Export singleton instance
export const assetManager = AssetManager.getInstance();
export default assetManager;
