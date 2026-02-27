import { callGemini } from './utils/gemini.ts';
import { buildSensePrompt } from '../../../src/core/api/SensePromtBackend.ts';
import { buildVisualPrompt } from '../../../src/core/api/VisualPromptsBackend.ts';
// We assume we can import these ts files directly in Deno as long as paths resolve
import { injectSenseMeta } from '../../../src/core/api/injectSenseMeta.ts';
import { RawSenseAIOutput, SenseAIPayload, SynthesisRequest } from './types.ts';

// Web crypto API runs in Deno Edge Functions
export const generateUUID = () => crypto.randomUUID();

/**
 * 验证并清理 AI 返回的 JSON 字符串
 */
function parseGeminiJson<T>(rawText: string): T {
    // 移除可能存在的 markdown 代码块
    const cleaned = rawText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
    return JSON.parse(cleaned) as T;
}

/**
 * Basic security / structure check for generated TSX payload
 */
function validateVisualPayload(payload: string): boolean {
    // Check if it exports default
    if (!payload.includes('export default')) return false;
    // Disallow hooks as per secure rules
    if (payload.includes('useEffect') || payload.includes('useState')) {
        console.warn('VisualPrompt validation failed: found hooks hook');
        // Currently we just log, but let's strictly reject it
        return false;
    }
    return true;
}

/**
 * Module A: 核心 Sense 生成业务流
 * - 调用 SensePrompt 生成概念本身 (Blocking)
 * - 注入 Meta, 写入 3 张表 (senses, sense_word_shells, sense_flavor_texts)
 * - 立刻返回已生成的 Sense 内容
 * - 后台异步触发 VisualPrompt (Non-blocking), 并写 sense_visuals
 */
export async function generateSense(
    concept: string,
    definition: string,
    request: SynthesisRequest,
    discovererUserId: string,
    supabaseAdmin: any // uses service_role client for DB inserts
): Promise<{ sense: SenseAIPayload & { uid: string }; visual: any }> {
    const { max_level = 'B2', target_languages = ['en'], personaId = 'default', personaNarrative, visual_id = 'default' } = request;

    // ① 生成新 UID
    const uid = generateUUID();

    // ② 构建并发送 Sense Prompt
    const { systemPrompt, userPrompt } = buildSensePrompt({
        concept,
        definition,
        maxLevel: max_level,
        target_languages,
        personaId,
        personaNarrative
    });

    const aiRawText = await callGemini({ systemPrompt, userPrompt });

    // ③ 解析 JSON 并注入 UID
    let rawJson: RawSenseAIOutput;
    try {
        rawJson = parseGeminiJson<RawSenseAIOutput>(aiRawText);
    } catch (err) {
        console.error('Failed to parse Sense AI JSON:', aiRawText);
        throw new Error('GENERATION_FAILED');
    }

    // 立即调用 injectSenseMeta 注入 `{ stability: 100.0 }` 等元数据
    const sensePayload: SenseAIPayload = injectSenseMeta(rawJson);

    const now = Date.now();

    // ④ 写入 DB
    // A. senses 表
    const { error: senseError } = await supabaseAdmin.from('senses').insert({
        uid,
        fingerprint: sensePayload.fingerprint.value, // value extract
        ontology: sensePayload.ontology.value,
        meaning: Object.fromEntries(Object.entries(sensePayload.meaning).map(([k, v]) => [k, v.value])),
        frequency: sensePayload.frequency.value,
        // word_family 使用注入 meta 后的完整字段
        word_family: sensePayload.wordFamily,

        // 核心：由后端在这里直接写入第一发现人元数据，防篡改
        meta: {
            firstDiscoverer: discovererUserId,
            firstDiscoveredAt: now,
        }
    });

    if (senseError) {
        console.error('Failed to insert senses DB', senseError);
        throw new Error('GENERATION_FAILED');
    }

    // B. sense_word_shells 表
    const { error: shellsError } = await supabaseAdmin.from('sense_word_shells').insert({
        sense_id: uid,
        shells: sensePayload.shells, // 包含 meta 注入后的整个 shells 对象
        traits: sensePayload.traits || null // traits 可能可选
    });

    if (shellsError) {
        console.error('Failed to insert sense_word_shells DB', shellsError);
        // Best effort continuation or abort? Usually better to fail loudly.
        throw new Error('GENERATION_FAILED');
    }

    // C. sense_flavor_texts 表
    // 每 persona 插入一行
    const flavorInserts = sensePayload.flavorText.map((flavor: any) => ({
        sense_id: uid,
        persona: flavor.persona,
        texts: Object.fromEntries(Object.entries(flavor.text).map(([k, v]: [string, any]) => [k, v.value])),
        examples: Object.fromEntries(Object.entries(flavor.example).map(([k, v]: [string, any]) => [k, v.value])),
    }));

    if (flavorInserts.length > 0) {
        const { error: flavorError } = await supabaseAdmin.from('sense_flavor_texts').insert(flavorInserts);
        if (flavorError) console.error('Failed to insert sense_flavor_texts DB', flavorError);
    }

    // ⑤ 异步 Non-blocking Visual 补全
    // Fire and forget
    (async () => {
        try {
            const { systemPrompt: vSys, userPrompt: vUser } = buildVisualPrompt({
                concept,
                definition,
                visualId: visual_id
            });
            const visualRawText = await callGemini({ systemPrompt: vSys, userPrompt: vUser });

            // Extract code:
            const codeMatch = visualRawText.split('// --- CODE BELOW ---');
            let code = codeMatch.length > 1 ? codeMatch[1].trim() : visualRawText.trim();
            // remove markdown wrappers if any
            code = code.replace(/^```(tsx|jsx|ts|js)?\n/i, '').replace(/\n```$/, '').trim();

            if (validateVisualPayload(code)) {
                // 写 DB
                const { error: visErr } = await supabaseAdmin.from('sense_visuals').insert({
                    sense_id: uid,
                    id: visual_id,
                    payload: code,
                    meta: {
                        stability: 50.0,
                        firstDiscoverer: discovererUserId,
                        firstDiscoveredAt: now
                    }
                });
                if (visErr) console.error('Silent failure writing visual DB:', visErr);
            }
        } catch (e) {
            console.error('Silent failure in Visual async task:', e);
        }
    })();

    // ⑥ 立即返回核心文本结构
    return {
        sense: { ...sensePayload, uid },
        visual: null // loading placeholder
    };
}
