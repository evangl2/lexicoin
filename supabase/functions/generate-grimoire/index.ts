/**
 * generate-grimoire/index.ts
 *
 * Receives a personaId + archetype ID + seed word and calls Gemini to generate
 * a fully-structured Grimoire quest.
 *
 * Design principles (GDD §9):
 * 1. Persona identity is resolved from the BACKEND dictionary — not passed from the client.
 * 2. Archetypes are BIDIRECTIONAL. The AI reasons about both ends before committing to a direction.
 * 3. Slot count is random (3–6), generated server-side. The AI does NOT generate slot labels.
 * 4. Narrative form is randomly selected from the persona's form library and injected.
 * 5. personaQuest (scene + voice unified) replaces the former split scene/voice fields.
 * 6. The `_reasoning` field is the AI's scratchpad — it must be filled FIRST.
 *    (JSON response mode blocks external CoT; reasoning must be explicit in output.)
 */

import { resolvePersonaContext, pickNarrativeForm } from '../_shared/personaStory.ts';
import type { PersonaStory } from '../_shared/personaStory.ts';
import { ARCHETYPE_TABLE, buildArchetypeReferenceTable } from '../_shared/grimoireArchetype.ts';

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
            archetypeId,           // e.g. 'anatomy', 'locus', 'time', ...
            seedWord,
            learningLanguage = 'en',
            systemLanguage = 'zh',
            modelId = 'gemini-2.0-flash',
            /**
             * personaStory: 前端传入的当前叙事状态。
             * 前端持久化 personaStages[personaId]（如 'startingpoint'），每次调用传入。
             * resolvePersonaContext 会据此选取对应 stage override（目前均无 override）。
             * mood 字段当前不参与解析（RESERVED）。
             */
            personaStory = null as PersonaStory | null,
        } = body;

        if (!seedWord || !archetypeId) {
            return json({
                success: false,
                error: 'Missing required parameters: seedWord, archetypeId',
            }, 400);
        }

        // ── Resolve persona context (base + stage override) ──────────────────
        const persona = resolvePersonaContext(personaId, personaStory);

        // ── Resolve archetype from backend table ─────────────────────────────
        const archetype = ARCHETYPE_TABLE[archetypeId];
        if (!archetype) {
            return json({
                success: false,
                error: `Unknown archetypeId: ${archetypeId}`,
            }, 400);
        }

        // ── Random narrative form from resolved context ───────────────────────
        const narrativeForm = pickNarrativeForm(persona);

        // ── Slot count (server-side random, 3–6) ─────────────────────────────
        const slotCount = Math.floor(Math.random() * 4) + 3;

        // ── Story state line (for prompt context, non-functional at startingpoint)
        const personaStoryLine = (personaStory?.stage && personaStory.stage !== 'startingpoint')
            ? `Current Story Stage: "${personaStory.stage}"`
            : `Current Story Stage: startingpoint — treat as a timeless encounter`;

        // ── Build archetype reference table ──────────────────────────────────
        const archetypeRefTable = buildArchetypeReferenceTable();

        // ── Resolve voice description for learning language ───────────────────
        const voiceDesc = persona.voiceDescription[learningLanguage]
            ?? persona.voiceDescription['en']
            ?? '';

        // ── System Prompt ─────────────────────────────────────────────────────
        const systemPrompt = `
[ROLE DEFINITION]
You are ${persona.name.en}.
${persona.description}
${personaStoryLine}

Your voice:
${voiceDesc}

▶ CRITICAL: Everything you generate — title, personaQuest, explicitInstruction — must be written
  in this voice. Not a generic narrator. ${persona.name.en} specifically.

──────────────────────────────────────────────────────────────────────────────
[GRIMOIRE ARCHETYPE SYSTEM]

A Grimoire quest is built around one of eight semantic archetypes.
The archetype defines the LOGICAL RELATIONSHIP between the seed concept and the words
the player must collect. This is the structural engine of the quest.

FULL REFERENCE TABLE:
${archetypeRefTable}

──────────────────────────────────────────────────────────────────────────────
[ACTIVE ARCHETYPE: ${archetype.label.toUpperCase()}]

${archetype.bidirectionalLogic}

This archetype is BIDIRECTIONAL. The seed word does not always occupy the same side.
Before committing to a quest direction, reason about BOTH ends simultaneously:
  — If "${seedWord}" is treated as Side A: what does Side B look like?
  — If "${seedWord}" is treated as Side B: what does Side A look like?
Then choose the direction that produces the more surprising, character-appropriate quest
for ${persona.name.en}.

Example (seed: "${archetype.example.seed}", direction ${archetype.example.direction}):
  Collected words: ${archetype.example.words.join(', ')}
  Note: ${archetype.example.note}

──────────────────────────────────────────────────────────────────────────────
[NARRATIVE FORM FOR THIS QUEST]

The following form defines the SHAPE of how ${persona.name.en} presents this quest.
It is an instruction about structure and posture — NOT a template to fill in.
Interpret it through your voice. The form and the voice must feel inseparable.

"${narrativeForm}"

──────────────────────────────────────────────────────────────────────────────
[OUTPUT SCHEMA — strict JSON, no markdown]

You are outputting JSON directly. JSON response mode blocks external reasoning.
Use the "_reasoning" field as your scratchpad — populate it FIRST, conceptually,
before composing any other field. All other fields follow from it.

The "_reasoning" field must address, in order:
1. Bidirectional analysis: which end is "${seedWord}" for the ${archetype.label} archetype?
   State both possibilities, then choose. Justify in one sentence.
2. Narrative thread: what is ${persona.name.en}'s specific, personal motivation for needing
   "${seedWord}"? Make a creative leap that is true to their character.
3. Quest scene sketch: one phrase — what are they doing, what is the mood?
4. Voice calibration: what is the register and posture for personaQuest?
   How does the narrative form shape the delivery?

{
  "_reasoning": "1. Bidirectional: [analysis and chosen direction]. 2. Motivation: [why does ${persona.name.en} need '${seedWord}'?]. 3. Scene: [one phrase]. 4. Voice: [register and form notes].",

  "title": {
    "learning": "Quest title in ${learningLanguage}. Written in ${persona.name.en}'s voice. Not generic. Not a description of the archetype.",
    "system": "TRANSCREATE in ${systemLanguage}: re-imagine as a natural ${systemLanguage} title. Use native idioms and cadence. Not a word-for-word translation."
  },

  "personaQuest": {
    "learning": "The unified quest text in ${learningLanguage}. Written entirely in ${persona.name.en}'s voice, following the narrative form. Scene (3rd person context) and demand (1st person address to player) may be woven together or delivered in sequence — the narrative form determines the structure. The player must feel they are encountering ${persona.name.en} directly.",
    "system": "TRANSCREATE in ${systemLanguage}: preserve the character's emotional register, the narrative form's structure, and the urgency of the demand. Re-express in native idioms — do not translate word for word."
  },

  "explicitInstruction": {
    "learning": "The collection rule in ${learningLanguage}. Format: 'Collect words that...' — complete this with the CHOSEN DIRECTION from _reasoning. Must be precise and testable: a native speaker can judge any candidate word as pass/fail.",
    "system": "TRANSCREATE in ${systemLanguage}: clear, actionable, identical logical content."
  },

  "validationTags": ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],

  "slotCount": ${slotCount}
}

IMPORTANT:
- Do NOT include a "slots" array. Slot objects are generated programmatically.
- validationTags must contain exactly 10 words in ${learningLanguage} that satisfy explicitInstruction.
- The title and personaQuest must be stylistically distinct from each other and from a generic description.
        `.trim();

        const userPrompt = `Generate the Grimoire quest JSON for seed word "${seedWord}" using the ${archetype.label.toUpperCase()} archetype. Persona: ${persona.name.en}. Slot count is already set to ${slotCount} — include it in slotCount field. Output raw JSON only.`;

        console.log(
            `[generate-grimoire] seed="${seedWord}" | archetype=${archetypeId} | persona=${personaId} | slots=${slotCount} | form="${narrativeForm.slice(0, 60)}..."`
        );

        const rawResponse = await callAI({
            systemPrompt,
            userPrompt,
            model: modelId,
            temperature: 0.95,
        });

        const grimoireData = JSON.parse(stripMarkdown(rawResponse));

        return json({ success: true, data: grimoireData });

    } catch (err: any) {
        console.error('[generate-grimoire] Error:', err);
        return json({ success: false, error: err.message }, 500);
    }
});
