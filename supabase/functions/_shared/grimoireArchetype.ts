/**
 * grimoireArchetype.ts — 魔典 Archetype 系统
 *
 * 定义 8 种语义类型及其双向逻辑关系，注入 generate-grimoire 的生成 prompt。
 * 与 Persona 无关，独立存在。
 *
 * KEY PRINCIPLE — BIDIRECTIONAL LOGIC:
 * seedWord 可以处于关系的任意一端。
 * AI 需同时思考两端，选择对当前 Persona 最有趣的方向。
 * 每个 archetype 提供两个 example，分别展示 A→B 与 B→A 两种方向。
 */

export interface ArchetypeExample {
    direction: 'A→B' | 'B→A';
    seed: string;
    words: string[];
    note: string;
}

export interface ArchetypeEntry {
    id: string;
    label: string;
    description: string;
    bidirectionalLogic: string;
    examples: [ArchetypeExample, ArchetypeExample];   // [A→B, B→A]
}

export const ARCHETYPE_TABLE: Record<string, ArchetypeEntry> = {
    anatomy: {
        id: 'anatomy',
        label: 'Anatomy',
        description: 'Parts and structures of a whole entity.',
        bidirectionalLogic:
            'A (Part) ↔ B (Whole): ' +
            'If seedWord is a PART → collect other PARTS of the same WHOLE. ' +
            'If seedWord is a WHOLE → collect its component PARTS.',
        examples: [
            {
                direction: 'A→B', seed: 'Gear',
                words: ['spring', 'hands', 'dial', 'crown', 'bezel'],
                note: '"Gear" is a Part of a watch. Collect its sibling Parts.',
            },
            {
                direction: 'B→A', seed: 'Clock',
                words: ['gears', 'hands', 'spring', 'dial', 'crown'],
                note: '"Clock" is the Whole. Collect its Parts.',
            },
        ],
    },
    locus: {
        id: 'locus',
        label: 'Locus',
        description: 'Objects and the places or contexts they inhabit.',
        bidirectionalLogic:
            'A (Object/Entity) ↔ B (Place/Context): ' +
            'If seedWord is an OBJECT → collect PLACES or CONTEXTS where it naturally exists. ' +
            'If seedWord is a PLACE/CONTEXT → collect OBJECTS or ENTITIES that belong there.',
        examples: [
            {
                direction: 'A→B', seed: 'Clock',
                words: ['tower', 'mantelpiece', 'station', 'wrist', 'bedside'],
                note: '"Clock" is the Object. Collect the Places it inhabits.',
            },
            {
                direction: 'B→A', seed: 'Kitchen',
                words: ['stove', 'knife', 'pot', 'apron', 'salt'],
                note: '"Kitchen" is the Place. Collect the Objects that belong there.',
            },
        ],
    },
    ritual: {
        id: 'ritual',
        label: 'Ritual',
        description: 'Sequential steps and the goal they achieve.',
        bidirectionalLogic:
            'A (Step/Action) ↔ B (Goal/Process): ' +
            'If seedWord is a STEP → collect other STEPS belonging to the same ritual or process. ' +
            'If seedWord is a GOAL or PROCESS → collect the sequential STEPS required to achieve it.',
        examples: [
            {
                direction: 'A→B', seed: 'Knead',
                words: ['measure', 'mix', 'rise', 'shape', 'bake'],
                note: '"Knead" is one Step. Collect the sibling Steps of breadmaking.',
            },
            {
                direction: 'B→A', seed: 'Bread',
                words: ['measure', 'mix', 'knead', 'rise', 'bake'],
                note: '"Bread" is the Goal. Collect the Steps that produce it.',
            },
        ],
    },
    qualia: {
        id: 'qualia',
        label: 'Qualia',
        description: 'Objects and the sensory or subjective qualities they evoke.',
        bidirectionalLogic:
            'A (Object/Source) ↔ B (Sensation/Quality): ' +
            'If seedWord is an OBJECT or SOURCE → collect the SENSATIONS or QUALITIES it evokes. ' +
            'If seedWord is a SENSATION or QUALITY → collect OBJECTS or SOURCES that produce it.',
        examples: [
            {
                direction: 'A→B', seed: 'Clock',
                words: ['rhythmic', 'metallic', 'cold', 'precise', 'relentless'],
                note: '"Clock" is the Source. Collect the Qualities it evokes.',
            },
            {
                direction: 'B→A', seed: 'Warmth',
                words: ['hearth', 'blanket', 'tea', 'sunlight', 'breath'],
                note: '"Warmth" is the Sensation. Collect the Sources that produce it.',
            },
        ],
    },
    spectrum: {
        id: 'spectrum',
        label: 'Spectrum',
        description: 'A concept and its opposing pole or gradient.',
        bidirectionalLogic:
            'A (Concept) ↔ B (Opposing Pole / Gradient Point): ' +
            'The relationship is inherently bidirectional — any word on the spectrum relates back to the seed. ' +
            'The seed can be either pole; collect words along the opposing gradient.',
        examples: [
            {
                direction: 'A→B', seed: 'Clock',
                words: ['timeless', 'eternal', 'frozen', 'still', 'boundless'],
                note: '"Clock" = structured time. Collect words from the opposing spectrum.',
            },
            {
                direction: 'B→A', seed: 'Silence',
                words: ['shout', 'thunder', 'laughter', 'bell', 'alarm'],
                note: '"Silence" = absence of sound. Collect words from the opposing pole.',
            },
        ],
    },
    time: {
        id: 'time',
        label: 'Time',
        description: 'Events, states, and their causes or effects across the time dimension.',
        bidirectionalLogic:
            'A (Cause / Prior State) ↔ B (Effect / Subsequent State): ' +
            'If seedWord is a CAUSE → collect the EFFECTS or subsequent states it produces. ' +
            'If seedWord is an EFFECT → collect the CAUSES or prior states that produced it.',
        examples: [
            {
                direction: 'A→B', seed: 'Drought',
                words: ['famine', 'migration', 'cracked earth', 'prayer', 'exodus'],
                note: '"Drought" as Cause. Collect the Effects it unfolds into.',
            },
            {
                direction: 'B→A', seed: 'Anxiety',
                words: ['deadline', 'crowd', 'uncertainty', 'debt', 'expectation'],
                note: '"Anxiety" as Effect. Collect the Causes that produce it.',
            },
        ],
    },
    metaphor: {
        id: 'metaphor',
        label: 'Metaphor',
        description: 'Concepts and the symbols or images that represent them.',
        bidirectionalLogic:
            'A (Abstract Concept) ↔ B (Symbol / Concrete Image): ' +
            'If seedWord is an ABSTRACT CONCEPT → collect SYMBOLS, IMAGES, or CONCRETE things that represent it. ' +
            'If seedWord is a CONCRETE SYMBOL → collect the ABSTRACT CONCEPTS it embodies or evokes.',
        examples: [
            {
                direction: 'A→B', seed: 'Mortality',
                words: ['hourglass', 'shadow', 'ash', 'crow', 'leaf'],
                note: '"Mortality" is the Concept. Collect its Symbols.',
            },
            {
                direction: 'B→A', seed: 'Mirror',
                words: ['truth', 'vanity', 'duality', 'self', 'judgment'],
                note: '"Mirror" is the Symbol. Collect the Abstracts it embodies.',
            },
        ],
    },
    taxonomy: {
        id: 'taxonomy',
        label: 'Taxonomy',
        description: 'Categories and their instances, or instances and their shared category.',
        bidirectionalLogic:
            'A (Category) ↔ B (Instance/Member): ' +
            'If seedWord is a CATEGORY → collect specific INSTANCES or MEMBERS. ' +
            'If seedWord is an INSTANCE → collect other MEMBERS of the same category.',
        examples: [
            {
                direction: 'A→B', seed: 'Clock',
                words: ['sundial', 'hourglass', 'stopwatch', 'chronometer', 'pendulum clock'],
                note: '"Clock" as Category. Collect specific Instances.',
            },
            {
                direction: 'B→A', seed: 'Sparrow',
                words: ['wren', 'finch', 'robin', 'starling', 'crow'],
                note: '"Sparrow" as Instance. Collect sibling Members of the same category (songbirds).',
            },
        ],
    },
};
