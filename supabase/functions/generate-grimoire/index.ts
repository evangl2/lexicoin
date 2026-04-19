/**
 * generate-grimoire/index.ts
 *
 * Receives personaId + archetypeId + seedWord + targetLevel and calls Gemini to generate
 * a fully-structured Grimoire quest.
 *
 * Design principles (GDD §9):
 * 1. Persona identity resolved from backend dictionary — not passed from client.
 * 2. Archetypes are BIDIRECTIONAL. AI reasons about both ends before committing.
 * 3. Slot count random (3–6), server-side. AI does NOT generate slot labels.
 * 4. personaQuest is shaped by TWO forces:
 *      - persona voice  — governs ONLY the persona's own speech / inner state
 *      - narrativeForm  — governs the scene, other characters, structure, pacing
 * 5. title and explicitInstruction are in neutral prose — no persona voice.
 * 6. _reasoning is scratchpad, filled first.
 * 7. responseSchema enforces output structure at the API level.
 */

import { resolvePersonaContext, pickNarrativeForm } from '../_shared/personaStory.ts';
import type { PersonaStory } from '../_shared/personaStory.ts';
import { ARCHETYPE_TABLE } from '../_shared/grimoireArchetype.ts';
import { callAI } from '../_shared/callAI.ts';

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

// ── Gemini responseSchema for hard structural enforcement ─────────────────────
const bilingualSchema = {
    type: 'OBJECT',
    properties: {
        learning: { type: 'STRING' },
        system:   { type: 'STRING' },
    },
    required: ['learning', 'system'],
};

const RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        _reasoning:           { type: 'STRING' },
        title:                bilingualSchema,
        personaQuest:         bilingualSchema,
        explicitInstruction:  bilingualSchema,
        validationTags: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            minItems: 10,
            maxItems: 10,
        },
        slotCount: { type: 'INTEGER' },
    },
    required: ['_reasoning', 'title', 'personaQuest', 'explicitInstruction', 'validationTags', 'slotCount'],
};

// callAI is now imported from '../_shared/callAI.ts'

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            personaId = 'CHILD',
            archetypeId,
            seedWord,
            // targetLevel forwarded by frontend for future tuning; not embedded in prompt.
            learningLanguage = 'en',
            systemLanguage = 'zh',
            modelId = 'gemini-3.1-flash-lite-preview',
            personaStory = null as PersonaStory | null,
        } = body;

        if (!seedWord || !archetypeId) {
            return json({
                success: false,
                error: 'Missing required parameters: seedWord, archetypeId',
            }, 400);
        }

        // ── Resolve persona context ───────────────────────────────────────────
        const persona = resolvePersonaContext(personaId, personaStory);

        // ── Resolve archetype ─────────────────────────────────────────────────
        const archetype = ARCHETYPE_TABLE[archetypeId];
        if (!archetype) {
            return json({ success: false, error: `Unknown archetypeId: ${archetypeId}` }, 400);
        }

        // ── Server-side randomness ────────────────────────────────────────────
        const narrativeForm = pickNarrativeForm(persona);
        const slotCount = Math.floor(Math.random() * 4) + 3;   // 3–6

        // ── Story stage line (omit at startingpoint to avoid over-constraining) ─
        const storyLine = (personaStory?.stage && personaStory.stage !== 'startingpoint')
            ? `\nCurrent story stage: "${personaStory.stage}"`
            : '';

        // ── Voice description for learning language ───────────────────────────
        const voiceDesc = persona.voiceDescription[learningLanguage]
            ?? persona.voiceDescription['en']
            ?? '';

        // ── Bidirectional examples (both A→B and B→A) ────────────────────────
        const [exA, exB] = archetype.examples;

        // ── System Prompt ─────────────────────────────────────────────────────
        const systemPrompt = `
# ROLE
You are ${persona.name.en}.
${persona.description}${storyLine}

# GLOBAL RULES
1. TRANSCREATE, never translate: for every "system" field, ask yourself what a native ${systemLanguage}
   speaker would naturally say to convey the same feeling or idea. Find that expression — do not map
   English words to ${systemLanguage} words. A different image, a different structure, the same soul.
2. validationTags must be in ${learningLanguage} only.
3. Output raw JSON. No markdown fences.

# TASK
Word: "${seedWord}"
Archetype: ${archetype.label.toUpperCase()}

Relationship logic:
${archetype.bidirectionalLogic}

Bidirectional thinking — before committing, consider BOTH directions:
  — Treating "${seedWord}" as Side A: what does Side B look like?
  — Treating "${seedWord}" as Side B: what does Side A look like?
Choose the direction that yields the richer, more unexpected quest.

Examples (orientation only — not templates):
  ${exA.direction}:  seed "${exA.seed}"  →  ${exA.words.slice(0, 5).join(', ')}
      ${exA.note}
  ${exB.direction}:  seed "${exB.seed}"  →  ${exB.words.slice(0, 5).join(', ')}
      ${exB.note}

# PERSONA QUEST — TWO SHAPING FORCES

personaQuest is a short narrative scene — a small moment the player walks into, already in progress.
The need for these words must emerge FROM THE SCENE. Never stated directly as "find me words that…".
The player understands what is needed by inhabiting the moment, not by being told.

Two forces shape personaQuest, with non-overlapping scope:

(A) ${persona.name.en}'s voice  — applies ONLY to ${persona.name.en}'s own dialogue and inner state.
    Everything ${persona.name.en} says or thinks follows this voice. Nothing else does.

    ${persona.name.en}'s voice:
${voiceDesc.split('\n').map((l) => '    ' + l).join('\n')}

(B) Narrative form  — governs everything that is NOT ${persona.name.en}'s own utterance:
    scene-setting, other characters' speech and presence, atmosphere, pacing, structure,
    what kind of moment this is, how it opens and closes.

    Narrative form for this quest:
    "${narrativeForm}"

The scene should feel substantial — several sentences, texture, stakes, a sense of what came before.
Not a single line. Not a direct question. A moment.

# OUTPUT SCHEMA

Fill _reasoning first (scratchpad). All other fields follow from it.

_reasoning must address, in order:
1. Bidirectional analysis: which end is "${seedWord}"? State both options, choose one, justify in one sentence.
2. Collection logic: given the chosen direction, what exactly are the words being collected?
   Be specific — what semantic territory do they occupy? What makes a word pass vs. fail?
3. Scene conception: now that the collection logic is fixed, what moment naturally contains these
   words as live, present things — not as concepts to be listed, but as textures of the scene itself?
   Who/what else is present besides ${persona.name.en}? What is the atmosphere, the implied backstory?
   (Shaped by the narrative form.)
4. Voice calibration: what does ${persona.name.en} actually say or think here? How does the
   narrative form arrange the rest of the scene around those specific utterances?

{
  "_reasoning": "1. [bidirectional + chosen direction]. 2. [collection logic + pass/fail test]. 3. [scene, who else, atmosphere, backstory]. 4. [persona utterances + how form shapes the rest].",

  "title": {
    "learning": "Quest title in ${learningLanguage}. Neutral, evocative prose. Not in ${persona.name.en}'s voice. Not a description of the archetype.",
    "system": "TRANSCREATE in ${systemLanguage}. A title a native ${systemLanguage} reader would find natural and evocative."
  },

  "explicitInstruction": {
    "learning": "Objective collection rule in neutral prose. Format: 'Collect words that...' — complete with the chosen direction from _reasoning. Precise and testable: a native ${learningLanguage} speaker can judge any candidate as pass/fail without ambiguity. Not in ${persona.name.en}'s voice.",
    "system": "TRANSCREATE in ${systemLanguage}: convey the same logical rule with equal precision."
  },

  "validationTags": ["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10"],

  "personaQuest": {
    "learning": "A substantial narrative scene in ${learningLanguage}. Several sentences — texture, atmosphere, stakes. ${persona.name.en}'s own speech and inner state follow their voice; everything else (scene, other characters, pacing) follows the narrative form. The collection need is woven into the scene — implied, never announced.",
    "system": "Write this scene fresh in ${systemLanguage}. Let the setting breathe in ${systemLanguage}. ${persona.name.en}'s lines should sound like how a ${systemLanguage}-speaking version of this character would actually speak — find the equivalent register and idiom, do not render English phrases into ${systemLanguage} words. The scene structure may shift to feel natural to a ${systemLanguage} reader."
  },

  "slotCount": ${slotCount}
}

CONSTRAINTS:
- validationTags: exactly 10 ${learningLanguage} words satisfying explicitInstruction. Each word must be unambiguous — if the word could satisfy a different rule equally well, replace it.
- Do NOT include a "slots" array.
- title, explicitInstruction, and personaQuest must each have a distinct register.
        `.trim();

        const userPrompt = `Generate the Grimoire quest JSON for the word "${seedWord}" using the ${archetype.label.toUpperCase()} archetype. Persona: ${persona.name.en}. slotCount is already set to ${slotCount} — include it verbatim. Output raw JSON only.`;

        console.log(
            `[generate-grimoire] word="${seedWord}" | archetype=${archetypeId} | persona=${personaId} | slots=${slotCount} | form="${narrativeForm.slice(0, 60)}..."`
        );

        const rawResponse = await callAI({
            systemPrompt,
            userPrompt,
            model: modelId,
            temperature: 0.95,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            tag: 'generate-grimoire',
        });

        const grimoireData = JSON.parse(stripMarkdown(rawResponse));

        return json({ success: true, data: grimoireData });

    } catch (err: any) {
        console.error('[generate-grimoire] Error:', err);
        return json({ success: false, error: err.message }, 500);
    }
});
