/**
 * useGrimoireInteraction.ts
 * 
 * 职责：管理玩家与魔典的交互逻辑。
 * 1. 槽位填充与移除 (附带自动保存)。
 * 2. 魔典提交评判。
 * 3. 评判结果处理（解析评级、锁定槽位、处理 F 槽）。
 */

import { useState } from 'react';
import { useGameStore } from '@/core/store';
import { supabase } from '@/core/infra/supabaseClient';
import { UUID, GrimoireSlot, GrimoireStatus, Grade } from '@/types/index';
import { personaModule } from '@/modules/persona/PersonaModule';

export function useGrimoireInteraction() {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeGrimoireId = useGameStore(s => s.activeGrimoireId);
    const setOpenGrimoire = useGameStore(s => s.setActiveGrimoireId);
    const activeGrimoires = useGameStore(s => s.activeGrimoires);
    const updateGrimoire = useGameStore(s => s.updateGrimoire);
    const updateSlotSense = useGameStore(s => s.updateSlotSense);
    const senses = useGameStore(s => s.senses);
    
    // 获取当前正在编辑的魔典
    const grimoire = activeGrimoires.find(g => g.id === activeGrimoireId);

    /**
     * 向槽位放入或移除卡片
     */
    const handleUpdateSlot = (slotId: UUID, senseId: UUID | null) => {
        if (!activeGrimoireId || !grimoire || grimoire.status === 'EVALUATING') return;
        updateSlotSense(activeGrimoireId, slotId, senseId);
    };

    /**
     * 提交魔典进行评判
     */
    const submit = async () => {
        if (!grimoire || !activeGrimoireId || submitting) return;

        // 验证：所有槽位必须已填充且未锁定
        const pendingSlots = grimoire.slots.filter(s => !s.locked);
        const unfilled = pendingSlots.find(s => !s.senseId);
        if (unfilled) {
            setError('Please fill all slots before submitting.');
            return;
        }

        setSubmitting(true);
        setError(null);

        // 更改状态为 EVALUATING
        updateGrimoire(activeGrimoireId, { status: 'EVALUATING' });

        try {
            // 准备 AI 评判数据
            const slotsToEvaluate = pendingSlots.map(slot => {
                const sense = senses.find(s => s.id === slot.senseId);
                // 获取当前学习语言下的单词和定义
                const learningLang = useGameStore.getState().player.settings.learningLang;
                return {
                    slotId: slot.id,
                    label: slot.label,
                    word: sense?.word[learningLang] || 'unknown',
                    meaning: sense?.meaning[learningLang] || 'unknown',
                    level: sense?.level || 'A1'
                };
            });

            // 获取 Persona 完整数据 (用于 Prompts)
            const personaData = personaModule.getPersona(grimoire.personaId);
            const personaPromptContext = {
                name: personaData?.name.en || grimoire.personaId,
                description: personaData?.description.en || "...",
                evalPrompt: personaData?.evalPrompt || "...",
                evalBias: personaData?.evalBias || 0
            };

            const { data, error: invokeErr } = await supabase.functions.invoke('evaluate-grimoire', {
                body: {
                    grimoire: {
                        id: grimoire.id,
                        theme: grimoire.theme,
                        explicitInstruction: grimoire.explicitInstruction,
                        designRationale: grimoire.designRationale,
                        validationTags: grimoire.validationTags,
                        persona: personaPromptContext, // 传入真实角色逻辑
                    },
                    slotsToEvaluate,
                    learningLanguage: useGameStore.getState().player.settings.learningLang,
                    systemLanguage: useGameStore.getState().player.settings.interfaceLang
                }
            });

            if (invokeErr || !data.success) {
                throw new Error(invokeErr?.message || data?.error || 'AI Evaluation Service Unreachable');
            }

            // 处理评判结果
            const apiResults = data.data.results; // [{ slotId, grade, commentary }]
            
            let hasF = false;
            const updatedSlots = grimoire.slots.map(slot => {
                const result = apiResults.find((r: any) => r.slotId === slot.id);
                if (result) {
                    const isF = result.grade === 'F';
                    if (isF) hasF = true;
                    return {
                        ...slot,
                        grade: result.grade,
                        commentary: result.commentary,
                        locked: !isF // F 级不锁定，允许重改
                    };
                }
                return slot;
            });

            // 计算是否全员通过 (RESOLVED)
            const allPassed = updatedSlots.every(s => s.grade && s.grade !== 'F');

            // 最终等级计算逻辑
            const calculateFinalGrade = (slots: GrimoireSlot[]): Grade => {
                const gradeWeights: Record<string, number> = {
                    'S++': 100, 'S+': 90, 'S': 80, 'A': 70, 'B': 50, 'C': 30, 'D': 10, 'F': 0
                };
                
                const totalPoints = slots.reduce((acc, s) => acc + (gradeWeights[s.grade || 'F'] || 0), 0);
                const avg = totalPoints / slots.length;

                if (avg >= 95) return 'S++';
                if (avg >= 85) return 'S+';
                if (avg >= 75) return 'S';
                if (avg >= 65) return 'A';
                if (avg >= 45) return 'B';
                if (avg >= 25) return 'C';
                if (avg >= 10) return 'D';
                return 'F';
            };

            const finalGrade = allPassed ? calculateFinalGrade(updatedSlots) : null;

            updateGrimoire(activeGrimoireId, {
                slots: updatedSlots,
                status: allPassed ? 'RESOLVED' : 'NEEDS_REVISION',
                fCount: hasF ? (grimoire.fCount || 0) + 1 : grimoire.fCount,
                finalGrade
            });

        } catch (err: any) {
            console.error('[Evaluation] Error:', err);
            setError(err.message);
            // 回调到 ACTIVE 状态以便重试
            updateGrimoire(activeGrimoireId, { status: 'ACTIVE' });
        } finally {
            setSubmitting(false);
        }
    };

    return {
        grimoire,
        submitting,
        error,
        handleUpdateSlot,
        submit,
        close: () => setOpenGrimoire(null)
    };
}
