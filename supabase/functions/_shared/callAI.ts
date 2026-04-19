import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

/**
 * _shared/callAI.ts — 统一 AI 调用中间层
 *
 * 所有需要调用 AI 的 edge function 统一 import 此模块。
 *
 * 路由规则：
 *   - model 以 "gemini-" 开头 → Google Gemini SDK (@google/generative-ai)
 *   - 其他 → OpenRouter REST API (OpenAI 兼容格式)
 *
 * 特性：
 *   - 60s 超时守卫（防止 Edge Function 挂起）
 *   - Attempt 1 + Attempt 2 自动重试
 *   - finishReason 校验（Gemini）
 *   - responseSchema 支持（仅 Gemini，用于 generate-grimoire 等强结构输出）
 *   - OpenRouter 支持（用户选择非 Gemini 模型时自动路由）
 */

export interface CallAIParams {
    systemPrompt: string;
    userPrompt: string;
    /** model ID — 以 gemini- 开头走 Google SDK，否则走 OpenRouter */
    model?: string;
    temperature?: number;
    responseMimeType?: string;
    /**
     * Gemini responseSchema — 强制结构化输出（仅 Gemini 支持）。
     * OpenRouter 调用时此参数被忽略，由 responseMimeType='application/json' 保障。
     * 格式参考：https://ai.google.dev/api/generate-content#v1beta.Schema
     */
    responseSchema?: object;
    /** 调用方标签，用于日志追踪 */
    tag?: string;
}

// ── Timeout helper ─────────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout of ${timeoutMs}ms exceeded`)), timeoutMs);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

// ── Gemini ─────────────────────────────────────────────────────────────────────

async function callGemini(params: CallAIParams): Promise<string> {
    const {
        systemPrompt,
        userPrompt,
        model = 'gemini-3.1-flash-lite-preview',
        temperature = 1.0,
        responseMimeType = 'application/json',
        responseSchema,
        tag = 'unknown',
    } = params;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable.');

    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig: Record<string, unknown> = { temperature, responseMimeType };
    if (responseSchema) {
        generationConfig['responseSchema'] = responseSchema;
    }

    const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig,
    });

    const attemptCall = async () => {
        const result = await fetchWithTimeout(generativeModel.generateContent(userPrompt), 60000);
        const candidate = result.response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const text = result.response.text();
        console.log(`[callGemini:${tag}] response ${text.length} chars (finishReason=${finishReason}): ${text.slice(0, 2000)}${text.length > 2000 ? '...(truncated)' : ''}`);
        if (finishReason && finishReason !== 'STOP') {
            throw new Error(`Gemini generation incomplete: finishReason=${finishReason} (model=${model})`);
        }
        return text;
    };

    try {
        return await attemptCall();
    } catch (error) {
        console.error(`[callGemini:${tag}] Attempt 1 failed: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        try {
            return await attemptCall();
        } catch (retryError) {
            console.error(`[callGemini:${tag}] Attempt 2 failed: ${retryError instanceof Error ? retryError.message : String(retryError)}.`);
            throw retryError;
        }
    }
}

// ── OpenRouter ─────────────────────────────────────────────────────────────────

async function callOpenRouter(params: CallAIParams): Promise<string> {
    const {
        systemPrompt,
        userPrompt,
        model,
        temperature = 1.0,
        responseMimeType = 'application/json',
        tag = 'unknown',
        // responseSchema is not supported by OpenRouter; JSON mode is handled via response_format
    } = params;

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY environment variable.');

    const body: Record<string, unknown> = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature,
    };

    if (responseMimeType === 'application/json') {
        body.response_format = { type: 'json_object' };
    }

    const attemptCall = async () => {
        const res = await fetchWithTimeout(
            fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': 'Lexicoin',
                },
                body: JSON.stringify(body),
            }),
            60000,
        );

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? '';
        const finishReason = data?.choices?.[0]?.finish_reason;
        console.log(`[callOpenRouter:${tag}] response ${text.length} chars (finish_reason=${finishReason}): ${text.slice(0, 2000)}${text.length > 2000 ? '...(truncated)' : ''}`);
        if (!text) throw new Error(`OpenRouter returned empty content (model=${model})`);
        return text;
    };

    try {
        return await attemptCall();
    } catch (error) {
        console.error(`[callOpenRouter:${tag}] Attempt 1 failed: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        try {
            return await attemptCall();
        } catch (retryError) {
            console.error(`[callOpenRouter:${tag}] Attempt 2 failed: ${retryError instanceof Error ? retryError.message : String(retryError)}.`);
            throw retryError;
        }
    }
}

// ── Unified entry ──────────────────────────────────────────────────────────────

/**
 * 统一 AI 调用入口。
 *
 * @param params.model       model ID。以 "gemini-" 开头走 Google SDK，否则走 OpenRouter。
 *                           未传时默认使用 'gemini-3.1-flash-lite-preview'。
 * @param params.responseSchema  仅 Gemini 支持。传入时启用强结构化输出。
 */
export async function callAI(params: CallAIParams): Promise<string> {
    const model = params.model ?? 'gemini-3.1-flash-lite-preview';
    if (model.startsWith('gemini-')) {
        return callGemini({ ...params, model });
    }
    return callOpenRouter({ ...params, model });
}
