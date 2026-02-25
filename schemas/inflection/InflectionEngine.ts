/**
 * Project: Lexicoin - Inflection Engine
 * 
 * Purpose:
 * Central dispatcher that generates complete inflection tables for any word
 * in any supported language. Delegates to language-specific rule modules.
 * 
 * Architecture:
 * 1. Consumer calls generateInflectionTable() with word + POS + language + traits
 * 2. Engine dispatches to the appropriate language rule module
 * 3. Rule module generates forms, respecting stored key_forms for irregulars
 * 4. Returns a unified InflectionTable for frontend rendering
 * 
 * Currently Implemented:
 * - English (en): Full noun/verb/adjective rules
 * 
 * Stubbed with Design Guidance:
 * - French (fr), German (de), Spanish (es), Italian (it),
 *   Portuguese (pt), Japanese (ja), Chinese (zh-CN)
 */

import type { POS, Language, LinguisticTrait } from '../schemas/SenseEntity.schema';
import type { InflectionTable, InflectionInput, InflectionRuleModule } from './InflectionTypes';
import { englishRules } from './rules/en';

// ============================================================================
// LANGUAGE STUB: FRENCH (fr)
// ============================================================================

/**
 * FRENCH INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Nouns:
 * - Gender: stored in `gender` trait (masculine/feminine)
 * - Regular plural: +s (default), -eau→-eaux, -al→-aux, -ail→-aux
 * - Article selection: le/la/l'/les derived from gender + first letter
 * 
 * Verbs — 3 regular groups:
 * - 1st group (-er): parler → parle/parles/parle/parlons/parlez/parlent
 *   - Strip -er, add: -e/-es/-e/-ons/-ez/-ent (present)
 *   - Past participle: -er → -é (parlé)
 *   - Imparfait: stem from 1p present (parl-) + -ais/-ais/-ait/-ions/-iez/-aient
 *   - Future: infinitive + -ai/-as/-a/-ons/-ez/-ont
 * 
 * - 2nd group (-ir with -issons): finir → finis/finis/finit/finissons/finissez/finissent
 *   - Strip -ir, add: -is/-is/-it/-issons/-issez/-issent (present)
 *   - Past participle: -ir → -i (fini)
 * 
 * - 3rd group (irregular): Use key_forms exclusively.
 *   No rules can cover this group — être, avoir, aller, faire, etc.
 * 
 * Adjectives:
 * - Regular feminine: +e (grand→grande), consonant doubling (bon→bonne)
 * - Regular plural: +s (grands), -eau→-eaux (beaux)
 * - Comparison: plus + adj (comparative), le/la plus + adj (superlative)
 *   - Irregular comparison (bon→meilleur) uses key_forms
 *   - Irregular agreement (beau→bel/belle) uses key_forms positions 2-5
 * 
 * Implementation priority: Verbs (1st group) → Nouns → Adjectives
 */
const frenchStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ _stub: { message: 'French noun inflection not yet implemented' } }),
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'French verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'French adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE STUB: GERMAN (de)
// ============================================================================

/**
 * GERMAN INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Nouns:
 * - Gender: stored in `gender` trait (masculine/feminine/neuter)
 * - Article derivation: der/die/das from gender (nominative)
 *   Full article table: der/den/dem/des (m), die/die/der/der (f), das/das/dem/des (n)
 * - Plural patterns (5 types): -e, -er, -(e)n, -s, zero + possible umlaut
 *   - Pattern is partially predictable from gender but has many exceptions
 *   - Use case_pattern trait label + key_forms for irregular paradigms
 * - Case system: nominative/accusative/dative/genitive
 *   - Regular patterns derivable from case_pattern label
 *   - Irregular: key_forms positions ['nom_sg', 'acc_sg', 'dat_sg', 'gen_sg', 'nom_pl']
 * 
 * Verbs:
 * - Weak (regular): stem + -e/-st/-t/-en/-t/-en (present)
 *   - Past: stem + -te (ich machte)
 *   - Past participle: ge- + stem + -t (gemacht)
 * - Strong (irregular): Use key_forms ['3s_past', 'past_participle', 'auxiliary']
 * - Mixed: behave like weak but with vowel change (key_forms needed)
 * - Separable prefix verbs: auf|machen → ich mache auf
 *   - Prefix separation is a construction-level rule, not word-level
 * 
 * Adjectives:
 * - Comparison: +er (comparative), am +sten (superlative)
 *   - With umlaut for some: groß→größer, alt→älter (irregular, use key_forms)
 * - Declension tables (strong/weak/mixed): purely rule-based from article context
 *   - This is a construction-level concern, not a word property
 * 
 * Implementation priority: Verbs (weak) → Nouns (with gender) → Adjectives
 */
const germanStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ _stub: { message: 'German noun inflection not yet implemented' } }),
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'German verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'German adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE STUB: SPANISH (es)
// ============================================================================

/**
 * SPANISH INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Nouns:
 * - Gender: stored in `gender` trait (masculine/feminine)
 *   - Mostly predictable: -o = masc, -a = fem (but exceptions exist)
 * - Regular plural: vowel → +s, consonant → +es, -z → -ces
 * - Article: el/la/los/las from gender + number
 * 
 * Verbs — 3 groups:
 * - -ar: hablar → hablo/hablas/habla/hablamos/habláis/hablan (present)
 *   - Strip -ar, add: -o/-as/-a/-amos/-áis/-an
 *   - Preterite: -é/-aste/-ó/-amos/-asteis/-aron
 *   - Past participle: -ar → -ado
 * - -er: comer → como/comes/come/comemos/coméis/comen
 *   - Strip -er, add: -o/-es/-e/-emos/-éis/-en
 *   - Preterite: -í/-iste/-ió/-imos/-isteis/-ieron
 *   - Past participle: -er → -ido
 * - -ir: vivir → vivo/vives/vive/vivimos/vivís/viven
 *   - Strip -ir, add: -o/-es/-e/-imos/-ís/-en
 *   - Same preterite as -er
 *   - Past participle: -ir → -ido
 * 
 * - Stem-changing verbs (e→ie, o→ue, e→i): semi-regular but affect boot pattern
 *   - Could be handled by a separate trait "stem_change" or use key_forms
 * 
 * Adjectives:
 * - Regular agreement: -o/-a/-os/-as (4 forms)
 * - Adjectives ending in -e/-ista: no gender change, +s for plural
 * - Comparison: más + adj (comparative), el/la más + adj (superlative)
 *   - Irregular: bueno→mejor, malo→peor (key_forms)
 * 
 * Implementation priority: Verbs (-ar group) → Nouns → Adjectives
 */
const spanishStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ _stub: { message: 'Spanish noun inflection not yet implemented' } }),
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'Spanish verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'Spanish adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE STUB: ITALIAN (it)
// ============================================================================

/**
 * ITALIAN INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Very similar to Spanish. Key differences:
 * 
 * Nouns:
 * - Gender + plural: -o→-i (m), -a→-e (f), -e→-i (m/f)
 * - Article: il/lo/la/l'/i/gli/le (complex rules based on first letter)
 * 
 * Verbs — 3 groups:
 * - -are: parlare → parlo/parli/parla/parliamo/parlate/parlano
 * - -ere: credere → credo/credi/crede/crediamo/credete/credono
 * - -ire: dormire → dormo/dormi/dorme/dormiamo/dormite/dormono
 *   - Some -ire verbs insert -isc-: capire → capisco/capisci/capisce/capiamo/capite/capiscono
 *   - This subgroup could use verb_group = "-ire (isc)"
 * - Past participle: -are→-ato, -ere→-uto, -ire→-ito
 * 
 * Adjectives:
 * - Agreement: -o/-a/-i/-e (4 forms, like Spanish)
 * - Comparison: più + adj / il più + adj
 *   - Irregular: buono→migliore (key_forms)
 *   - Irregular agreement: bello→bel/bell'/bella/bei/begli/belle (key_forms positions)
 * 
 * Implementation priority: Verbs (-are) → Nouns → Adjectives
 */
const italianStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ _stub: { message: 'Italian noun inflection not yet implemented' } }),
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'Italian verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'Italian adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE STUB: PORTUGUESE (pt)
// ============================================================================

/**
 * PORTUGUESE INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Very similar to Spanish with key differences:
 * 
 * Nouns:
 * - Gender + plural: similar to Spanish (-o/-a, +s/+es)
 * - Special: -ão has 3 possible plurals: -ões (most), -ães (some), -ãos (few)
 *   - These should use plural_form trait
 * 
 * Verbs — 3 groups:
 * - -ar: falar → falo/falas/fala/falamos/falais/falam
 * - -er: comer → como/comes/come/comemos/comeis/comem
 * - -ir: partir → parto/partes/parte/partimos/partis/partem
 * - Past participle: -ar→-ado, -er→-ido, -ir→-ido
 * - Unique feature: personal infinitive (inflected infinitive)
 *   - This is construction-level, not word-level
 * 
 * Adjectives: Same as Spanish pattern
 * 
 * Implementation priority: Verbs (-ar) → Nouns → Adjectives
 */
const portugueseStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ _stub: { message: 'Portuguese noun inflection not yet implemented' } }),
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'Portuguese verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'Portuguese adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE STUB: JAPANESE (ja)
// ============================================================================

/**
 * JAPANESE INFLECTION RULES — IMPLEMENTATION GUIDE
 * 
 * Japanese inflection is agglutinative: base stem + suffix chain.
 * 
 * Verbs — 3 groups (from verb_group trait):
 * 
 * 五段動詞 (Godan / Group 1):
 * - Final -u row kana changes to other rows for different forms
 * - Example: 書く (kaku, to write)
 *   - 書か (ka-row a) + ない → 書かない (negative)
 *   - 書き (ka-row i) + ます → 書きます (polite)
 *   - 書い (i-sound change) + て → 書いて (te-form)
 *   - 書い + た → 書いた (past)
 * - Te-form/ta-form sound changes depend on final consonant:
 *   - く→いて, ぐ→いで, す→して, む/ぬ/ぶ→んで, つ/る/う→って
 * 
 * 一段動詞 (Ichidan / Group 2):
 * - Simply drop final る and add suffix
 * - Example: 食べる (taberu, to eat)
 *   - 食べ + ない → 食べない (negative)
 *   - 食べ + ます → 食べます (polite)
 *   - 食べ + て → 食べて (te-form)
 *   - 食べ + た → 食べた (past)
 * 
 * 不規則動詞 (Irregular / Group 3):
 * - Only 2 verbs: する (suru) and 来る (kuru)
 * - Use key_forms exclusively
 * 
 * Nouns: NO inflection (particles handle grammar → construction level)
 * 
 * Adjectives:
 * - い-adjectives: 高い → 高くない (neg), 高かった (past), 高くて (te-form)
 *   - Drop い, add くない/かった/くて
 * - な-adjectives: behave like nouns + だ/です (construction level)
 * 
 * Implementation priority: Verbs (ichidan first, then godan) → い-adjectives
 * (Nouns need no inflection engine in Japanese)
 * 
 * CRITICAL NOTE: Japanese uses kana/kanji, not Latin alphabet.
 * String manipulation must be Unicode-aware.
 * Godan sound changes require a kana row mapping table.
 */
const japaneseStub: InflectionRuleModule = {
    inflectNoun: (_base, _traits) => ({ number: { singular: _base, plural: _base } }), // No noun inflection in Japanese
    inflectVerb: (_base, _traits) => ({ _stub: { message: 'Japanese verb inflection not yet implemented' } }),
    inflectAdjective: (_base, _traits) => ({ _stub: { message: 'Japanese adjective inflection not yet implemented' } }),
};

// ============================================================================
// LANGUAGE: CHINESE (zh-CN)
// ============================================================================

/**
 * Chinese has NO morphological inflection.
 * 
 * - No verb conjugation (tense/aspect handled by particles: 了/着/过/会/要)
 * - No noun declension (no case, no plural morphology)
 * - No adjective agreement or comparison morphology (更/最 are separate words)
 * 
 * All grammatical functions are handled at the construction/particle level.
 * The inflection engine returns the base form unchanged for all categories.
 */
const chineseRules: InflectionRuleModule = {
    inflectNoun: (base, _traits) => ({ form: { base: base } }),
    inflectVerb: (base, _traits) => ({ form: { base: base } }),
    inflectAdjective: (base, _traits) => ({ form: { base: base } }),
};

// ============================================================================
// LANGUAGE REGISTRY
// ============================================================================

const RULE_MODULES: Record<string, InflectionRuleModule> = {
    'en': englishRules,
    'zh-CN': chineseRules,
    'fr': frenchStub,
    'de': germanStub,
    'es': spanishStub,
    'it': italianStub,
    'pt': portugueseStub,
    'ja': japaneseStub,
};

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate a complete inflection table for a word.
 * 
 * @param input - The word, POS, language, and linguistic traits
 * @returns Complete inflection table, or null if language/POS not supported
 * 
 * @example
 * generateInflectionTable({
 *   baseForm: 'walk',
 *   lang: 'en',
 *   pos: 'v.',
 *   traits: [{ traitId: 'verb_group', value: 'regular', meta: { stability: 10 } }]
 * })
 * // Returns: { baseForm: 'walk', lang: 'en', pos: 'v.', isFullyRegular: true,
 * //   categories: { present: { '1s': 'walk', '3s': 'walks', ... }, past: { simple: 'walked', ... }, ... }
 * // }
 */
export function generateInflectionTable(input: InflectionInput): InflectionTable | null {
    const module = RULE_MODULES[input.lang];
    if (!module) return null;

    let categories: Record<string, Record<string, string>>;

    // Dispatch based on POS
    const posBase = input.pos.replace('.', '');  // 'v.t.' → 'vt', 'n.' → 'n'
    if (posBase === 'n') {
        categories = module.inflectNoun(input.baseForm, input.traits);
    } else if (posBase.startsWith('v')) {
        categories = module.inflectVerb(input.baseForm, input.traits);
    } else if (posBase === 'adj') {
        categories = module.inflectAdjective(input.baseForm, input.traits);
    } else {
        // Adverbs, prepositions, etc. — no inflection tables
        return null;
    }

    // Determine if fully regular (no key_forms trait used)
    const hasKeyForms = input.traits.some(t => t.traitId === 'key_forms');

    return {
        baseForm: input.baseForm,
        lang: input.lang,
        pos: input.pos,
        isFullyRegular: !hasKeyForms,
        categories,
    };
}

/**
 * Check if a language has inflection support (implemented or stubbed).
 */
export function isInflectionSupported(lang: Language): boolean {
    return lang in RULE_MODULES;
}

/**
 * Check if a language has FULL (non-stub) inflection support.
 */
export function isInflectionImplemented(lang: Language): boolean {
    // Currently only English and Chinese are fully implemented
    return lang === 'en' || lang === 'zh-CN';
}
