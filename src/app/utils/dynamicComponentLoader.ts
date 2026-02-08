
import { transform } from 'sucrase';
import React from 'react';
import * as Motion from 'motion/react';

// Scope for the dynamic component
const SCOPE = {
    react: React,
    'motion/react': Motion,
    'framer-motion': Motion, // Alias for backward compatibility/AI generation
};

/**
 * Compile and load a React component from source code string
 * 
 * Uses sucrase for fast runtime transpilation (TSX -> JS).
 * Executes the code in a function scope with shimmed require/exports.
 * 
 * @param code - Source code string (TSX/JS)
 * @returns The exported React component (default export)
 */
export function loadDynamicComponent(code: string): React.ComponentType<any> | null {
    if (!code) return null;

    try {
        // 1. Transpile TSX to JS
        const item = transform(code, {
            transforms: ['typescript', 'jsx', 'imports'],
            production: true,
        });

        // 2. Prepare execution environment
        const exports: { default?: React.ComponentType<any> } = {};

        // Shimmed require function
        const require = (name: string) => {
            if (name in SCOPE) {
                return SCOPE[name as keyof typeof SCOPE];
            }
            throw new Error(`Module '${name}' not found in dynamic scope`);
        };

        // 3. Execute the code
        // We use new Function to create a functional scope
        // The code is wrapped in a way that allows it to execute immediately
        const execute = new Function('require', 'exports', 'React', item.code);
        execute(require, exports, React);

        // 4. Return default export
        return exports.default || null;

    } catch (error) {
        console.error("[DynamicComponentLoader] Failed to compile dynamic component:", error);
        console.error("Code snippet:", code.substring(0, 100) + "...");
        return null;
    }
}
