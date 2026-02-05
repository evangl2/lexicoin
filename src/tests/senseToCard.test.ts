/**
 * Test Suite for Sense-to-Card Transformation Pipeline
 * 
 * This file tests the transformation pipeline with real INITIAL_SENSES data
 * to validate correct data extraction and card creation.
 */

import { INITIAL_SENSES } from '../data/initialSenses';
import { senseToCard, sensesToCards } from '../pipelines/senseToCard';
import type { CardEntity } from '../types/CardEntity';

// ============================================================================
// TEST: Single Card Transformation
// ============================================================================

console.log('='.repeat(80));
console.log('SENSE-TO-CARD PIPELINE TEST');
console.log('='.repeat(80));

// Test with first sense (should be 'fire')
const firstSense = INITIAL_SENSES[0];
const firstCard = senseToCard(firstSense, 0);

console.log('\n1. SINGLE CARD TRANSFORMATION TEST');
console.log('-'.repeat(80));
console.log('Source UID:', firstSense.uid);
console.log('Card UID:', firstCard.uid);
console.log('Position:', firstCard.position);
console.log('Visual Status:', firstCard.visual.status);
console.log('Durability:', firstCard.senseInfo.durability);
console.log('Ontology:', firstCard.senseInfo.ontology);
console.log('Frequency:', firstCard.senseInfo.frequency);
console.log('Personas:', firstCard.senseInfo.personas);

// ============================================================================
// TEST: Display Data Extraction (All Languages)
// ============================================================================

console.log('\n2. DISPLAY DATA EXTRACTION TEST');
console.log('-'.repeat(80));

const languages = ['en', 'zh-CN', 'fr', 'de', 'ja', 'es', 'it', 'pt'] as const;

languages.forEach(lang => {
    const displayData = firstCard.displayData[lang];
    console.log(`\n[${lang}]`);
    console.log(`  Word: ${displayData.word}`);
    console.log(`  Pronunciation: ${displayData.pronunciation || 'N/A'}`);
    console.log(`  POS: ${displayData.pos}`);
    console.log(`  Level: ${displayData.level}`);
    console.log(`  Definition: ${displayData.definition.substring(0, 60)}...`);
    console.log(`  Flavor Persona: ${displayData.flavorText.persona}`);
    console.log(`  Flavor Text: ${displayData.flavorText.text.substring(0, 50)}...`);
});

// ============================================================================
// TEST: Batch Transformation
// ============================================================================

console.log('\n\n3. BATCH TRANSFORMATION TEST');
console.log('-'.repeat(80));

const allCards = sensesToCards(INITIAL_SENSES);

console.log(`Total senses: ${INITIAL_SENSES.length}`);
console.log(`Total cards created: ${allCards.length}`);
console.log('\nCard grid layout:');

allCards.forEach((card, index) => {
    console.log(`  [${index}] ${card.displayData['en'].word.padEnd(15)} @ (${card.position.x}, ${card.position.y})`);
});

// ============================================================================
// TEST: Data Integrity
// ============================================================================

console.log('\n\n4. DATA INTEGRITY TEST');
console.log('-'.repeat(80));

// Check that rawSense matches original
const integrityCheck = allCards.every((card, index) => {
    const originalUid = INITIAL_SENSES[index].uid;
    const cardUid = card.uid;
    const rawUid = card.rawSense.uid;

    return originalUid === cardUid && cardUid === rawUid;
});

console.log('UID Integrity Check:', integrityCheck ? '✅ PASS' : '❌ FAIL');

// Check that all cards have 8 languages of display data
const languageCheck = allCards.every(card => {
    const langs = Object.keys(card.displayData);
    return langs.length === 8;
});

console.log('Language Count Check:', languageCheck ? '✅ PASS' : '❌ FAIL');

// Check that all cards have durability = 100
const durabilityCheck = allCards.every(card => card.senseInfo.durability === 100);

console.log('Durability Check:', durabilityCheck ? '✅ PASS' : '❌ FAIL');

// Check that all cards have loading visual status
const visualCheck = allCards.every(card => card.visual.status === 'loading');

console.log('Visual Loading Check:', visualCheck ? '✅ PASS' : '❌ FAIL');

// ============================================================================
// TEST: Sample Card Data Structure
// ============================================================================

console.log('\n\n5. SAMPLE CARD STRUCTURE');
console.log('-'.repeat(80));
console.log(JSON.stringify(allCards[0], null, 2).substring(0, 1000));
console.log('... (truncated)');

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETED');
console.log('='.repeat(80));

export { allCards };
