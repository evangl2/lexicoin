import test from 'node:test';
import assert from 'node:assert';
import { randomElement, deepClone, generateId } from '../utils/helpers.ts';

test('randomElement - empty array', () => {
    const result = randomElement([]);
    assert.strictEqual(result, undefined, 'Should return undefined for an empty array');
});

test('randomElement - non-empty array', () => {
    const array = [1, 2, 3];
    const result = randomElement(array);
    assert.ok(array.includes(result as number), 'Should return an element from the array');
});

test('randomElement - single element array', () => {
    const array = ['test'];
    const result = randomElement(array);
    assert.strictEqual(result, 'test', 'Should return the only element in the array');
});

test('deepClone - simple object', () => {
    const obj = { a: 1, b: 'test' };
    const cloned = deepClone(obj);
    assert.notStrictEqual(cloned, obj, 'Should create a new object');
    assert.deepStrictEqual(cloned, obj, 'Should be deeply equal');
});

test('deepClone - nested object', () => {
    const obj = { a: { b: 2 } };
    const cloned = deepClone(obj);
    assert.notStrictEqual(cloned.a, obj.a, 'Should clone nested object');
    assert.deepStrictEqual(cloned, obj, 'Should be deeply equal');
});

test('deepClone - array', () => {
    const arr = [1, 2, { a: 3 }];
    const deepCloned = deepClone(arr);
    assert.notStrictEqual(deepCloned, arr, 'Should create a new array');
    assert.deepStrictEqual(deepCloned, arr, 'Should be deeply equal');
    assert.notStrictEqual(deepCloned[2], arr[2], 'Should clone nested object in array');
});

test('deepClone - Date', () => {
    const date = new Date();
    const cloned = deepClone(date);

    // With structuredClone, Date objects are preserved as Date objects
    assert.ok(cloned instanceof Date, 'Should return a Date object');
    assert.strictEqual(cloned.getTime(), date.getTime(), 'Should have same time');
    assert.notStrictEqual(cloned, date, 'Should be a new Date instance');
});

test('deepClone - Map', () => {
    const map = new Map();
    map.set('a', 1);
    const cloned = deepClone(map);

    assert.ok(cloned instanceof Map, 'Should return a Map object');
    assert.strictEqual(cloned.get('a'), 1, 'Should have same value');
    assert.notStrictEqual(cloned, map, 'Should be a new Map instance');
});

test('generateId - returns string', () => {
    const id = generateId();
    assert.strictEqual(typeof id, 'string', 'Should return a string');
    assert.ok(id.length > 0, 'Should not be empty');
});

test('generateId - uniqueness', () => {
    const id1 = generateId();
    const id2 = generateId();
    assert.notStrictEqual(id1, id2, 'Should generate unique IDs');
});
