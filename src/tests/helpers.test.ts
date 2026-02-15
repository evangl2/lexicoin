import test from 'node:test';
import assert from 'node:assert';
import { randomElement } from '../utils/helpers.ts';

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
