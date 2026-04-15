/**
 * archetypeTable.ts
 *
 * The eight semantic archetypes that define the logical relationship between
 * the seed concept and the words the player must collect.
 *
 * KEY PRINCIPLE — BIDIRECTIONAL LOGIC:
 * The seed word does not always occupy the same position in the relationship.
 * The AI must reason about BOTH ends simultaneously and choose the direction
 * that creates the most interesting quest for the active persona.
 *
 * "Script" archetype has been replaced by "Time" to better capture
 * causal-temporal relationships (time dimension / cause-effect dimension).
 */

export interface ArchetypeEntry {
    id: string;
    label: string;
    /** Plain-language description shown in archetype reference table. */
    description: string;
    /**
     * Bidirectional logic rule.
     * Uses A ↔ B notation to make both ends explicit.
     * The AI reasons: which end is the seedWord, and which end must the player collect?
     */
    bidirectionalLogic: string;
    /** Concrete example demonstrating one possible direction. */
    example: {
        seed: string;
        direction: 'A→B' | 'B→A';
        words: string[];
        note: string;
    };
}

export const ARCHETYPE_TABLE: Record<string, ArchetypeEntry> = {
    anatomy: {
        id: 'anatomy',
        label: 'Anatomy',
        description: 'Parts and structures of a whole entity.',
        bidirectionalLogic:
            'A (Part) ↔ B (Whole): ' +
            'If seedWord is a WHOLE → collect its component PARTS. ' +
            'If seedWord is a PART → collect other PARTS of the same WHOLE.',
        example: {
            seed: 'Clock',
            direction: 'B→A',
            words: ['Gears', 'Hands', 'Spring', 'Dial', 'Crown'],
            note: '"Clock" is the Whole. Collect its Parts.',
        },
    },
    locus: {
        id: 'locus',
        label: 'Locus',
        description: 'Objects and the places or contexts they inhabit.',
        bidirectionalLogic:
            'A (Object/Entity) ↔ B (Place/Context): ' +
            'If seedWord is an OBJECT → collect PLACES or CONTEXTS where it naturally exists. ' +
            'If seedWord is a PLACE/CONTEXT → collect OBJECTS or ENTITIES that belong there.',
        example: {
            seed: 'Clock',
            direction: 'A→B',
            words: ['Tower', 'Mantelpiece', 'Station', 'Wrist', 'Bedside'],
            note: '"Clock" is the Object. Collect the Places it inhabits.',
        },
    },
    ritual: {
        id: 'ritual',
        label: 'Ritual',
        description: 'Sequential steps and the goal they achieve.',
        bidirectionalLogic:
            'A (Step/Action) ↔ B (Goal/Process): ' +
            'If seedWord is a GOAL or PROCESS → collect the sequential STEPS required to achieve it. ' +
            'If seedWord is a STEP → collect other STEPS belonging to the same ritual or process.',
        example: {
            seed: 'Clock',
            direction: 'B→A',
            words: ['Wind', 'Set', 'Synchronize', 'Oil', 'Calibrate'],
            note: '"Clock" implies maintenance ritual. Collect its procedural Steps.',
        },
    },
    qualia: {
        id: 'qualia',
        label: 'Qualia',
        description: 'Objects and the sensory or subjective qualities they evoke.',
        bidirectionalLogic:
            'A (Object/Source) ↔ B (Sensation/Quality): ' +
            'If seedWord is an OBJECT or SOURCE → collect the SENSATIONS or QUALITIES it evokes. ' +
            'If seedWord is a SENSATION or QUALITY → collect OBJECTS or SOURCES that produce it.',
        example: {
            seed: 'Clock',
            direction: 'A→B',
            words: ['Rhythmic', 'Metallic', 'Cold', 'Precise', 'Relentless'],
            note: '"Clock" is the Source. Collect the Qualities it evokes.',
        },
    },
    spectrum: {
        id: 'spectrum',
        label: 'Spectrum',
        description: 'A concept and its opposing pole or gradient.',
        bidirectionalLogic:
            'A (Concept) ↔ B (Opposing Pole / Gradient Point): ' +
            'If seedWord is a CONCEPT → collect words along its opposing gradient or antonymous spectrum. ' +
            'The relationship is inherently bidirectional: any word in the spectrum relates back to the seed.',
        example: {
            seed: 'Clock',
            direction: 'A→B',
            words: ['Timeless', 'Eternal', 'Frozen', 'Still', 'Boundless'],
            note: '"Clock" = structured time. Collect words from the opposing spectrum.',
        },
    },
    time: {
        id: 'time',
        label: 'Time',
        description: 'Events, states, and their causes or effects across the time dimension.',
        bidirectionalLogic:
            'A (Cause / Prior State) ↔ B (Effect / Subsequent State): ' +
            'If seedWord is an EVENT or STATE → collect its CAUSES (what preceded it) or EFFECTS (what it leads to). ' +
            'If seedWord is a CAUSE → collect the EVENTS or STATES it produces. ' +
            'If seedWord is an EFFECT → collect the CAUSES that produced it.',
        example: {
            seed: 'Clock',
            direction: 'B→A',
            words: ['Industry', 'Standardization', 'Colonialism', 'Anxiety', 'Deadline'],
            note: '"Clock" as Effect: collect the historical forces (Causes) that created clock culture.',
        },
    },
    metaphor: {
        id: 'metaphor',
        label: 'Metaphor',
        description: 'Concepts and the symbols or images that represent them.',
        bidirectionalLogic:
            'A (Abstract Concept) ↔ B (Symbol / Concrete Image): ' +
            'If seedWord is an ABSTRACT CONCEPT → collect SYMBOLS, IMAGES, or CONCRETE things that represent it. ' +
            'If seedWord is a CONCRETE SYMBOL → collect the ABSTRACT CONCEPTS it embodies or evokes.',
        example: {
            seed: 'Clock',
            direction: 'A→B',
            words: ['Heartbeat', 'Prison', 'Spiral', 'Tide', 'Flame'],
            note: '"Clock" as Concept (mortality, order). Collect its Symbols.',
        },
    },
    taxonomy: {
        id: 'taxonomy',
        label: 'Taxonomy',
        description: 'Categories and their instances, or instances and their shared category.',
        bidirectionalLogic:
            'A (Category) ↔ B (Instance/Member): ' +
            'If seedWord is a CATEGORY → collect specific INSTANCES or MEMBERS that belong to it. ' +
            'If seedWord is an INSTANCE → collect other MEMBERS of the same category, or the PARENT CATEGORIES it belongs to.',
        example: {
            seed: 'Clock',
            direction: 'A→B',
            words: ['Sundial', 'Hourglass', 'Stopwatch', 'Chronometer', 'Pendulum clock'],
            note: '"Clock" as Category (timekeeping devices). Collect specific Instances.',
        },
    },
};

/**
 * Generates the reference table string for injection into the system prompt.
 * The full table gives the AI the complete system before focusing on the active archetype.
 */
export function buildArchetypeReferenceTable(): string {
    const rows = Object.values(ARCHETYPE_TABLE).map((a) => {
        const exWords = a.example.words.slice(0, 3).join(', ');
        return `${a.label.padEnd(10)} | ${a.bidirectionalLogic.split(':')[0]!.trim().padEnd(25)} | ${exWords} (seed: "${a.example.seed}", ${a.example.direction})`;
    });
    return [
        'Type       | Bidirectional Logic               | Example (3 words)',
        '-'.repeat(80),
        ...rows,
    ].join('\n');
}
