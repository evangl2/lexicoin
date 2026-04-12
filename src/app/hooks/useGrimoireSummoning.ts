/**
 * useGrimoireSummoning.ts
 * 
 * 职责：编排魔典召唤过程。
 * 1. 拦截召唤并检查/扣除体力。
 * 2. 选取适用的 GrimoireType。
 * 3. 发起 generate-grimoire Edge Function 调用。
 * 4. 生成实体并注入 Zustand Store。
 * 
 * NOTE: 这是一个 V1 版本，AI 内容和 Prompt 构建目前基于初始 Mock 逻辑。
 */

import { useState } from 'react';
import { useGameStore } from '@/core/store';
import { supabase } from '@/core/infra/supabaseClient';
import { GRIMOIRE_TYPES_REGISTRY } from '@/config/grimoireConfig';
import { SenseEntity, GrimoireType } from '@/types/index';

export function useGrimoireSummoning() {
    const [isSummoning, setIsSummoning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activePersona = useGameStore(s => s.activePersona);
    const player = useGameStore(s => s.player);
    const learningLang = useGameStore(s => s.player?.settings?.learningLang ?? 'en');
    const systemLang   = useGameStore(s => s.player?.settings?.interfaceLang ?? 'zh');
    const consumeStamina = useGameStore(s => s.consumeStamina);
    const regenerateStamina = useGameStore(s => s.regenerateStamina); // 用于退费
    const spawnGrimoire = useGameStore(s => s.spawnGrimoire);

    /**
     * 执行召唤
     * @param seed 种子 Sense 卡片 (可选，若无则由 AI 随机选择主题)
     * @param position 投放坐标
     */
    const summon = async (seed: SenseEntity, position: { x: number, y: number }) => {
        if (isSummoning) return;

        // 1. 权限与资源校验
        if (player.stamina < 60) {
            setError('Insufficient stamina (Need 60)');
            return;
        }

        setIsSummoning(true);
        setError(null);

        // 2. 扣除体力 (献祭仪式)
        const success = consumeStamina(60);
        if (!success) {
            setError('Stamina deduction failed');
            setIsSummoning(false);
            return;
        }

        try {
            // 3. 随机选择逻辑类型 (遵循 GDD §9.2: 过滤 Excluded Types)
            const personaExcluded = activePersona?.excludedTypes || [];
            const availableTypes = (Object.keys(GRIMOIRE_TYPES_REGISTRY) as GrimoireType[]).filter(
                t => !personaExcluded.includes(t)
            );
            
            // 安全降级：如果全部被排除（理论不应发生），回退到 locus
            const selectedType = availableTypes.length > 0 
                ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
                : 'locus';
                
            const grimoireTypeInfo = GRIMOIRE_TYPES_REGISTRY[selectedType];

            // 4. 发起 AI 调用
            const { data, error: invokeErr } = await supabase.functions.invoke('generate-grimoire', {
                body: {
                    persona: activePersona,
                    grimoireType: grimoireTypeInfo,
                    seedSense: seed,
                    targetLevel: player.level >= 5 ? 'B1' : 'A1',
                    learningLanguage: learningLang,
                    systemLanguage: systemLang,
                }
            });

            if (invokeErr || !data.success) {
                throw new Error(invokeErr?.message || data?.error || 'AI Generation Failed');
            }

            // 5. 生成实体 (执行严格的数据映射与 ID 注入)
            const grimoireData = data.data;
            const mappedSlots = (grimoireData.slots || []).map((s: any) => ({
                id: crypto.randomUUID(),
                type: 'SENSE',
                label: s.label,
                acceptedTags: grimoireData.validationTags || [], // 借用验证标签作为宽泛约束
                filledSenseId: null
            }));

            spawnGrimoire({
                ...grimoireData,
                slots: mappedSlots,
                position,
                uid: crypto.randomUUID(),
            });

            console.log(`[Summoning] Successfully spawned Grimoire: ${grimoireData.title.learning}`);

        } catch (err: any) {
            console.error('[Summoning] Error:', err);
            setError(err.message);
            
            // 6. 退费机制 (如果是网络/系统错误)
            regenerateStamina(60);
            console.log('[Summoning] Stamina refunded due to failure.');
        } finally {
            setIsSummoning(false);
        }
    };

    return {
        summon,
        isSummoning,
        error
    };
}
