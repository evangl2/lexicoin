# Dynamic Split/Merge Feature

## 1. Overview

The **Dynamic Split/Merge** feature is a core mechanic in Lexicoin that visualizes the "fluidity of meaning" across different languages. 
As the user switches the **Learning Language**, cards on the canvas dynamically regroup based on their lexical relationships (homonyms/synonyms) in the target language.

> **Key Concept**: A single concept might be unique in English (e.g., "Spring") but distinct in Chinese ("春天" vs "弹簧"). The system automatically merges or splits cards to reflect this reality.

## 2. Core Mechanisms

### 2.1 Trigger 
The regrouping logic is **Reactive**. It is triggered automatically by:
1.  **Language Switch**: Changing `learningLanguage` in the Dock.
2.  **Card Addition**: Dropping a new card triggers a check for potential merges with existing cards.

### 2.2 Anchor & Variants
When multiple cards share the same **Word** (spelling) in the current learning language:
1.  **Grouping**: They form a "Group".
2.  **Sorting**: The group is sorted by **Frequency** (Usage commonality).
3.  **Anchor (主卡)**: The highest frequency card becomes the visible "Anchor".
4.  **Variants (变体)**: Lower frequency cards are hidden and "merged" into the Anchor. They are accessible via the Card's UI (e.g., Overlay or Stack Badge).

### 2.3 Physics-Based Split 
When a Variant becomes independent (due to language switch):
1.  **Spawn**: It re-appears at the exact position of its former Anchor.
2.  **Offset**: A tiny random offset is applied to prevent perfect overlap.
3.  **Cell Division**: The global `usePhysics` engine detects the collision and applies a natural repulsion force, causing the new card to "squeeze" out organically, pushing neighbors aside.

### 2.4 Smart Camera 
The camera (`Canvas` viewport) automatically adapts to tell the story:
1.  **Detection**: Calculates the Bounding Box of all *active* moving items (Merge targets & Split results).
2.  **Auto-Fit**: Pans and zooms to frame these items with comfortable padding.
3.  **Spring Animation**: All camera moves use smooth spring physics for a premium feel.

## 3. Architecture & Data Flow 
**File**: `src/app/App.tsx`

1.  **State**: 
    -   `items`: Currently visible cards (Anchors).
    -   `mergedVariants`: `Record<AnchorUID, CardEntity[]>` storing hidden variants.
2.  **Effect Hook**:
    -   Monitors `learningLang`.
    -   **Flattens** all `items` + `mergedVariants`.
    -   **Re-groups** based on new language data.
    -   **Diffs** to determine who stays, who merges, who splits.
    -   **Updates** state and triggers animations (`animate`, `usePhysics`).

## 4. Developer Guide (开发者指南)

### 4.1 Integration
The feature is currently centralized in **`src/app/App.tsx`**. It is designed as a "Layout Effect" that runs whenever the deck or language state changes.

*   **State Dependencies**:
    *   `learningLang`: The trigger for Global Regrouping.
    *   `items`: The list of visible cards (Anchors).
    *   `mergedVariants`: A dictionary mapping Anchor UIDs to their hidden Variant cards.

### 4.2 Key Logic Flow
To modify the logic, look for the `useEffect` block in `App.tsx`:
```typescript
useEffect(() => {
    // 1. Flatten (Collect all data)
    // 2. Group (By new language word)
    // 3. Diff (Identify Merge/Split candidates)
    // 4. Update State (setItems, setMergedVariants)
}, [learningLang, items.length]);
```

---

## 5. Debugging (调试指南)

### 5.1 Console Logs
Filter your console for the tag **`[Regroup]`** or **`[Smart Camera]`**.
*   `[Regroup] Triggered`: Indicates the logic has started (Language change or Item added).
*   `[Smart Camera] Fitting to box`: Shows the calculated bounding box for the auto-zoom.

### 5.2 Common Issues & Fixes
*   **Infinite Loop / Thrashing**:
    *   *Symptom*: Cards separate and merge repeatedly every frame.
    *   *Cause*: `useEffect` dependencies are unstable, or the sort order changes every render.
    *   *Fix*: Ensure the `sort` function is deterministic (use UID as a tie-breaker if Frequency is equal).
*   **Exploding Physics**:
    *   *Symptom*: Split cards fly off screen instantly.
    *   *Cause*: Split offset is 0. Physics engine divides by distance (0), causing Infinite force.
    *   *Fix*: Ensure `randX/randY` offset in the Split Logic is at least 0.01.
*   **"Ghost" Cards**:
    *   *Symptom*: A card disappears but isn't in a merged group.
    *   *Fix*: Check the `Flatten` phase. Ensure `mergedVariants` are correctly unpacked back into the `allCards` array before regrouping.

---

## 6. Extension Guide (拓展指南)

### 6.1 Customizing Grouping Rules
Target: `App.tsx` -> `Regroup` phase.
Currently, it groups by `word.toLowerCase()`. You can change this to:
*   **Fuzzy Match**: Use Levenshtein distance to group similar spellings.
*   **Root Match**: Group by Etymological Root (e.g., "Act", "Action", "Active").

### 6.2 Customizing Sort Priority
Target: `App.tsx` -> `group.sort(...)`.
Currently, it sorts by `senseInfo.frequency`.
*   **Proficiency-based**: Sort by user's mastery level (low mastery = visible anchor).
*   **Date-based**: Sort by "Last Reviewed".

### 6.3 Adding Event Hooks
If you need to play sounds or trigger achievements:
1.  In the `Diff & Animate` phase, detect the transition type.
2.  **Merge**: When `variants.length > 0` and `newMergedVariants` is updated.
3.  **Split**: When `oldAnchorItem` is found (Source determined).
4.  *Example*:
    ```typescript
    if (oldAnchorItem) {
        // Trigger Split Sound
        audioManager.play('split_pop');
        // Trigger Particle Effect
        particleSystem.emit(spawnX, spawnY);
    }
    ```

---

## 7. Future Improvements (待优化)
*   **Strain Indicator**: Visual cues for cards that "want" to split (e.g., trembling).
*   **Audio**: Satisfying "Pop" and "Click" sounds.
*   **Stack UI**: Explicit UI on the card face showing how many variants are inside.
