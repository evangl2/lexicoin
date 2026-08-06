## Pending Proposals

### [🟡] Extract SVG Filters (AlchemyVisual)
- **Category**: B
- **Location**: `src/app/components/ui/visual/AlchemyVisual.tsx`
- **Current**: Identical structural wrapper and filter configuration for each element type
- **Proposed**: Extract the repeating wrapper elements into a shared `AlchemyWrapper` component
- **Principle**: Parallel visual structures should share a wrapper component to ensure consistent rendering dimensions and filter application.
- **Blast radius**: `src/app/components/ui/visual/AlchemyVisual.tsx`
- **Dependencies**: None
- **Confidence**: High

### [🟡] Consolidate Store/Retrieve Device/Card Logic
- **Category**: B
- **Location**: `src/app/hooks/useDeviceManager.ts`, `src/app/hooks/useCardManager.ts`
- **Current**: Multiple functions in `useDeviceManager` and `useCardManager` repeat the boilerplate state update logic
- **Proposed**: Create a generic `updateItemInArray(array, idField, idValue, updateFn)` helper
- **Principle**: Repetitive state update patterns should be abstracted to reduce noise and prevent bugs.
- **Blast radius**: `src/app/hooks/useDeviceManager.ts`, `src/app/hooks/useCardManager.ts`
- **Dependencies**: None
- **Confidence**: High

### [🟡] Extract Common Hover Visual Glow
- **Category**: B
- **Location**: `src/app/components/ui/shell/DeckRepository.tsx`
- **Current**: Duplicate complex React-DnD useDrag hooks mapping props to drag items
- **Proposed**: Use a custom `useRepoDrag` hook or unify drag configurations
- **Principle**: React-DnD configurations are verbose; similar drag sources in the same module should share setup logic.
- **Blast radius**: `src/app/components/ui/shell/DeckRepository.tsx`
- **Dependencies**: None
- **Confidence**: Medium

- Replace `any` with specific types in Event Handlers (`src/app/hooks/useCardManager.ts`)
- Split overly large component (`src/app/components/ui/card/Card.tsx`)
- Split overly large component (`src/app/components/ui/shell/DeckRepository.tsx`)
- Avoid casting to `any` (`src/app/components/ui/card/DragPreviewCard.tsx`)
- Inline unnecessary hook abstractions (`src/app/hooks/useWindowDimensions.ts`)
- Consolidate Store Interfaces (`src/core/store/slices/`)

## Accepted Proposals

## Rejected Proposals
