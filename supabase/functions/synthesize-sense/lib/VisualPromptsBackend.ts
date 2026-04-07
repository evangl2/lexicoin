import { VISUAL_DICTIONARY } from './VisualDictionary.ts';

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
Identify the concept's semantic category and apply its visual strategy. For animation, always express the category's most characteristic natural motion or behavior.

*   **Living Creatures:** Recognizable **silhouette + defining anatomy** (wings, scales, antennae, fins); organic curves and biological textures.
*   **Plants & Botanicals:** **Morphological identity** (petal arrangement, leaf venation, root systems, spore structures); organic growth curves.
*   **Physical Objects:** **Form and material truth** (metallic sheen, wood grain, glass refraction, fabric folds); functional operational state.
*   **Food & Drink:** **Appetizing realism**—glistening surfaces, rich saturation, steam, condensation, or dripping textures.
*   **Natural Phenomena:** Direct simulation of the phenomenon's **visual essence** (lightning forks, vortex spirals, flame tongues, aurora ribbons, planetary rings).
*   **Places & Architecture:** **Miniature diorama**—iconic silhouettes, atmospheric perspective, signature lighting (golden hour, neon glow, moonlight).
*   **Body & Anatomy:** **Anatomical fidelity** with biological palettes (warm reds, tissue pinks, vascular blues); physiological rhythms.
*   **Emotions & Mental States:** Most evocative **visual metaphor**—"loneliness" as a single light in a void, "anger" as cracking magma, "joy" as radiating prismatic light.
*   **Abstract Ideas:** **Geometric harmony and symbolic structures**—interlocking forms, recursive patterns, balanced compositions, flowing data-streams.
*   **Actions & Verbs:** Freeze at the **most dynamic moment of tension**, then animate the release (a fist mid-strike, water mid-splash, an explosion mid-bloom).
*   **Social & Relational:** **Symbolic figures or interconnected elements** expressing relational essence (intertwined rings, converging paths, hierarchical structures).
*   **Cultural & Mythological:** **Iconography of the relevant culture**—sacred geometry, ceremonial motifs, mythological attributes, traditional color symbolism.
*   **Memes & Internet Culture:** **Bold pop-art maximalism**—neon palettes, glitch effects, halftone patterns, pixel aesthetics, exaggerated proportions.
*   **Music & Sound:** **Waveforms, resonance patterns, and vibrational energy**; render instruments with material accuracy.
*   **Technology & Science:** **Precision engineering aesthetics**—circuit traces, holographic displays, molecular structures, quantum states.
*   **Time & Temporal:** **Transitional imagery**—sundials, hourglasses, seasonal palettes, decay/renewal cycles, celestial arcs.

If the concept spans multiple categories or defies all of them, **hybridize freely or invent an entirely new visual language**.

## III. Technical Specification

**Single import:** \`import { motion } from 'motion/react';\`

**Follow this skeleton:**

\`\`\`tsx
import { motion } from 'motion/react';

const ComponentName = ({ isActive }: { isActive: boolean }) => (
  <svg viewBox="0 0 100 100" width="100%" height="100%">

    <motion.element
      attr={idleValue}              {/* direct prop = idle variant value */}
      variants={{
        idle:   { attr: idleValue },
        active: { attr: targetValue,
                  transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } }
      }}
      initial="idle"
      animate={isActive ? 'active' : 'idle'}
    />

  </svg>
);

export default ComponentName;
\`\`\`

**Four invariants — violations cause runtime crashes:**

1. **Variant parity** — every property in any variant must appear in *all* variants with an explicit value. framer-motion cannot interpolate from \`undefined\`.
2. **Direct-prop anchor** — every \`<motion.*>\` using variants must carry the animated attributes as direct props (set to idle values). This gives framer-motion a valid DOM starting point.
3. **Path data** — every \`d\` value must be a complete path string starting with \`M\`, present in both variants and as a direct prop.
4. **Hard termination** — \`export default ComponentName;\` is the absolute final line. Any text after it is parsed as JavaScript and will throw a SyntaxError.

**Sandbox limits:** no \`useEffect / useState / useRef\`, no \`window / document\`, no \`async/await\`, no \`import type\`.

**SVG tips:** \`<defs>\` for gradients/filters; \`<filter x="-50%" y="-50%" width="200%" height="200%">\` prevents blur clipping; \`style={{ transformOrigin: '…' }}\` not a direct prop.

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
