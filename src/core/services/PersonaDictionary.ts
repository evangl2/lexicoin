/**
 * 字典式的 Persona 管理中心
 * 
 * [设计理念: 动态叙事注入机制]
 * 当 personaNarrative 为空 (null/undefined) 时，系统将取用该 Persona 的默认 (default) 文本与示例指令。
 * 当 personaNarrative 不为空时，系统会在该 Persona 的 `narratives` 映射中查找对应的叙事键值（如 'loser'）。
 * - 若命中，则注入与该叙事独家绑定的 `textInstruction` 和 `exampleInstruction`。
 * - 若未命中，则作为稳健性降级，依然使用该 Persona 的默认指令。
 */

export interface InstructionSet {
    textInstruction: string;
    exampleInstruction: string;
}

export interface PersonaDirective {
    default: InstructionSet;
    narratives?: Record<string, InstructionSet>;
}

export const PERSONA_DICTIONARY: Record<string, PersonaDirective> = {
    default: {
        default: {
            textInstruction: "Craft a culturally resonant observation about this concept. It MUST exude a unique flavor—blend humor, sarcasm, wit, or philosophical weight characteristic of the target language. Do NOT write a boring, dry observation.",
            exampleInstruction: "Provide a complete, high-frequency, perfectly natural daily sentence showing how a native speaker would typically use the word in real life."
        }
    },
    // Example implementation demonstrating the narrative mapping
    idol: {
        default: {
            textInstruction: "Describe this concept with the bright, energetic, and slightly dramatic flair of a popular pop idol speaking to their fans.",
            exampleInstruction: "Provide a natural, highly trendy sentence that sounds like a social media update or a concert MC chat from an idol."
        },
        narratives: {
            loser: {
                textInstruction: "Describe this concept as a fallen idol: someone who used to shine but now views the world with cynical self-deprecation, hidden behind a cracked, fake smile.",
                exampleInstruction: "Provide an authentic sentence that sounds like a bitter, exhausted ex-idol whispering a dark truth off-camera."
            }
        }
    }
};
