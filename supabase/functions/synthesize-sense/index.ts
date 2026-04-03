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
 * - Escapes all literal control characters (U+0000–U+001F) inside string values
 * - Fixes invalid escape sequences (e.g. \s, \, → \\s, \\,)
 */
function repairJsonString(raw: string): string {
    const VALID_ESCAPE = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);
    let result = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!;
        const code = ch.charCodeAt(0);
        if (escaped) {
            if (inString && !VALID_ESCAPE.has(ch)) {
                // Invalid escape sequence — double the backslash
                result += '\\';
            }
            result += ch;
            escaped = false;
        } else if (ch === '\\' && inString) {
            result += ch;
            escaped = true;
        } else if (ch === '"') {
            result += ch;
            inString = !inString;
        } else if (inString && code < 0x20) {
            // All control characters must be escaped in JSON strings
            if (code === 0x0A) result += '\\n';
            else if (code === 0x0D) result += '\\r';
            else if (code === 0x09) result += '\\t';
            else if (code === 0x08) result += '\\b';
            else if (code === 0x0C) result += '\\f';
            else result += `\\u${code.toString(16).padStart(4, '0')}`;
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

// ── Validate TSX visual payload — returns null if valid, reason string if invalid ─
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
            systemlang,
            learninglang,
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

        // ③ Determing slot_index and Query synthesis_cache
        function getSlotIndex(level: string): number {
            if (['A1', 'A2'].includes(level)) return 1;
            if (['B1', 'B2'].includes(level)) return 2;
            if (['C1', 'C2'].includes(level)) return 3;
            return 1;
        }
        const currentSlotIndex = getSlotIndex(max_level);

        const { data: cacheRows, error: cacheErr } = await supabase
            .from('synthesis_cache')
            .select('result_sense_uid, method_id, meta, word_text_a, word_text_b')
            .eq('sense_uid_1', uid1)
            .eq('sense_uid_2', uid2)
            .eq('slot_index', currentSlotIndex);

        if (cacheErr) {
            console.error('[index] synthesis_cache query error:', cacheErr);
            return json({ success: false, error: { code: 'GENERATION_FAILED', message: 'Cache query failed' } }, 500);
        }

        let isOffensiveBlock = false;
        const deadEndMethods = new Set<number>();
        const successfulMethods = new Set<number>();
        const successRows: any[] = [];

        if (cacheRows && cacheRows.length > 0) {
            for (const row of cacheRows) {
                if (row.result_sense_uid) {
                    successfulMethods.add(row.method_id);
                    successRows.push(row);
                } else if (row.meta && row.meta.failure_code) {
                    const fcode = row.meta.failure_code;
                    if (fcode === 'OFFENSIVE') {
                        isOffensiveBlock = true;
                        break;
                    }
                    if (fcode === 'NO_SYNERGY' || fcode === 'TOO_COMPLEX') {
                        deadEndMethods.add(row.method_id);
                    }
                }
            }
        }

        if (isOffensiveBlock) {
            console.log('[index] synthesis_cache: OFFENSIVE negative cache hit. Blocking.');
            return json({ success: false, error: { code: 'OFFENSIVE', message: 'Synthesis failed: OFFENSIVE' } });
        }

        const archetypeIds = [1, 2, 3, 4, 5, 6] as readonly number[];
        const availableMethods = archetypeIds.filter(id => !deadEndMethods.has(id) && !successfulMethods.has(id));

        let cacheRow = null;
        let skipCacheWrite = false;

        if (availableMethods.length === 0) {
            // 图鉴枯竭阶段：如果盲盒全部开完（无新套路可用），且曾有成功的成果，直接敷衍返回
            if (successRows.length > 0) {
                console.log('[index] synthesis_cache: All fresh methods exhausted. Retrieving an existing success.');
                cacheRow = successRows[Math.floor(Math.random() * successRows.length)];
            } else {
                console.log('[index] synthesis_cache: All methods exhausted & NO successes exist. Failing.');
                return json({ success: false, error: { code: 'NO_SYNERGY', message: 'Synthesis completely exhausted.' } });
            }
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
                            tag: 'delta',
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
                const visualTask = (async () => {
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
                            tag: 'delta-visual',
                        });

                        const parts = visualRawText.split('// --- CODE BELOW ---');
                        let code = (parts.length > 1 ? parts[1] : visualRawText).trim();
                        code = stripMarkdown(code);

                        const deltaVisualErr = validateVisualPayload(code);
                        if (deltaVisualErr) {
                            console.warn('[Visual delta] Validation failed:', deltaVisualErr);
                            return;
                        }

                        const { error: visualInsertErr } = await supabase.from('sense_visuals').insert({
                            sense_id: resultSenseId,
                            id: visual_id,
                            payload: code,
                            meta: {
                                stability: 50.0,
                                firstDiscoverer: discovererUserId,
                                firstDiscoveredAt: Date.now(),
                            },
                        });
                        if (visualInsertErr) {
                            console.error('[Visual delta] sense_visuals INSERT error:', visualInsertErr);
                        } else {
                            console.log('[Visual delta] sense_visuals INSERT ok:', resultSenseId);
                        }
                    } catch (e) {
                        console.error('[Visual delta] Async failed (non-fatal):', e);
                    }
                })();
                (globalThis as any).EdgeRuntime?.waitUntil(visualTask);
            }

            // Re-fetch updated data for response (simplified: use existing + delta merged)
            const activeFlavor = (flavors ?? []).find((f: any) => f.persona === personaId)
                ?? (flavors ?? [])[0]
                ?? null;

            const senseEntityPayload = assembleFromDbRows(senseRow, shellRow, flavors ?? [], '');

            console.log(`[RESULT] cached=true new=false sense=${resultSenseId} visual=${activeVisual ? 'ready' : 'pending'} total=+${Date.now() - t0}ms`);
            return json({
                success: true,
                data: {
                    sense: senseEntityPayload,
                    visual: activeVisual ?? null,
                    cached: true,
                    isNewDiscovery: false,
                    archetypeUsed: cacheRow.method_id ? String(cacheRow.method_id) : 'Unknown',
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
        console.log(`[index] synthesizing: "${nameA}" + "${nameB}" → system=${systemlang} learning=${learninglang}`);

        // Module B — SynthesisPrompt, attempt 1: random archetype
        let randomArchtype: number;
        if (availableMethods.length === 0) {
            // If we reached here, availableMethods is empty BUT we just passed the CACHE HIT block,
            // which means we should never actually reach here if availableMethods=0.
            randomArchtype = 1;
        } else {
            randomArchtype = availableMethods[Math.floor(Math.random() * availableMethods.length)];
        }

        const archetypeNames = ['Composition', 'Metaphor', 'Conflict', 'Function', 'Gestalt', 'Culture'];
        const archetypeName = archetypeNames[randomArchtype - 1];

        const archetypeNameToId: Record<string, number> = {
            'Composition': 1, 'Metaphor': 2, 'Conflict': 3,
            'Function': 4, 'Gestalt': 5, 'Culture': 6,
        };

        let synthesisOutput: GeminiSynthesisOutput | null = null;
        let existingUid: string | null = null;
        let finalMethodId = randomArchtype;
        let finalArchetypeUsed = archetypeName;
        
        if (availableMethods.length > 0) {
            const p1 = buildSynthesisPrompt({
                nameA, defA, nameB, defB, systemlang, learninglang,
                targetLanguages: target_languages, maxLevel: max_level, archetype: archetypeName,
            });

            const t4 = Date.now();
            const synthesisText1 = await callGemini({
                systemPrompt: p1.systemPrompt, userPrompt: p1.userPrompt,
                temperature: 0.7, responseMimeType: 'application/json', tag: 'moduleB-attempt1',
            });
            console.log(`[TIMING] 4_moduleB_gemini +${Date.now() - t0}ms (took ${Date.now() - t4}ms)`);

            try {
                synthesisOutput = JSON.parse(repairJsonString(stripMarkdown(synthesisText1)));
            } catch (parseErr) {
                console.error('[Module B] JSON parse error (attempt 1):', parseErr instanceof Error ? parseErr.message : String(parseErr));
                synthesisOutput = { outcome: 'failure', failure_code: 'NO_SYNERGY' } as GeminiSynthesisOutput;
            }
        } else {
             synthesisOutput = { outcome: 'failure', failure_code: 'NO_SYNERGY' } as GeminiSynthesisOutput;
        }

        let proceedToAttempt2 = false;

        // If Attempt 1 failed
        if (synthesisOutput!.outcome === 'failure') {
            const fcode = synthesisOutput!.failure_code ?? 'NO_SYNERGY';
            console.log(`[Module B] Attempt 1 failed (${fcode}). Recording negative cache.`);
            
            await supabase.from('synthesis_cache').upsert({
                sense_uid_1: uid1, sense_uid_2: uid2, method_id: randomArchtype,
                slot_index: currentSlotIndex, result_sense_uid: null,
                word_text_a: nameA, word_text_b: nameB, meta: { is_valid: false, failure_code: fcode }
            }, { onConflict: 'sense_uid_1,sense_uid_2,method_id,slot_index', ignoreDuplicates: false }).catch((err: any) => console.error(err));

            if (fcode === 'OFFENSIVE') {
                return json({ success: false, error: { code: fcode, message: `Synthesis failed: ${fcode}` } });
            } 
            
            // UX Rescue: 如果有以前的成功存货，直接挑一个敷衍玩家（暗中抢救）
            if (successRows.length > 0) {
                console.log('[Module B] UX Rescue: returning an existing successful method to hide this failure.');
                const rescueRow = successRows[Math.floor(Math.random() * successRows.length)];
                existingUid = rescueRow.result_sense_uid;
                finalMethodId = rescueRow.method_id;
                skipCacheWrite = true; // 避免重写已有记录
            } else if (fcode === 'TOO_COMPLEX') {
                if (currentSlotIndex > 1) {
                    console.log(`[Module B] TOO_COMPLEX detected. Looking for fallback in slot_index: 1 for method_id: ${randomArchtype}.`);
                    const { data: fallbackRow } = await supabase.from('synthesis_cache')
                        .select('result_sense_uid')
                        .eq('sense_uid_1', uid1).eq('sense_uid_2', uid2)
                        .eq('slot_index', 1).eq('method_id', randomArchtype)
                        .not('result_sense_uid', 'is', null)
                        .maybeSingle();

                    if (fallbackRow?.result_sense_uid) {
                        console.log('[Module B] Fallback success! Returning lower level sense.');
                        existingUid = fallbackRow.result_sense_uid;
                    } else {
                        proceedToAttempt2 = true;
                    }
                } else {
                    proceedToAttempt2 = true;
                }
            } else { 
                proceedToAttempt2 = true;
            }
        }

        // Attempt 2: let AI self-select archetype
        if (synthesisOutput!.outcome === 'failure' && proceedToAttempt2 && !existingUid) {
            console.log('[Module B] Attempt 2 (Untethered AI).');
            const p2 = buildSynthesisPrompt({ nameA, defA, nameB, defB, systemlang, learninglang, targetLanguages: target_languages, maxLevel: max_level });
            const synthesisText2 = await callGemini({
                systemPrompt: p2.systemPrompt, userPrompt: p2.userPrompt,
                temperature: 0.7, responseMimeType: 'application/json', tag: 'moduleB-attempt2',
            });
            try {
                synthesisOutput = JSON.parse(repairJsonString(stripMarkdown(synthesisText2)));
            } catch (parseErr) {
                console.error('[Module B] JSON parse error (attempt 2):', parseErr instanceof Error ? parseErr.message : String(parseErr));
                return json({ success: false, error: { code: 'LLM_ERROR', message: 'Synthesis failed: LLM parse error' } });
            }

            if (synthesisOutput!.outcome === 'failure') {
                const fcode2 = synthesisOutput!.failure_code ?? 'NO_SYNERGY';
                console.log(`[Module B] Attempt 2 failed: ${fcode2}.`);
                return json({ success: false, error: { code: fcode2, message: `Synthesis failed: ${fcode2}` } });
            }
        }

        let resultConcept: string = '';
        let resultDefinitionEn: string = '';
        
        if (!existingUid) {
             resultConcept = synthesisOutput!.result_concept!.trim();
             resultDefinitionEn = synthesisOutput!.result_definition_en!;
             finalArchetypeUsed = synthesisOutput!.archetype_used || archetypeName;
             finalMethodId = archetypeNameToId[finalArchetypeUsed] ?? randomArchtype;
        }

        if (!existingUid) {
            // Check if concept already exists (case-insensitive)
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
        }

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
            if (!skipCacheWrite) {
                const { error: cacheWriteErr1 } = await supabase.from('synthesis_cache').upsert({
                    sense_uid_1: uid1,
                    sense_uid_2: uid2,
                    method_id: finalMethodId,
                    slot_index: currentSlotIndex,
                    result_sense_uid: existingUid,
                    word_text_a: nameA,
                    word_text_b: nameB,
                    meta: {},
                }, { onConflict: 'sense_uid_1,sense_uid_2,method_id,slot_index', ignoreDuplicates: false });
                if (cacheWriteErr1) {
                    console.error('[index] synthesis_cache INSERT error (existing sense path):', cacheWriteErr1);
                } else {
                    console.log('[index] synthesis_cache INSERT ok (existing sense path)');
                }
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
            if (!skipCacheWrite) {
                const { error: cacheWriteErr2 } = await supabase.from('synthesis_cache').upsert({
                    sense_uid_1: uid1,
                    sense_uid_2: uid2,
                    method_id: finalMethodId,
                    slot_index: currentSlotIndex,
                    result_sense_uid: senseFinal.uid,
                    word_text_a: nameA,
                    word_text_b: nameB,
                    meta: {},
                }, { onConflict: 'sense_uid_1,sense_uid_2,method_id,slot_index', ignoreDuplicates: false });
                if (cacheWriteErr2) {
                    console.error('[index] synthesis_cache INSERT error (new sense path):', cacheWriteErr2);
                } else {
                    console.log('[index] synthesis_cache INSERT ok (new sense path)');
                }
            }
        }

        console.log(`[RESULT] cached=false new=${isNewDiscovery} sense=${senseFinal?.uid ?? 'n/a'} visual=${visualFinal ? 'ready' : 'pending'} total=+${Date.now() - t0}ms`);
        console.log(`[TIMING] 9_total +${Date.now() - t0}ms`);
        return json({
            success: true,
            data: {
                sense: senseFinal,
                visual: visualFinal,
                cached: false,
                isNewDiscovery,
                archetypeUsed: finalArchetypeUsed,
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


