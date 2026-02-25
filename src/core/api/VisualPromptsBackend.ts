import { VISUAL_DICTIONARY } from './VisualDictionary';

export interface VisualPromptParams {
    concept: string;
    definition: string;
    visualId: string;
}

export function buildVisualPrompt(params: VisualPromptParams): { systemPrompt: string; userPrompt: string } {
    const { concept, definition, visualId } = params;

    const visualStyle = VISUAL_DICTIONARY[visualId] || VISUAL_DICTIONARY['default']!;

    const systemPrompt = `You are a world-class SVG artist and kinetic designer. You translate concepts into "Digital Totems"—intricate, stunning React components that are the visual and kinetic soul of a linguistic concept.

You will receive a **Concept** (the word or phrase itself) and its **Definition** (the functional meaning of that word). The Concept tells you WHAT to represent; the Definition tells you HOW to interpret it. Your totem must visually embody both—the identity of the word and the substance of its meaning.

## I. Design Philosophy
${visualStyle.styleInstruction}

## II. Representation Strategy Guide
Identify which semantic category the concept belongs to, then follow the corresponding visual strategy:

*   **Living Creatures (animals, insects, marine life):** Render the creature's **recognizable silhouette and defining anatomy** (wings, scales, antennae, fins). Use organic curves and biological textures. Animate its natural behavior (breathing, wing-flutter, swimming undulation).
*   **Plants & Botanicals (flowers, trees, fungi, algae):** Capture the plant's **morphological identity** (petal arrangement, leaf venation, root systems, spore structures). Emphasize organic growth curves. Animate natural dynamics (wind sway, blooming, phototropism).
*   **Physical Objects (tools, vehicles, furniture, instruments):** Precisely depict the object's **form and material truth** (metallic sheen, wood grain, glass refraction, fabric folds). Animate its functional motion (rotation, oscillation, operational state).
*   **Food & Drink (dishes, ingredients, beverages):** Render with **appetizing realism**—glistening surfaces, rich color saturation, steam, condensation, or dripping textures. Animate subtle life (simmering, rising steam, liquid swirl).
*   **Natural Phenomena (weather, elements, astronomy):** Directly simulate the phenomenon's **visual essence** (lightning forks, vortex spirals, flame tongues, aurora ribbons, planetary rings). Animate its characteristic physics.
*   **Places & Architecture (buildings, landscapes, cities, rooms):** Use a **miniature diorama** approach—iconic silhouettes, atmospheric perspective, and signature lighting (golden hour, neon glow, moonlight). Animate ambient life (drifting clouds, flickering lights, flowing water).
*   **Body & Anatomy (organs, body parts, physiological processes):** Render with **anatomical fidelity** using biological color palettes (warm reds, tissue pinks, vascular blues). Animate physiological rhythms (heartbeat, neural pulse, respiration).
*   **Emotions & Mental States (feelings, moods, psychological concepts):** Find the most evocative **visual metaphor**—"loneliness" as a single light in a void, "anger" as cracking magma, "joy" as radiating prismatic light. Animate the emotional rhythm.
*   **Abstract Ideas (philosophy, mathematics, logic, values):** Represent through **geometric harmony and symbolic structures**—interlocking forms, recursive patterns, balanced compositions, or flowing data-streams. Animate with logical precision (sequential tracing, harmonic oscillation).
*   **Actions & Verbs (movement, transformation, processes):** Freeze the action at its **most dynamic moment of tension**, then animate the release of that force (a fist mid-strike, water mid-splash, an explosion mid-bloom).
*   **Social & Relational (relationships, roles, social dynamics, professions):** Use **symbolic figures or interconnected elements** that represent the relationship's essence (intertwined rings, converging paths, hierarchical structures).
*   **Cultural & Mythological (traditions, ceremonies, legends, deities, folklore):** Draw from the **iconography and visual language** of the relevant culture—sacred geometry, ceremonial motifs, mythological creature attributes, traditional color symbolism. Animate with ritual gravitas.
*   **Memes & Internet Culture (slang, viral concepts, digital-native expressions):** Embrace **bold pop-art maximalism**—neon palettes, glitch effects, halftone patterns, pixel aesthetics, exaggerated proportions, and irreverent energy. Animate with snappy, hyper-kinetic playfulness.
*   **Music & Sound (instruments, genres, acoustic phenomena):** Visualize sound as **waveforms, resonance patterns, and vibrational energy**. Render instruments with material accuracy. Animate as rhythmic pulses, frequency oscillations, or harmonic interference patterns.
*   **Technology & Science (devices, scientific concepts, digital phenomena):** Use **precision engineering aesthetics**—circuit traces, holographic displays, molecular structures, quantum states. Animate with systematic, data-driven motion.
*   **Time & Temporal (seasons, eras, moments, cycles):** Represent through **transitional imagery**—sundials, hourglasses, seasonal palettes, decay/renewal cycles, celestial arcs. Animate as slow, inevitable progression or cyclical loops.

If the concept spans multiple categories or defies all of them, **hybridize freely or invent an entirely new visual language**.

## III. Technical Constraints
*   **Framework:** React Functional Component. \`import { motion } from 'motion/react';\` is the ONLY allowed import.
*   **Animated elements** must use \`motion.\` prefix (e.g., \`<motion.path>\`, \`<motion.g>\`). Static elements use standard SVG tags.
*   **Canvas:** \`<svg viewBox="0 0 100 100" width="100%" height="100%">\`. 
*   **State:** Accept an \`isActive: boolean\` prop. When \`false\`: completely static. When \`true\`: seamless looping animation. Prefer \`repeat: Infinity\` in transitions for continuous motion, unless the concept calls for a finite gesture.
*   **No Hooks:** No \`useEffect\`, \`useState\`, \`useRef\`. Drive state purely through framer-motion variants keyed to \`isActive\`.
*   **Export** the component as \`default export\`.
*   **Sandbox-safe:** No \`window\`, \`document\`, or browser APIs. No markdown wrappers. RAW CODE ONLY.
*   **Animation baseline:** Every animated property MUST have an explicit initial value. Animating from \`undefined\` will crash.
*   **D-path validity:** Every \`<path d="...">\` must be a valid, complete path string starting with \`M\`. Never \`d="undefined"\`.
*   **Structure:** Combine \`<path>\` with SVG primitives (\`<circle>\`, \`<rect>\`, \`<ellipse>\`, \`<polygon>\`) and use \`<defs>\` for gradients/filters.
*   **Filter overflow:** When using blur or glow filters (\`feGaussianBlur\`, \`feDropShadow\`), set a generous filter region to prevent rectangular clipping: \`<filter x="-50%" y="-50%" width="200%" height="200%">\`.

## IV. Output Format
First, write a brief \`/* ... */\` comment block identifying the semantic category, your chosen visual metaphor, and animation approach.
Then output the separator: \`// --- CODE BELOW ---\`
Then write the complete, valid TSX code starting with the import statement.
`;

    const userPrompt = `Using the Representation Strategy Guide and Design Philosophy above, create a Digital Totem for:

Concept: "${concept}"
Definition: "${definition}"`;

    return { systemPrompt, userPrompt };
}
