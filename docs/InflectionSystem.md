# 词语形变功能：架构与逻辑

## 概述

词语形变系统负责管理单词在不同语法语境下的形态变化（如动词变位、名词复数、形容词比较级等）。
系统采用**双轨策略**：不规则变形通过 AI 生成并存储在数据库中，规则变形由前端引擎实时计算。

---

## 核心架构

```
┌──────────────────────────────────────────────────────────┐
│                      SenseEntity                         │
│                                                          │
│  shells: Record<Language, WordShell[]>                    │
│    └─ text / pronunciation / pos / level / wordFrequency │
│                                                          │
│  traits: Record<Language, LinguisticTrait[]>              │
│    └─ gender / plural_form / verb_group / case_pattern   │
│    └─ key_forms (不规则变形数组)                           │
│                                                          │
│  wordFamily: Record<Language, WordFamily>                 │
│    └─ root / derivations[]                               │
└──────────────┬───────────────────────────────┬────────────┘
               │                               │
    ┌──────────▼──────────┐         ┌──────────▼──────────┐
    │   不规则变形 (存储)   │         │   规则变形 (计算)    │
    │                     │         │                     │
    │  key_forms trait    │         │  InflectionEngine   │
    │  + KeyFormsDictionary│         │  + 语言规则模块     │
    └─────────────────────┘         └─────────────────────┘
```

---

## 一、语言学特质系统 (Linguistic Traits)

### 设计哲学

不同语言的语法特征完全不同（德语有性数格，中文没有；法语有动词变位组，日语有活用类型）。
为避免在 WordShell 上堆满大量特定语言才用到的空字段，采用**通用键值容器**：

```typescript
interface LinguisticTrait {
    traitId: TraitId;           // 标准化的特质标识符
    value: string | string[];   // 值（单值或数组）
    meta: EntryMetadata;        // 质量追踪（仅 stability）
}
```

### 标准特质词汇表

| traitId | 含义 | 值类型 | 何时使用 |
|---------|------|--------|---------|
| `gender` | 语法性 | `string`：`"masculine"` / `"feminine"` / `"neuter"` | 名词，在有语法性的语言中 |
| `plural_form` | 不规则复数形式 | `string`：如 `"children"`、`"Männer"` | 名词复数不可规则推导时 |
| `verb_group` | 动词变位分组 | `string`：如 `"1st group (-er)"`、`"五段動詞"` | 所有动词（告知规则引擎该用哪套规则） |
| `case_pattern` | 名词变格分类 | `string`：如 `"strong masculine"` | 有格系统的语言中的名词 |
| `key_forms` | 不规则变形的具体形式 | `string[]`：位置含义由静态字典定义 | 任何不规则的动词/名词/形容词 |

### 数据层级关系

```
SenseEntity.traits: Record<Language, LinguisticTrait[]>
                              │
                    与 shells 平级
                    存储在 sense_word_shells 表的 traits JSONB 列
```

---

## 二、不规则变形：存储方案

### 核心思路

不规则变形无法通过规则推导，必须由 AI 在合成（Synthesis）时生成并存储。
存储采用**紧凑位置数组 + 静态字典**的方式。

### key_forms 与 KeyFormsDictionary 的关系

```
trait: { traitId: "key_forms", value: ["été", "suis", "est", "sont"] }
                                        ↕ 位置对应 ↕
dict: VERB_KEY_FORMS['fr'] = ['past_participle', '1s_present', '3s_present', '3p_present']
                                        ↓
结果: value[0]="été" 是 past_participle，value[1]="suis" 是 1s_present...
```

### 三套字典覆盖三大词类

| 字典 | 词类 | 查询条件 |
|------|------|---------|
| `VERB_KEY_FORMS` | 动词 | `pos` 以 `v` 开头 |
| `NOUN_KEY_FORMS` | 名词 | `pos === "n."` |
| `ADJ_KEY_FORMS` | 形容词 | `pos === "adj."` |

### 8 种核心语言的覆盖情况

| 语言 | 动词字典 | 名词字典 | 形容词字典 |
|------|:-------:|:-------:|:---------:|
| en   | ✅ `['past_tense', 'past_participle']` | — | ✅ `['comparative', 'superlative']` |
| fr   | ✅ | — | ✅ (含性数一致位置) |
| de   | ✅ | ✅ (4 格 + 复数) | ✅ |
| es   | ✅ | — | ✅ |
| it   | ✅ | — | ✅ (含性数一致位置) |
| pt   | ✅ | — | ✅ |
| ja   | ✅ `['te_form', 'ta_form', 'nai_form']` | — | — |
| zh-CN | — (无变位) | — (无格系统) | — (无形态比较级) |

### 维护规则

- 字典顺序**一旦定义不可更改**（会导致历史数据错位）
- 新增位置只能**追加到末尾**
- 新增语言需同时定义动词和名词字典

---

## 三、规则变形：前端引擎

### 设计哲学

规则变形不消耗存储空间，由前端纯函数实时计算。
调用方式：

```typescript
import { generateInflectionTable } from 'src/schemas/inflection/InflectionEngine';

const table = generateInflectionTable({
    baseForm: 'walk',       // 基础词形
    lang: 'en',             // 语言
    pos: 'v.',              // 词性
    traits: []              // 语言学特质（规则动词无需特殊 trait）
});
// → { categories: { present: { '3s': 'walks', ... }, past: { simple: 'walked', ... }, ... } }
```

### 引擎架构

```
generateInflectionTable(input)
        │
        ├─ pos 以 v 开头 → module.inflectVerb()
        ├─ pos === 'n.'  → module.inflectNoun()
        ├─ pos === 'adj.' → module.inflectAdjective()
        └─ 其他词性 → 返回 null（无形变）

module = RULE_MODULES[lang]
        │
        ├─ 'en'    → englishRules   ← 完整实现
        ├─ 'zh-CN' → chineseRules   ← 返回原形（无形变）
        └─ 其他    → stub（待实现）
```

### 英语规则引擎详解

#### 名词复数

| 规则 | 条件 | 示例 |
|------|------|------|
| +es | 末尾 -s/-ss/-sh/-ch/-x/-z | bus → buses, watch → watches |
| 辅音+y → ies | 末尾辅音 + y | city → cities |
| -fe → ves | 末尾 -fe | knife → knives |
| -f → ves | 末尾 -f | leaf → leaves |
| +s | 默认 | cat → cats |

> 注：-f/-fe 规则有例外（belief → beliefs），应通过 `plural_form` trait 覆盖。

#### 动词变位

**Present 3s：**
与名词复数类同（+s / +es / consonant+y → ies）

**Past / Past Participle（规则：两者相同）：**

| 规则 | 条件 | 示例 |
|------|------|------|
| +d | 末尾 -e | live → lived |
| 辅音+y → ied | 末尾辅音 + y | carry → carried |
| 双写+ed | CVC 模式（单音节） | stop → stopped |
| +ed | 默认 | walk → walked |

**Present Participle：**

| 规则 | 条件 | 示例 |
|------|------|------|
| -ie → ying | 末尾 -ie | die → dying |
| 去 e + ing | 末尾 -e（非 -ee/-ye/-oe） | live → living |
| 双写 + ing | CVC 模式（单音节） | stop → stopping |
| +ing | 默认 | walk → walking |

> 注：CVC 双写规则仅对单音节词可靠。多音节重读末音节（如 prefer → preferred）应使用 key_forms。

#### 形容词比较级/最高级

**策略选择：**
- 单音节 → synthetic（-er/-est）
- 双音节以 -y/-le/-er/-ow 结尾 → synthetic
- 其他 → analytic（more/most）

**Synthetic 规则：**

| 规则 | 示例 |
|------|------|
| 末尾 -e → +r/+st | nice → nicer → nicest |
| 辅音+y → ier/iest | happy → happier → happiest |
| CVC → 双写+er/est | big → bigger → biggest |
| 默认 → +er/+est | tall → taller → tallest |

---

## 四、规则与不规则的协作流程

当前端需要展示一个词的完整形变表时：

```
1. 从 SenseEntity 取出 WordShell（基础词形 + POS）和 traits
2. 检查 traits 中是否有 key_forms
3. 调用 generateInflectionTable(baseForm, lang, pos, traits)
4. 引擎内部：
   a. 用规则生成完整形变表
   b. 如果 traits 中存在 key_forms，用其覆盖对应位置
   c. 返回合并后的 InflectionTable
5. 前端渲染形变表
```

**关键原则：key_forms 永远覆盖规则生成的结果。**

---

## 五、POS 扩展

词性系统新增了动词及物性区分：

| POS | 含义 | 示例 |
|-----|------|------|
| `v.` | 兼及物/不及物 | eat（可接宾语也可不接） |
| `v.t.` | 及物动词 | make（必须接宾语），ja: 他動詞 |
| `v.i.` | 不及物动词 | arrive（不接宾语），ja: 自動詞 |

形变引擎对 `v.` / `v.t.` / `v.i.` 的变位规则完全相同，区别仅在于语义标记。

---

## 六、词族 / 形态学 (Word Family)

### 数据结构

```typescript
wordFamily?: Record<Language, {
    root: string;                              // 词根
    derivations: { word: string; pos: POS }[]; // 派生词 + 词性
    meta: EntryMetadata;
}>
```

### 用途

1. **学习辅助**：「你认识 create → 那么 creation/creative/creator 你也应该能认出」
2. **形态解析游戏**：把 creation 拆成 creat- + -ion
3. **导航**：从派生词查回对应 SenseEntity，通过后端 `text + fingerprint 重合度` 查询

### 存储

`senses` 表的 `word_family` JSONB 列。

---

## 七、文件清单

| 文件 | 用途 |
|------|------|
| `src/schemas/schemas/SenseEntity.schema.ts` | 主 Schema（含 LinguisticTrait / TraitId / WordFamily 类型定义） |
| `src/schemas/schemas/KeyFormsDictionary.config.ts` | 不规则变形位置字典（VERB / NOUN / ADJ） |
| `src/schemas/inflection/InflectionTypes.ts` | 形变引擎输出类型 |
| `src/schemas/inflection/InflectionEngine.ts` | 主调度器 + 语言模块注册 |
| `src/schemas/inflection/rules/en.ts` | 英语规则模块（完整实现） |
| `src/schemas/schemas/UserSenseProgress.schema.ts` | 学习者进度（本地 IndexedDB） |

---

## 八、当前进度

### Schema 层

| 组件 | 状态 | 说明 |
|------|:----:|------|
| `LinguisticTrait` / `TraitId` 类型 | ✅ 完成 | 定义在 `SenseEntity.schema.ts` |
| `WordFamily` / `WordFamilyDerivation` 类型 | ✅ 完成 | 定义在 `SenseEntity.schema.ts` |
| `SenseEntity.traits` 字段 | ✅ 完成 | `Record<Language, LinguisticTrait[]>` |
| `SenseEntity.wordFamily` 字段 | ✅ 完成 | `Record<Language, WordFamily>` |
| `POS` 扩展 (v.t. / v.i.) | ✅ 完成 | 已加入类型定义 |
| `UserSenseProgress` 接口 | ✅ 完成 | 独立文件，IndexedDB 专用 |

### 数据库层

| 组件 | 状态 | 说明 |
|------|:----:|------|
| `sense_word_shells.traits` 列 | ✅ 已迁移 | JSONB，存储语言学特质 |
| `senses.word_family` 列 | ✅ 已迁移 | JSONB，存储词族数据 |

### 不规则变形字典

| 组件 | 状态 | 说明 |
|------|:----:|------|
| `VERB_KEY_FORMS` | ✅ 7 语言 | en/fr/de/es/it/pt/ja（zh-CN 无需） |
| `NOUN_KEY_FORMS` | ✅ 2 语言 | de/ru（仅有格系统的语言需要） |
| `ADJ_KEY_FORMS` | ✅ 6 语言 | en/fr/de/es/it/pt（含 fr/it 性数一致位置） |
| 工具函数 | ✅ 完成 | `getFormLabel()` / `getFormLabels()` |

### 规则变形引擎

| 语言 | 动词 | 名词 | 形容词 | 状态 |
|------|:----:|:----:|:------:|------|
| en | ✅ | ✅ | ✅ | **完整实现** |
| zh-CN | ✅ | ✅ | ✅ | **完成**（全部返回原形，无形变） |
| fr | ⬜ | ⬜ | ⬜ | Stub + 详细实现注释 |
| de | ⬜ | ⬜ | ⬜ | Stub + 详细实现注释 |
| es | ⬜ | ⬜ | ⬜ | Stub + 详细实现注释 |
| it | ⬜ | ⬜ | ⬜ | Stub + 详细实现注释 |
| pt | ⬜ | ⬜ | ⬜ | Stub + 详细实现注释 |
| ja | ⬜ | ✅ | ⬜ | Stub + 详细实现注释（名词无形变） |

### 待集成

| 组件 | 状态 | 说明 |
|------|:----:|------|
| AI Prompt 更新 | ⬜ 未开始 | SensePrompt 需要增加 traits / wordFamily 生成指令 |
| 前端 UI 渲染 | ⬜ 未开始 | 形变表展示组件 |
| IndexedDB 存储层 | ⬜ 未开始 | UserSenseProgress 的读写与 SRS 查询 |

---

## 九、排除项及未来规划

| 功能 | 当前状态 | 归属 |
|------|---------|------|
| 搭配词组 (collocations) | 未部署 | 未来 Qualia |
| 量词/分类词 | 未部署 | 未来构式系统 |
| 敬语系统 | 未部署 | 未来构式系统 |
| 动词体标记 | 未部署 | 未来构式系统 |
| 多重读音 | 不处理 | 复杂度过高 |
| 其他语言形变引擎 | Stub 已就位 | 按需实现 |

