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
    systemlang: string;
    learninglang: string;
    targetLanguages: string[];
    maxLevel: string;
    archetype?: string;
}

export function buildSynthesisPrompt(params: SynthesisPromptParams): { systemPrompt: string; userPrompt: string } {
    const { nameA, defA, nameB, defB, systemlang, learninglang, targetLanguages, maxLevel, archetype } = params;

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

    // 2. Trial 逻辑（两轮）
    const trialInstruction = archetype
        ? `ROUND 1: Generate your single best candidate using the [!!! PRIMARY PRIORITY !!!] Archetype. Apply the Full Viability Check below.
If Round 1 fails, proceed to ROUND 2.
ROUND 2: Self-select the most suitable Archetype. You may relax the level constraint by one CEFR step and use a semantically close but simpler alternative if needed. Apply the Full Viability Check.
If Round 2 also fails, return the appropriate failure_code.`
        : `ROUND 1: Choose the MOST SUITABLE Archetype and generate your single best candidate. Apply the Full Viability Check below.
If Round 1 fails, proceed to ROUND 2.
ROUND 2: Choose a different Archetype. You may relax the level constraint by one CEFR step. Apply the Full Viability Check.
If Round 2 also fails, return the appropriate failure_code.`;

    // 3. Cultural Lens（简化版，learninglang优先）
    const isCulturalLensActive = archetype ? ['Metaphor', 'Gestalt', 'Culture'].includes(archetype) : true;
    const culturalLensInstruction = isCulturalLensActive
        ? `\n[CULTURAL LENS: ${learninglang}]
When the synthesis archetype is Metaphor, Gestalt, or Culture: if an obvious cultural reference (idiom, historical event, cultural symbol, famous saying) in "${learninglang}" connects Entity A and Entity B, this MUST take absolute priority over a generic logical result.
Otherwise, proceed with the strongest logical result that feels natural and meaningful to a "${learninglang}" speaker.\n`
        : '';

    // 4. 构建 System Prompt
    const systemPrompt = `You are the Grandmaster Linguistic Alchemist.

YOUR GOAL:
Synthesize two input concepts (Entity A + Entity B) into a new, single English output word or short phrase (The Result).

[THE ALCHEMY LAWS (6 Archetypes)]
${archetypesList}${culturalLensInstruction}
[SYNTHESIS PROCESS]
${trialInstruction}

[FULL VIABILITY CHECK]
Your candidate must simultaneously satisfy ALL of the following:
1. Logical fit: Clear and recognizable connection under the chosen Archetype
2. Appropriate level: CEFR ≤ ${maxLevel}
3. Clean content: Not offensive or NSFW
If the candidate fails, identify which criterion failed and use that as the failure_code: NO_SYNERGY / TOO_COMPLEX / OFFENSIVE.

[OUTPUT CONSTRAINTS]
Output STRICTLY in the following JSON schema:
{
  "outcome": "success" | "failure",
  "result_concept": "The synthesized English word or phrase (null if failure)",
  "result_definition_en": "A clear, concise dictionary definition in English (null if failure)",
  "archetype_used": "The name of the Archetype ultimately used (e.g., 'Metaphor', 'Culture')",
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
System Language: ${systemlang}
Learning Language: ${learninglang}

[EXECUTION PROTOCOL]
Please generate the synthesis result matching the exact JSON schema provided.`;

    return { systemPrompt, userPrompt };
}

