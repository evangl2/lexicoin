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

test('deepClone - basic objects', () => {
    const obj = { a: 1, b: 'test', c: null };
    const clone = deepClone(obj);
    assert.deepStrictEqual(clone, obj);
    assert.notStrictEqual(clone, obj);
});

test('deepClone - nested objects', () => {
    const obj = { a: { b: { c: 1 } } };
    const clone = deepClone(obj);
    assert.deepStrictEqual(clone, obj);
    assert.notStrictEqual(clone, obj);
    assert.notStrictEqual(clone.a, obj.a);
});

test('deepClone - dates', () => {
    const date = new Date();
    const obj = { d: date };
    const clone = deepClone(obj);

    // In Node 22, structuredClone is available, so Date should be preserved
    if (typeof structuredClone === 'function') {
        assert.ok(clone.d instanceof Date, 'Should preserve Date object');
        assert.strictEqual(clone.d.getTime(), date.getTime());
    }
});

test('generateId - returns string', () => {
    const id = generateId();
    assert.strictEqual(typeof id, 'string');
    assert.ok(id.length > 0);
});

test('generateId - returns unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    assert.notStrictEqual(id1, id2);
});
