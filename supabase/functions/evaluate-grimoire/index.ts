/**
 * evaluate-grimoire/index.ts
 *
 * Receives filled Grimoire slots and calls Gemini to grade each one.
 * Persona identity (bias, affinityTags, evalPrompt) is resolved from the BACKEND dictionary.
 * Based on GDD §9.3.
 */

import { getPersona } from '../lib/personaDictionary.ts';

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

        // ── Resolve persona from backend dictionary ───────────────────────────
        const persona = getPersona(personaId);
        const evalBias: number = persona.evalBias;
        const affinityTags: string[] = persona.affinityTags;

        const biasLabel =
            evalBias > 0.1  ? 'LENIENT' :
            evalBias < -0.1 ? 'STRICT'  : 'NEUTRAL';

        const biasDescription =
            evalBias > 0.1
                ? 'You are generous. When a word surprises you, reward it. Tip close calls upward.'
                : evalBias < -0.1
                ? 'You hold high standards. Mediocrity does not satisfy you. Tip close calls downward.'
                : 'You are fair. Grade purely on merit.';

        const systemPrompt = `
[ROLE DEFINITION]
You are ${persona.name.en}.
${persona.description}
Your evaluation voice: ${persona.evalPrompt}

[YOUR BIAS]
Disposition: ${biasLabel} (${evalBias > 0 ? '+' : ''}${evalBias})
${biasDescription}
Affinity: You especially value words that are [${affinityTags.join(', ')}].
When two grades are equally justified, let your affinity decide.

[CONTEXT]
Seed Concept: "${grimoire.seedWord ?? ''}"
Archetype: ${grimoire.grimoireType ?? ''}
Explicit Instruction: "${grimoire.explicitInstruction?.learning ?? ''}"
Design Rationale: "${grimoire.designRationale ?? ''}"
Standard Answer Reference (hidden from player): ${(grimoire.validationTags ?? []).join(', ')}

[GRADING CRITERIA — apply in order]
1. Relevance: Does the word strictly follow the Explicit Instruction?
2. Creativity: Is the connection surprising, precise, or poetic?
3. Persona Bias: Apply your disposition and affinity as the tiebreaker.

[SCORING SCALE]
S++  Inspired. Fulfills the task AND reveals unexpected depth. You are genuinely moved.
S+   Fits perfectly and shows clear creative thinking.
S    Clearly and correctly fulfills the task.
A    Fits but is predictable or lacks depth.
B    Loosely fits. A native speaker might use it, but it misses the core logic.
C    Tangentially related. Misses the explicit rule but not entirely off-topic.
D    Very weak semantic link. Almost wrong.
F    Irrelevant, grammatically wrong, or nonsense. Must be replaced.

[COMMENTARY RULES]
- Length: 1–2 sentences maximum. No more.
- Voice: First person. Write as ${persona.name.en} — use their vocabulary and emotional register.
- Content: State what impressed you OR what is lacking. Do not restate the grade.
- Language note: Briefly indicate WHY this word fits or doesn't in this semantic context.
- Do NOT mention the Standard Answer Reference in your commentary.

[OUTPUT SCHEMA — strict JSON, no markdown]
{
  "results": [
    {
      "slotId": "uuid",
      "grade": "S++ | S+ | S | A | B | C | D | F",
      "commentary": {
        "learning": "First-person critique in ${learningLanguage}. 1-2 sentences. Language note included.",
        "system": "TRANSCREATE in ${systemLanguage}: same voice, same judgment, native register. Not a translation."
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
