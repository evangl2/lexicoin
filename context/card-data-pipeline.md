# Card Data Pipeline - Complete Technical Reference

**Last Updated**: 2026-02-07  
**Purpose**: Comprehensive guide to understand the complete data flow from raw SenseEntity to rendered Card on canvas

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Stage 1: Data Source](#stage-1-data-source)
4. [Stage 2: Data Transformation](#stage-2-data-transformation)
5. [Stage 3: Card Entity Creation](#stage-3-card-entity-creation)
6. [Stage 4: Runtime Integration](#stage-4-runtime-integration)
7. [Stage 5: Component Rendering](#stage-5-component-rendering)
8. [Bilingual Language System](#bilingual-language-system)
9. [Extension Guidelines](#extension-guidelines)
10. [Debugging Guide](#debugging-guide)

---

## Pipeline Overview

The card data pipeline transforms raw linguistic data (`SenseEntity`) into interactive, multilingual cards rendered on an infinite canvas.

**Key Design Principles**:
- **Extract Once, Render Many**: All 8 languages pre-extracted at card creation
- **Type-Safe**: Strict TypeScript typing throughout pipeline
- **Performance-First**: O(1) language switching, minimal runtime processing
- **Bilingual Support**: Simultaneous display of learning + system languages

---

## Data Flow Diagram

```
┌─────────────────┐
│ SenseEntity     │  Raw linguistic data (JSON)
│ (initialSenses) │  - 8 language shells
└────────┬────────┘  - Ontology, frequency
         │           - Flavor text, visuals
         ↓
┌─────────────────┐
│ sensesToCards() │  Transformation pipeline
│ Pipeline        │  - extractAllDisplayData()
└────────┬────────┘  - extractSenseInfo()
         │           - initVisual()
         ↓           - calculatePosition()
┌─────────────────┐
│ CardEntity[]    │  Renderable card data
│                 │  - displayData: Record<Language, LanguageDisplayData>
└────────┬────────┘  - senseInfo, visual, position
         │
         ↓
┌─────────────────┐
│ App.tsx         │  Application state
│ - items state   │  - Wraps CardEntity with MotionValues
└────────┬────────┘  - Manages canvas positions
         │
         ↓
┌─────────────────┐
│ Card.tsx        │  Physics & Interaction Layer
│                 │  - Dual language extraction
└────────┬────────┘  - Drag/flip physics
         │           - Event handling
         ↓
┌─────────────────┐
│ CardVisual.tsx  │  Visual Rendering Layer
│                 │  - Bilingual front face
└─────────────────┘  - Learning language back face
                     - Persona-specific styling
```

---

## Stage 1: Data Source

### File: `schemas/data/initialSenses.ts`

**Type**: `SenseEntity[]`

**Structure**:
```typescript
interface SenseEntity {
  uid: string;                          // Unique identifier
  shells: {                             // 8 language variations
    en: WordShell[];
    'zh-CN': WordShell[];
    fr: WordShell[];
    // ... 5 more languages
  };
  meaning: {                            // Definitions per language
    en: { value: string };
    'zh-CN': { value: string };
    // ...
  };
  ontology: { value: OntologyType };    // OBJECT, PROCESS, etc.
  frequency: { value: number };         // 1-100
  fingerprint: Fingerprint;             // Semantic DNA
  flavorText: FlavorTextEntry[];        // Narrative content
  visual: VisualEntry[];                // Asset references
}
```

**Example**:
```typescript
{
  uid: "fire_001",
  shells: {
    en: [{ text: { value: "fire" }, pos: { value: "n." }, level: { value: "A1" } }],
    'zh-CN': [{ text: { value: "火" }, pos: { value: "n." }, level: { value: "A1" } }],
  },
  meaning: {
    en: { value: "A combustion process..." },
    'zh-CN': { value: "燃烧的过程..." }
  },
  // ...
}
```

---

## Stage 2: Data Transformation

### File: `src/pipelines/senseToCard.ts`

**Entry Point**: `sensesToCards(senses: SenseEntity[]): CardEntity[]`

### Pipeline Functions

#### 1. extractAllDisplayData()
```typescript
// Input: SenseEntity
// Output: Record<Language, LanguageDisplayData>

// Calls extractDisplayData() for each of 8 languages
const languages = ['en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'];
for (const lang of languages) {
  displayData[lang] = extractDisplayData(sense, lang);
}
```

**What It Extracts Per Language**:
- `word`: shells[lang][0].text.value
- `pronunciation`: shells[lang][0].pronunciation?.value
- `pos`: shells[lang][0].pos.value
- `level`: shells[lang][0].level.value
- `definition`: meaning[lang].value
- `flavorText`: First matching flavorText entry

#### 2. extractSenseInfo()
```typescript
// Extracts semantic metadata for quick access
{
  ontology: sense.ontology.value,
  frequency: sense.frequency.value,
  fingerprint: sense.fingerprint,
  personas: sense.flavorText?.map(f => f.persona) || ['default'],
  durability: 100  // Fixed for new cards
}
```

#### 3. initVisual()
```typescript
// Initializes async loading state
{
  status: 'loading',
  payload: ''  // Populated by async loader later
}
```

#### 4. calculatePosition()
```typescript
// Grid-based canvas positioning
const row = Math.floor(index / 5);
const col = index % 5;
return {
  x: col * 350 - 700,
  y: row * 450 - 900
};
```

---

## Stage 3: Card Entity Creation

### File: `src/types/CardEntity.ts`

**Type**: `CardEntity`

**Complete Structure**:
```typescript
interface CardEntity {
  uid: string;  // From SenseEntity.uid
  
  // Pre-extracted data for all 8 languages
  displayData: Record<Language, LanguageDisplayData>;
  /* Example:
  {
    'en': { word: 'fire', pronunciation: '/faɪər/', pos: 'n.', level: 'A1', ... },
    'zh-CN': { word: '火', pronunciation: 'huǒ', pos: 'n.', level: 'A1', ... },
    'fr': { word: 'feu', ... },
    // ... 5 more
  }
  */
  
  visual: VisualData;      // { status: 'loading', payload: '' }
  rawSense: SenseEntity;   // Complete original data
  senseInfo: SenseInfo;    // Quick-access metadata
  position: CardPosition;  // { x: number, y: number }
}
```

**Key Characteristic**: **All 8 languages pre-extracted** → O(1) language switching

---

## Stage 4: Runtime Integration

### File: `src/app/App.tsx`

**State Management**:
```typescript
// Initial card entities (static data)
const INITIAL_CARD_ENTITIES = sensesToCards(INITIAL_SENSES);

// Runtime state wrapper
interface CardItem {
  cardData: CardEntity;    // Complete card data
  mx: MotionValue<number>; // X position with physics
  my: MotionValue<number>; // Y position with physics
  width: number;
  height: number;
}

const [items, setItems] = useState<CardItem[]>([]);
```

**Initialization**:
```typescript
useEffect(() => {
  const initialCards = INITIAL_CARD_ENTITIES.slice(0, 2).map((cardData, idx) => ({
    cardData: {
      ...cardData,
      position: savedPositions[idx] || { x: -250, y: -250 }
    },
    width: 250,
    height: 350,
    mx: motionValue(cardData.position.x),
    my: motionValue(cardData.position.y),
  }));
  setItems(initialCards);
}, []);
```

**Language Mapping**:
```typescript
// UI language names → Language codes
const mapLanguageCode = (uiLang: string): Language => {
  const langMap: Record<string, Language> = {
    'ENGLISH': 'en',
    '简体中文': 'zh-CN',
    'FRANÇAIS': 'fr',
    // ...
  };
  return langMap[uiLang] || 'en';
};
```

**Card Rendering**:
```typescript
{items.map((item) => (
  <Card
    key={item.cardData.rawSense.uid}
    cardData={item.cardData}
    learningLanguage={mapLanguageCode(learningLang)}  // e.g., 'en'
    systemLanguage={mapLanguageCode(systemLang)}      // e.g., 'zh-CN'
    x={item.mx}
    y={item.my}
    // ... physics props
  />
))}
```

---

## Stage 5: Component Rendering

### Layer 1: Card.tsx (Physics & Interaction)

**Responsibilities**:
- Extract dual language data
- Handle drag/drop physics
- Manage flip animation
- Coordinate card interactions

**Data Extraction**:
```typescript
export const Card: React.FC<CardProps> = ({
  cardData,
  learningLanguage,  // 'en'
  systemLanguage,    // 'zh-CN'
  // ...
}) => {
  // Extract BOTH languages from CardEntity
  const learningData = cardData.displayData[learningLanguage]!;
  const systemData = cardData.displayData[systemLanguage]!;
  
  // learningData = { word: 'fire', definition: '...', ... }
  // systemData = { word: '火', definition: '...', ... }
  
  return (
    <CardVisual
      learningData={learningData}
      systemData={systemData}
      senseInfo={cardData.senseInfo}
      visual={cardData.visual}
      // ... motion props
    />
  );
};
```

### Layer 2: CardVisual.tsx (Visual Rendering)

**Responsibilities**:
- Render bilingual front face
- Render learning language back face
- Apply Persona-specific styling
- Handle visual states (hover, flip, etc.)

**Data Usage**:
```typescript
export const CardVisual: React.FC<CardVisualProps> = ({
  learningData,  // Primary language data
  systemData,    // Secondary language data
  senseInfo,
  visual,
  // ...
}) => {
  // Extract from learning language
  const { word, pronunciation, pos, level, definition, flavorText } = learningData;
  // Extract system language word for bilingual display
  const systemWord = systemData.word;
  
  // Render components...
};
```

**Front Face Rendering**:
```tsx
{/* Main title: Learning language */}
<h2>{word}</h2>  {/* "fire" */}

{/* Translation: System language */}
{systemWord !== word && (
  <span className="text-sm opacity-70">
    {systemWord}  {/* "火" */}
  </span>
)}
```

**Back Face Rendering**:
```tsx
{/* Title */}
<h3>{word}</h3>  {/* Learning language only */}

{/* Definition */}
<p>{definition}</p>  {/* Learning language */}

{/* Flavor Text */}
<p>{flavorText.text}</p>  {/* Learning language */}
```

---

## Bilingual Language System

### Design Philosophy

**Learning Context**: User studies `learningLanguage` with help from `systemLanguage`

### Visual Implementation

**Front Face** (Vocabulary Display):
```
┌──────────────────┐
│       fire       │ ← learningLanguage (primary)
│        火        │ ← systemLanguage (translation aid)
│                  │
│   [card visual]  │
│                  │
│   n. • A1        │
└──────────────────┘
```

**Back Face** (Learning Content):
```
┌──────────────────┐
│      fire        │ ← learningLanguage only
│                  │
│ Definition:      │
│ A combustion...  │ ← learningLanguage
│                  │
│ Flavor Text:     │
│ ...              │ ← learningLanguage
└──────────────────┘
```

### Data Flow

```typescript
User Config:
  learningLanguage = 'ENGLISH'    → mapped to 'en'
  systemLanguage = '简体中文'      → mapped to 'zh-CN'
         ↓
CardEntity.displayData['en']  → learningData
CardEntity.displayData['zh-CN'] → systemData
         ↓
Front: word='fire' + systemWord='火'
Back: word='fire', definition='...', flavorText='...'
```

### Language Switching

**Instant O(1) Switching**:
```typescript
// User changes learningLanguage: ENGLISH → FRANÇAIS
// No data fetching needed!

learningData = cardData.displayData['fr'];  // Already extracted!
// Front: "feu" (fr) + "火" (zh-CN)
// Back: "feu" + French definition
```

---

## Extension Guidelines

### Adding a 9th Language

**Step 1**: Update `senseToCard.ts`
```typescript
// Line 135
const languages: Language[] = [
  'en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt',
  'ko'  // ← Add Korean
];
```

**Step 2**: Update `App.tsx` language mapping
```typescript
const langMap: Record<string, Language> = {
  // ...
  '한국어': 'ko'  // ← Add Korean
};
```

**Step 3**: Ensure `SenseEntity` has Korean shells & meaning

That's it! CardEntity structure automatically supports it.

### Adding Trilingual Support

Current: Front face shows 2 languages (learning + system)

**To add 3rd language**:

1. Add `assistLanguage` prop to Card/CardVisual
2. Extract `assistData = cardData.displayData[assistLanguage]`
3. Render 3rd word in CardVisual front face

### Adding New Visual States

**Example: Add "selected" state**

1. Add to `CardVisualProps`: `isSelected?: boolean`
2. Pass from Card.tsx: `isSelected={isSelected}`
3. Use in CardVisual: `className={isSelected ? 'ring-4' : ''}`

---

## Debugging Guide

### Issue: Card shows "Missing" instead of word

**Diagnosis**:
```typescript
// Check if language exists in displayData
console.log(cardData.displayData);
// Should show all 8 languages

// Check if learningLanguage is valid
console.log(learningLanguage);  // Should be 'en', not 'ENGLISH'
```

**Fix**: Ensure `mapLanguageCode()` correctly maps UI names to Language codes

### Issue: Translation not showing on front face

**Diagnosis**:
```typescript
// In CardVisual.tsx
console.log('word:', word);           // e.g., 'fire'
console.log('systemWord:', systemWord);  // e.g., '火'
console.log('Are different?', systemWord !== word);  // Should be true
```

**Fix**: Check that `systemLanguage !== learningLanguage` in user settings

### Issue: Language switch doesn't work

**Diagnosis**:
```typescript
// In Card.tsx
console.log('learningLanguage:', learningLanguage);  // Should change
console.log('learningData:', learningData);  // Should update
```

**Possible Causes**:
1. State not updating in App.tsx
2. Memoization preventing re-render
3. Wrong language code passed

### Issue: Card data undefined

**Diagnosis**:
```typescript
// Check pipeline
console.log('INITIAL_SENSES:', INITIAL_SENSES.length);
console.log('INITIAL_CARD_ENTITIES:', INITIAL_CARD_ENTITIES.length);
console.log('First card:', INITIAL_CARD_ENTITIES[0]);
```

**Possible Causes**:
1. `initialSenses.ts` import failed
2. `sensesToCards()` errored
3. Empty INITIAL_SENSES array

---

## Type Reference Quick Guide

### Core Types

```typescript
// Raw data
SenseEntity          // From schemas/data/initialSenses.ts

// Transformed data
CardEntity           // Complete card data with 8 languages
LanguageDisplayData  // Single language display data
SenseInfo            // Semantic metadata

// Runtime wrappers
CardItem             // CardEntity + MotionValues (App.tsx)

// Component props
CardProps            // Card.tsx interface
CardVisualProps      // CardVisual.tsx interface
```

### Type Locations

| Type | File |
|------|------|
| `SenseEntity` | `schemas/schemas/SenseEntity.schema.ts` |
| `CardEntity` | `src/types/CardEntity.ts` |
| `LanguageDisplayData` | `src/types/CardEntity.ts` |
| `SenseInfo` | `src/types/CardEntity.ts` |
| `CardProps` | `src/app/components/Card.tsx` |
| `CardVisualProps` | `src/app/components/CardVisual.tsx` |

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Card creation | O(n) per language | n = 8 languages, done once |
| Language switch | O(1) | Direct hash lookup |
| Card render | O(1) | Pre-extracted data |
| Adding 9th language | O(n) | n = total cards, rebuild all |

**Memory Usage**:
- Per CardEntity: ~10-15 KB (includes all 8 languages + rawSense)
- 500 cards: ~5-7.5 MB
- Fits comfortably in localStorage

---

## Summary

**Data Pipeline in One Sentence**:  
Raw `SenseEntity` → `sensesToCards()` extracts 8 languages → `CardEntity` with all data → `App.tsx` wraps with MotionValues → `Card.tsx` extracts dual languages → `CardVisual.tsx` renders bilingual front + learning back

**Key Insight**:  
CardEntity pre-computes ALL language data at creation time, making runtime operations instant and language switching free.

**Bilingual Magic**:  
Same CardEntity, different `learningLanguage + systemLanguage` params → Different card display, zero data fetching!
