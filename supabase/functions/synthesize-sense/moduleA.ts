import { callAI } from './utils/callAI.ts';
import { buildSensePrompt } from './lib/SensePromtBackend.ts';
import { injectSenseMeta } from './lib/injectSenseMeta.ts';
import type { RawSenseAIOutput, SenseAIPayload, SynthesisRequest } from './types.ts';

/** Strip any markdown code fences Gemini might wrap around JSON or TSX */
function stripMarkdown(raw: string): string {
    return raw.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim();
}

/**
 * Extract the JSON object/array from text that may have surrounding prose.
 * Uses bracket depth tracking to find the exact end of the first complete
 * JSON object/array, avoiding truncation bugs from lastIndexOf.
 */
function extractJson(raw: string): string {
    const start = raw.search(/[{[]/);
    if (start === -1) return raw;

    const opener = raw[start] as '{' | '[';
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < raw.length; i++) {
        const ch = raw[i]!;
        if (escaped) { escaped = false; continue; }
        if (ch === '\\' && inString) { escaped = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === opener) depth++;
        else if (ch === closer) {
            depth--;
            if (depth === 0) return raw.slice(start, i + 1);
        }
    }

    // Fallback: return from start to end of string
    return raw.slice(start);
}

/**
 * Repair malformed JSON produced by Gemini:
 * - Removes trailing commas before } or ] (e.g. {"a":1,})
 * - Escapes literal control characters (U+0000–U+001F) inside string values
 * - Fixes invalid escape sequences (e.g. \s, \, → \\s, \\,)
 */
function repairJsonString(raw: string): string {
    // Pass 1: remove trailing commas
    let result = raw.replace(/,(\s*[}\]])/g, '$1');

    // Pass 2: fix escape sequences and control characters
    const VALID_ESCAPE = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
    let fixed = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < result.length; i++) {
        const ch = result[i]!;
        const code = ch.charCodeAt(0);
        if (escaped) {
            if (inString && !VALID_ESCAPE.has(ch)) fixed += '\\';
            fixed += ch;
            escaped = false;
        } else if (ch === '\\' && inString) {
            fixed += ch;
            escaped = true;
        } else if (ch === '"') {
            fixed += ch;
            inString = !inString;
        } else if (inString && code < 0x20) {
            if (code === 0x0A) fixed += '\\n';
            else if (code === 0x0D) fixed += '\\r';
            else if (code === 0x09) fixed += '\\t';
            else if (code === 0x08) fixed += '\\b';
            else if (code === 0x0C) fixed += '\\f';
            else fixed += `\\u${code.toString(16).padStart(4, '0')}`;
        } else {
            fixed += ch;
        }
    }
    return fixed;
}

/** Parse Gemini JSON output safely, with repair for common malformations */
function parseGeminiJson<T>(rawText: string): T {
    return JSON.parse(repairJsonString(extractJson(stripMarkdown(rawText)))) as T;
}


/**
 * Module A: Full Sense generation flow.
 *
 * ① Generate UID
 * ② Call SensePrompt → AI returns raw JSON
 * ③ injectSenseMeta() → wrap all values in { value, meta }
 * ④ Write senses, sense_word_shells, sense_flavor_texts (blocking)
 * ⑤ Return immediately with visual: null
 * ⑥ Fire-and-forget: VisualPrompt → validate → write sense_visuals
 */
export async function generateSense(
    concept: string,
    definition: string,
    request: SynthesisRequest,
    discovererUserId: string,
    supabaseAdmin: any,
    corrId = 'unknown',
): Promise<{ sense: SenseAIPayload & { uid: string }; visual: null }> {
    const {
        learninglang,
        max_level = 'B2',
        target_languages = ['en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'],
        personaId = 'default',
        personaNarrative,
        visual_id = 'default',
        modelId,
    } = request;

    // ① Generate UUID via Web Crypto (available in Deno Edge Functions)
    const uid = crypto.randomUUID();

    // ② Build and call SensePrompt
    const { systemPrompt, userPrompt } = buildSensePrompt({
        concept,
        definition,
        target_languages,
        learningLang: learninglang,
        personaId,
        maxLevel: max_level,
        personaNarrative,
    });

    const t10 = Date.now();
    const aiRawText = await callAI({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        responseMimeType: 'application/json',
        tag: 'moduleA-sense',
        model: modelId,
    });
    console.log(`[corr:${corrId}][TIMING] 10_moduleA_gemini took ${Date.now() - t10}ms`);

    // ③ Parse AI output and inject meta
    let rawJson: RawSenseAIOutput;
    try {
        rawJson = parseGeminiJson<RawSenseAIOutput>(aiRawText);
    } catch (err) {
        console.error('[moduleA] Failed to parse SensePrompt JSON output. Error:', err instanceof Error ? err.message : String(err));
        console.error('[moduleA] Full raw output:', aiRawText);
        throw new Error('GENERATION_FAILED');
    }

    const sensePayload: SenseAIPayload = injectSenseMeta(rawJson);

    const now = Date.now();

    // ④-A Write senses table
    // DB columns: uid, fingerprint (jsonb), ontology (jsonb), meaning (jsonb), frequency (jsonb), word_family (jsonb)
    // fingerprint and ontology/frequency are stored as their full injected shapes
    const { error: senseError } = await supabaseAdmin.from('senses').insert({
        uid,
        fingerprint: sensePayload.fingerprint,      // { items: [...] }
        ontology: sensePayload.ontology,            // { value, meta }
        meaning: Object.fromEntries(               // { lang: { value, meta } }
            Object.entries(sensePayload.meaning).map(([k, v]) => [k, v])
        ),
        frequency: sensePayload.frequency,          // { value, meta }
        word_family: sensePayload.wordFamily,       // { lang: { root, derivations, meta } }
    });

    if (senseError) {
        console.error('[moduleA] senses INSERT error:', senseError);
        throw new Error('GENERATION_FAILED');
    }
    console.log(`[corr:${corrId}][moduleA] senses INSERT ok:`, uid);

    // ④-B Write sense_word_shells table (single row per sense, shells=JSONB, traits=JSONB)
    const { error: shellsError } = await supabaseAdmin.from('sense_word_shells').insert({
        sense_id: uid,
        shells: sensePayload.shells,                // { lang: [InjectedShell] }
        traits: sensePayload.traits ?? null,        // { lang: [InjectedTrait] } or null
    });

    if (shellsError) {
        console.error('[moduleA] sense_word_shells INSERT error:', shellsError);
        throw new Error('GENERATION_FAILED');
    }
    console.log(`[corr:${corrId}][moduleA] sense_word_shells INSERT ok`);

    // ④-C Write sense_flavor_texts table (one row per persona)
    if (sensePayload.flavorText.length > 0) {
        // Deduplicate by persona — AI occasionally returns duplicate persona entries
        const seenPersonas = new Set<string>();
        const flavorInserts = sensePayload.flavorText
            .filter((flavor) => {
                if (seenPersonas.has(flavor.persona)) return false;
                seenPersonas.add(flavor.persona);
                return true;
            })
            .map((flavor) => ({
                sense_id: uid,
                persona: flavor.persona,
                text: flavor.text,       // { lang: { value, meta } } — column name is "text"
                example: flavor.example, // { lang: { value, meta } } — column name is "example"
            }));

        const { error: flavorError } = await supabaseAdmin.from('sense_flavor_texts').insert(flavorInserts);
        if (flavorError) {
            console.error('[moduleA] sense_flavor_texts INSERT error (non-fatal):', flavorError);
        } else {
            console.log(`[corr:${corrId}][moduleA] sense_flavor_texts INSERT ok (${flavorInserts.length} personas)`);
        }
    }

    // ⑤ Return immediately with visual: null (VisualPrompt is non-blocking)
    const result = { sense: { ...sensePayload, uid }, visual: null } as const;

    // ⑥ Fire-and-forget: delegate visual generation to generate-visual function
    //    (gives it an independent 150s wall-clock budget, free of this function's remaining time)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log(`[corr:${corrId}][moduleA] invoking generate-visual (fire-and-forget) sense=${uid} visual=${visual_id}`);
    const visualFetch = fetch(`${supabaseUrl}/functions/v1/generate-visual`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
        },
        body: JSON.stringify({
            sense_id: uid,
            visual_id,
            concept,
            definition,
            discoverer_user_id: discovererUserId,
            model_id: modelId,
            corr_id: corrId,
        }),
    }).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[moduleA] generate-visual invoke failed (non-fatal): ${msg}`);
    });
    (globalThis as any).EdgeRuntime?.waitUntil(visualFetch);

    return result;
}
