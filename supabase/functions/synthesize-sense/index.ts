/**
 * Edge Function: synthesize-sense
 *
 * Full flow:
 *   1. Validate & sort UUIDs
 *   2. Init Supabase admin client
 *   3. Query synthesis_cache
 *      - Cache Hit  → aggregate senses/shells/visuals/flavors, handle Delta, return
 *      - Cache Miss → Module B (SynthesisPrompt), dedup check, Module A, write cache, return
 */

import { createClient } from 'npm:@supabase/supabase-js';
import { generateSense } from './moduleA.ts';
import { callGemini } from './utils/gemini.ts';
import { buildSynthesisPrompt } from './lib/SynthesisPromptsBackend.ts';
import { buildDeltaPrompt } from './lib/DeltaPromptBackend.ts';
import type { DeltaMissing } from './lib/DeltaPromptBackend.ts';
import { buildVisualPrompt } from './lib/VisualPromptsBackend.ts';
import { injectSenseMeta } from './lib/injectSenseMeta.ts';
import type {
    SynthesisRequest,
    GeminiSynthesisOutput,
    SenseAIPayload,
    RawSenseAIOutput,
} from './types.ts';

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

/** Strip markdown code fences (Gemini sometimes wraps JSON/TSX) */
function stripMarkdown(raw: string): string {
    return raw.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/m, '').trim();
}

/**
 * Repair malformed JSON produced by Gemini:
 * replaces literal newlines/tabs inside string values with proper escape sequences.
 */
function repairJsonString(raw: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (escaped) {
            result += ch;
            escaped = false;
        } else if (ch === '\\' && inString) {
            result += ch;
            escaped = true;
        } else if (ch === '"') {
            result += ch;
            inString = !inString;
        } else if (inString && ch === '\n') {
            result += '\\n';
        } else if (inString && ch === '\r') {
            result += '\\r';
        } else if (inString && ch === '\t') {
            result += '\\t';
        } else {
            result += ch;
        }
    }
    return result;
}

/** Languages that require grammatical gender for nouns */
const GENDERED_LANGS = new Set(['fr', 'de', 'es', 'it', 'pt']);
/** Languages that use verb conjugation groups */
const VERB_GROUP_LANGS = new Set(['fr', 'es', 'it', 'pt']);

// ── Delta lock (in-memory, 15s TTL) ──────────────────────────────────────────
const deltaLocks = new Map<string, number>();

function acquireDeltaLock(senseId: string): boolean {
    const now = Date.now();
    const expiry = deltaLocks.get(senseId);
    if (expiry && expiry > now) return false; // locked
    deltaLocks.set(senseId, now + 15_000);
    return true;
}

function releaseDeltaLock(senseId: string): void {
    deltaLocks.delete(senseId);
}

// ── Validate TSX visual payload ───────────────────────────────────────────────
function validateVisualPayload(payload: string): boolean {
    if (!payload.includes('export default')) return false;
    if (payload.includes('useEffect') || payload.includes('useState') || payload.includes('useRef')) return false;
    if (!payload.includes("from 'motion/react'") && !payload.includes('from "motion/react"')) return false;
    if (payload.length < 200 || payload.length > 20_000) return false;
    return true;
}

// ── Assemble a full SenseEntityPayload from raw DB rows ──────────────────────
function assembleFromDbRows(
    senseRow: any,
    shellRow: any,
    flavors: any[],
    nameEn: string
): any {
    return {
        uid: senseRow.uid,
        fingerprint: senseRow.fingerprint,
        ontology: senseRow.ontology,
        frequency: senseRow.frequency,
        meaning: senseRow.meaning,
        wordFamily: senseRow.word_family,
        shells: shellRow?.shells ?? {},
        traits: shellRow?.traits ?? undefined,
        // Reconstruct flavorText array from flavor rows
        flavorText: (flavors ?? []).map((f: any) => ({
            persona: f.persona,
            text: f.text,
            example: f.example,
        })),
    };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    // Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const t0 = Date.now();
        console.log('[TIMING] 1_start');
        const body: SynthesisRequest = await req.json();
        const {
            input_1_id,
            input_2_id,
            lang,
            max_level = 'B2',
            target_languages = ['en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'],
            personaId = 'default',
            personaNarrative,
            visual_id = 'default',
        } = body;

        // ① UUID validation & sort
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!input_1_id || !input_2_id || !uuidRegex.test(input_1_id) || !uuidRegex.test(input_2_id)) {
            return json({ success: false, error: { code: 'INPUT_NOT_FOUND', message: 'Missing or invalid UUIDs' } }, 400);
        }

        const [uid1, uid2] = [input_1_id, input_2_id].sort();

        // ② Supabase admin client (service_role)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Extract discoverer from JWT if present, else fallback to anonymous
        let discovererUserId = 'anonymous';
        try {
            const authHeader = req.headers.get('Authorization') ?? '';
            const token = authHeader.replace('Bearer ', '');
            if (token && token !== Deno.env.get('SUPABASE_ANON_KEY')) {
                const { data: { user } } = await supabase.auth.getUser(token);
                if (user?.id) discovererUserId = user.id;
            }
        } catch { /* non-fatal */ }

        // ③ Query synthesis_cache
        // DB columns: sense_uid_1, sense_uid_2, result_sense_uid, method_id, slot_index
        const { data: cacheRow, error: cacheErr } = await supabase
            .from('synthesis_cache')
            .select('result_sense_uid, synthesis_reason, method_id, word_text_a, word_text_b')
            .eq('sense_uid_1', uid1)
            .eq('sense_uid_2', uid2)
            .eq('slot_index', 1)
            .maybeSingle();

        if (cacheErr && cacheErr.code !== 'PGRST116') {
            console.error('[index] synthesis_cache query error:', cacheErr);
            return json({ success: false, error: { code: 'GENERATION_FAILED', message: 'Cache query failed' } }, 500);
        }

        // ──────────────────────────── CACHE HIT ───────────────────────────────
        if (cacheRow?.result_sense_uid) {
            const resultSenseId = cacheRow.result_sense_uid;

            // Aggregate all existing data in parallel
            const [
                { data: senseRow },
                { data: shellRow },
                { data: visuals },
                { data: flavors },
            ] = await Promise.all([
                supabase.from('senses').select('*').eq('uid', resultSenseId).single(),
                supabase.from('sense_word_shells').select('*').eq('sense_id', resultSenseId).maybeSingle(),
                supabase.from('sense_visuals').select('*').eq('sense_id', resultSenseId),
                supabase.from('sense_flavor_texts').select('*').eq('sense_id', resultSenseId),
            ]);

            if (!senseRow) {
                console.error('[index] Orphaned cache entry for sense_id:', resultSenseId);
                return json({ success: false, error: { code: 'GENERATION_FAILED', message: 'Orphaned cache entry' } }, 500);
            }

            const existingShells = shellRow?.shells ?? {};
            const existingTraits = shellRow?.traits ?? {};
            const existingWordFamily = senseRow.word_family ?? {};

            // --- Version-upgrade delta detection ---
            const missing: DeltaMissing = {
                langs: [],
                personas: [],
                wordFamilyLangs: [],
                traitLangs: [],
            };

            // Determine POS from existing shells (needed for trait validation)
            const firstLangShells = Object.values(existingShells)[0] as any;
            const existingPos: string = firstLangShells?.[0]?.pos?.value ?? firstLangShells?.[0]?.pos ?? 'n.';
            const isNoun = existingPos === 'n.';
            const isVerb = ['v.', 'v.t.', 'v.i.'].includes(existingPos);

            for (const tl of target_languages) {
                // Check if the language is fully missing
                if (!existingShells[tl] || !senseRow.meaning?.[tl]) {
                    missing.langs.push(tl);
                } else {
                    // Language exists — check for missing sub-data
                    if (!existingWordFamily[tl]) {
                        missing.wordFamilyLangs.push(tl);
                    }

                    // POS-aware trait check
                    const traitList: any[] = existingTraits[tl] ?? [];
                    let needsTrait = false;

                    if (isNoun && GENDERED_LANGS.has(tl)) {
                        if (!traitList.some((t: any) => t.traitId === 'gender')) needsTrait = true;
                    } else if (isVerb && VERB_GROUP_LANGS.has(tl)) {
                        if (!traitList.some((t: any) => t.traitId === 'verb_group')) needsTrait = true;
                    }

                    if (needsTrait) missing.traitLangs.push(tl);
                }
            }

            // Check if requested persona's FlavorText exists
            const hasPersona = (flavors ?? []).some((f: any) => f.persona === personaId);
            if (!hasPersona && missing.langs.length === 0) {
                missing.personas.push(personaId);
            }

            // --- Blocking Delta: text fields ---
            const totalTextMissing =
                missing.langs.length +
                missing.personas.length +
                missing.wordFamilyLangs.length +
                missing.traitLangs.length;

            if (totalTextMissing > 0) {
                if (!acquireDeltaLock(resultSenseId)) {
                    // Lock held — wait and proceed with existing data
                    console.log('[Delta] Lock held for sense:', resultSenseId, '— skipping delta');
                } else {
                    try {
                        console.log('[Delta] Triggered for sense:', resultSenseId, 'missing:', missing);

                        // Build shell anchor for ROOT RULE
                        const existingShellsAnchor: Record<string, string> = {};
                        for (const [lang, shellArr] of Object.entries(existingShells)) {
                            const sh = (shellArr as any[])[0];
                            const textVal = sh?.text?.value ?? sh?.text ?? '';
                            existingShellsAnchor[lang] = textVal;
                        }

                        // English definition as context
                        const definitonEn: string = senseRow.meaning?.['en']?.value ?? senseRow.meaning?.['en'] ?? '';

                        const { systemPrompt: dSys, userPrompt: dUsr } = buildDeltaPrompt({
                            concept: existingShellsAnchor['en'] ?? 'Unknown',
                            definition: definitonEn,
                            existingShells: existingShellsAnchor,
                            pos: existingPos,
                            missing,
                            personaId,
                            personaNarrative,
                        });

                        const rawDeltaText = await callGemini({
                            systemPrompt: dSys,
                            userPrompt: dUsr,
                            temperature: 0.4,
                            maxTokens: 10000,
                            responseMimeType: 'application/json',
                        });

                        const deltaJson = injectSenseMeta(
                            JSON.parse(stripMarkdown(rawDeltaText)) as RawSenseAIOutput
                        );

                        // UPSERT missing langs
                        if (missing.langs.length > 0 && deltaJson.meaning) {
                            // Update meaning
                            const newMeaning = { ...senseRow.meaning };
                            for (const l of missing.langs) {
                                if (deltaJson.meaning[l]) newMeaning[l] = deltaJson.meaning[l];
                            }
                            await supabase.from('senses').update({ meaning: newMeaning }).eq('uid', resultSenseId);

                            // Update word_family
                            if (deltaJson.wordFamily && Object.keys(deltaJson.wordFamily).length > 0) {
                                const newWf = { ...existingWordFamily };
                                for (const l of missing.langs) {
                                    if (deltaJson.wordFamily[l]) newWf[l] = deltaJson.wordFamily[l];
                                }
                                await supabase.from('senses').update({ word_family: newWf }).eq('uid', resultSenseId);
                            }

                            // Update shells
                            if (deltaJson.shells && Object.keys(deltaJson.shells).length > 0) {
                                const newShells = { ...existingShells };
                                for (const l of missing.langs) {
                                    if (deltaJson.shells[l]) newShells[l] = deltaJson.shells[l];
                                }
                                await supabase.from('sense_word_shells').update({ shells: newShells }).eq('sense_id', resultSenseId);
                            }

                            // Update traits
                            if (deltaJson.traits && Object.keys(deltaJson.traits).length > 0) {
                                const newTraits = { ...existingTraits };
                                for (const l of missing.langs) {
                                    if (deltaJson.traits[l]) newTraits[l] = deltaJson.traits[l];
                                }
                                await supabase.from('sense_word_shells').update({ traits: newTraits }).eq('sense_id', resultSenseId);
                            }

                            // Insert FlavorText for new langs
                            if (deltaJson.flavorText && deltaJson.flavorText.length > 0) {
                                const flavorUpserts = deltaJson.flavorText.map((ft: any) => ({
                                    sense_id: resultSenseId,
                                    persona: ft.persona,
                                    text: ft.text,
                                    example: ft.example,
                                }));
                                await supabase.from('sense_flavor_texts').upsert(flavorUpserts, {
                                    onConflict: 'sense_id,persona',
                                    ignoreDuplicates: false,
                                });
                            }
                        }

                        // UPSERT missing personas (existing langs, new persona FlavorText)
                        if (missing.personas.length > 0 && deltaJson.flavorText) {
                            const personaUpserts = deltaJson.flavorText
                                .filter((ft: any) => missing.personas.includes(ft.persona))
                                .map((ft: any) => ({
                                    sense_id: resultSenseId,
                                    persona: ft.persona,
                                    text: ft.text,
                                    example: ft.example,
                                }));
                            if (personaUpserts.length > 0) {
                                await supabase.from('sense_flavor_texts').upsert(personaUpserts, {
                                    onConflict: 'sense_id,persona',
                                    ignoreDuplicates: false,
                                });
                            }
                        }

                        // UPSERT missing wordFamily langs
                        if (missing.wordFamilyLangs.length > 0 && deltaJson.wordFamily) {
                            const newWf = { ...existingWordFamily };
                            for (const l of missing.wordFamilyLangs) {
                                if (deltaJson.wordFamily[l]) newWf[l] = deltaJson.wordFamily[l];
                            }
                            await supabase.from('senses').update({ word_family: newWf }).eq('uid', resultSenseId);
                        }

                        // UPSERT missing trait langs
                        if (missing.traitLangs.length > 0 && deltaJson.traits) {
                            const newTraits = { ...existingTraits };
                            for (const l of missing.traitLangs) {
                                if (deltaJson.traits[l]) newTraits[l] = deltaJson.traits[l];
                            }
                            await supabase.from('sense_word_shells').update({ traits: newTraits }).eq('sense_id', resultSenseId);
                        }
                    } catch (deltaErr) {
                        console.error('[Delta] Generation failed:', deltaErr);
                        // Per spec: refuse to degrade, return failure
                        return json({
                            success: false,
                            error: { code: 'GENERATION_FAILED', message: 'Delta generation failed' }
                        }, 500);
                    } finally {
                        releaseDeltaLock(resultSenseId);
                    }
                }
            }

            // --- Non-blocking Visual delta ---
            const activeVisual = (visuals ?? []).find((v: any) => v.id === visual_id);
            if (!activeVisual) {
                (async () => {
                    try {
                        // Use english name from shells for visual concept context
                        const shellsEn = existingShells['en'] as any;
                        const conceptEn = shellsEn?.[0]?.text?.value ?? shellsEn?.[0]?.text ?? 'Unknown';
                        const defEn: string = senseRow.meaning?.['en']?.value ?? senseRow.meaning?.['en'] ?? '';

                        const { systemPrompt: vSys, userPrompt: vUser } = buildVisualPrompt({
                            concept: conceptEn,
                            definition: defEn,
                            visualId: visual_id,
                        });

                        const visualRawText = await callGemini({
                            systemPrompt: vSys,
                            userPrompt: vUser,
                            temperature: 0.6,
                            maxTokens: 6000,
                            responseMimeType: 'text/plain',
                        });

                        const parts = visualRawText.split('// --- CODE BELOW ---');
                        let code = (parts.length > 1 ? parts[1] : visualRawText).trim();
                        code = stripMarkdown(code);

                        if (!validateVisualPayload(code)) {
                            console.warn('[Visual delta] Validation failed — discarding');
                            return;
                        }

                        await supabase.from('sense_visuals').insert({
                            sense_id: resultSenseId,
                            id: visual_id,
                            payload: code,
                            meta: {
                                stability: 50.0,
                                firstDiscoverer: discovererUserId,
                                firstDiscoveredAt: Date.now(),
                            },
                        });
                    } catch (e) {
                        console.error('[Visual delta] Async failed (non-fatal):', e);
                    }
                })();
            }

            // Re-fetch updated data for response (simplified: use existing + delta merged)
            const activeFlavor = (flavors ?? []).find((f: any) => f.persona === personaId)
                ?? (flavors ?? [])[0]
                ?? null;

            const senseEntityPayload = assembleFromDbRows(senseRow, shellRow, flavors ?? [], '');

            return json({
                success: true,
                data: {
                    sense: senseEntityPayload,
                    visual: activeVisual ?? null,
                    cached: true,
                    isNewDiscovery: false,
                    archetypeUsed: cacheRow.method_id ? String(cacheRow.method_id) : 'Unknown',
                    synthesisReason: cacheRow.synthesis_reason ?? '',
                },
            });
        }

        // ──────────────────────────── CACHE MISS ──────────────────────────────

        // Fetch input senses' english names and definitions
        // English name: sense_word_shells.shells->en->0->text->value
        // English def:  senses.meaning->en->value
        const [{ data: sense1Row }, { data: sense2Row }] = await Promise.all([
            supabase.from('senses').select('uid, meaning').eq('uid', uid1).maybeSingle(),
            supabase.from('senses').select('uid, meaning').eq('uid', uid2).maybeSingle(),
        ]);

        if (!sense1Row || !sense2Row) {
            return json({ success: false, error: { code: 'INPUT_NOT_FOUND', message: 'One or both input UUIDs not found' } }, 404);
        }

        const [{ data: shell1Row }, { data: shell2Row }] = await Promise.all([
            supabase.from('sense_word_shells').select('shells').eq('sense_id', uid1).maybeSingle(),
            supabase.from('sense_word_shells').select('shells').eq('sense_id', uid2).maybeSingle(),
        ]);

        // Extract EN name from shells (first EN shell text)
        function extractEnName(shells: any): string {
            const enArr = shells?.['en'];
            if (!enArr || enArr.length === 0) return 'Unknown';
            const sh = enArr[0];
            return sh?.text?.value ?? sh?.text ?? 'Unknown';
        }

        function extractEnDef(meaningJson: any): string {
            if (!meaningJson) return '';
            const m = meaningJson['en'];
            if (!m) return '';
            return m?.value ?? m ?? '';
        }

        const nameA = extractEnName(shell1Row?.shells);
        const defA = extractEnDef(sense1Row.meaning);
        const nameB = extractEnName(shell2Row?.shells);
        const defB = extractEnDef(sense2Row.meaning);
        console.log(`[TIMING] 3_input_fetch +${Date.now() - t0}ms`);

        // Module B — SynthesisPrompt, attempt 1: random archetype
        const archetypeIds = [1, 2, 3, 4, 5, 6] as const;
        const randomArchtype = archetypeIds[Math.floor(Math.random() * archetypeIds.length)];

        const archetypeNames = ['Composition', 'Metaphor', 'Conflict', 'Function', 'Gestalt', 'Culture'];
        const archetypeName = archetypeNames[randomArchtype - 1];

        const p1 = buildSynthesisPrompt({
            nameA,
            defA,
            nameB,
            defB,
            lang,
            maxLevel: max_level,
            archetype: archetypeName,
        });

        const t4 = Date.now();
        let synthesisText = await callGemini({
            systemPrompt: p1.systemPrompt,
            userPrompt: p1.userPrompt,
            temperature: 0.7,
            responseMimeType: 'application/json',
        });
        console.log(`[TIMING] 4_moduleB_gemini +${Date.now() - t0}ms (took ${Date.now() - t4}ms)`);

        let synthesisOutput: GeminiSynthesisOutput;
        try {
            synthesisOutput = JSON.parse(repairJsonString(stripMarkdown(synthesisText)));
        } catch (parseErr) {
            console.error('[Module B] Failed to parse synthesis JSON (attempt 1):', synthesisText.slice(0, 300));
            synthesisOutput = { outcome: 'failure', failure_code: 'NO_SYNERGY' } as GeminiSynthesisOutput;
        }

        // Attempt 2: let AI self-select archetype if first attempt fails NO_SYNERGY
        if (synthesisOutput.outcome === 'failure' && synthesisOutput.failure_code === 'NO_SYNERGY') {
            console.log('[Module B] Attempt 1 failed (NO_SYNERGY). Retrying with AI-selected archetype.');
            const p2 = buildSynthesisPrompt({ nameA, defA, nameB, defB, lang, maxLevel: max_level });
            synthesisText = await callGemini({
                systemPrompt: p2.systemPrompt,
                userPrompt: p2.userPrompt,
                temperature: 0.7,
                responseMimeType: 'application/json',
            });
            try {
                synthesisOutput = JSON.parse(repairJsonString(stripMarkdown(synthesisText)));
            } catch (parseErr) {
                console.error('[Module B] Failed to parse synthesis JSON (attempt 2):', synthesisText.slice(0, 300));
                throw new Error('LLM_ERROR');
            }
        }

        // Both attempts failed
        if (synthesisOutput.outcome === 'failure') {
            const code = synthesisOutput.failure_code ?? 'NO_SYNERGY';
            return json({
                success: false,
                error: { code, message: `Synthesis failed: ${code}` }
            });
        }

        const resultConcept = synthesisOutput.result_concept!.trim();
        const resultDefinitionEn = synthesisOutput.result_definition_en!;
        const archetypeUsed = synthesisOutput.archetype_used;
        const synthesisReason = synthesisOutput.synthesis_reason;

        // Map archetype name back to method_id (1-6)
        const archetypeNameToId: Record<string, number> = {
            'Composition': 1, 'Metaphor': 2, 'Conflict': 3,
            'Function': 4, 'Gestalt': 5, 'Culture': 6,
        };
        const methodId = archetypeNameToId[archetypeUsed] ?? randomArchtype;

        // Check if concept already exists (case-insensitive)
        const { data: dupeRow } = await supabase
            .from('sense_word_shells')
            .select('sense_id, shells')
            .textSearch('shells', resultConcept);
            // Simpler fallback: check via meaning equality or search is not available in simple select
            // We do an alternative: fetch all senses shells and check in-memory if too hard.
            // But the recommended approach per TDD is case-insensitive check on senses table.
            // Since senses has no 'concept' column, we check via shell text.

        // Actually the correct check per TDD §3.6 is case-insensitive query on result_concept.
        // But senses has no direct concept column — we check via ilike on shells JSONB via SQL.
        // Use raw SQL via rpc if available, or fallback to simpler checks.

        // Let's use a filter on shells jsonb: shells->'en'->0->>'text' ilike '%concept%'
        // This is complex via JS client. Use a simpler approach: check if any sense_word_shells
        // has an 'en' shell whose text value matches (case-insensitive).
        let existingUid: string | null = null;

        const t7 = Date.now();
        const { data: shellMatches } = await supabase
            .from('sense_word_shells')
            .select('sense_id, shells');

        if (shellMatches) {
            for (const row of shellMatches) {
                const enArr = row.shells?.['en'];
                if (!enArr) continue;
                const enText: string = enArr[0]?.text?.value ?? enArr[0]?.text ?? '';
                if (enText.toLowerCase() === resultConcept.toLowerCase()) {
                    existingUid = row.sense_id;
                    break;
                }
            }
        }
        console.log(`[TIMING] 7_dedup_check +${Date.now() - t0}ms (took ${Date.now() - t7}ms, rows=${shellMatches?.length ?? 0})`);

        let senseFinal: any;
        let visualFinal: any = null;
        let isNewDiscovery = false;

        if (existingUid) {
            // Concept already exists — reuse that sense
            console.log('[index] Concept already exists, reusing sense:', existingUid);

            const [
                { data: existingSenseRow },
                { data: existingShellRow },
                { data: existingVisualsRows },
                { data: existingFlavorsRows },
            ] = await Promise.all([
                supabase.from('senses').select('*').eq('uid', existingUid).single(),
                supabase.from('sense_word_shells').select('*').eq('sense_id', existingUid).maybeSingle(),
                supabase.from('sense_visuals').select('*').eq('sense_id', existingUid),
                supabase.from('sense_flavor_texts').select('*').eq('sense_id', existingUid),
            ]);

            senseFinal = assembleFromDbRows(existingSenseRow, existingShellRow, existingFlavorsRows ?? [], '');
            visualFinal = (existingVisualsRows ?? []).find((v: any) => v.id === visual_id) ?? null;

            // Write synthesis_cache to record this combination → existing sense
            const { error: cacheWriteErr1 } = await supabase.from('synthesis_cache').insert({
                sense_uid_1: uid1,
                sense_uid_2: uid2,
                method_id: methodId,
                slot_index: 1,
                result_sense_uid: existingUid,
                word_text_a: nameA,
                word_text_b: nameB,
                synthesis_reason: synthesisReason,
                meta: {},
            });
            if (cacheWriteErr1) {
                console.error('[index] synthesis_cache INSERT error (existing sense path):', cacheWriteErr1);
            }

            isNewDiscovery = false;
        } else {
            // Generate a brand new Sense via Module A
            isNewDiscovery = true;
            const { sense, visual } = await generateSense(
                resultConcept,
                resultDefinitionEn,
                body,
                discovererUserId,
                supabase
            );

            senseFinal = sense;
            visualFinal = visual; // null (async pending)

            // Write synthesis_cache
            const { error: cacheWriteErr2 } = await supabase.from('synthesis_cache').insert({
                sense_uid_1: uid1,
                sense_uid_2: uid2,
                method_id: methodId,
                slot_index: 1,
                result_sense_uid: sense.uid,
                word_text_a: nameA,
                word_text_b: nameB,
                synthesis_reason: synthesisReason,
                meta: {},
            });
            if (cacheWriteErr2) {
                console.error('[index] synthesis_cache INSERT error (new sense path):', cacheWriteErr2);
            }
        }

        console.log(`[TIMING] 9_total +${Date.now() - t0}ms`);
        return json({
            success: true,
            data: {
                sense: senseFinal,
                visual: visualFinal,
                cached: false,
                isNewDiscovery,
                archetypeUsed,
                synthesisReason,
            },
        });

    } catch (error: any) {
        console.error('[index] Uncaught error:', error);

        const code: string =
            error.message === 'INPUT_NOT_FOUND' ? 'INPUT_NOT_FOUND' :
                error.message === 'GENERATION_FAILED' ? 'GENERATION_FAILED' :
                    error.message === 'LLM_ERROR' ? 'LLM_ERROR' :
                        'GENERATION_FAILED';

        return json({ success: false, error: { code, message: error.message ?? 'Unknown error' } },
            code === 'INPUT_NOT_FOUND' ? 404 : 500);
    }
});


