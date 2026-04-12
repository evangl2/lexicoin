/**
 * GrimoireBackend.ts
 * 
 * 职责：负责构建用于生成魔典（Grimoire）的主题、逻辑与槽位的 AI Prompt。
 * 当前版本：V1 (Mock/Scaffold) - 基于 GDD_S9 初始规范。
 */

import { GrimoireType, PersonaEntity, SenseEntity } from "@/types/index";

export interface GrimoirePromptParams {
    persona: PersonaEntity;
    grimoireType: {
        id: string;
        name: string;
        logic: string;
        description: string;
    };
    seedSense: SenseEntity;
    targetLevel: string;
    learningLanguage: string;
    systemLanguage: string;
}

/**
 * 构建 generate-grimoire 的 Prompt (V1)
 */
export function buildGrimoireGenerationPrompt(params: GrimoirePromptParams): { systemPrompt: string; userPrompt: string } {
    const { persona, grimoireType, seedSense, targetLevel, learningLanguage, systemLanguage } = params;

    // 获取种子词（在学习语言中的表达）
    const seedWord = seedSense.shells[learningLanguage]?.[0]?.text ?? "unknown";

    const systemPrompt = `
[ROLE DEFINITION]
You are ${persona.name}.
Archetype: ${persona.description}
Tone/Bias: ${persona.genPrompt || "Professional and mysterious."}

[INPUT DATA]
Seed Concept: "${seedWord}" (Language: ${learningLanguage})
Quest Logic: "${grimoireType.logic}"
Target CEFR Level: ${targetLevel}

[GENERATION PROCESS]

1. LOGIC CORE (Objective Task)
   Define a strict semantic set based on [Quest Logic].
   ExplicitInstruction must be a specific collection rule for the player, not a vague description.
   Example: "Collect words that..." instead of "Describe..."

2. NARRATIVE ENGINE (Persona Layer)
   Step A - Motivation: As ${persona.name}, why do you need "${seedWord}"? Find a reason that fits your persona's obsession.
   Step B - Scene (3rd Person): Describe what you are doing right now to set the atmosphere.
   Step C - Instruction (1st Person): Turn to the player and demand specific words based on the logic.

3. VALIDATION (Hidden Answer Set)
   List 10 standard words fitting the rules (in ${learningLanguage}, hidden from player).
   Difficulty should be near ${targetLevel}.

[OUTPUT SCHEMA - STRICT JSON]
{
  "_designRationale": "Brief explanation of persona's intent for the evaluation AI.",
  "title": {
    "learning": "...",
    "system": "TRANSCREATE: Natural ${systemLanguage} title, not a direct translation."
  },
  "description": {
    "learning": "[3rd Person Scene]. \\"[1st Person Instruction]\\"",
    "system": "TRANSCREATE: Re-interpret in ${systemLanguage} while preserving voice."
  },
  "explicitInstruction": {
    "learning": "Collect words that ...",
    "system": "TRANSCREATE: Clear task in ${systemLanguage}."
  },
  "slots": [
    { "label": "Label in ${learningLanguage}" }
  ],
  "validationTags": ["word1", "word2", ..., "word10"]
}
    `.trim();

    const userPrompt = `
[TASK DATA]
Seed: "${seedWord}"
Logic: "${grimoireType.logic}"
Goal: Generate a Grimoire structure for a 3-6 slot challenge.

[EXECUTION]
Please construct the Grimoire JSON strictly following the schema. Output JSON only.
    `.trim();

    return { systemPrompt, userPrompt };
}

/**
 * NOTE: 这是一个初始版本的 Prompt。
 * 正式的内容和更细致的权重要求将在后续版本中根据 Persona 系统进行更新。
 */
