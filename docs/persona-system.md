# Persona System — 字典位置与职责说明

## 概览

Persona 系统由两个独立字典组成，分别服务不同的子系统。
各字典存放在各自的 Edge Function 目录中。

```
supabase/functions/
├── generate-grimoire/
│   └── lib/
│       ├── personaDictionary.ts   ← PersonaContext Layer（见 §1）
│       └── archetypeTable.ts      ← 魔典 Archetype 系统（见 §3）
│
├── evaluate-grimoire/
│   └── lib/
│       └── personaDictionary.ts   ← PersonaContext Layer（同上，独立副本）
│
└── synthesize-sense/
    └── lib/
        └── PersonaDictionary.ts   ← Flavor Text 字典（见 §2）
```

**注意**：`generate-grimoire/lib/personaDictionary.ts` 与
`evaluate-grimoire/lib/personaDictionary.ts` 内容完全一致，是同一份文件的两个副本。
修改时需同步更新两处。

---

## §1  `personaDictionary.ts` — PersonaContext Layer

**使用方**：`generate-grimoire`、`evaluate-grimoire`（各持一份副本）

**职责**：控制 AI 生成魔典任务和评判时的声音、叙事形式、评分偏向。

**核心机制**：
- 每个 Persona 有一个 `base`（startingpoint 状态，当前全部内容）
- `stages` 存放未来故事阶段的 override（目前为空）
- `resolvePersonaContext(personaId, personaStory)` 在运行时合并 base + stage override

**解析规则**：
```
base（startingpoint）
  └─ stages[story.stage]   若不存在该 stage，直接用 base
       └─ mood overlay      RESERVED，目前不实现
```

- 数组字段（`narrativeForms` / `affinityTags` / `excludedTypes`）：stage override 提供时**完全替换**，不合并
- 标量字段（`voiceDescription` / `evalBias` 等）：stage override 提供时**覆盖**对应字段

**前端对应**：
- Store 持久化 `personaStages: Record<PersonaType, string>`，初始值均为 `'startingpoint'`
- 每次调用 Edge Function 时，前端将 `{ stage: personaStages[personaId] }` 作为 `personaStory` 传入

**受 personaStory 影响**：**是**

---

## §2  `synthesize-sense/lib/PersonaDictionary.ts` — Flavor Text 字典

**使用方**：`synthesize-sense`（Delta 增量补全路径）

**职责**：控制 AI 为 Sense 卡片生成 flavor text（卡片上的观察文字和例句）时的写作风格。

**核心机制**：
- 按 `personaId` 静态查找对应的 `textInstruction` / `exampleInstruction`
- 支持 `narratives` 二级 key（`personaNarrative` 参数命中时使用，未命中降级 default）
- 内容写入数据库后长期存在，不随故事阶段变化

**受 personaStory 影响**：**否**（故意如此——flavor text 是持久内容，应保持一致）

---

## §3  `generate-grimoire/lib/archetypeTable.ts` — Archetype 系统

**使用方**：`generate-grimoire` 独用

**职责**：定义 8 种魔典语义类型及其双向逻辑关系，注入生成 prompt。

**受 personaStory 影响**：**否**（Archetype 与 Persona 无关）

---

## 两个 Persona 字典的对比

| | PersonaContext Layer | Flavor Text 字典 |
|---|---|---|
| 路径 | `*/lib/personaDictionary.ts`（两份） | `synthesize-sense/lib/PersonaDictionary.ts` |
| 使用方 | generate-grimoire, evaluate-grimoire | synthesize-sense |
| 控制内容 | 任务声音、叙事形式、评分偏向 | 卡片观察文字风格 |
| 受故事阶段影响 | 是（stage override） | 否（静态） |
| 修改时 | **两处需同步更新** | 改一处即可 |

---

## 未来：添加新故事阶段

在 `generate-grimoire/lib/personaDictionary.ts` 和
`evaluate-grimoire/lib/personaDictionary.ts` 中同步添加 stage 条目：

```typescript
stages: {
  'chapter2_haunted': {
    // Story context: The Child has witnessed something that cannot be unseen.
    voiceDescription: '...',
    evalBias: 0.1,
    narrativeForms: ['...', '...']  // 完全替换 base.narrativeForms
  }
}
```

然后通过 `store.setPersonaStage('CHILD', 'chapter2_haunted')` 推进即可。
Edge Function 其他代码无需修改。
