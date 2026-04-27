import { useState, useCallback } from 'react';
import { useGameStore } from '@/core/store';
import { GrimoireEntity, Sense } from '@/types/index';
import { messageBus } from '@/core/protocol/MessageBus';
import { generateId } from '@/utils/helpers';
import { logger } from '@/utils/logger';

export const useEchoSystem = () => {
    const [isExtracting, setIsExtracting] = useState(false);
    const consumeEchoCharge = useGameStore(s => s.consumeEchoCharge);
    const addNotification = useGameStore(s => s.addNotification);

    const extractEcho = useCallback(async (grimoire: GrimoireEntity) => {
        const settings = useGameStore.getState().player?.settings;
        if (isExtracting) return;

        setIsExtracting(true);

        try {
            const tags = grimoire.validationTags || [];
            if (tags.length === 0) {
                throw new Error('No echoes found in this volume');
            }

            // Pick a random word from the hidden validation tags
            const echoWord = tags[Math.floor(Math.random() * tags.length)]!;

            const learningLang = settings?.learningLang ?? 'en';
            const systemLang = settings?.interfaceLang ?? 'zh';

            // Always create a fresh Echo Sense — the point is to surface words
            // the player may not yet own, not to retrieve existing cards
            const echoSense: Sense = {
                id: generateId(),
                word: {
                    [learningLang]: echoWord,
                    [systemLang]: echoWord,
                } as any,
                meaning: {
                    [learningLang]: `An echo from the ritual: "${grimoire.theme.title.learning}"`,
                    [systemLang]: `仪式"${grimoire.theme.title.system}"的回响。`,
                } as any,
                partOfSpeech: 'noun',
                level: grimoire.targetLevel,
                visual: '✨',
                flavorText: { en: '', zh: '' } as any,
                tags: ['echo', grimoire.grimoireType],
                durability: 100,
                maxDurability: 100,
                createdAt: Date.now(),
            };

            // Consume charge first, then emit
            consumeEchoCharge();
            await messageBus.send('SENSE_CREATED', echoSense, 'EchoSystem');

            addNotification({
                en: `The echo of "${echoWord}" resonates on the canvas!`,
                zh: `"${echoWord}"的回响已出现在画布上！`,
            }, 'SUCCESS');

            logger.info(`Extracted echo: ${echoWord} from grimoire ${grimoire.id}`, undefined, 'EchoSystem');

        } catch (error: any) {
            addNotification(error.message || 'Extraction failed', 'ERROR');
            logger.error('Echo extraction failed', error, 'EchoSystem');
        } finally {
            setTimeout(() => setIsExtracting(false), 1500);
        }
    }, [isExtracting, consumeEchoCharge, addNotification, settings]);

    return { extractEcho, isExtracting };
};
