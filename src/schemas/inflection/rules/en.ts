/**
 * English Regular Inflection Rules
 * 
 * Generates complete inflection tables for regular English words.
 * Irregular forms should be stored in key_forms traits and override these rules.
 * 
 * Coverage:
 * - Nouns: singular/plural
 * - Verbs: present (all persons), past simple, past participle, present participle
 * - Adjectives: positive, comparative, superlative
 * 
 * Limitations:
 * - CVC consonant doubling uses a simple heuristic (1-syllable words only).
 *   Multi-syllable words with stressed final syllables (e.g., prefer → preferred)
 *   should use key_forms for accuracy.
 * - Syllable counting is approximate (used for adjective comparison strategy).
 */

import type { LinguisticTrait } from '../../schemas/SenseEntity.schema';
import type { InflectionRuleModule } from '../InflectionTypes';

// ============================================================================
// PHONOLOGICAL HELPERS
// ============================================================================

const VOWELS = 'aeiou';

function isVowel(c: string): boolean {
    return VOWELS.includes(c.toLowerCase());
}

function isConsonant(c: string): boolean {
    return /[a-z]/i.test(c) && !isVowel(c);
}

/**
 * Check if a word ends in a Consonant-Vowel-Consonant pattern.
 * Used for consonant doubling rules (stop → stopped, big → bigger).
 * 
 * Excludes final w, x, y which never double.
 */
function endsCVC(word: string): boolean {
    if (word.length < 3) return false;
    const last = word[word.length - 1]!.toLowerCase();
    const mid = word[word.length - 2]!.toLowerCase();
    const first = word[word.length - 3]!.toLowerCase();
    // Final w, x, y never double
    if ('wxy'.includes(last)) return false;
    return isConsonant(first) && isVowel(mid) && isConsonant(last);
}

/**
 * Approximate syllable count using vowel group heuristic.
 * Used to determine adjective comparison strategy (synthetic vs analytic).
 * 
 * Not perfect, but sufficient for the -er/-est vs more/most decision.
 */
function countSyllables(word: string): number {
    const lower = word.toLowerCase();
    const vowelGroups = lower.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    // Silent final -e (but not -le after consonant)
    if (lower.endsWith('e') && !lower.endsWith('le') && count > 1) {
        count--;
    }
    // -le after consonant is a syllable (e.g., "simple" = 2)
    if (lower.endsWith('le') && lower.length >= 3 && isConsonant(lower[lower.length - 3]!)) {
        // Already counted by vowel groups? Check:
        // "simple" → vowel groups: "i", "e" → 2, minus silent-e doesn't apply (ends in -le) → 2 ✓
    }
    return Math.max(1, count);
}

/**
 * Check if a 2-syllable adjective can use synthetic comparison (-er/-est).
 * English allows synthetic comparison for 2-syllable adjectives ending in:
 * -y (happy → happier), -le (simple → simpler), -er (clever → cleverer),
 * -ow (narrow → narrower)
 */
function canUseSyntheticComparison(word: string): boolean {
    const lower = word.toLowerCase();
    return lower.endsWith('y') ||
        lower.endsWith('le') ||
        lower.endsWith('er') ||
        lower.endsWith('ow');
}

// ============================================================================
// NOUN INFLECTION
// ============================================================================

/**
 * English noun pluralization rules:
 * 
 * 1. Sibilant endings (-s, -ss, -sh, -ch, -x, -z) → +es
 * 2. Consonant + y → drop y, +ies
 * 3. -f → drop f, +ves (common pattern, but many exceptions exist)
 * 4. -fe → drop fe, +ves
 * 5. Default → +s
 * 
 * Note: -f/-fe rules have many exceptions (belief→beliefs, roof→roofs).
 * Words with truly irregular plurals should use the plural_form trait.
 */
function pluralizeNoun(word: string): string {
    const lower = word.toLowerCase();

    // -s, -ss, -sh, -ch, -x, -z → +es
    if (/(?:s|ss|sh|ch|x|z)$/.test(lower)) {
        return word + 'es';
    }

    // Consonant + y → drop y, +ies
    if (lower.endsWith('y') && word.length >= 2 && isConsonant(lower[lower.length - 2]!)) {
        return word.slice(0, -1) + 'ies';
    }

    // -fe → drop fe, +ves (knife → knives)
    if (lower.endsWith('fe')) {
        return word.slice(0, -2) + 'ves';
    }

    // -f → drop f, +ves (leaf → leaves)
    // Note: This is a common but NOT universal rule.
    // Exceptions (belief, roof, proof) should use plural_form trait.
    if (lower.endsWith('f')) {
        return word.slice(0, -1) + 'ves';
    }

    // Default → +s
    return word + 's';
}

function inflectNounEn(baseForm: string, traits: LinguisticTrait[]): Record<string, Record<string, string>> {
    // Check for stored irregular plural
    const pluralTrait = traits.find(t => t.traitId === 'plural_form');
    const plural = pluralTrait
        ? (typeof pluralTrait.value === 'string' ? pluralTrait.value : (pluralTrait.value[0] ?? baseForm))
        : pluralizeNoun(baseForm);

    return {
        number: {
            singular: baseForm,
            plural: plural,
        },
    };
}

// ============================================================================
// VERB INFLECTION
// ============================================================================

/**
 * English present tense 3rd person singular:
 * 1. Sibilant endings (-s, -ss, -sh, -ch, -x, -z) → +es
 * 2. Consonant + y → drop y, +ies
 * 3. -o → +es (go→goes, do→does — but these are usually irregular anyway)
 * 4. Default → +s
 */
function present3s(word: string): string {
    const lower = word.toLowerCase();

    if (/(?:s|ss|sh|ch|x|z)$/.test(lower)) {
        return word + 'es';
    }
    if (lower.endsWith('y') && word.length >= 2 && isConsonant(lower[lower.length - 2]!)) {
        return word.slice(0, -1) + 'ies';
    }
    if (lower.endsWith('o')) {
        return word + 'es';
    }
    return word + 's';
}

/**
 * English past tense / past participle (regular: both are the same):
 * 1. Ending in -e → +d
 * 2. Consonant + y → drop y, +ied
 * 3. CVC (1-syllable) → double final consonant, +ed
 * 4. Default → +ed
 */
function pastRegular(word: string): string {
    const lower = word.toLowerCase();

    if (lower.endsWith('e')) {
        return word + 'd';
    }
    if (lower.endsWith('y') && word.length >= 2 && isConsonant(lower[lower.length - 2]!)) {
        return word.slice(0, -1) + 'ied';
    }
    if (endsCVC(word) && countSyllables(word) === 1) {
        return word + word[word.length - 1]! + 'ed';
    }
    return word + 'ed';
}

/**
 * English present participle / gerund:
 * 1. Ending in -ie → change to y, +ing (die→dying, lie→lying)
 * 2. Ending in -e (not -ee, -ye, -oe) → drop e, +ing (live→living)
 * 3. CVC (1-syllable) → double final consonant, +ing (stop→stopping)
 * 4. Default → +ing
 */
function presentParticiple(word: string): string {
    const lower = word.toLowerCase();

    if (lower.endsWith('ie')) {
        return word.slice(0, -2) + 'ying';
    }
    if (lower.endsWith('e') && !lower.endsWith('ee') && !lower.endsWith('ye') && !lower.endsWith('oe')) {
        return word.slice(0, -1) + 'ing';
    }
    if (endsCVC(word) && countSyllables(word) === 1) {
        return word + word[word.length - 1]! + 'ing';
    }
    return word + 'ing';
}

function inflectVerbEn(baseForm: string, traits: LinguisticTrait[]): Record<string, Record<string, string>> {
    // Check for stored irregular key_forms
    const keyFormsTrait = traits.find(t => t.traitId === 'key_forms');
    let past: string;
    let pastParticiple: string;

    if (keyFormsTrait && Array.isArray(keyFormsTrait.value)) {
        // KeyFormsDictionary for 'en' verbs: ['past_tense', 'past_participle']
        past = keyFormsTrait.value[0] ?? pastRegular(baseForm);
        pastParticiple = keyFormsTrait.value[1] ?? past;
    } else {
        past = pastRegular(baseForm);
        pastParticiple = past; // Regular English: past === past participle
    }

    return {
        present: {
            '1s': baseForm,        // I walk
            '2s': baseForm,        // you walk
            '3s': present3s(baseForm), // he/she walks
            '1p': baseForm,        // we walk
            '2p': baseForm,        // you walk
            '3p': baseForm,        // they walk
        },
        past: {
            simple: past,               // walked / went
            participle: pastParticiple,  // walked / gone
        },
        continuous: {
            present_participle: presentParticiple(baseForm),  // walking
        },
    };
}

// ============================================================================
// ADJECTIVE INFLECTION
// ============================================================================

/**
 * English adjective comparison:
 * 
 * Synthetic (-er/-est): 1-syllable adjectives + some 2-syllable
 * Analytic (more/most): 2+ syllable adjectives
 * 
 * Synthetic rules:
 * 1. Ending in -e → +r/+st (nice→nicer→nicest)
 * 2. Consonant + y → drop y, +ier/+iest (happy→happier→happiest)
 * 3. CVC (1-syllable) → double + er/est (big→bigger→biggest)
 * 4. Default → +er/+est (tall→taller→tallest)
 */
function syntheticComparative(word: string): string {
    const lower = word.toLowerCase();
    if (lower.endsWith('e')) return word + 'r';
    if (lower.endsWith('y') && word.length >= 2 && isConsonant(lower[lower.length - 2]!)) {
        return word.slice(0, -1) + 'ier';
    }
    if (endsCVC(word) && countSyllables(word) === 1) {
        return word + word[word.length - 1]! + 'er';
    }
    return word + 'er';
}

function syntheticSuperlative(word: string): string {
    const lower = word.toLowerCase();
    if (lower.endsWith('e')) return word + 'st';
    if (lower.endsWith('y') && word.length >= 2 && isConsonant(lower[lower.length - 2]!)) {
        return word.slice(0, -1) + 'iest';
    }
    if (endsCVC(word) && countSyllables(word) === 1) {
        return word + word[word.length - 1]! + 'est';
    }
    return word + 'est';
}

function inflectAdjectiveEn(baseForm: string, traits: LinguisticTrait[]): Record<string, Record<string, string>> {
    // Check for stored irregular key_forms
    const keyFormsTrait = traits.find(t => t.traitId === 'key_forms');

    if (keyFormsTrait && Array.isArray(keyFormsTrait.value)) {
        // KeyFormsDictionary for 'en' adjectives: ['comparative', 'superlative']
        return {
            comparison: {
                positive: baseForm,
                comparative: keyFormsTrait.value[0] ?? syntheticComparative(baseForm),
                superlative: keyFormsTrait.value[1] ?? syntheticSuperlative(baseForm),
            },
        };
    }

    // Determine comparison strategy based on syllable count
    const syllables = countSyllables(baseForm);
    const useSynthetic = syllables === 1 || (syllables === 2 && canUseSyntheticComparison(baseForm));

    return {
        comparison: {
            positive: baseForm,
            comparative: useSynthetic ? syntheticComparative(baseForm) : `more ${baseForm}`,
            superlative: useSynthetic ? syntheticSuperlative(baseForm) : `most ${baseForm}`,
        },
    };
}

// ============================================================================
// MODULE EXPORT
// ============================================================================

export const englishRules: InflectionRuleModule = {
    inflectNoun: inflectNounEn,
    inflectVerb: inflectVerbEn,
    inflectAdjective: inflectAdjectiveEn,
};
