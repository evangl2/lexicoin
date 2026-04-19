import { useEffect } from 'react';
import { assetManager } from '@core/assets/AssetManager';
import { logger } from '@utils/logger';
import type { Language } from '@/types/index';

/**
 * Hook to lazily load language-specific assets (like heavy fonts)
 * only when that language is active in the system or learning context.
 */
export function useLanguageFonts(learningLang: Language, systemLang: Language) {
    useEffect(() => {
        logger.info(`Checking assets for learningLang: ${learningLang}, systemLang: ${systemLang}`, undefined, 'useLanguageFonts');

        const loadFonts = async () => {
            try {
                const promises: Promise<void>[] = [];

                // Load assets for learning language
                if (learningLang) {
                    promises.push(assetManager.loadLanguageAssets(learningLang));
                }

                // Load assets for system language (if different)
                if (systemLang && systemLang !== learningLang) {
                    promises.push(assetManager.loadLanguageAssets(systemLang));
                }

                await Promise.all(promises);
            } catch (error) {
                logger.error('Failed to load language fonts', error, 'useLanguageFonts');
            }
        };

        loadFonts();
    }, [learningLang, systemLang]);
}
