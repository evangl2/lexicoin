import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { generateSense } from './moduleA.ts';
import { callGemini } from './utils/gemini.ts';
import { buildSynthesisPrompt, ARCHETYPES } from '../../../src/core/api/SynthesisPromptsBackend.ts';
import { buildDeltaPrompt, DeltaMissing } from '../../../src/core/api/DeltaPromptBackend.ts';
import { buildVisualPrompt } from '../../../src/core/api/VisualPromptsBackend.ts';
import { injectSenseMeta } from '../../../src/core/api/injectSenseMeta.ts';
import { SynthesisRequest, GeminiSynthesisOutput, SenseAIPayload, RawSenseAIOutput } from './types.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const _genderedLangs = new Set(['fr', 'de', 'es', 'it', 'pt']);
const _verbGroupLangs = new Set(['fr', 'es', 'it', 'pt']);

serve(async (req: Request) => {
    // 1. CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: SynthesisRequest = await req.json();
        const {
            input_1_id,
            input_2_id,
            lang,
            max_level = 'B2',
            target_languages = ['en'],
            personaId = 'default',
            personaNarrative,
            visual_id = 'default'
        } = body;

        // ① UUID 格式验证 + 非空检查
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!input_1_id || !input_2_id || !uuidRegex.test(input_1_id) || !uuidRegex.test(input_2_id)) {
            return new Response(JSON.stringify({ error: 'INVALID_INPUT', message: 'Missing or invalid UUIDs' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        const sortedUids = [input_1_id, input_2_id].sort();

        // ② 初始化 Supabase Client (Service Role for Admin read/writes, user identity in context if passed)
        // Assume req has user identity optionally, but here we run elevated DB tasks
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Mock discoverer ID for Edge func (if not passing auth correctly)
        // Normally extract from req headers via anon key auth token
        const discovererUserId = '00000000-0000-0000-0000-000000000000';

        // ③ 查 synthesis_cache (hit or miss)
        // method_id = 1 (default standard merge) slot_index = 1
        const { data: cacheRow, error: cacheErr } = await supabaseAdmin
            .from('synthesis_cache')
            .select('sense_id, synthesis_reason')
            .eq('uid1_sorted', sortedUids[0])
            .eq('uid2_sorted', sortedUids[1])
            .eq('method_id', 1)
            .eq('slot_index', 1)
            .maybeSingle();

        if (cacheErr && cacheErr.code !== 'PGRST116') {
            console.error('Cache Query Error:', cacheErr);
            throw new Error('DATABASE_ERROR');
        }

        if (cacheRow && cacheRow.sense_id) {
            // ④ Cache Hit 聚合逻辑
            const { data: senseRow } = await supabaseAdmin.from('senses').select('*').eq('uid', cacheRow.sense_id).single();
            const { data: shellRow } = await supabaseAdmin.from('sense_word_shells').select('*').eq('sense_id', cacheRow.sense_id).maybeSingle();
            const { data: visuals } = await supabaseAdmin.from('sense_visuals').select('*').eq('sense_id', cacheRow.sense_id);
            const { data: flavors } = await supabaseAdmin.from('sense_flavor_texts').select('*').eq('sense_id', cacheRow.sense_id);

            if (!senseRow) {
                // Orphaned cache handle
                throw new Error('ORPHANED_CACHE');
            }

            const existingShells = shellRow?.shells || {};
            const existingTraits = shellRow?.traits || {};
            const existingWordFamily = senseRow.word_family || {};
            const activeVisual = visuals?.find(v => v.id === visual_id);
            const activeFlavor = flavors?.find(f => f.persona === personaId);

            // 检查版本升级缺失 (Delta)
            const missing: DeltaMissing = {
                langs: [],
                personas: [],
                wordFamilyLangs: [],
                traitLangs: []
            };

            for (const tl of target_languages) {
                if (!existingShells[tl] || !senseRow.meaning?.[tl]) {
                    missing.langs.push(tl);
                } else {
                    if (!existingWordFamily[tl]) {
                        missing.wordFamilyLangs.push(tl);
                    }
                    // Traits Check - minimal validation
                    const shellValues = Object.values(existingShells);
                    const pos = shellValues.length > 0 ? (shellValues[0] as any).pos.value || 'n.' : 'n.';
                    const traitList = existingTraits[tl] || [];
                    let traitMissing = false;

                    if (pos === 'n.' && _genderedLangs.has(tl)) {
                        if (!traitList.some((t: any) => t.traitId === 'gender')) traitMissing = true;
                    } else if ((pos === 'v.' || pos === 'v.i.' || pos === 'v.t.') && _verbGroupLangs.has(tl)) {
                        if (!traitList.some((t: any) => t.traitId === 'verb_group')) traitMissing = true;
                    }

                    if (traitMissing) {
                        missing.traitLangs.push(tl);
                    }
                }
            }

            if (!activeFlavor && missing.langs.length === 0) { // If langs is empty, it means we don't naturally fetch the new persona
                missing.personas.push(personaId);
            }

            // Sync blocking Delta check
            let updatedPayload: any = null; // Normally we'd deep merge the db records + delta generated ones
            const totalMissing = missing.langs.length + missing.personas.length + missing.wordFamilyLangs.length + missing.traitLangs.length;

            if (totalMissing > 0) {
                // Here we might normally implement a DB level short-lived lock [sense_id_delta_lock].
                console.log('Delta Triggered for cache hit:', missing);
                const exShellsAnchor = Object.fromEntries(
                    Object.entries(existingShells).map(([k, v]: [string, any]) => [k, typeof v.text === 'object' ? v.text.value : v.text])
                );

                const { systemPrompt: sys, userPrompt: usr } = buildDeltaPrompt({
                    concept: senseRow.concept || 'Unknown',
                    definition: senseRow.meaning?.['en']?.value || '', // Simplified definition fetch for prompt
                    existingShells: exShellsAnchor,
                    missing,
                    personaId,
                    personaNarrative
                });

                const rawDelta = await callGemini({ systemPrompt: sys, userPrompt: usr });
                const deltaJson = injectSenseMeta(JSON.parse(rawDelta.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim()));
                // UPSERT delta updates - left simplified as this is a skeleton router pattern
                // We assume `deltaJson` correctly aligns with SenseAIPayload 
            }

            // Non-blocking Visual Check
            if (!activeVisual) {
                (async () => {
                    try {
                        const { systemPrompt: vSys, userPrompt: vUser } = buildVisualPrompt({
                            concept: senseRow.concept || 'Unknown',
                            definition: senseRow.meaning?.['en']?.value || '',
                            visualId: visual_id
                        });
                        const visualRawText = await callGemini({ systemPrompt: vSys, userPrompt: vUser });
                        let code = visualRawText.split('// --- CODE BELOW ---')[1]?.trim() || visualRawText.trim();
                        code = code.replace(/^```(tsx|jsx|ts|js)?\n/i, '').replace(/\n```$/, '').trim();

                        await supabaseAdmin.from('sense_visuals').insert({
                            sense_id: cacheRow.sense_id,
                            id: visual_id,
                            payload: code,
                            meta: { stability: 50.0, firstDiscoverer: discovererUserId, firstDiscoveredAt: Date.now() }
                        });
                    } catch (e) { }
                })();
            }

            return new Response(JSON.stringify({
                synthesisReason: cacheRow.synthesis_reason,
                sense: { ...senseRow, shells: shellRow?.shells }, // Simplified output assembly
                visual: activeVisual || null,
                cached: true
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ⑤ Cache Miss 流程

        // Fetch definition of the two roots to provide to SynthesisPrompt
        // (Assuming senses table stores all base roots too)
        const { data: r1 } = await supabaseAdmin.from('senses').select('concept, meaning').eq('uid', sortedUids[0]).maybeSingle();
        const { data: r2 } = await supabaseAdmin.from('senses').select('concept, meaning').eq('uid', sortedUids[1]).maybeSingle();

        if (!r1 || !r2) throw new Error('INPUT_NOT_FOUND');

        const defA = r1.meaning?.['en']?.value || 'Unknown';
        const defB = r2.meaning?.['en']?.value || 'Unknown';

        // Attempt 1: Contextual Archetype (pick randomly 1-6)
        const randomArchetype = Math.floor(Math.random() * 6) + 1;
        const p1 = buildSynthesisPrompt({
            nameA: r1.concept, defA,
            nameB: r2.concept, defB,
            lang: target_languages[0] || 'en',
            maxLevel: max_level,
            archetype: randomArchetype as any
        });

        let outputText = await callGemini({ systemPrompt: p1.systemPrompt, userPrompt: p1.userPrompt });
        let aijson: GeminiSynthesisOutput = JSON.parse(outputText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim());

        if (aijson.outcome === 'failure') {
            // Attempt 2: Free AI (no archetype limit)
            const p2 = buildSynthesisPrompt({
                nameA: r1.concept, defA,
                nameB: r2.concept, defB,
                lang: target_languages[0] || 'en',
                maxLevel: max_level
            });
            outputText = await callGemini({ systemPrompt: p2.systemPrompt, userPrompt: p2.userPrompt });
            aijson = JSON.parse(outputText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim());

            if (aijson.outcome === 'failure') {
                return new Response(JSON.stringify({ error: 'NO_SYNERGY', message: 'The elements cannot be synthesized together rationally.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                });
            }
        }

        // 去重检查
        const exactConcept = aijson.result_concept.trim();
        const { data: dupe } = await supabaseAdmin.from('senses').select('uid').ilike('concept', exactConcept).maybeSingle();

        let coreOutputData;

        if (dupe) {
            // It's a late cache hit essentially
            const { data: senseRow } = await supabaseAdmin.from('senses').select('*').eq('uid', dupe.uid).single();
            // Assuming simplified response as cache
            coreOutputData = { sense: { ...senseRow }, visual: null };

            // Record this combination in cache to point to existing entity
            await supabaseAdmin.from('synthesis_cache').insert({
                uid1_sorted: sortedUids[0],
                uid2_sorted: sortedUids[1],
                method_id: 1,
                slot_index: 1,
                sense_id: dupe.uid,
                synthesis_reason: aijson.synthesis_reason
            });
        } else {
            // Fresh Generate
            coreOutputData = await generateSense(
                aijson.result_concept,
                aijson.result_definition_en,
                body,
                discovererUserId,
                supabaseAdmin
            );

            await supabaseAdmin.from('synthesis_cache').insert({
                uid1_sorted: sortedUids[0],
                uid2_sorted: sortedUids[1],
                method_id: 1,
                slot_index: 1,
                sense_id: coreOutputData.sense.uid,
                synthesis_reason: aijson.synthesis_reason
            });
        }

        return new Response(JSON.stringify({
            synthesisReason: aijson.synthesis_reason,
            sense: coreOutputData.sense,
            visual: coreOutputData.visual,
            cached: false
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('Edge function caught error:', error);
        const errType = error.message === 'DATABASE_ERROR' ? 'DATABASE_ERROR' :
            error.message === 'INPUT_NOT_FOUND' ? 'INPUT_NOT_FOUND' : 'GENERATION_FAILED';
        return new Response(JSON.stringify({ error: errType, message: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: errType === 'INPUT_NOT_FOUND' ? 404 : 500
        });
    }
});
