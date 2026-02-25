/**
 * Project: Lexicoin - Key Forms Static Dictionary
 * 
 * Purpose:
 * Defines the positional semantics for the 'key_forms' LinguisticTrait arrays.
 * When a word has irregular inflections, its key_forms trait stores a string[]
 * where each position corresponds to a specific grammatical form.
 * This dictionary maps positions to human-readable form labels per language.
 * 
 * Usage:
 * Given a trait { traitId: "key_forms", value: ["été", "suis", "est", "sont"] }
 * and the French verb dictionary ['past_participle', '1s_present', '3s_present', '3p_present'],
 * we know: value[0]="été" is past_participle, value[1]="suis" is 1s_present, etc.
 * 
 * Maintenance:
 * - This is a STATIC configuration — defined once per language, not per word.
 * - Order must NOT be changed after data has been generated (would misalign existing entries).
 * - New forms can only be APPENDED to the end of existing arrays.
 * - Adding a new language requires defining both verb and noun dictionaries.
 */

// ============================================================================
// VERB KEY FORMS DICTIONARY
// ============================================================================

/**
 * Verb Key Forms: Positional semantics for irregular verb inflection arrays.
 * 
 * Each language defines which grammatical forms are captured and in what order.
 * Only the most critical forms for learner recognition are included —
 * this is NOT a full conjugation table.
 * 
 * Naming convention: {person}{number}_{tense}
 * - Person: 1/2/3 (first/second/third person)
 * - Number: s/p (singular/plural)
 * - Tense: present/past/future/subjunctive/etc.
 * - Special: past_participle, present_participle, te_form, etc.
 */
export const VERB_KEY_FORMS: Record<string, string[]> = {
    // French: Focus on present indicative + past participle
    'fr': ['past_participle', '1s_present', '3s_present', '3p_present'],

    // German: Past tense + past participle + auxiliary (sein/haben)
    'de': ['3s_past', 'past_participle', 'auxiliary'],

    // Spanish: Past participle + present (yo) + preterite (yo)
    'es': ['past_participle', '1s_present', '1s_preterite'],

    // Italian: Past participle + present (io) + present (loro)
    'it': ['past_participle', '1s_present', '3p_present'],

    // Portuguese: Past participle + present (eu) + preterite (eu)
    'pt': ['past_participle', '1s_present', '1s_preterite'],

    // Japanese: Core conjugation forms for learner recognition
    'ja': ['te_form', 'ta_form', 'nai_form'],

    // English: Past tense + past participle (only for irregulars like go/went/gone)
    'en': ['past_tense', 'past_participle'],
};

// ============================================================================
// NOUN KEY FORMS DICTIONARY
// ============================================================================

/**
 * Noun Key Forms: Positional semantics for irregular noun declension arrays.
 * 
 * Only relevant for languages with case systems.
 * Each position represents a specific case form (typically singular).
 * 
 * Naming convention: {case}_{number}
 * - Case: nom/acc/dat/gen/inst/prep (nominative/accusative/dative/genitive/instrumental/prepositional)
 * - Number: sg/pl (singular/plural)
 */
export const NOUN_KEY_FORMS: Record<string, string[]> = {
    // German: 4 cases × singular + nominative plural
    'de': ['nom_sg', 'acc_sg', 'dat_sg', 'gen_sg', 'nom_pl'],

    // Russian (future): 6 cases singular
    'ru': ['nom_sg', 'gen_sg', 'dat_sg', 'acc_sg', 'inst_sg', 'prep_sg'],
};

// ============================================================================
// ADJECTIVE KEY FORMS DICTIONARY
// ============================================================================

/**
 * Adjective Key Forms: Positional semantics for irregular comparison arrays.
 * 
 * Captures irregular comparative and superlative forms.
 * Only needed for truly irregular adjectives (e.g., good/better/best).
 * Regular comparison (tall/taller/tallest, grand/plus grand) does not need key_forms.
 * 
 * Not applicable to: zh-CN (no morphological comparison), ja (no morphological comparison)
 */
export const ADJ_KEY_FORMS: Record<string, string[]> = {
    // English: good → better → best (no gender/number agreement)
    'en': ['comparative', 'superlative'],

    // German: gut → besser → am besten (adjective declension is fully regular, no agreement slots needed)
    'de': ['comparative', 'superlative'],

    // French: bon → meilleur → le meilleur
    // + irregular gender/number agreement (beau → bel/belle/beaux/belles)
    'fr': ['comparative', 'superlative', 'masc_prevowel', 'feminine_sg', 'masc_pl', 'feminine_pl'],

    // Spanish: bueno → mejor → el mejor (gender agreement is regular: -o/-a)
    'es': ['comparative', 'superlative'],

    // Italian: buono → migliore → il migliore
    // + irregular gender/number agreement (bello → bel/bell'/bella/bei/begli/belle)
    'it': ['comparative', 'superlative', 'masc_prevowel', 'feminine_sg', 'masc_pl', 'feminine_pl'],

    // Portuguese: bom → melhor → o melhor (gender agreement is regular: -o/-a)
    'pt': ['comparative', 'superlative'],
};

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Get the human-readable label for a specific position in a key_forms array.
 * 
 * @param lang - Language code
 * @param index - Position index in the key_forms array
 * @param type - 'verb', 'noun', or 'adjective'
 * @returns The form label (e.g., 'past_participle') or undefined if out of range
 * 
 * @example
 * getFormLabel('fr', 0, 'verb')      // → 'past_participle'
 * getFormLabel('de', 2, 'noun')      // → 'dat_sg'
 * getFormLabel('en', 0, 'adjective') // → 'comparative'
 */
export function getFormLabel(lang: string, index: number, type: 'verb' | 'noun' | 'adjective'): string | undefined {
    const dict = type === 'verb' ? VERB_KEY_FORMS : type === 'noun' ? NOUN_KEY_FORMS : ADJ_KEY_FORMS;
    const forms = dict[lang];
    if (!forms || index < 0 || index >= forms.length) return undefined;
    return forms[index];
}

/**
 * Get all form labels for a language and type.
 * Used by the frontend to display column headers in inflection tables.
 * 
 * @param lang - Language code
 * @param type - 'verb', 'noun', or 'adjective'
 * @returns Array of form labels, or empty array if language has no forms defined
 */
export function getFormLabels(lang: string, type: 'verb' | 'noun' | 'adjective'): string[] {
    const dict = type === 'verb' ? VERB_KEY_FORMS : type === 'noun' ? NOUN_KEY_FORMS : ADJ_KEY_FORMS;
    return dict[lang] ?? [];
}
