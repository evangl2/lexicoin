/**
 * src/core/api/prompts.ts
 */

export type ArchetypeId = 1 | 2 | 3 | 4 | 5 | 6;

// 定义每种 Archetype 的基础描述和高亮描述
export const ARCHETYPES: Record<ArchetypeId, { concept: string; name: string; standard: string; active: string }> = {
    1: {
        concept: 'Composition',
        name: 'Composition',
        standard: 'Combine the materials/bodies of A and B. e.g. Water+Fall=Waterfall. Twig+Leaf=Branch.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Physically or structurally combine the raw materials or distinct bodies of Entity A and Entity B into a single, cohesive entity. Think about what is literally created when these two ingredients are mixed. e.g. Water+Fall=Waterfall. Twig+Leaf=Branch.'
    },
    2: {
        concept: 'Metaphor',
        name: 'Metaphor',
        standard: 'Map the core abstract quality of A onto B, or reversed. e.g. Lion+Man=Brave. Time+River=History.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Extract the most potent abstract quality, symbolic meaning, or emotional essence from Entity A, and project it onto Entity B (or vice versa). Create a poetic or conceptual bridge. e.g. Lion+Man=Brave. Time+River=History.'
    },
    3: {
        concept: 'Conflict',
        name: 'Conflict',
        standard: 'What happens when A Collide with B? What\'s the process or the product of their collision e.g. Fire+Water=Steam. Love+Home=Marriage.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Envision a direct clash, chemical reaction, or dialectical collision between Entity A and Entity B. What is the chaotic process or the immediate, inevitable product of their interaction? e.g. Fire+Water=Steam. Love+Home=Marriage.'
    },
    4: {
        concept: 'Function',
        name: 'Function',
        standard: 'Tool applied to a Purpose. Use A to solve/operate B, or reversed.e.g. See+Distance=Telescope. Head+Protect=Helmet.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Analyze the utilitarian relationship. If Entity A is a tool, how is it applied to Entity B as a purpose or material? Or if Entity B is the problem, what tool does Entity A represent? e.g. See+Distance=Telescope. Head+Protect=Helmet.'
    },
    5: {
        concept: 'Gestalt',
        name: 'Gestalt',
        standard: 'Find the specific situation where both exist together. e.g. Cat+Box=Schrödinger. Coffee+Deadline=Midnight.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Identify the specific, evocative human situation, scene, or atmospheric context where both Entity A and Entity B naturally coexist. What larger picture emerges when both are present? e.g. Cat+Box=Schrödinger. Coffee+Deadline=Midnight.'
    },
    6: {
        concept: 'Culture',
        name: 'Culture',
        standard: 'Cultural references, myths, historical events, pop culture, memes, or art that connect A and B.',
        active: '[!!! PRIMARY PRIORITY !!!] DIRECTION: Search deeply through mythology, history, pop culture, iconic art, or widespread internet memes to find a specific narrative or iconic reference that fundamentally connects Entity A and Entity B.'
    }
};

export interface SynthesisPromptParams {
    nameA: string;
    defA: string;
    nameB: string;
    defB: string;
    lang: string;
    maxLevel: string;
    archetype?: string;
}

export function buildSynthesisPrompt(params: SynthesisPromptParams): { systemPrompt: string; userPrompt: string } {
    const { nameA, defA, nameB, defB, lang, maxLevel, archetype } = params;

    // 1. 构建 Archetypes 列表
    let archetypesList = '';
    Object.values(ARCHETYPES).forEach(arch => {
        if (!archetype) {
            archetypesList += `${arch.name}: ${arch.active}\n`;
        } else {
            const isMatch = arch.name.toLowerCase() === archetype.toLowerCase();
            archetypesList += `${arch.name}: ${isMatch ? arch.active : arch.standard}\n`;
        }
    });

    // 2. 简化的 Trial 逻辑
    const trialInstruction = archetype
        ? `Evaluate the inputs using the [!!! PRIMARY PRIORITY !!!] Archetype. Iterate through possible result candidates and evaluate them against "The Three Gates" below. 
If absolutely no candidate from the Primary Archetype passes the gates, you MUST fall back to the MOST SUITABLE of the other 5 Archetypes. 
If still no candidate passes the gates, return a "NO_SYNERGY" failure code.`
        : `Evaluate the inputs and choose the MOST SUITABLE Archetype logic. Iterate candidates against "The Three Gates" below. Return a "NO_SYNERGY" failure code if none pass.`;

    // 3. Cultural Lens 逻辑 (强化版)
    const isCulturalLensActive = archetype ? ['Metaphor', 'Gestalt', 'Culture'].includes(archetype) : true;
    const culturalLensInstruction = isCulturalLensActive
        ? `\n[CONDITIONAL CULTURAL LENS: ACTIVE]
1. **Total Immersion**: You MUST evaluate the entities from the perspective of native speakers of the "${lang}" language.
2. **Linguistic Scavenging**: Are there specific idioms, proverbs, colloquialisms, or folklore in "${lang}" involving Entity A and B?
3. **Cultural Metaphor**: If translating A and B into "${lang}" creates a unique cultural connection (e.g., a pun or historical reference), use that connection as the absolute basis for the synthesis, even if it seems non-obvious in English. Explain this brilliant connection in the synthesis_reason.\n`
        : '';

    // 4. 构建 System Prompt
    const systemPrompt = `You are the Grandmaster Linguistic Alchemist.

YOUR GOAL:
Synthesize two input concepts (Entity A + Entity B) into a new, single English output word or short phrase (The Result).

[THE ALCHEMY LAWS (6 Archetypes)]
${archetypesList}${culturalLensInstruction}
[CRITICAL PROCESS: THE SYNTHESIS TRIAL]
${trialInstruction}

[THE THREE GATES OF JUDGMENT] (Candidates MUST pass these gates sequentially)
1. Gate 1: Resonance: Is the connection undeniably logical and instantly recognizable under the chosen Archetype? (If No, keep searching. If exhaustive -> 'NO_SYNERGY')
2. Gate 2: Purity: Is it offensive/NSFW? (If Yes, keep searching. If exhaustive -> 'OFFENSIVE')
3. Gate 3: Insight: Is the Candidate Level > CEFR ${maxLevel}? (If Yes, keep searching. If exhaustive -> 'TOO_COMPLEX'. Do NOT downgrade to a weak synonym. Fail instead.)

[OUTPUT CONSTRAINTS]
Output STRICTLY in the following JSON schema:
{
  "outcome": "success" | "failure",
  "result_concept": "The synthesized English word or phrase (null if failure)",
  "result_definition_en": "A clear, concise dictionary definition in English (null if failure)",
  "archetype_used": "The name of the Archetype ultimately used (e.g., 'Metaphor', 'Culture')",
  "synthesis_reason": "Provide a natural language explanation of exactly why and how A + B = Result, leveraging the chosen archetype logic. **MUST BE WRITTEN IN THE ${lang} LANGUAGE.**",
  "failure_code": null | "NO_SYNERGY" | "OFFENSIVE" | "TOO_COMPLEX"
}
`;

    // 5. 构建 User Prompt
    const userPrompt = `[TASK DATA]
Entity A: "${nameA}"
> Definition: "${defA}"
  
Entity B: "${nameB}"
> Definition: "${defB}"

Target Level Maximum (CEFR): ${maxLevel}
Target Cultural Lens Language: ${lang}

[EXECUTION PROTOCOL]
Please generate the synthesis result matching the exact JSON schema provided.`;

    return { systemPrompt, userPrompt };
}
