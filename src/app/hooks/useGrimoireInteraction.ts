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
import { UUID, GrimoireSlot, Grade } from '@/types/index';
import { personaModule } from '@/modules/persona/PersonaModule';
import { GRADE_VALUES, F_PENALTY_MULTIPLIER, FINAL_GRADE_THRESHOLDS } from '@/config/grimoireConfig';

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
            // 准备 AI 评判数据（不含 label —— AI 不应看到 slot 的预设提示）
            const learningLang = useGameStore.getState().player.settings.learningLang;
            const slotsToEvaluate = pendingSlots.map(slot => {
                const sense = senses.find(s => s.id === slot.senseId);
                return {
                    slotId: slot.id,
                    word: sense?.word[learningLang] || 'unknown',
                    meaning: sense?.meaning[learningLang] || 'unknown',
                    level: sense?.level || 'A1',
                };
            });

            const { data, error: invokeErr } = await supabase.functions.invoke('evaluate-grimoire', {
                body: {
                    personaId: grimoire.personaId,   // 后端查 personaDictionary
                    grimoire: {
                        id: grimoire.id,
                        seedWord: grimoire.seedWord,
                        grimoireType: grimoire.grimoireType,
                        explicitInstruction: grimoire.explicitInstruction,
                        designRationale: grimoire.designRationale,
                        validationTags: grimoire.validationTags,
                    },
                    slotsToEvaluate,
                    learningLanguage: learningLang,
                    systemLanguage: useGameStore.getState().player.settings.interfaceLang,
                }
            });

            if (invokeErr || !data.success) {
                throw new Error(invokeErr?.message || data?.error || 'AI Evaluation Service Unreachable');
            }

            // 处理评判结果
            const apiResults = data.data.results; // [{ slotId, grade, commentary }]
            
            const updatedSlots = grimoire.slots.map(slot => {
                const result = apiResults.find((r: any) => r.slotId === slot.id);
                if (result) {
                    const isF = result.grade === 'F';
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

            // fCount: 累加本轮所有 F 槽数量
            const newFCount = (grimoire.fCount || 0) + updatedSlots.filter(s => s.grade === 'F').length;

            // 最终等级计算 — GDD §7.3 算法
            const calculateFinalGrade = (slots: GrimoireSlot[], fCount: number): Grade => {
                const rawScore = slots.reduce((acc, s) => acc + (GRADE_VALUES[s.grade as Grade] ?? 0), 0) / slots.length;
                const finalScore = rawScore - fCount * F_PENALTY_MULTIPLIER;
                const threshold = FINAL_GRADE_THRESHOLDS.find(t => finalScore >= t.min);
                return threshold?.grade ?? 'D';
            };

            const finalGrade = allPassed ? calculateFinalGrade(updatedSlots, newFCount) : null;

            updateGrimoire(activeGrimoireId, {
                slots: updatedSlots,
                status: allPassed ? 'RESOLVED' : 'NEEDS_REVISION',
                fCount: newFCount,
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
