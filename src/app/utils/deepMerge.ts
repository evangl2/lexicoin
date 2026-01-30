/**
 * Deep Merge Utility with Fallback
 * 
 * Recursively merge objects, ensuring missing values in custom Persona fallback to Default.
 * 
 * Rules:
 * 1. undefined → Use default value
 * 2. null → Explicit disable (for Slot components)
 * 3. object → Recursive merge
 * 4. other → Direct override
 */

import React from 'react';

/**
 * Check if plain object (not array, not React element, not function)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false;
    if (Array.isArray(value)) return false;
    if (React.isValidElement(value)) return false;
    if (typeof value === 'function') return false;

    // Check if plain object prototype
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Deep merge with fallback
 * 
 * @param defaults - Default value object (Complete Default Persona)
 * @param custom - Custom value object (Partial Custom Persona)
 * @returns Merged complete object
 * 
 * @example
 * // Basic Merge
 * deepMerge({ a: 1, b: 2 }, { b: 3 }) // { a: 1, b: 3 }
 * 
 * // Recursive Merge
 * deepMerge(
 *   { colors: { primary: 'gold', secondary: 'silver' } },
 *   { colors: { primary: 'red' } }
 * ) // { colors: { primary: 'red', secondary: 'silver' } }
 * 
 * // Explicit Disable Slot
 * deepMerge(
 *   { slots: { Background: SomeComponent } },
 *   { slots: { Background: null } }
 * ) // { slots: { Background: null } }
 */
export function deepMerge<T extends Record<string, unknown>>(
    defaults: T,
    custom: Partial<T> | undefined | null
): T {
    // No custom value, return default directly
    if (custom === undefined || custom === null) {
        return defaults;
    }

    // Create result object
    const result = { ...defaults } as T;

    // Iterate custom values
    for (const key of Object.keys(custom) as Array<keyof T>) {
        const customValue = custom[key];
        const defaultValue = defaults[key];

        // undefined → skip, use default value
        if (customValue === undefined) {
            continue;
        }

        // null → explicit set to null (used to disable Slot)
        if (customValue === null) {
            result[key] = null as T[keyof T];
            continue;
        }

        // Both are plain objects → Recursive merge
        if (isPlainObject(customValue) && isPlainObject(defaultValue)) {
            result[key] = deepMerge(
                defaultValue as Record<string, unknown>,
                customValue as Record<string, unknown>
            ) as T[keyof T];
            continue;
        }

        // Other cases → Direct override
        result[key] = customValue as T[keyof T];
    }

    return result;
}

/**
 * Merge arrays (for special cases)
 * Default behavior is replace, not merge
 */
export function mergeArrays<T>(defaults: T[], custom: T[] | undefined): T[] {
    if (custom === undefined) return defaults;
    return custom;
}

/**
 * Create Persona Merger
 * Pre-bind Default Persona for reuse
 */
export function createPersonaMerger<T extends Record<string, unknown>>(defaults: T) {
    return (custom: Partial<T> | undefined | null): T => deepMerge(defaults, custom);
}
