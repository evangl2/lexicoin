# Grimoire System Architecture

This document outlines the technical architecture, directory structure, and implementation details of the Grimoire system in Lexicoin.

## 1. Overview

The Grimoire system follows a strict **Container + Pure Visual** decoupling pattern. This ensures that business logic, state management, and interaction handlers are separated from the presentation layer, enabling a robust **Persona (Skinning)** system and performance optimizations like **LOD (Level of Detail)**.

## 2. Lifecycle & State Machine

The core logic of a Grimoire is driven by its `status` property (defined in `src/types/index.ts`). Understanding these transitions is key to managing the system.

| Status | Description | Transitions To |
| :--- | :--- | :--- |
| `SUMMONING` | Initial state. Triggered by `GrimoireSummoner`. | `ACTIVE` (when API creates entity) |
| `ACTIVE` | On canvas, openable, and slots can be filled. | `EVALUATING` (on Seal Ritual) |
| `EVALUATING` | Waiting for Edge Function to grade the card senses. | `RESOLVED` or `NEEDS_REVISION` |
| `NEEDS_REVISION` | At least one slot received an 'F' grade. | `ACTIVE` (after user edits) |
| `RESOLVED` | All slots graded >= D. Ready for archiving. | `ARCHIVED` |
| `EXPIRED` | Time-out reached. | (Final state) |

## 3. Directory Structure

### UI Components (`src/app/components/ui/grimoire/`)
- **`Grimoire.tsx`**: Canvas container. Responsible for coordinate mapping and scale forwarding.
- **`GrimoireVisual.tsx`**: Canvas visual. Handles LOD-based complexity switching.
- **`GrimoireOverlay.tsx`**: Fullscreen container. Manages `displayLang` (Learning vs System) state.
- **`GrimoireSlot.tsx`**: Container for slot logic. Connects to `react-dnd` for item drops.
- **`GrimoireSlotVisual.tsx`**: Renders card preview, grades, and persona-specific feedback bubbles.

### Persona System (`src/app/components/persona/grimoire/`)
- **`Grimoire.persona.base.ts`**: The `GrimoirePersonaBundle` interface.
- **`index.ts`**: The registry. Use `getGrimoirePersona(id)` to resolve a theme.

## 4. The Persona System (Skinning)

Visual components consume a `persona` object. This object contains two main pillars:

### A. Semantic Tokens
- `tokens.colors`: Named classes for `coverBase`, `pageBg`, `textPrimary`, etc.
- `tokens.shadows`: Elevation styles for `book` and `overlay`.
- `tokens.typography`: Font families for `title`, `body`, and `handwriting` (Persona insights).

### B. Functional Visuals
- `visuals.CoverDecoration`: SVG/Component rendered on the closed book cover.
- `visuals.PageTexture`: Overlay (e.g., parchment noise, linen) for open pages.
- `visuals.Divider`: Decorative separator between sections.
- `visuals.NarrativeVisuals`: Background elements for the left-page narrative context.

## 5. Performance Optimization (LOD)

The `useGrimoireLOD` hook implements **Hysteresis** to prevent UI flickering.

- **Thresholds**:
  - `Medium -> Low`: < 0.38 scale
  - `Low -> Medium`: > 0.42 scale
  - `High -> Medium`: < 0.68 scale
  - `Medium -> High`: > 0.72 scale

| LOD Level | Rendering Logic |
| :--- | :--- |
| **High** | Full textures, handwriting fonts, decorative visuals, interactive hints. |
| **Medium** | Solid colors, standard fonts, core metadata only. |
| **Low** | Icon-only + Status glow. No text or children components rendered. |

## 6. Interaction Engine Integration

The canvas interaction engine (`useCardDrag.ts`) uses specific DOM markers for hit detection:

1. **Markers**: 
   - Class `.closed-grimoire` (on canvas)
   - Class `.grimoire-slot` (in overlay)
2. **Data Attributes**: 
   - `data-grimoire-id`
   - `data-slot-id`
3. **High-Frequency Feedback**: 
   - Use CSS selector `[&.is-drag-over]` to style the book during active drag operations without triggering React re-renders.

## 7. Common Workflows

### How to add a new Persona
1. Create `Grimoire.persona.[id].tsx`.
2. Define tokens matching the alchemical, scrapbook, or botanical logic.
3. Add the persona to the `getGrimoirePersona` switch statement in `index.ts`.

### Triggering an Evaluation
1. User clicks "Seal Ritual" in `GrimoireRightPage`.
2. `onSubmit` is called, which executes `submit()` from `useGrimoireInteraction`.
3. The store method `evaluateGrimoire(id)` is invoked, transitioning the status to `EVALUATING`.

---
*Created: 2026-04-23 | Revised for Detail: 2026-04-23*
