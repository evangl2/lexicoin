import { PERSONA_DICTIONARY } from './PersonaDictionary';

export interface SensePromptParams {
    concept: string;
    definition: string;
    target_languages: string[];
    personaId: string;
    personaNarrative?: string;
}

export function buildSensePrompt(params: SensePromptParams): { systemPrompt: string; userPrompt: string } {
    const { concept, definition, target_languages, personaId, personaNarrative } = params;

    // 1. 获取基础大类的 Persona (如 'idol' 或 'default')
    const persona = PERSONA_DICTIONARY[personaId] || PERSONA_DICTIONARY['default']!;

    // 2. 动态匹配对应的具体 InstructionSet
    // 若前端传了特定的 personaNarrative 且该角色有独家配置，则挂载独家指令。否则直接使用该角色的 default 指令。
    let activeInstructions = persona.default;
    if (personaNarrative && persona.narratives && persona.narratives[personaNarrative]) {
        activeInstructions = persona.narratives[personaNarrative]!;
    }

    const textInstruction = `${activeInstructions.textInstruction}\n- **LENGTH LIMIT**: MUST be strictly under 25 words/characters.`;
    const exampleInstruction = `${activeInstructions.exampleInstruction}\n- **LENGTH LIMIT**: Should ideally be under 25 words/characters.`;

    const systemPrompt = `You are a Senior Semantic Architect and Multi-language Lexicographer. 
Your mission is to transform a conceptual "Sense" into a high-fidelity **SenseEntity** JSON object.

### **1. THE MASTER SCHEMA FRAMEWORK**
You must strictly output the JSON according to this structure:

{
  "fingerprint": {
    "items": [
      { "word": "lemma_form", "tier": 1 | 2 | 3 }
    ]
  },
  "frequency": { "value": 0, "meta": { "stability": 100.0 } },
  "ontology": { "value": "OBJECT | PROCESS | PROPERTY | STATE | LOCATION | ABSTRACT", "meta": { "stability": 100.0 } },
  "meaning": {
    "lang_code": { 
      "value": "Detailed dictionary definition (max 40 words/chars)", 
      "meta": { "stability": 100.0 } 
    }
  },
  "flavorText": [
    {
      "persona": "${personaId}",
      "text": { 
        "lang_code": { "value": "...", "meta": { "stability": 100.0 } } 
      },
      "example": { 
        "lang_code": { "value": "...", "meta": { "stability": 100.0 } } 
      }
    }
  ],
  "shells": {
    "lang_code": [
      {
        "text": { "value": "word_or_phrase", "meta": { "stability": 100.0 } },
        "pronunciation": { "value": "...", "meta": { "stability": 100.0 } },
        "pos": { "value": "n. | v. | adj. | adv. | prep. | conj. | pron. | int.", "meta": { "stability": 100.0 } },
        "level": { "value": "A1-C2", "meta": { "stability": 100.0 } },
        "wordFrequency": { "value": 0, "meta": { "stability": 100.0 } },
        "meta": { "stability": 100.0 }
      }
    ]
  }
}

> **SCHEMA CONSTRAINT**: In the JSON structure above, every \`lang_code\` MUST be populated with the following languages: [${target_languages.join(', ')}]. Do not miss any language.

### **2. COMPREHENSIVE FILLING INSTRUCTIONS**

#### **A. Semantic DNA (Fingerprint)**
- **Protocol**: Analyze the input sense to identify the unique semantic core.
- **Word Selection**: Provide **EXACTLY 6** English terms that best define this core sense.
- **Language**: Always use English words for the fingerprint regardless of the input language.
- **Tier Logic**: 
    - **Tier 1**: Essential words. If missing, the sense changes fundamentally.
    - **Tier 2**: Very close synonyms or descriptors with slight nuance differences.
    - **Tier 3**: Broadly related terms mapping the general semantic field.
- **Normalization**: 
    - **Strict Lemmatization**: Always use the most basic lemma form (e.g., "spring", NOT "springs"). 
    - **Forms**: Prefer **NOUN** forms for objects/entities and **ADJECTIVE** forms for properties. No past tense, no plurals, no progressive forms.
- **Sorting**: Sort by Tier (Tier 1 first, then 2, then 3).

#### **B. Ontology & Frequency**
- **Ontology Selection**:
    - \`OBJECT\`: Physical, tangible entities (e.g., "mountain").
    - \`PROCESS\`: Actions, events, or changes over time (e.g., "oxidation").
    - \`PROPERTY\`: Characteristics or qualities (e.g., "fragile").
    - \`STATE\`: Ongoing conditions or modes of existence (e.g., "serenity").
    - \`LOCATION\`: Physical or conceptual spaces/positions (e.g., "abyss").
    - \`ABSTRACT\`: Pure concepts, systems, or ideals (e.g., "entropy").
- **Frequency**: 1-100 score. 100 = universal daily concept; 1 = extremely rare/specialized sense.

#### **C. Meaning & FlavorText**
- **meaning**: meaning must be **dictionary-level detailed explanations, no more than 40 words/characters**.
- **flavorText - text**: ${textInstruction}
- **flavorText - example**: ${exampleInstruction}
- **NATIVE AUTHENTICITY (CRITICAL)**: Write \`meaning\`, \`text\`, and \`example\` directly in the target language's native mindset. **Literal translations from English are strictly prohibited.** You must use culturally accurate idioms, natural phrasing, and authentic sentence structures. The output must be indistinguishable from a native speaker's original writing.

#### **D. Shells**
- **Shells Exclusion**: In the "shells" object, provide **EXACTLY ONE** (the most core and accurate) Shell element per language. Do not output multiple variations.
- **text**: the word or phrase that corresponds to the sense.
- **pronunciation**: Phonetic notation based on the specific language. (eg.IPA for english, Pinyin with tone marks for simplified chinese) If no phonetic notation exists for that language, use \`none\`.
- **pos (Part of Speech)**: MUST be one of the following exact strings: \`'n.' | 'v.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.'\`.
- **Level**: Map the \`text\`'s difficulty in its language to the equivalent English **CEFR (A1-C2)** level.
- **wordFrequency**: 1-100 score. 100 = the word or phrase in \`text\` is a universal daily concept; 1 = extremely rare.
- **INDEPENDENT SCORING (CRITICAL)**: \`level\` and \`wordFrequency\` MUST ONLY evaluate the word/phrase in \`shells.text.value\` as a standalone dictionary headword. Absolutely ignore the current concept's specific meaning when scoring these two fields. (e.g., Even if the meaning is a complex theological metaphor, if the \`text.value\` is simply "water", the level is A1 and frequency is 100). Conversely, \`pos\` must match the specific meaning.`;

    const userPrompt = `[TASK DATA]
Concept: "${concept}"
Definition (Base): "${definition}"

[EXECUTION]
Construct the SenseEntity JSON. Ensure all ${target_languages.length} languages are filled with high precision and respect the requested persona styles.
Output RAW JSON ONLY.`;

    return { systemPrompt, userPrompt };
}

