import { GoogleGenerativeAI } from 'npm:@google/generative-ai';

interface CallGeminiParams {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;
    responseMimeType?: string;
    maxTokens?: number;
    /** Caller label for logging (e.g. 'moduleB', 'moduleA-sense', 'moduleA-visual') */
    tag?: string;
}

/**
 * Helper to call Gemini AI with a timeout.
 */
async function fetchWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    let timer: number | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * 封装对 Google Gemini API 的调用。
 * 支持传入 systemPrompt 和 userPrompt，默认使用 gemini-3.1-flash-lite-preview 模型。
 * 包含 1 次自动重试和 60s 超时控制。
 */
export async function callGemini(params: CallGeminiParams): Promise<string> {
    const {
        systemPrompt,
        userPrompt,
        model = 'gemini-3.1-flash-lite-preview',
        temperature = 1.0,
        responseMimeType = 'application/json',
        maxTokens = 10000,
        tag = 'unknown',
    } = params;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY environment variable.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({
        model,
        systemInstruction: systemPrompt,
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType,
        },
    });

    const attemptCall = async () => {
        const result = await fetchWithTimeout(
            generativeModel.generateContent(userPrompt),
            60000 // 60 seconds timeout
        );
        const candidate = result.response.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const text = result.response.text();
        console.log(`[callGemini:${tag}] response ${text.length} chars (finishReason=${finishReason}): ${text.slice(0, 2000)}${text.length > 2000 ? '...(truncated)' : ''}`);
        if (finishReason && finishReason !== 'STOP') {
            throw new Error(`Gemini generation incomplete: finishReason=${finishReason}`);
        }
        return text;
    };

    try {
        // Attempt 1
        return await attemptCall();
    } catch (error) {
        console.error(`[callGemini] Attempt 1 failed: ${error instanceof Error ? error.message : String(error)}. Retrying...`);
        // Attempt 2 (1 retry)
        try {
            return await attemptCall();
        } catch (retryError) {
            console.error(`[callGemini] Attempt 2 failed: ${retryError instanceof Error ? retryError.message : String(retryError)}.`);
            throw retryError;
        }
    }
}
