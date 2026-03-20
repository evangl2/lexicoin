/**
 * Project: Lexicoin - Inflection Engine Type Definitions
 * 
 * Purpose:
 * Defines the output types for the regular inflection engine.
 * The engine takes a base word + linguistic traits and generates
 * all inflected forms as a structured table.
 * 
 * Architecture:
 * - InflectionTable is the universal output container
 * - Forms are keyed by standardized labels (e.g., 'present_3s', 'plural')
 * - Each language module produces language-specific form labels
 * - Irregular forms (from key_forms trait) override rule-generated forms
 */

import type { POS, Language, LinguisticTrait } from '../schemas/SenseEntity.schema';

// ============================================================================
// INFLECTION TABLE (Universal Output)
// ============================================================================

/**
 * InflectionTable: The complete inflection output for a single word.
 * 
 * Contains ALL inflected forms organized by category.
 * The consumer (frontend UI) renders this as a reference table.
 */
export interface InflectionTable {
    /** The base/dictionary form of the word */
    baseForm: string;

    /** Language code */
    lang: Language;

    /** Part of speech */
    pos: POS;

    /** 
     * Whether ALL forms were generated from rules (true) 
     * or some/all came from stored key_forms (false).
     */
    isFullyRegular: boolean;

    /**
     * Inflected forms organized by category.
     * 
     * Structure varies by POS:
     * - Noun:      { number: { singular, plural } }
     * - Verb:      { present: { 1s, 2s, 3s, ... }, past: { ... }, ... }
     * - Adjective: { comparison: { positive, comparative, superlative } }
     * 
     * Keys are standardized per language.
     */
    categories: Record<string, Record<string, string>>;
}

// ============================================================================
// INFLECTION INPUT
// ============================================================================

/**
 * InflectionInput: Everything needed to generate an inflection table.
 * 
 * Assembled from WordShell + LinguisticTrait data.
 */
export interface InflectionInput {
    /** The base/dictionary form (from WordShell.text.value) */
    baseForm: string;

    /** Language code */
    lang: Language;

    /** Part of speech (from WordShell.pos.value) */
    pos: POS;

    /** 
     * Linguistic traits for this word in this language.
     * Used to determine: verb group, case pattern, gender, etc.
     * If key_forms trait exists, those override generated forms.
     */
    traits: LinguisticTrait[];
}

// ============================================================================
// LANGUAGE RULE MODULE INTERFACE
// ============================================================================

/**
 * InflectionRuleModule: Contract for language-specific rule implementations.
 * 
 * Each language exports an object implementing this interface.
 * The main engine dispatches to the appropriate module based on language code.
 */
export interface InflectionRuleModule {
    /** Generate noun inflection table */
    inflectNoun(baseForm: string, traits: LinguisticTrait[]): InflectionTable['categories'];

    /** Generate verb inflection table */
    inflectVerb(baseForm: string, traits: LinguisticTrait[]): InflectionTable['categories'];

    /** Generate adjective inflection table */
    inflectAdjective(baseForm: string, traits: LinguisticTrait[]): InflectionTable['categories'];
}
