/**
 * Edge Function: generate-visual
 *
 * Generates a TSX visual component for a given sense and writes it to sense_visuals.
 * Called as a fire-and-forget invocation by synthesize-sense (moduleA / delta-visual paths)
 * so that visual generation has its own independent 150s wall-clock budget.
 *
 * Request body (POST JSON):
 *   sense_id          string  — UUID of the sense to attach the visual to
 *   visual_id         string  — visual variant key (e.g. "default", "cyberpunk")
 *   concept           string  — English word / concept
 *   definition        string  — English definition
 *   discoverer_user_id string — user ID of the first discoverer
 *   model_id?         string  — optional Gemini model override
 */

import { createClient } from 'npm:@supabase/supabase-js';
import { buildVisualPrompt } from '../synthesize-sense/lib/VisualPromptsBackend.ts';
import { callAI } from '../synthesize-sense/utils/callAI.ts';

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

/** Strip markdown code fences Gemini sometimes wraps around TSX */
function stripMarkdown(raw: string): string {
    return raw.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim();
}

/** Validate TSX visual payload for safety constraints. Returns null if valid. */
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

// ── Failure sentinel ─────────────────────────────────────────────────────────
/**
 * Write a sentinel record to sense_visuals so the frontend stops polling immediately
 * instead of exhausting all 3 auto-poll attempts over ~100s.
 *
 * Uses upsert with ignoreDuplicates so a real visual that won the race is never overwritten.
 * The payload is a marker string (not null) to avoid any NOT NULL constraint issues.
 * Frontend detects this via meta.status === 'failed' checked before reading payload.
 */
async function writeFailureSentinel(
    supabase: any,
    senseId: string,
    visualId: string,
    reason: string,
): Promise<void> {
    const { error } = await supabase
        .from('sense_visuals')
        .upsert(
            {
                sense_id: senseId,
                id: visualId,
                payload: 'VISUAL_GENERATION_FAILED',
                meta: { status: 'failed', error: reason, failedAt: Date.now() },
            },
            { onConflict: 'sense_id,id', ignoreDuplicates: true },
        );
    if (error) {
        console.error(`[generate-visual] writeFailureSentinel error (non-fatal):`, error);
    } else {
        console.log(`[generate-visual] failure sentinel written: sense=${senseId} visual=${visualId} reason=${reason}`);
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const t0 = Date.now();
    let corrId = 'unknown';

    try {
        const body = await req.json();
        const { sense_id, visual_id, concept, definition, discoverer_user_id, model_id, corr_id } = body;
        corrId = typeof corr_id === 'string' && corr_id ? corr_id : 'unknown';

        // Validate required fields
        for (const [field, value] of Object.entries({ sense_id, visual_id, concept, definition, discoverer_user_id })) {
            if (!value || typeof value !== 'string') {
                console.error(`[generate-visual] bad request: missing ${field}`);
                return json({ success: false, error: `missing ${field}` }, 400);
            }
        }

        console.log(`[corr:${corrId}][generate-visual] start sense=${sense_id} visual=${visual_id}`);
        console.log(`[corr:${corrId}][TIMING] 1_start`);

        // Supabase admin client (service_role)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Build visual prompt
        const { systemPrompt, userPrompt } = buildVisualPrompt({
            concept,
            definition,
            visualId: visual_id,
        });

        // Call Gemini
        console.log(`[corr:${corrId}][TIMING] 2_gemini_start +${Date.now() - t0}ms`);
        const t2 = Date.now();
        let visualRawText: string;
        try {
            visualRawText = await callAI({
                systemPrompt,
                userPrompt,
                temperature: 0.6,
                responseMimeType: 'text/plain',
                tag: 'generate-visual',
                model: model_id,
            });
        } catch (geminiErr) {
            const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
            console.error(`[corr:${corrId}][generate-visual] Gemini failed: ${msg}`);
            console.log(`[corr:${corrId}][RESULT] sense=${sense_id} visual=${visual_id} status=failed reason=gemini_error total=+${Date.now() - t0}ms`);
            await writeFailureSentinel(supabase, sense_id, visual_id, 'gemini_error');
            return json({ success: false, error: 'gemini_failed' }, 500);
        }
        console.log(`[corr:${corrId}][TIMING] 3_gemini_done +${Date.now() - t0}ms (took ${Date.now() - t2}ms)`);

        // Extract TSX code after the delimiter
        const parts = visualRawText.split('// --- CODE BELOW ---');
        let code = (parts.length > 1 ? parts[1] : visualRawText).trim();
        code = stripMarkdown(code);

        // Validate
        const validationErr = validateVisualPayload(code);
        if (validationErr) {
            console.warn(`[corr:${corrId}][generate-visual] validation failed: ${validationErr}`);
            console.log(`[corr:${corrId}][RESULT] sense=${sense_id} visual=${visual_id} status=failed reason=validation:${validationErr} total=+${Date.now() - t0}ms`);
            await writeFailureSentinel(supabase, sense_id, visual_id, `validation:${validationErr}`);
            return json({ success: false, error: `validation_failed: ${validationErr}` }, 422);
        }
        console.log(`[corr:${corrId}][generate-visual] validation ok (length=${code.length})`);

        // Insert into sense_visuals
        const { error: insertErr } = await supabase.from('sense_visuals').insert({
            sense_id,
            id: visual_id,
            payload: code,
            meta: {
                stability: 50.0,
                firstDiscoverer: discoverer_user_id,
                firstDiscoveredAt: Date.now(),
            },
        });

        if (insertErr) {
            console.error(`[corr:${corrId}][generate-visual] sense_visuals INSERT error:`, insertErr);
            console.log(`[corr:${corrId}][RESULT] sense=${sense_id} visual=${visual_id} status=failed reason=db_insert total=+${Date.now() - t0}ms`);
            await writeFailureSentinel(supabase, sense_id, visual_id, 'db_insert_failed');
            // Return 200 — the visual is non-critical, caller does not retry on failure
            return json({ success: false, error: 'db_insert_failed' });
        }

        console.log(`[corr:${corrId}][TIMING] 4_insert_done +${Date.now() - t0}ms`);
        console.log(`[corr:${corrId}][RESULT] sense=${sense_id} visual=${visual_id} status=ok total=+${Date.now() - t0}ms`);
        return json({ success: true });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[corr:${corrId}][generate-visual] uncaught error: ${msg}`);
        console.log(`[corr:${corrId}][RESULT] status=failed reason=uncaught total=+${Date.now() - t0}ms`);
        return json({ success: false, error: msg }, 500);
    }
});
