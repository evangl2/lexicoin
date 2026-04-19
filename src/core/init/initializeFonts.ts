import { assetManager } from '@core/assets/AssetManager';
import notoSerifSC from '@/assets/fonts/NotoSerifSC-VariableFont_wght.ttf?url';
import notoSerifJP from '@/assets/fonts/NotoSerifJP-VariableFont_wght.ttf?url';
import notoSansSC from '@/assets/fonts/NotoSansSC-VariableFont_wght.ttf?url';
import notoSansJP from '@/assets/fonts/NotoSansJP-VariableFont_wght.ttf?url';
import { logger } from '@utils/logger';

export function initializeFonts(): void {
    logger.info('Registering lazy-loaded CJK fonts', undefined, 'InitializeFonts');

    assetManager.registerAsset({
        id: 'Noto Serif SC',
        type: 'FONT',
        language: 'zh',
        url: notoSerifSC
    });

    assetManager.registerAsset({
        id: 'Noto Sans SC',
        type: 'FONT',
        language: 'zh',
        url: notoSansSC
    });

    assetManager.registerAsset({
        id: 'Noto Serif JP',
        type: 'FONT',
        language: 'ja',
        url: notoSerifJP
    });

    assetManager.registerAsset({
        id: 'Noto Sans JP',
        type: 'FONT',
        language: 'ja',
        url: notoSansJP
    });
}
