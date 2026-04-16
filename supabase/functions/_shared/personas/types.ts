/**
 * personas/types.ts — Persona 数据结构类型定义
 *
 * 纯类型文件，无运行时依赖。
 * 供各 persona 文件和 personaStory.ts 引用。
 */

/** Persona 的完整基础指令（startingpoint 状态的全部内容）。 */
export interface PersonaBaseDirectives {
    voiceDescription: string;
    /** 评判者画像：包含评判性格、客观评判原则、偏好倾向的完整指令。注入 evaluate-grimoire prompt。 */
    evaluatorProfile: string;
    evalBias: number;
    /**
     * 触发条件列表。每个条件是一段语义描述（如"属于玩具的"/"表示积极情绪的"）。
     * 当提交词命中某条件时，触发 conditionMatchComm 中的特殊 commentary 规则。
     * 无数量上限。
     */
    triggerConditions: string[];
    /**
     * 当提交词命中 triggerConditions 中的任意条件时，
     * 如何影响 commentary 的写法。
     */
    conditionMatchComm: string;
    excludedTypes: string[];
    narrativeForms: string[];
}

/**
 * 特定故事阶段的 override。
 * 只需声明与 base 不同的字段——未声明的字段自动继承 base。
 * 数组字段提供时完全替换 base 数组（不合并）。
 */
export interface PersonaStageOverride {
    voiceDescription?: string;
    evaluatorProfile?: string;
    evalBias?: number;
    triggerConditions?: string[];
    conditionMatchComm?: string;
    excludedTypes?: string[];
    narrativeForms?: string[];
}

/** 完整 Persona 定义（含身份信息 + base 指令 + 所有故事阶段 override）。 */
export interface PersonaDefinition {
    id: string;
    name: { en: string; zh: string };
    /** 一句话原型描述。注入 prompt [ROLE] 区块。 */
    description: string;
    /**
     * Base 指令 = startingpoint 状态的全部内容。
     * 未来的章节通过 stages 添加 override。
     */
    base: PersonaBaseDirectives;
    /**
     * 故事阶段 overrides。键为阶段名（snake_case，建议带章节前缀）。
     * 目前为空 —— 所有 persona 均处于 startingpoint 状态。
     *
     * 添加新阶段规范：
     *   - 只写需要变化的字段，其余自动继承 base
     *   - 注释说明该阶段的叙事背景
     */
    stages?: Record<string, PersonaStageOverride>;
}
