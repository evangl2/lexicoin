/**
 * useGrimoireSummoning.ts
 *
 * 职责：编排魔典召唤过程。
 * 1. 拦截召唤并检查/扣除体力。
 * 2. 选取适用的 GrimoireType（过滤 Persona 的 excludedTypes）。
 * 3. 发起 generate-grimoire Edge Function 调用（传 personaId 字符串；后端查字典）。
 * 4. 生成实体并注入 Zustand Store。
 *
 * Slot 设计：AI 不生成 slot labels（避免直接给出答案）。
 * Edge Function 返回 slotCount，前端据此创建等数量的空 slot 对象。
 */

import { useState } from 'react';
import { useGameStore } from '@/core/store';
import { supabase } from '@/core/infra/supabaseClient';
import { GRIMOIRE_TYPES_REGISTRY, STAMINA_CONFIG } from '@/config/grimoireConfig';
import { personaModule } from '@/modules/persona/PersonaModule';
import type { Sense, GrimoireType, GrimoireEntity, PersonaType } from '@/types/index';
import { generateId } from '@/utils/helpers';

const SUMMON_COST = STAMINA_CONFIG.COSTS.GENERATE_GRIMOIRE;
const GRIMOIRE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function useGrimoireSummoning() {
    const [isSummoning, setIsSummoning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activePersonaId   = useGameStore(s => s.activePersona);
    const player            = useGameStore(s => s.player);
    const learningLang      = useGameStore(s => s.player?.settings?.learningLang ?? 'en');
    const systemLang        = useGameStore(s => s.player?.settings?.interfaceLang ?? 'zh');
    const personaStages     = useGameStore(s => s.personaStages);
    const consumeStamina    = useGameStore(s => s.consumeStamina);
    const regenerateStamina = useGameStore(s => s.regenerateStamina);
    const spawnGrimoire     = useGameStore(s => s.spawnGrimoire);
    const setSummonerStatus = useGameStore(s => s.setSummonerStatus);

    /**
     * 执行召唤
     * @param seed      种子 Sense 卡片
     * @param position  投放坐标
     */
    const summon = async (seed: Sense, position: { x: number; y: number }) => {
        if (isSummoning) return;

        // 1. 资源校验
        if (player.stamina < SUMMON_COST) {
            setError(`Insufficient stamina (Need ${SUMMON_COST})`);
            return;
        }

        setIsSummoning(true);
        setError(null);

        // 2. 扣除体力
        const success = consumeStamina(SUMMON_COST);
        if (!success) {
            setError('Stamina deduction failed');
            setIsSummoning(false);
            return;
        }

        setSummonerStatus('GENERATING');

        try {
            // 3. 解析当前 Persona（用于过滤排除类型）
            const resolvedPersonaId = activePersonaId ?? 'CHILD';
            const activePersona = personaModule.getPersona(resolvedPersonaId);

            // 4. 随机选择 Archetype（过滤 Persona excludedTypes）
            const personaExcluded = activePersona?.excludedTypes ?? [];
            const availableTypes = (Object.keys(GRIMOIRE_TYPES_REGISTRY) as GrimoireType[]).filter(
                t => !personaExcluded.includes(t)
            );
            const selectedType: GrimoireType = availableTypes.length > 0
                ? (availableTypes[Math.floor(Math.random() * availableTypes.length)] ?? 'locus')
                : 'locus';

            // 5. 计算目标 CEFR 等级（计算但不注入 prompt，用于实体记录）
            const levelInLang = player.languageProgress[learningLang]?.level ?? 1;
            const targetLevel =
                levelInLang >= 20 ? 'C1' :
                levelInLang >= 15 ? 'B2' :
                levelInLang >= 10 ? 'B1' :
                levelInLang >= 5  ? 'A2' : 'A1';

            // 6. 发起 AI 调用（传 personaId + personaStory；后端查字典并 resolve context）
            const personaStory = {
                stage: personaStages[resolvedPersonaId as keyof typeof personaStages] ?? 'startingpoint',
                // mood: null — RESERVED，目前不传递
            };
            const { data, error: invokeErr } = await supabase.functions.invoke('generate-grimoire', {
                body: {
                    personaId: resolvedPersonaId,       // 后端查 personaDictionary
                    personaStory,                       // 后端 resolvePersonaContext 选取对应 stage
                    archetypeId: selectedType,          // e.g. 'anatomy', 'locus', 'time'
                    seedWord: seed.word[learningLang] || seed.word.en,
                    learningLanguage: learningLang,
                    systemLanguage: systemLang,
                }
            });

            if (invokeErr || !data.success) {
                throw new Error(invokeErr?.message || data?.error || 'AI Generation Failed');
            }

            // 7. 构建完整 GrimoireEntity
            const grimoireData = data.data;
            const now = Date.now();

            // Slot 由后端随机数决定数量，前端创建空 slot 对象（无 label）
            const slotCount: number = typeof grimoireData.slotCount === 'number'
                ? Math.max(3, Math.min(6, grimoireData.slotCount))
                : 4;

            const entity: GrimoireEntity = {
                id: generateId(),
                x: position.x,
                y: position.y,
                personaId: resolvedPersonaId as PersonaType,
                grimoireType: selectedType,
                targetLevel,
                seedWord: seed.word[learningLang] || seed.word.en,
                theme: {
                    title: grimoireData.title ?? { learning: '???', system: '???' },
                    // personaQuest → theme.description (unified scene+voice)
                    description: grimoireData.personaQuest ?? { learning: '', system: '' },
                },
                explicitInstruction: grimoireData.explicitInstruction ?? { learning: '', system: '' },
                validationTags: grimoireData.validationTags ?? [],
                designRationale: grimoireData._reasoning ?? '',
                // Empty slots — no labels
                slots: Array.from({ length: slotCount }, () => ({
                    id: generateId(),
                    senseId: null,
                    grade: null,
                    locked: false,
                    commentary: null,
                })),
                createdAt: now,
                expiresAt: now + GRIMOIRE_DURATION_MS,
                status: 'ACTIVE',
                fCount: 0,
                finalGrade: null,
                rewardClaimed: false,
            };

            spawnGrimoire(entity);
            console.log(`[Summoning] Spawned: ${entity.theme.title.learning} (${slotCount} slots)`);

        } catch (err: any) {
            console.error('[Summoning] Error:', err);
            setError(err.message);
            regenerateStamina(SUMMON_COST);
            console.log('[Summoning] Stamina refunded due to failure.');
        } finally {
            setSummonerStatus('IDLE');
            setIsSummoning(false);
        }
    };

    return { summon, isSummoning, error };
}
