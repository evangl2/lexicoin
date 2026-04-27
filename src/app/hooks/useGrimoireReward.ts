import { useState, useCallback } from 'react';
import { useGameStore } from '@/core/store';
import { messageBus } from '@/core/protocol/MessageBus';
import { UUID, Sense, GrimoireEntity, BilingualText } from '@/types/index';
import { generateId } from '@/utils/helpers';
import { GRIMOIRE_REWARDS } from '@/config/grimoireConfig';
import { logger } from '@/utils/logger';

export interface RewardResult {
    xp: number;
    resonance: number;
    echo?: Sense;
}

export function useGrimoireReward() {
    const [isClaiming, setIsClaiming] = useState(false);
    const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);
    
    const activeGrimoires = useGameStore(s => s.activeGrimoires);
    const libraryGrimoires = useGameStore(s => s.libraryGrimoires);
    const claimGrimoireReward = useGameStore(s => s.claimGrimoireReward);

    const claim = useCallback(async (grimoireId: UUID) => {
        const settings = useGameStore.getState().player?.settings;
        const grimoire =
            activeGrimoires.find(g => g.id === grimoireId) ||
            libraryGrimoires.find(g => g.id === grimoireId);
        if (!grimoire || !grimoire.finalGrade || grimoire.rewardClaimed) return;

        setIsClaiming(true);
        logger.info(`Claiming rewards for Grimoire ${grimoireId}`, undefined, 'GrimoireReward');

        try {
            // 1. Calculate Rewards (Match store logic for UI sync)
            const rewards = GRIMOIRE_REWARDS[grimoire.finalGrade];
            
            // 2. Generate Echo Card
            // We pick a word from validationTags or the seed word itself
            const echoWord = grimoire.validationTags.length > 0 
                ? grimoire.validationTags[Math.floor(Math.random() * grimoire.validationTags.length)]
                : grimoire.seedWord;

            const learningLang = settings?.learningLang ?? 'en';
            const systemLang = settings?.interfaceLang ?? 'zh';

            const echoSense: Sense = {
                id: generateId(),
                word: {
                    [learningLang]: echoWord,
                    [systemLang]: `Echo of ${grimoire.theme.title.system}`
                } as any,
                meaning: {
                    [learningLang]: `A lingering echo from the ritual: "${grimoire.theme.title.learning}"`,
                    [systemLang]: `仪式“${grimoire.theme.title.system}”留下的回响。`
                } as any,
                partOfSpeech: 'noun',
                level: grimoire.targetLevel,
                visual: '✨', // Default sparkle for Echos
                flavorText: {
                    en: `Extracted from the design rationale: ${grimoire.designRationale}`,
                    zh: `从仪式逻辑中提取：${grimoire.designRationale}`
                } as any,
                tags: ['echo', ...grimoire.grimoireType.split(' ')],
                durability: 100,
                maxDurability: 100,
                createdAt: Date.now()
            };

            // 3. Trigger Store Updates (XP, Resonance, Archival)
            claimGrimoireReward(grimoireId);

            // 4. Inject Echo Card into the system
            // MessageBus triggers SenseRepository to save and CardManager to show on canvas
            await messageBus.send('SENSE_CREATED', echoSense, 'GrimoireRewardService');

            setRewardResult({
                xp: rewards.xp,
                resonance: rewards.resonance,
                echo: echoSense
            });

            // Note: We don't setIsClaiming(false) immediately to allow the UI to show the cinematic
        } catch (err) {
            logger.error('Failed to claim grimoire rewards', err, 'GrimoireReward');
            setIsClaiming(false);
        }
    }, [activeGrimoires, libraryGrimoires, claimGrimoireReward, settings]);

    const resetReward = useCallback(() => {
        setRewardResult(null);
        setIsClaiming(false);
    }, []);

    return {
        claim,
        isClaiming,
        rewardResult,
        resetReward
    };
}
