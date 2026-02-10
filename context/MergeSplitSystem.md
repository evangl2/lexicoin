# Lexicoin Merge/Split System

**Current Version**: 2.1 (Linguistic Core)
**Last Updated**: 2026-02-10

## 1. Core Philosophy: Linguistic Polysemy & Fluidity

The Merge/Split system is the **Linguistic Engine** of Lexicoin. It solves the fundamental problem of vocabulary mapping across languages: **One word does not equal one concept.**

### The Problem: Many-to-Many Mappings
-   **Polysemy / Homonymy**: A single word in Language A may represent multiple distinct concepts.
    -   *Example*: English "Spring" -> {Season, Coil, Jump, Water Source}.
-   **Divergence**: In Language B, these concepts map to completely different words.
    -   *Chinese*: {春天, 弹簧, 跳跃, 泉水}.

### The Solution: Dynamic Regrouping
As the user switches the **Learning Language**, the system dynamically reorganizes the abstract concepts (`Sense Entities`) based on their **Lexical Form** (the written word) in the target language.

1.  **Merge**: When multiple distinct Senses share the same word in the target language (e.g., "Spring"), they collapse into a single **Anchor Card**.
2.  **Split**: When the target language changes and those Senses map to different words (e.g., "春天" vs "弹簧"), the group dissolves, and the Senses become independent cards again.

---

## 2. Architecture & Logic

The grouping logic is fully decoupled from the visual layer.

### 2.1 The Orchestrator: `useCardGrouping.ts`
This hook manages the global state of the card deck.

-   **Input**: List of all active Card Items + Current `learningLanguage`.
-   **Process**:
    1.  **Flatten**: Resolves all currently grouped cards back into individual Senses.
    2.  **Regroup**: Buckets Senses by their `word` in the new target language.
    3.  **Diff**: Compares the new grouping against the previous state to detect structural changes.
-   **Output**: 
    -   **`items`**: The list of visible cards (Anchors).
    -   **`mergedVariants`**: A map of hidden variants attached to each Anchor.
    -   **`groupFeedback`**: A transient event describing *what just happened* (e.g., "Card A absorbed Card B", "Card C split from Card D").

### 2.2 The State Manager: `useCardVariants.ts`
This hook manages the internal state of a specific Anchor Card.

-   **Sorting**: Determines the "Face" of the card based on usage frequency (e.g., "Spring" as a season is more common than "Spring" as a coil).
-   **Cycling**: Allows the user to manually cycle through the meanings contained within the card.

---

## 3. Visual Feedback System (The "Coating")

While the core logic is linguistic, the visual feedback provides the **"Game Feel"**. This layer listens to the `groupFeedback` events and triggers animations.

### 3.1 Event-Driven Feedback
The visual layer is purely reactive. The `Card` component monitors the `groupFeedback` event stream. Valid events trigger a temporary visual state (`visualFeedback = 'merge' | 'split'`).

### 3.2 The Alchemical Metaphor (Default Persona)
In the default theme, we visualize these linguistic transformations through alchemical symbolism:

-   **Merge (Conjunction)**: Diverse elements synthesizing into a unified form.
    -   **Symbol**: **The Conjunction Rune** (Two intersecting circles).
    -   **Meaning**: The unification of meanings under a single symbol (word).
    -   **Visual**: White/Cyan glow, representing purification/synthesis.

-   **Split (Separation)**: A unified form breaking down into distinct essences.
    -   **Symbol**: **The Cracked Core** (A solid sphere fractured in half, surrounded by a containment field).
    -   **Meaning**: The disambiguation of meaning; precision through separation.
    -   **Visual**: Gold radiated glow, dashed "field" lines, representing the release of energy as concepts diverge.

---

## 4. Configuration & Extensibility

The system is designed to support different visual metaphors via the **Persona System**. The linguistic engine remains constant, but the "Coating" can change.

### Persona Configuration (`Card.persona.default.tsx`)
All visual parameters (paths, colors, glows) are tokenized:

```typescript
feedback: {
  merge: { ... }, // Visuals for Synthesis events
  split: { ... }  // Visuals for Divergence events
}
```

This allows new themes (e.g., Sci-Fi, Organic) to interpret the `groupFeedback` events with completely different visual languages without modifying the core grouping logic.
