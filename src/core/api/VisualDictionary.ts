export interface VisualDirective {
    styleInstruction: string;
}

/**
 * 字典式的 Visual 管理中心
 * 
 * 承担了各个 visualId 最核心的基准构建哲学注入。
 * 在此定义风格的具体材质、特效取向和美术约束。
 * 
 * NOTE: styleInstruction 拥有最高设计优先级。
 * 当 Representation Strategy Guide 与此处的指导发生矛盾时，以此为准。
 */
export const VISUAL_DICTIONARY: Record<string, VisualDirective> = {
    default: {
        styleInstruction: `**This section has the HIGHEST design priority. When any other guidance conflicts with these principles, defer to this section.**

*   **Iconic Imprint:** The totem must capture the irreducible visual essence of the concept—so distinctive that a single glance permanently bonds it to the concept in the viewer's mind. Prioritize recognizability and semantic accuracy over abstract beauty.
*   **Optic Sophistication:** Use at least 2 SVG filter effects (e.g., \`feGaussianBlur\`, \`feTurbulence\`, \`feSpecularLighting\`, \`feDropShadow\`, \`feColorMatrix\`) to create atmospheric depth and textural richness. Define all filters, gradients, masks, and patterns within a \`<defs>\` block.
*   **Detail Density:** Favor rich, layered compositions over flat minimalism—UNLESS the concept's essence IS simplicity (e.g., "void", "silence", "zero"), in which case minimalism becomes the representational truth.
*   **Compositional Presence:** The totem should confidently fill **50–80%** of the viewBox, centered, with no important elements clipped by the edges.
*   **Transparent Background:** Keep the background transparent by default. Only add background elements when they are semantically essential to the concept (e.g., a horizon for "landscape", a void for "space").`
    }
    /* 示例：其它可通过动态传参注入的美学特化
    cyberpunk: {
        styleInstruction: "Employ a harsh cyberpunk aesthetic: utilize high-contrast neon hues (cyan, magenta, electric yellow), glitch artifacts, harsh rim lighting, and industrial circuit-like structural patterns."
    },
    watercolor: {
        styleInstruction: "Employ an organic watercolor aesthetic: utilize feTurbulence and feDisplacementMap to create rough, bleeding edges, soft overlapping washes of color, and varying opacities to simulate paper texture."
    }
    */
};
