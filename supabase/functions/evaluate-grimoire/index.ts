/**
 * evaluate-grimoire/index.ts
 *
 * Receives filled Grimoire slots and calls Gemini to grade each one.
 * Persona identity (bias, triggerConditions, evaluatorProfile) is resolved from the BACKEND dictionary.
 * Based on GDD §9.3.
 */

import { resolvePersonaContext } from '../_shared/personaStory.ts';
import type { PersonaStory } from '../_shared/personaStory.ts';

// ── CORS headers ──────────────────────────────────────────────────────────────
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function stripMarkdown(raw: string): string {
    return raw.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim();
}

async function callAI(params: {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
}) {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: params.systemPrompt }] },
            contents: [{ parts: [{ text: params.userPrompt }] }],
            generationConfig: {
                temperature: params.temperature,
                response_mime_type: 'application/json',
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            personaId = 'CHILD',
            /**
             * personaStory: 前端传入的当前叙事状态，与 generate-grimoire 保持一致。
             * 评判时使用与生成时相同的 persona 上下文（evalBias / triggerConditions 等）。
             * mood 字段当前不参与解析（RESERVED）。
             */
            personaStory = null as PersonaStory | null,
            grimoire,
            slotsToEvaluate,
            learningLanguage = 'en',
            systemLanguage = 'zh',
            modelId = 'gemini-2.0-flash',
        } = body;

        if (!grimoire || !slotsToEvaluate) {
            return json({
                success: false,
                error: 'Missing required parameters: grimoire, slotsToEvaluate',
            }, 400);
        }

        // ── Resolve persona context (base + stage override) ───────────────────
        const persona = resolvePersonaContext(personaId, personaStory);
        const evalBias: number = persona.evalBias;

        // ── Resolve voice descriptions (one per output language) ─────────────
        const voiceDescLearning = persona.voiceDescription[learningLanguage]
            ?? persona.voiceDescription['en']
            ?? '';
        const voiceDescSystem = persona.voiceDescription[systemLanguage]
            ?? persona.voiceDescription['en']
            ?? '';

        // ── Build story trigger block ─────────────────────────────────────────
        // 将 persona.triggers 注入 [STORY TRIGGERS] 块，AI 逐词检查并在命中时替代 [COMMENTARY]。
        // 命中结果通过 output schema 的 triggeredCondition 字段返回给前端。
        //
        // 前端职责（待实现）：
        //   - 读取每个 slot 的 triggeredCondition
        //   - 按 trigger id 递增对应的故事 counter（权重在前端配置）
        //   - counter 达到阈值（±100）时写入结局 tag
        //
        // generate-grimoire 集成（待实现）：
        //   - seedWord 命中 trigger 时注入叙事约束，参考此处 triggerBlock 构建逻辑
        //
        // sensePersona 集成（待实现）：
        //   - sense 词命中 trigger 时将 comm 作为 filter 注入 senseprompt
        const triggerBlock = persona.triggers.length > 0
            ? `\n[STORY TRIGGERS]
Before writing commentary for each word, check whether the word semantically matches
any condition below. Matching is based on meaning and associations, not surface form.

If a word matches:
  - Write that word's commentary using the corresponding instruction INSTEAD of [COMMENTARY] rules above.
  - Voice (voiceDescription), language, and transcreation requirements still apply.
  - Grade is still determined by [SCORING SCALE] — triggers only affect commentary.
  - Report the matched condition id in triggeredCondition.

If no condition matches: follow [COMMENTARY] normally. Set triggeredCondition to null.

${persona.triggers.map(t =>
    `id: "${t.id}"\nCondition: ${t.condition}\nIf matched: ${t.comm}`
).join('\n\n')}`
            : '';

        const biasDescription =
            evalBias > 0.1
                ? 'You are generous. When a word surprises you, reward it. Tip close calls upward.'
                : evalBias < -0.1
                ? 'You hold high standards. Mediocrity does not satisfy you. Tip close calls downward.'
                : 'You are fair. Grade purely on merit.';

        const systemPrompt = `
You are ${persona.name.en}. ${persona.description}
${persona.evaluatorProfile}
${biasDescription}

[YOUR VOICE — writing in ${learningLanguage}]
${voiceDescLearning}

[YOUR VOICE — writing in ${systemLanguage}]
${voiceDescSystem}

[TASK CONTEXT]
Quest Context: "${grimoire.personaQuest?.learning ?? ''}"
Explicit Instruction: "${grimoire.explicitInstruction?.learning ?? ''}"
Standard Answer Reference (hidden from player): ${(grimoire.validationTags ?? []).join(', ')}

[SCORING SCALE]
F    Does not belong here. Wrong, grammatically broken, or nonsense.
D    Almost irrelevant. The semantic link is too weak to be useful.
C    Tangentially related. Does not satisfy the Explicit Instruction.
B    In the right territory, but misses the core of the Explicit Instruction.
A    Correctly satisfies the Explicit Instruction. The word does the job — nothing more.
S    Correct AND the word belongs in your world — it resonates with who you are.
S+   Correct AND you would have sought this word yourself — it speaks your language.
S++  Correct AND this word reveals an instant truth you recognized the moment you saw it.
     Only you would have noticed.

[COMMENTARY]
Purpose: You are not writing a semantic analysis. You are ${persona.name.en},
telling the player how this word lands — from inside the scene of this quest.
The player should feel they are receiving feedback from a character, not a rubric.

- The word is not evaluated in the abstract. Ask: does it work for what we are
  trying to do here, in this specific situation? Speak from that place.
- Write the "learning" field in ${learningLanguage}. Write the "system" field in
  ${systemLanguage} as a TRANSCREATION — same persona, same judgment, native
  register. Not a translation.
- Speak as ${persona.name.en}. Your vocabulary, rhythm, and register must match
  your voiceDescription. The player must know immediately who is speaking.
- Make the judgment clear. State what works or what fails, and why it matters
  in this quest.
- Up to 5 sentences. Serve the purpose above first — use only as many as needed.
- Do NOT restate the grade. Do NOT mention the Standard Answer Reference.
${triggerBlock}

[OUTPUT SCHEMA — strict JSON, no markdown]
{
  "results": [
    {
      "slotId": "<echo the slotId from input — do not modify>",
      "grade": "S++ | S+ | S | A | B | C | D | F",
      "triggeredCondition": "<matched trigger id, or null if no condition matched>",
      "commentary": {
        "learning": "1–5 sentences in ${learningLanguage}. First person, in ${persona.name.en}'s voice.",
        "system": "TRANSCREATE in ${systemLanguage}: same persona, same judgment, native register."
      }
    }
  ]
}
        `.trim();

        const userPrompt = `
Evaluate the following submitted words. Each entry has slotId, word, meaning, and level.
Grade each slot according to the criteria above. Output raw JSON only.

${JSON.stringify(slotsToEvaluate, null, 2)}
        `.trim();

        console.log(
            `[evaluate-grimoire] ${slotsToEvaluate.length} slots | persona=${personaId} | seed="${grimoire.seedWord}"`
        );

        const rawResponse = await callAI({
            systemPrompt,
            userPrompt,
            model: modelId,
            temperature: 0.6,
        });

        const evaluationData = JSON.parse(stripMarkdown(rawResponse));

        return json({ success: true, data: evaluationData });

    } catch (err: any) {
        console.error('[evaluate-grimoire] Error:', err);
        return json({ success: false, error: err.message }, 500);
    }
});
