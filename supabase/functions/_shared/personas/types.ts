/**
 * personas/types.ts — Persona 数据结构类型定义
 *
 * 纯类型文件，无运行时依赖。
 * 供各 persona 文件和 personaStory.ts 引用。
 *
 * ── 故事层架构概述 ────────────────────────────────────────────────────────────
 *
 * 每个 Persona 有若干隐藏 counter，由玩家的词语选择驱动，形成叙事分支。
 * counter 达到阈值（暂定 ±100）时进入结局状态，前端写入游戏数据 tag。
 *
 * 当前实现状态：
 *   ✅ triggers 数据结构已定义
 *   ✅ evaluate-grimoire 已注入 [STORY TRIGGERS] 块，AI 逐词检查并返回 triggeredCondition
 *   ⬜ 前端：读取 triggeredCondition，递增对应 counter，持久化至 store
 *   ⬜ 前端：counter 达到阈值时写入结局 tag，更新 UI 状态
 *   ⬜ generate-grimoire：seedWord 命中 trigger 时注入叙事约束（遮蔽或补充 narrativeForm）
 *   ⬜ sensePersona：命中 trigger 时将 comm 作为最高优先级 filter 注入 senseprompt
 *   ⬜ GARDENER / ALCHEMIST：故事与 trigger 内容待设计
 *
 * counter 设计（以 CHILD 为例，三条并行）：
 *   home_warm / home_dark     → 家的明暗面 counter（结局：留下 or 离开）
 *   growth_child / adult_*    → 成长 counter（结局：永不成人 or 成年）
 *   mother_warm / mother_absent → 母亲 counter（结局：知道 or 不知道）
 */

/** Persona 的完整基础指令（startingpoint 状态的全部内容）。 */
export interface PersonaBaseDirectives {
    /**
     * 按语言代码索引的声音指令，每个条目包含说话风格描述 + 内嵌样例句。
     * 注入 generate-grimoire（取 learningLanguage 条目）
     * 和 evaluate-grimoire（分别取 learningLanguage 和 systemLanguage 条目）。
     * Fallback 顺序：目标语言 → 'en' → 空字符串。
     */
    voiceDescription: Record<string, string>;
    /** 评判者画像：包含评判性格、客观评判原则、偏好倾向的完整指令。注入 evaluate-grimoire prompt。 */
    evaluatorProfile: string;
    evalBias: number;
    /**
     * 故事触发器列表。每个触发器包含：
     *   id          — 唯一标识符，前端用于递增对应 counter
     *   condition   — 语义条件描述，AI 在 prompt 层判断提交词是否命中
     *   comm        — 命中时替代 [COMMENTARY] 规则的生成指令
     *
     * 触发机制：evaluate-grimoire 将所有触发器注入 [STORY TRIGGERS] 块，
     * AI 对每个词单独检查，命中则用 comm 替代标准 commentary 规则。
     * 未命中则按 [COMMENTARY] 正常生成。
     */
    triggers: Array<{
        id: string;
        condition: string;
        comm: string;
    }>;
    excludedTypes: string[];
    narrativeForms: string[];
}

/**
 * 特定故事阶段的 override。
 * 只需声明与 base 不同的字段——未声明的字段自动继承 base。
 * 数组字段提供时完全替换 base 数组（不合并）。
 */
export interface PersonaStageOverride {
    voiceDescription?: Record<string, string>;
    evaluatorProfile?: string;
    evalBias?: number;
    triggers?: Array<{ id: string; condition: string; comm: string }>;
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
