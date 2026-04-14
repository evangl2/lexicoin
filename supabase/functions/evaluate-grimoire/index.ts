/**
 * evaluate-grimoire/index.ts
 * 
 * 职责：接收填充了词语的魔典槽位，调用 AI 进行分项评判。
 * 遵循 GDD §9.3 规范。
 */

import { createClient } from 'npm:@supabase/supabase-js';

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

/** Strip markdown code fences */
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
                response_mime_type: 'application/json'
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            grimoire,
            slotsToEvaluate, // 仅传入需要评级的槽位 (WBS §9.4)
            learningLanguage = 'en',
            systemLanguage = 'zh',
            modelId = 'gemini-1.5-flash'
        } = body;

        if (!grimoire || !slotsToEvaluate) {
            return json({ success: false, error: 'Missing required parameters' }, 400);
        }

        // 3. Build Evaluation Prompt
        const systemPrompt = `
[ROLE DEFINITION]
You are ${grimoire.persona.name}. 
Archetype: ${grimoire.persona.description}
Tone: ${grimoire.persona.evalPrompt || "Analytical and critical."}

[CONTEXT]
- Explicit Instruction: "${grimoire.theme.explicitInstruction.learning}"
- Design Rationale: "${grimoire.designRationale}"
- Validation Reference: ${grimoire.validationTags.join(', ')}

[GRADING CRITERIA]
1. Relevance: Strictly follows ExplicitInstruction?
2. Creativity: Deep, poetic, or unexpected connections?
3. Persona Bias: Matches your specific archetype preference?

[SCORING]
- S++ / S+: Perfect fit. Deep semantic connection.
- S / A: Strong connection, logical.
- B / C: Weak/Generative connection.
- D / F: Irrelevant or wrong category.

[OUTPUT SCHEMA]
Return a JSON object:
{
  "results": [
    {
      "slotId": "uuid",
      "grade": "S | A | B | C | D | F",
      "commentary": {
        "learning": "First-person critique in ${learningLanguage}",
        "system": "TRANSCREATE: Native ${systemLanguage} version of the critique"
      }
    }
  ]
}
        `.trim();

        const userPrompt = `
Evaluate these slots:
${JSON.stringify(slotsToEvaluate, null, 2)}
Output raw JSON only.
        `.trim();

        // 4. Call AI
        console.log(`[evaluate-grimoire] Evaluating ${slotsToEvaluate.length} slots for ${grimoire.id}`);
        const rawResponse = await callAI({
            systemPrompt,
            userPrompt,
            model: modelId,
            temperature: 0.5 // Lower temp for consistent grading
        });

        const evaluationData = JSON.parse(stripMarkdown(rawResponse));

        return json({
            success: true,
            data: evaluationData
        });

    } catch (err: any) {
        console.error('[evaluate-grimoire] Error:', err);
        return json({ success: false, error: err.message }, 500);
    }
});
