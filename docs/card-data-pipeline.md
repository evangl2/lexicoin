# Card Data Pipeline (IndexedDB Architecture)

## Overview
The Card Data Pipeline is responsible for transforming raw semantic data (`SenseEntity`) into interactive, render-ready card objects (`CardEntity`) on the canvas. 

**Key Change:** As of the latest refactor, the pipeline uses **IndexedDB (Dexie.js)** as the single source of truth for all data, replacing static file imports. This enables real-time updates from AI generation and user modifications.

## Core Architecture

### 1. Data Source: IndexedDB (`lexicoin_db`)
- **Table**: `senses` (Key: `uid`)
- **Type**: `SenseRecord { uid: string, data: SenseEntity }`
- **Role**: The persistent storage for all concepts.
- **Seeding**: On first app launch, `moduleInit.ts` seeds this table with default data from `INITIAL_SENSES`.

### 2. Repository Layer: `SenseRepository`
- **File**: `src/core/storage/SenseRepository.ts`
- **Role**: Abstract access to IndexedDB.
- **Methods**:
    - `getAll()`: Returns `Promise<SenseEntity[]>` (used by `useCardManager`).
    - `upsert(sense)`: Saves/updates a sense.
    - `seed(senses)`: Populates initial data if empty.
    - `initSubscriptions()`: Listens to MessageBus for AI updates.

### 3. Transformation Pipeline: `senseToCard.ts`
- **File**: `src/core/pipelines/senseToCard.ts`
- **Role**: Pure function transformation.
- **Input**: `SenseEntity` (from Repository)
- **Output**: `CardEntity`
- **Process**:
    1.  **Language Extraction**: Pre-calculates display data for all 8 languages (O(1) runtime switching).
    2.  **Visual Association**: Links to visual payload via `visualForCard()`.
    3.  **Positioning**: Calculates initial layout coordinates.

### 4. Runtime Management: `useCardManager`
- **File**: `src/app/hooks/useCardManager.ts`
- **Role**: React hook managing the canvas state.
- **Flow**:
    1.  Calls `SenseRepository.getAll()` on mount.
    2.  Passes data through `sensesToCards()`.
    3.  Wraps result in `MotionValue` for animation (Framer Motion).
    4.  Syncs card positions to `canvasPositions` table in IndexedDB.

### 5. AI Integration (Real-time)
- **MessageBus Topics**: `SENSE_CREATED`, `SENSE_UPDATED`, `SENSE_DELETED`.
- **Flow**:
    1.  AI Backend generates new concept.
    2.  `APIClient` receives data.
    3.  `MessageBus` publishes `SENSE_CREATED`.
    4.  `SenseRepository` subscriber catches event -> `upsert()` to IndexedDB.
    5.  (Future) UI subscribes to validation/updates to render new card.

## Data Flow Diagram

```mermaid
graph TD
    subgraph Initialization
    A[App Start] -->|moduleInit| B(SenseRepository)
    B -->|Seed if empty| C[(IndexedDB: senses)]
    end

    subgraph Runtime
    C -->|Load All| D[useCardManager]
    D -->|Transform| E{sensesToCards}
    E -->|CardEntity[]| F[Canvas/Card Component]
    end

    subgraph AI Generation
    G[AI/API] -->|SENSE_CREATED| H[MessageBus]
    H -->|Subscribe| B
    B -->|Upsert| C
    end
```

## Developer Guide

### Adding Initial Senses
Modify `src/schemas/data/initialSenses.ts`. These will be seeded only if the user's IndexedDB is empty (or cleared).

### Fetching Data
Do **not** import `INITIAL_SENSES` directly in components.
```typescript
// Correct
import { senseRepository } from '@core/storage/SenseRepository';
const senses = await senseRepository.getAll();

// Incorrect
import { INITIAL_SENSES } from '@schemas/data/initialSenses';
```

### Debugging
Check Application > IndexedDB > `lexicoin_db` > `senses` table to verify data persistence.
