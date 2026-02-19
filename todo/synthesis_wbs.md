# 合成词语功能 — WBS 工作分解结构 v2

> **团队**：1 人类 + 1 AI · **顺序**：底层数据 → 核心逻辑 → 前端组件 → 联调测试

---

## Phase 0: 环境准备

### 0.1 ·【人类】配置 Supabase Edge Function Secrets

**前置**：无
**操作**：Supabase Dashboard → Settings → Edge Functions → Secrets，添加：
- `GEMINI_API_KEY` = `AIzaSyCM9Qwr9sNH079AlV96ZBT6mLdytuCAH6E`
- （`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_URL` 运行时自动注入无需手动配）

**产出**：`Deno.env.get('GEMINI_API_KEY')` 可读

---

### 0.2 ·【人类】配置前端环境变量

**前置**：无（并行）
**操作**：`lexicoin/.env` 添加：
```
VITE_SUPABASE_URL=https://leehstoygnmmofpznsvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZWhzdG95Z25tbW9mcHpuc3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODA3NDIsImV4cCI6MjA4Mzc1Njc0Mn0.mTWgWWKiEfNjhEmJOGsk_8nw25ciO53xN9axZZGFFkI
```

---

### 0.3 ·【人类】安装前端依赖

```bash
cd lexicoin && npm install @supabase/supabase-js
```

---

### 0.4 ·【AI 任务】导入 8 个种子 Sense + Visual 到 Supabase DB

**前置**：0.1
**输入**：`schemas/data/initialSenses.ts`（8 个 SenseEntity）+ `schemas/data/InitialItem/`（8 个 VisualEntry）

> [!TIP]
> **Prompt 关键词**：「读取 `schemas/data/initialSenses.ts` 的 8 个 SenseEntity 和 `schemas/data/InitialItem/` 的 8 个 VisualEntry。为每个 Sense 生成 SQL INSERT 语句写入 Supabase 的 `senses`、`sense_word_shells`、`sense_visuals`、`sense_flavor_texts` 表。注意 DB 列名映射：`sense_visuals.svg` = `VisualEntry.payload`，`sense_visuals.visual_id` = `VisualEntry.id`，`sense_word_shells.shells` = 打包 JSONB，`sense_flavor_texts.translations` = 打包多语言文本。通过 MCP 的 `apply_migration` 工具执行。」

**产出**：DB 中有 8 行 `senses` + 对应的 shells/visuals/flavors 数据
**验证**：`SELECT count(*) FROM senses` = 8

---

## Phase 1: Prompt 工程改造

### 1.1 ·【AI 任务】SynthesisPrompt 动态模板

**前置**：0.1
**输入**：[SynthesisPrompt.txt](file:///a:/lexicoin/lexicoin/prompt/SynthesisPrompt.txt)
**产出**：`prompts.ts` 中的 `buildSynthesisPrompt()` 函数

> [!TIP]
> **Prompt 关键词**：「基于 `prompt/SynthesisPrompt.txt`，写 `buildSynthesisPrompt(params: { nameA, defA, nameB, defB, lang, maxLevel })` 返回 `{ systemPrompt, userPrompt }`。改动：①去掉 Active 标记让 AI 自选最佳 Archetype；②去掉 `${VISUAL_GENERATION_RULES}` 和 `${getLinguisticRules()}`（视觉由独立调用处理）；③输出 JSON schema = `{ outcome, result_concept, result_definition_en, archetype_used, failure_code }`；④Cultural Lens 段保留，使用 `lang` 参数切换文化认知。Prompt 本身用英文，输出数据在 `lang` 影响下可能有文化倾向。」

**验证**：函数可编译，prompt 字符串包含 5 种 Archetype 且无 Active 标记

---

### 1.2 ·【AI 任务】SensePrompt Persona 动态模板

**前置**：无
**输入**：[SensePrompt.txt](file:///a:/lexicoin/lexicoin/prompt/SensePrompt.txt)

> [!TIP]
> **Prompt 关键词**：「基于 `prompt/SensePrompt.txt`，写 `buildSensePrompt(params: { concept, definition, languages: string[], persona })` 返回 `{ systemPrompt, userPrompt }`。改动：①Section C 根据 persona 注入写作风格指令（default/LOGICIAN/POET/ALCHEMIST/MYSTIC）；②`languages` 数组控制只生成哪些语言（初期只传 `['en', lang]`）；③输出 JSON 对齐 `SenseEntity.schema.ts`（不含 qualia 和 uid——**UID 由后端 gen_random_uuid() 生成，不在 prompt 输出中**）。」

**验证**：传不同 persona 后 Section C 内容有差异

---

### 1.3 ·【AI 任务】VisualPrompt 安全模板

**前置**：无（并行）
**输入**：[VisualPrompt.txt](file:///a:/lexicoin/lexicoin/prompt/VisualPrompt.txt)

> [!TIP]
> **Prompt 关键词**：「基于 `prompt/VisualPrompt.txt`，写 `buildVisualPrompt(params: { concept, definition, ontology })` 返回 `{ systemPrompt, userPrompt }`。额外加入安全约束段：禁止 hooks（useEffect/useState/useRef），仅允许 `import { motion } from 'motion/react'`，必须 export default，字符上限 3000。此 prompt 是**异步非阻塞**的，生成失败不影响合成结果。」

**验证**：输出 system prompt 包含安全约束段

---

## Phase 2: 后端 Edge Function

### 2.1 ·【AI 任务】Gemini SDK 封装 (`gemini.ts`)

**前置**：1.1
**产出**：Deno 兼容的 `gemini.ts`

> [!TIP]
> **Prompt 关键词**：「为 Supabase Edge Function（Deno）写 `gemini.ts`。使用 `npm:@google/generative-ai` SDK。封装 `callGemini(params: { systemPrompt, userPrompt, model?, temperature?, responseMimeType?, maxTokens? })` 函数。默认 model 为 `gemini-3.0-flash`。从 `Deno.env.get('GEMINI_API_KEY')` 读密钥。返回 `string`（自动解析 JSON 或返回纯文本）。含 1 次自动重试和超时处理。」

---

### 2.2 ·【AI 任务】类型定义 (`types.ts`)

**前置**：TDD v2
**产出**：Edge Function 内部共享类型

> [!TIP]
> **Prompt 关键词**：「写 `types.ts`，定义：SynthesisRequest, SynthesisSuccessResponse, SynthesisFailureResponse, SynthesisErrorCode, GeminiSynthesisOutput(`{ outcome, result_concept, result_definition_en, archetype_used, failure_code }`), ArchetypeId(1-6 映射)。注意 visual 字段可为 null（非阻塞生成）。对齐 TDD v2 API 接口定义。」

---

### 2.3 ·【AI 任务】Module A — Sense 生成 (`moduleA.ts`)

**前置**：1.2, 1.3, 2.1, 2.2
**产出**：`moduleA.ts` 的 `generateSense()` 函数

> [!TIP]
> **Prompt 关键词**：「写 `moduleA.ts` 的 `generateSense(concept, definition, lang, supabaseAdmin)`。流程：①用 `supabaseAdmin.rpc('gen_random_uuid')` 或 SQL 生成新 UID；②调 `callGemini(buildSensePrompt)` 获取 SenseEntity JSON；③解析并注入 UID；④写入 DB（senses, sense_word_shells, sense_flavor_texts）——注意 DB 列名映射：shells 打包为 JSONB 行，flavor_texts 用 translations 列和 global_meta 列；⑤**异步**调 `callGemini(buildVisualPrompt)` 写入 sense_visuals（svg 列 = payload）——此步骤不阻塞返回；⑥返回 `{ sense, visual: null }`（visual 异步补全后可能会有值）。」

**验证**：SQL INSERT 对齐实际 DB 列名

---

### 2.4 ·【AI 任务】Edge Function 入口 (`index.ts`)

**前置**：1.1, 2.1, 2.2, 2.3
**产出**：`index.ts`

> [!TIP]
> **Prompt 关键词**：「写 `index.ts`。`Deno.serve` 接收 POST `{ input_1_id, input_2_id, lang, max_level? }`。流程：①UUID 验证 + 字典序排序；②`createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`；③查 synthesis_cache 的 `(uid1_sorted, uid2_sorted, method_id=1, slot_index=1)`；④Cache Hit：聚合 senses+shells+visuals+flavors 返回；⑤Cache Miss：查两个 input 的英文名和定义（`sense_word_shells WHERE lang='en'` + `senses.meaning->'en'->>'value'`），调 `callGemini(SynthesisPrompt)`，检查概念已存在否，不存在调 `generateSense()`，写 synthesis_cache（slot_index=1, meta='{}'）；⑥返回 TDD 定义的 Response。CORS headers。」

**验证**：覆盖 Cache Hit / Cache Miss / 合成失败三条路径

---

### 2.5 ·【人类 + AI】部署 Edge Function 并验证

**前置**：2.1-2.4 + 0.4（DB有种子数据）
**操作**：
1. AI 通过 MCP `deploy_edge_function` 部署
2. 人类在 Dashboard 确认部署成功
3. curl 测试：
   ```bash
   curl -X POST .../functions/v1/synthesize-sense \
     -H "Authorization: Bearer <ANON_KEY>" \
     -d '{"input_1_id":"<FIRE_UID>","input_2_id":"<WATER_UID>","lang":"zh-CN"}'
   ```
4. 检查返回 JSON 是否符合 TDD
5. 检查 `synthesis_cache` 新记录
6. 相同输入再调一次 → `cached: true`

---

## Phase 3: 前端 API 对接层

### 3.1 ·【AI 任务】Supabase 客户端 (`supabaseClient.ts`)

**前置**：0.2, 0.3

> [!TIP]
> **Prompt 关键词**：「在 `src/core/api/` 创建 `supabaseClient.ts`。`createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`。导出单例 `supabase`。仅用于 `functions.invoke()`。」

---

### 3.2 ·【AI 任务】更新 API 类型 (`api.ts`)

**前置**：TDD v2

> [!TIP]
> **Prompt 关键词**：「修改 `src/types/api.ts`。替换 SynthesisRequest 为 `{ input_1_id, input_2_id, lang, max_level? }`，SynthesisResponse 为 `{ sense: SenseEntity, visual: VisualEntry | null, cached, isNewDiscovery, archetypeUsed }`。注意 visual 可为 null。添加 SynthesisErrorCode 和 SynthesisError 类型。」

---

### 3.3 ·【AI 任务】useSynthesis Hook

**前置**：3.1, 3.2, 2.5（Edge Function 已部署）

> [!TIP]
> **Prompt 关键词**：「创建 `src/app/hooks/logic/useSynthesis.ts`。参考 `referenced project/useRitualSynthesis.ts`。暴露 `{ synthesize, state, error, result }`，state = `'idle'|'processing'|'success'|'error'`。调用 `supabase.functions.invoke('synthesize-sense')`。成功后：①senseToCard() 转 CardEntity；②如有 visual 则 VisualRepository.upsert()；③SenseRepository.save()；④store.addSense()。**15 秒后未返回时** setState 为 'processing-long' 显示"仍在处理中…"提示。」

---

## Phase 4: 前端 UI 集成

### 4.1 ·【AI 任务】SynthesisCircle 集成

**前置**：3.3 + 2.5（Edge Function 可用）

> [!TIP]
> **Prompt 关键词**：「修改 `SynthesisCircle.tsx`：①import useSynthesis 替换 mock setTimeout；②新增 props `onSynthesisComplete(card: CardEntity)` 和 `currentLang`；③成功后 onCardEject 弹出输入卡、onSynthesisComplete 回传新卡；④处理中显示阶段文字、失败显示错误 3 秒消失；⑤DeviceState 增加 `lastResult?` 和 `errorMessage?`。」

---

### 4.2 ·【AI 任务】Canvas 放置逻辑

**前置**：4.1

> [!TIP]
> **Prompt 关键词**：「在 `onSynthesisComplete` 回调中：①SynthesisCircle 坐标附近偏移 50-100px 计算位置；②创建 CardItem 添加到 cards 列表；③保存 CardLocation 到 IndexedDB。参考 useCardManager 的现有添加卡牌模式。」

---

## Phase 5: 联调测试

### 5.1 ·【人类】端到端测试

**前置**：所有 Phase 0-4
**检查清单**：
- ✅ 拖 Fire + Water 到合成阵 → 点合成
- ✅ 加载状态 → 新卡牌出现（名称 + 可能的占位 visual）
- ✅ 输入卡从插槽弹出
- ✅ `synthesis_cache` 有新记录
- ✅ 刷新后新卡牌仍在
- ✅ 重复合成 → `cached: true`（秒级返回）
- ✅ 同一张卡拖入两次 → 错误提示
- ✅ `npx tsc --noEmit` 零报错

---

## 甘特图

```mermaid
gantt
    title 合成功能开发进度
    dateFormat YYYY-MM-DD
    axisFormat %m-%d

    section Phase 0 环境
    0.1 配置 Secrets    :human, h1, 2026-02-19, 1d
    0.2 配置 .env        :human, h2, 2026-02-19, 1d
    0.3 安装依赖         :human, h3, 2026-02-19, 1d
    0.4 种子数据导入     :ai, a0, after h1, 1d

    section Phase 1 Prompt
    1.1 SynthesisPrompt  :ai, a1, after h1, 1d
    1.2 SensePrompt      :ai, a2, after h1, 1d
    1.3 VisualPrompt     :ai, a3, after h1, 1d

    section Phase 2 Edge Function
    2.1 gemini.ts SDK    :ai, a4, after a1, 1d
    2.2 types.ts         :ai, a7, after a1, 1d
    2.3 moduleA.ts       :ai, a5, after a4, 1d
    2.4 index.ts         :ai, a6, after a5, 1d
    2.5 部署验证         :crit, human, h4, after a6, 1d

    section Phase 3 前端API
    3.1 supabaseClient   :ai, a8, after h2, 1d
    3.2 api.ts 类型      :ai, a9, after a8, 1d
    3.3 useSynthesis     :ai, a10, after h4, 1d

    section Phase 4 UI
    4.1 SynthesisCircle  :ai, a11, after a10, 1d
    4.2 Canvas 放置      :ai, a12, after a11, 1d

    section Phase 5 测试
    5.1 端到端测试       :crit, human, h5, after a12, 1d
```

> [!IMPORTANT]
> **关键路径**：Phase 1 → Phase 2 → 2.5 部署 → 3.3 useSynthesis → Phase 4 → 5.1。Phase 3.1/3.2 可在 Phase 2 期间并行完成，但 3.3 必须等 2.5 部署成功。
