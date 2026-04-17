/**
 * sensePersona.ts — Flavor Text 风格指令字典（synthesize-sense 专用）
 *
 * 职责：控制 AI 为 Sense 卡片生成 flavor text（卡片观察文字和例句）时的写作风格。
 *
 * ⚠ 独立于 personaStory.ts：
 *   Sense 卡片的 flavor text 属于持久内容（写入数据库后长期存在），
 *   不受 personaStory（叙事阶段 / mood）影响——无论 persona 处于哪个 chapter，
 *   同一 Sense 的 flavor text 保持一致。
 *   因此本字典只需按 persona 静态注入风格指令，无需 stage/mood 解析。
 *
 * 双层命中机制（personaId + personaNarrative）：
 *   - personaNarrative 为空   → 使用 persona.default 指令
 *   - personaNarrative 不为空 → 在 persona.narratives[key] 中查找；未命中则降级 default
 *
 * 游戏 Persona 与此字典的对应关系：
 *   CHILD / GARDENER / ALCHEMIST → 下方三个条目
 *   'default'                    → 兜底，用于未匹配任何已知 personaId 的情况
 */

export interface InstructionSet {
    textInstruction: string;
    exampleInstruction: string;
}

export interface PersonaDirective {
    default: InstructionSet;
    narratives?: Record<string, InstructionSet>;
}

export const SENSE_PERSONA_DICTIONARY: Record<string, PersonaDirective> = {

    // ── 兜底 ───────────────────────────────────────────────────────────────────
    default: {
        default: {
            textInstruction:
                'Craft a culturally resonant observation about this concept. ' +
                'It MUST exude a unique flavor — blend humor, sarcasm, wit, or philosophical weight ' +
                'characteristic of the target language. Do NOT write a boring, dry observation.',
            exampleInstruction:
                'Provide a complete, high-frequency, perfectly natural daily sentence showing how a ' +
                'native speaker would typically use the word in real life.',
        },
    },

    // ── 游戏 Persona：CHILD ────────────────────────────────────────────────────
    CHILD: {
        default: {
            textInstruction:
                'The Child has its own definition of this word. Not the official one — the one it worked out before anyone explained it properly.\n\n' +
                'A child defines things by what they do, not what they are. By how they feel against the skin, by what they sound like when they arrive, by the rule the child discovered through testing. A child\'s definition lives in one specific moment — the first encounter — and that moment becomes permanent. It does not generalize. It does not need to.\n\n' +
                'The angle is always unexpected because the child noticed a different thing. Not the important thing. The most physical thing. The detail that was actually there, that adults stopped seeing after the tenth time.\n\n' +
                'Write in The Child\'s voice. No first person. Simple words — the ones a child actually uses to say things, not the ones adults use to describe children. Short sentences, or a chain of short sentences that land somewhere the reader didn\'t expect. No hedging. State the definition as fact: flat, certain, with no awareness that anyone might disagree.',
            exampleInstruction:
                'Write one sentence a child would say out loud — at home, at school, or while playing. ' +
                'Short and spoken: simple vocabulary, no complex clauses, direct grammar. ' +
                'The word appears in a small, concrete moment a child would actually live.',
        },
        // narratives: reserved for future use if narrative-driven flavor text is ever needed.
        // Currently not used — flavor text is static regardless of story stage.
    },

    // ── 游戏 Persona：GARDENER ─────────────────────────────────────────────────
    GARDENER: {
        default: {
            textInstruction:
                'Write an observation about this concept that reveals a hidden connection — ' +
                'to a season, a life cycle, a relationship between living things. ' +
                'The tone is quiet, unhurried, and precise. Use metaphors from the natural world ' +
                'only when they carry real meaning. Do not decorate; illuminate.',
            exampleInstruction:
                'Provide a sentence that feels like something said while tending to something — ' +
                'measured, specific, as if the speaker has been watching this for a long time.',
        },
    },

    // ── 游戏 Persona：ALCHEMIST ────────────────────────────────────────────────
    ALCHEMIST: {
        default: {
            textInstruction:
                'Write a precise, functional observation about this concept — its properties, ' +
                'its transformative potential, or its structural role in a larger system. ' +
                'The register is technical and dry, with occasional flashes of dry wit. ' +
                'Every word must earn its place. No metaphors unless they are exact.',
            exampleInstruction:
                'Provide a sentence that reads like an entry in a technical manual or a laboratory note. ' +
                'Clean, informative, slightly cold. Native and natural in the target language.',
        },
    },

    // ── Legacy / Non-game personas (kept for backward compatibility) ───────────
    idol: {
        default: {
            textInstruction:
                'Describe this concept with the bright, energetic, and slightly dramatic flair ' +
                'of a popular pop idol speaking to their fans.',
            exampleInstruction:
                'Provide a natural, highly trendy sentence that sounds like a social media update ' +
                'or a concert MC chat from an idol.',
        },
        narratives: {
            loser: {
                textInstruction:
                    'Describe this concept as a fallen idol: someone who used to shine but now views ' +
                    'the world with cynical self-deprecation, hidden behind a cracked, fake smile.',
                exampleInstruction:
                    'Provide an authentic sentence that sounds like a bitter, exhausted ex-idol ' +
                    'whispering a dark truth off-camera.',
            },
        },
    },
};
