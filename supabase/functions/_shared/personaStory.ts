/**
 * personaStory.ts — 故事层（Story Layer）
 *
 * 职责：
 *   1. 定义 PersonaStory（前端传入的叙事状态）。
 *   2. resolvePersonaContext：根据 story 状态从字典中解析出当前激活的指令集。
 *   3. 未来可在此扩展：故事推进逻辑、事件触发、里程碑检测等。
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  解析规则                                                        │
 * │  base (startingpoint)                                           │
 * │    └─ stages[story.stage]  ← 不存在则直接用 base               │
 * │         └─ mood overlay    ← RESERVED，目前不应用               │
 * │                                                                 │
 * │  标量字段：override 值覆盖 base 对应字段                        │
 * │  数组字段：override 提供时完全替换（不合并）                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 使用方：generate-grimoire、evaluate-grimoire
 */

import { PERSONA_DICTIONARY } from './personas/index.ts';
import type { PersonaBaseDirectives, PersonaDefinition } from './personas/index.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * 前端传入的当前 Persona 叙事状态。
 * 前端持久化在 store.personaStages[personaId]，每次调用 Edge Function 时构造并传入。
 */
export interface PersonaStory {
    /**
     * 当前叙事阶段标识符。
     * 'startingpoint' = 默认初始状态，等同于直接使用 base 指令。
     * 未来示例：'chapter2_exile'、'arc3_threshold'。
     */
    stage: string;

    /**
     * RESERVED — Mood 叠加层，目前未实现。
     *
     * 设计意图（未来）：
     *   mood 是短暂的情绪叠加，叠在当前 stage 之上，可以消退。
     *   适合表达由游戏事件触发的临时状态变化（如刚经历失败、获得突破）。
     *   生命周期：由游戏事件触发，持续 N 次魔典召唤后自动过期。
     *   解析顺序变为：merge(base, stages[story.stage], moodOverrides[story.mood])
     *
     * 当前行为：即使此字段有值，也不会影响任何 prompt 组装。
     */
    mood?: string | null;
}

/**
 * resolvePersonaContext 的输出：当前激活的完整上下文。
 * 包含 Persona 身份信息 + 已解析的指令集（base 与 stage override 合并后的结果）。
 */
export interface ActivePersonaContext extends PersonaBaseDirectives {
    id: string;
    name: { en: string; zh: string };
    description: string;
    /** 实际解析时使用的 stage 名（用于日志/调试）。 */
    resolvedStage: string;
}

// ── Resolution ────────────────────────────────────────────────────────────────

/**
 * 解析当前激活的 Persona 上下文。
 *
 * @param personaId  'CHILD' | 'GARDENER' | 'ALCHEMIST'（未来支持更多）
 * @param story      前端传入的叙事状态。为空时等同于 startingpoint。
 */
export function resolvePersonaContext(
    personaId: string,
    story?: PersonaStory | null
): ActivePersonaContext {
    const persona: PersonaDefinition = PERSONA_DICTIONARY[personaId] ?? PERSONA_DICTIONARY['CHILD']!;
    const stage = story?.stage ?? 'startingpoint';

    // mood 目前保留，不参与解析
    // const mood = story?.mood;

    const override = persona.stages?.[stage] ?? {};

    return {
        id:            persona.id,
        name:          persona.name,
        description:   persona.description,
        resolvedStage: stage,
        // 标量字段：override 覆盖 base
        voiceDescription:   override.voiceDescription   ?? persona.base.voiceDescription,
        evaluatorProfile:   override.evaluatorProfile   ?? persona.base.evaluatorProfile,
        evalBias:           override.evalBias            ?? persona.base.evalBias,
        conditionMatchComm: override.conditionMatchComm ?? persona.base.conditionMatchComm,
        // 数组字段：override 完全替换（不合并）
        triggerConditions: override.triggerConditions ?? persona.base.triggerConditions,
        excludedTypes:     override.excludedTypes     ?? persona.base.excludedTypes,
        narrativeForms:    override.narrativeForms    ?? persona.base.narrativeForms,
    };
}

/**
 * 从已解析的上下文中随机选取一条叙事形式。
 * 每次 generate-grimoire 调用时选取一次，保证叙事多样性。
 */
export function pickNarrativeForm(context: ActivePersonaContext): string {
    const forms = context.narrativeForms;
    const index = Math.floor(Math.random() * forms.length);
    return forms[index] ?? forms[0] ?? 'Speak in your own voice.';
}

/**
 * 直接获取 PersonaDefinition 原始数据（调试用）。
 * 通常应使用 resolvePersonaContext。
 */
export function getPersonaDefinition(personaId: string): PersonaDefinition {
    return PERSONA_DICTIONARY[personaId] ?? PERSONA_DICTIONARY['CHILD']!;
}
