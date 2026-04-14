import { useState, useCallback } from 'react';
import { useGameStore } from '@/core/store';
import { GrimoireEntity, Sense } from '@/types/index';
import { senseRepository } from '@/core/storage/SenseRepository';
import { messageBus } from '@/core/protocol/MessageBus';
import { logger } from '@/utils/logger';

export const useEchoSystem = () => {
    const [isExtracting, setIsExtracting] = useState(false);
    const consumeEchoCharge = useGameStore(s => s.consumeEchoCharge);
    const addNotification = useGameStore(s => s.addNotification);

    const extractEcho = useCallback(async (grimoire: GrimoireEntity) => {
        if (isExtracting) return;
        
        setIsExtracting(true);
        
        try {
            // 1. Pick a random word from validation tags
            const tags = grimoire.validationTags || [];
            if (tags.length === 0) {
                throw new Error("No echoes found in this volume");
            }
            
            const randomTag = tags[Math.floor(Math.random() * tags.length)];
            
            // 2. Find the corresponding Sense in repository
            // Note: In a real scenario, we might need a searchByWord helper
            const allSenses = await senseRepository.getAll();
            const match = allSenses.find(s => 
                s.word.en.toLowerCase() === randomTag.toLowerCase() || 
                s.word.zh === randomTag
            );
            
            if (!match) {
                throw new Error(`The echo of '${randomTag}' has faded into the void`);
            }

            // 3. Consume charge
            consumeEchoCharge();

            // 4. "Spawn" it (By emitting SENSE_CREATED)
            // Note: useCardManager will handle duplicate prevention.
            // If it already exists, we might want to "Retrieve" it to canvas instead.
            messageBus.publish('SENSE_CREATED', match);
            
            // 5. Special Notification
            addNotification({
                en: `The echo of '${randomTag}' resonates on the canvas!`,
                zh: `“${randomTag}”的回响正在画布上共鸣！`
            }, 'SUCCESS');

            logger.info(`Extracted echo: ${randomTag} from grimoire ${grimoire.id}`, undefined, 'EchoSystem');

        } catch (error: any) {
            addNotification(error.message || "Extraction failed", 'ERROR');
            logger.error('Echo extraction failed', error, 'EchoSystem');
        } finally {
            // Artificial delay for cinematic feel
            setTimeout(() => {
                setIsExtracting(false);
            }, 1500);
        }
    }, [isExtracting, consumeEchoCharge, addNotification]);

    return {
        extractEcho,
        isExtracting
    };
};
