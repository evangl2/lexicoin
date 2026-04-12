/**
 * generate-grimoire/index.ts
 * 
 * 职责：接收种子 Sense 和角色信息，调用 AI 生成魔典结构（标题、叙事、槽位、验证标签）。
 * 遵循 GDD §9 规范。
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

/** 
 * V1 Mock/Ready CallAI Logic (Simplified for self-contained index)
 * In a real deployment, this would use a shared module.
 */
async function callAI(params: {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
}) {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    // Use fetch directly for simplicity in index.ts
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
    // 1. Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            persona,
            grimoireType,
            seedSense,
            targetLevel = 'A1',
            learningLanguage = 'en',
            systemLanguage = 'zh',
            modelId = 'gemini-1.5-flash'
        } = body;

        // 2. Validate Inputs (V1)
        if (!seedSense || !persona || !grimoireType) {
            return json({ success: false, error: 'Missing required parameters' }, 400);
        }

        // 3. Build Prompts (V1 - Mock/Placeholder logic based on GDD)
        const seedWord = seedSense.shells?.[learningLanguage]?.[0]?.text ?? "concept";
        
        const systemPrompt = `
[ROLE DEFINITION]
You are ${persona.name}. 
Archetype: ${persona.description}
Tone: ${persona.genPrompt || "Enigmatic and demanding."}

[TASK]
Create a Grimoire (quest book) based on the seed "${seedWord}" and logic "${grimoireType.logic}".
Level: ${targetLevel}.
Languages: ${learningLanguage} (learning) and ${systemLanguage} (system).

[OUTPUT SCHEMA]
{
  "_designRationale": "Explain the logic for the evaluator.",
  "title": { "learning": "...", "system": "..." },
  "description": { "learning": "...", "system": "..." },
  "explicitInstruction": { "learning": "...", "system": "..." },
  "slots": [ { "label": "..." } ],
  "validationTags": ["...", "...", "..."]
}
        `.trim();

        const userPrompt = `Generate the Grimoire JSON for "${seedWord}". Output raw JSON only.`;

        // 4. Call AI
        console.log(`[generate-grimoire] Calling AI for seed: ${seedWord}`);
        const rawResponse = await callAI({
            systemPrompt,
            userPrompt,
            model: modelId,
            temperature: 1.1
        });

        const grimoireData = JSON.parse(stripMarkdown(rawResponse));

        // 5. Final Assembly (Inject system-level metadata)
        const responsePayload = {
            success: true,
            data: {
                ...grimoireData,
                status: 'ACTIVE',
                createdAt: Date.now(),
                personaType: persona.id.toUpperCase(),
                seedSenseUid: seedSense.uid
            }
        };

        return json(responsePayload);

    } catch (err: any) {
        console.error('[generate-grimoire] Error:', err);
        return json({ success: false, error: err.message }, 500);
    }
});
