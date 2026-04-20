# Edge Function AI 调用中间层 (`supabase/functions/_shared/callAI.ts`)

统一入口，替代各 Edge Function 内的内联 AI 调用逻辑。所有需要调用 AI 的函数必须 import 此模块。

## 路由规则

| `model` 参数 | 后端 | 所需 env var |
|-------------|------|-------------|
| 以 `gemini-` 开头 | Google Generative AI SDK (`@google/generative-ai`) | `GEMINI_API_KEY` |
| 其他 | OpenRouter REST API（OpenAI 兼容格式） | `OPENROUTER_API_KEY` |

默认 model（未传时）：`gemini-3.1-flash-lite-preview`。

## 接口

```typescript
export interface CallAIParams {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    temperature?: number;         // default 1.0
    responseMimeType?: string;    // default 'application/json'
    responseSchema?: object;      // 仅 Gemini 支持；强结构化输出
    tag?: string;                 // 日志追踪标签
}

export async function callAI(params: CallAIParams): Promise<string>
```

## 主要特性

- **60 s 超时**：防止 Edge Function 永久挂起
- **自动重试**：Attempt 1 失败后自动 Attempt 2；两次均失败则抛出
- **`responseSchema`**：仅 Gemini 支持，用于强结构化 JSON 输出（如 `generate-grimoire`）
- **OpenRouter JSON 模式**：`responseMimeType='application/json'` 时自动设置 `response_format: {type:'json_object'}`
- **Gemini `finishReason` 校验**：非 `STOP` 的完成原因视为失败并触发重试

## 消费方

- `evaluate-grimoire/index.ts`
- `generate-grimoire/index.ts`
- `synthesize-sense/index.ts`
