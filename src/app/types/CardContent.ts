/**
 * Represents a single content item (definition or flavor text) for a card.
 */
export type ContentItem = {
    /** Unique identifier for the content item */
    id: string;
    /** English text */
    en: string;
    /** Chinese text (Simplified) */
    zh: string;
    /** Part of speech (optional, for definitions) */
    pos?: string;
};

/**
 * Data structure for element content including definitions and flavor texts.
 */
export type ElementData = {
    /** Array of definition items */
    definitions: ContentItem[];
    /** Array of flavor text items */
    flavors: ContentItem[];
};
