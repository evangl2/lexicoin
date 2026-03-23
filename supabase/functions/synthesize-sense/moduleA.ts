import { callGemini } from './utils/gemini.ts';
import { buildSensePrompt } from './lib/SensePromtBackend.ts';
import { buildVisualPrompt } from './lib/VisualPromptsBackend.ts';
import { injectSenseMeta } from './lib/injectSenseMeta.ts';
import type { RawSenseAIOutput, SenseAIPayload, SynthesisRequest } from './types.ts';

/** Strip any markdown code fences Gemini might wrap around JSON or TSX */
function stripMarkdown(raw: string): string {
    return raw.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim();
}

/** Parse Gemini JSON output safely */
function parseGeminiJson<T>(rawText: string): T {
    return JSON.parse(stripMarkdown(rawText)) as T;
}

/**
 * Validate TSX visual payload for safety constraints.
 * Returns true only if all rules pass.
 */
function validateVisualPayload(payload: string): string | null {
    if (!payload.includes('export default')) return 'missing export default';
    if (payload.includes('useEffect')) return 'contains forbidden hook: useEffect';
    if (payload.includes('useState')) return 'contains forbidden hook: useState';
    if (payload.includes('useRef')) return 'contains forbidden hook: useRef';
    if (!payload.includes("from 'motion/react'") && !payload.includes('from "motion/react"')) return "missing import from 'motion/react'";
    if (payload.length < 200) return `length ${payload.length} < 200`;
    if (payload.length > 20_000) return `length ${payload.length} > 20000`;
    return null;
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
    supabaseAdmin: any
): Promise<{ sense: SenseAIPayload & { uid: string }; visual: null }> {
    const {
        max_level = 'B2',
        target_languages = ['en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'],
        personaId = 'default',
        personaNarrative,
        visual_id = 'default',
    } = request;

    // ① Generate UUID via Web Crypto (available in Deno Edge Functions)
    const uid = crypto.randomUUID();

    // ② Build and call SensePrompt
    const { systemPrompt, userPrompt } = buildSensePrompt({
        concept,
        definition,
        target_languages,
        personaId,
        personaNarrative,
    });

    const t10 = Date.now();
    const aiRawText = await callGemini({
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxTokens: 10000,
        responseMimeType: 'application/json',
        tag: 'moduleA-sense',
    });
    console.log(`[TIMING] 10_moduleA_gemini took ${Date.now() - t10}ms`);

    // ③ Parse AI output and inject meta
    let rawJson: RawSenseAIOutput;
    try {
        rawJson = parseGeminiJson<RawSenseAIOutput>(aiRawText);
    } catch (err) {
        console.error('[moduleA] Failed to parse SensePrompt JSON output:', aiRawText.slice(0, 500));
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
    console.log('[moduleA] senses INSERT ok:', uid);

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
    console.log('[moduleA] sense_word_shells INSERT ok');

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
            console.log(`[moduleA] sense_flavor_texts INSERT ok (${flavorInserts.length} personas)`);
        }
    }

    // ⑤ Return immediately with visual: null (VisualPrompt is non-blocking)
    const result = { sense: { ...sensePayload, uid }, visual: null } as const;

    // ⑥ Fire-and-forget: async visual generation (kept alive by EdgeRuntime.waitUntil)
    const visualTask = (async () => {
        try {
            const { systemPrompt: vSys, userPrompt: vUser } = buildVisualPrompt({
                concept,
                definition,
                visualId: visual_id,
            });

            const t14 = Date.now();
            const visualRawText = await callGemini({
                systemPrompt: vSys,
                userPrompt: vUser,
                temperature: 0.6,
                maxTokens: 6000,
                responseMimeType: 'text/plain',
                tag: 'moduleA-visual',
            });
            console.log(`[TIMING] 14_visual_gemini took ${Date.now() - t14}ms`);

            // Extract TSX code after the delimiter
            const parts = visualRawText.split('// --- CODE BELOW ---');
            let code = (parts.length > 1 ? parts[1] : visualRawText).trim();
            code = stripMarkdown(code);

            const visualErr = validateVisualPayload(code);
            if (visualErr) {
                console.warn('[moduleA] Visual validation failed:', visualErr);
                return;
            }

            const { error: visErr } = await supabaseAdmin.from('sense_visuals').insert({
                sense_id: uid,
                id: visual_id,
                payload: code,
                meta: {
                    stability: 50.0,
                    firstDiscoverer: discovererUserId,
                    firstDiscoveredAt: now,
                },
            });

            if (visErr) {
                console.error('[moduleA] sense_visuals INSERT error (async, non-fatal):', visErr);
            } else {
                console.log(`[TIMING] 15_visual_insert done (took ${Date.now() - t14}ms since visual_gemini start)`);
            }
        } catch (e) {
            console.error('[moduleA] Visual async task failed (non-fatal):', e);
        }
    })();
    (globalThis as any).EdgeRuntime?.waitUntil(visualTask);

    return result;
}
