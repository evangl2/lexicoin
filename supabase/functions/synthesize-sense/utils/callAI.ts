import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

interface CallAIParams {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    responseMimeType?: string;
    /** Caller label for logging */
    tag?: string;
}

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

// ── Gemini ────────────────────────────────────────────────────────────────────

async function callGemini(params: CallAIParams): Promise<string> {
    const {
        systemPrompt,
        userPrompt,
        model = 'gemini-3.1-flash-lite-preview',
        temperature = 1.0,
        responseMimeType = 'application/json',
        tag = 'unknown',
    } = params;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: { temperature, responseMimeType },
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
        console.error(`[callGemini] Attempt 1 failed: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        try {
            return await attemptCall();
        } catch (retryError) {
            console.error(`[callGemini] Attempt 2 failed: ${retryError instanceof Error ? retryError.message : String(retryError)}.`);
            throw retryError;
        }
    }
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

async function callOpenRouter(params: CallAIParams): Promise<string> {
    const {
        systemPrompt,
        userPrompt,
        model,
        temperature = 1.0,
        responseMimeType = 'application/json',
        tag = 'unknown',
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
        console.error(`[callOpenRouter] Attempt 1 failed: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        try {
            return await attemptCall();
        } catch (retryError) {
            console.error(`[callOpenRouter] Attempt 2 failed: ${retryError instanceof Error ? retryError.message : String(retryError)}.`);
            throw retryError;
        }
    }
}

// ── Unified entry ─────────────────────────────────────────────────────────────

/**
 * 统一 AI 调用入口。
 * - model 以 "gemini-" 开头 → Google Gemini API
 * - 其他 → OpenRouter（OpenAI 兼容格式）
 */
export async function callAI(params: CallAIParams): Promise<string> {
    const model = params.model ?? 'gemini-3.1-flash-lite-preview';
    if (model.startsWith('gemini-')) {
        return callGemini({ ...params, model });
    }
    return callOpenRouter({ ...params, model });
}
