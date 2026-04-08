import { createClient } from 'npm:@supabase/supabase-js';

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

Deno.serve(async (req: Request) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json().catch(() => ({}));
        const { 
            visual_id = 'default', 
            discoverer_user_id = 'system', 
            dry_run = false,
            limit = 50 
        } = body;

        console.log(`[backfill-visuals] Start. visual_id=${visual_id}, dry_run=${dry_run}, limit=${limit}`);

        // 1. Efficiently find senses missing the specified visual
        // We use a query that selects senses that DON'T have a successful visual entry for the given ID.
        // Since Supabase JS subqueries are tricky, we'll use a single robust query via .select() with a filter
        // OR a simpler 'not.in' with a prepared list of IDs if the count is manageable.
        // For maximum scale, a raw RPC or a View would be best, but here we can use a join-like filter:
        
        const { data: missing, error: queryError } = await supabase
            .rpc('get_senses_missing_visuals', { 
                p_visual_id: visual_id,
                p_limit: limit
            });

        // Check if RPC exists, otherwise fallback to the JS-filtered version but with better paging
        let missingSenses = missing;
        if (queryError || !missing) {
            console.warn(`[backfill-visuals] RPC 'get_senses_missing_visuals' not found or failed. Falling back to manual filtering...`);
            
            // Fallback: Get all senses and all successful visuals, then diff.
            // (Only suitable for < 1000 senses, which is fine for current app state)
            const { data: allSenses } = await supabase.from('senses').select('uid, meaning').limit(limit);
            const { data: existing } = await supabase
                .from('sense_visuals')
                .select('sense_id')
                .eq('id', visual_id)
                .or('meta->>status.is.null,meta->>status.neq.failed');
            
            const existingIds = new Set(existing?.map(v => v.sense_id) || []);
            missingSenses = allSenses?.filter(s => !existingIds.has(s.uid)) || [];
        }

        console.log(`[backfill-visuals] Identified ${missingSenses.length} senses needing visuals.`);

        if (dry_run) {
            return json({
                total_missing: missing.length,
                missing_ids: missing.map(m => m.uid),
                message: 'Dry run completed. No actions taken.'
            });
        }

        const results = [];
        let succeeded = 0;
        let failed = 0;

        // 2. Process each sense sequentially
        for (const sense of missing) {
            try {
                // Get definition
                const definition = sense.meaning?.en?.value || 'No definition found';

                // Get concept (from shells)
                const { data: shellData } = await supabase
                    .from('sense_word_shells')
                    .select('shells')
                    .eq('sense_id', sense.uid)
                    .single();
                
                const concept = shellData?.shells?.en?.[0]?.text?.value || 'unknown';

                console.log(`[backfill-visuals] Processing sense=${sense.uid} concept="${concept}"`);

                // Call generate-visual
                const genUrl = `${supabaseUrl}/functions/v1/generate-visual`;
                const resp = await fetch(genUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sense_id: sense.uid,
                        visual_id,
                        concept,
                        definition,
                        discoverer_user_id,
                        corr_id: `backfill-${Date.now()}`
                    })
                });

                const outcome = await resp.json();

                if (resp.ok && outcome.success) {
                    succeeded++;
                    results.push({ sense_id: sense.uid, concept, status: 'ok' });
                } else {
                    failed++;
                    results.push({ sense_id: sense.uid, concept, status: 'failed', error: outcome.error || 'Unknown error' });
                }

                // Wait a bit between calls for safety? 
                // generate-visual itself takes ~30s, so concurrency is naturally limited.
            } catch (err) {
                failed++;
                results.push({ sense_id: sense.uid, status: 'error', error: String(err) });
            }
        }

        return json({
            total: missing.length,
            processed: results.length,
            succeeded,
            failed,
            results
        });

    } catch (err) {
        return json({ error: String(err) }, 500);
    }
});
