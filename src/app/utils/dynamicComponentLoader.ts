
import { transform, type Transform } from 'sucrase';
import React from 'react';
import * as Motion from 'motion/react';

// Scope available to dynamic components via shimmed require()
const SCOPE = {
    react: React,
    'motion/react': Motion,
    'framer-motion': Motion, // Alias for backward compatibility/AI generation
};

const TRANSFORM_OPTS: { transforms: Transform[]; production: boolean } = {
    transforms: ['typescript', 'jsx', 'imports'],
    production: true,
};

/**
 * Compile and load a React component from an AI-generated source code string.
 *
 * Uses sucrase for fast runtime TSX → JS transpilation, then executes in a
 * sandboxed Function scope.  Handles common AI output contamination:
 *   - Markdown code fences
 *   - Trailing Chinese description text (without comment markers)
 *   - `import type` statements
 *   - Any other trailing garbage (iterative line-stripping fallback)
 */
export function loadDynamicComponent(code: string): React.ComponentType<any> | null {
    if (!code) return null;

    const transformedCode = compileToJS(code);
    if (!transformedCode) return null;

    try {
        const exports: { default?: React.ComponentType<any> } = {};
        const module = { exports: {} as { default?: React.ComponentType<any> } };

        const require = (name: string) => {
            if (name in SCOPE) return SCOPE[name as keyof typeof SCOPE];
            throw new Error(`Module '${name}' not found in dynamic scope`);
        };

        const execute = new Function('require', 'exports', 'module', 'React', transformedCode);
        execute(require, exports, module, React);

        return exports.default ?? module.exports.default ?? null;
    } catch (error) {
        console.error('[DynamicComponentLoader] Execution failed:', error);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Three-pass pipeline:
 *   Pass 1 – structural cleanup (markdown fences, import type, AI delimiter)
 *   Pass 2 – strip trailing non-code lines (CJK prose, blank lines, fences)
 *   Pass 3 – iterative line-stripping fallback (handles anything else)
 */
function compileToJS(raw: string): string | null {
    // Pass 1: structural cleanup
    const cleaned = structuralClean(raw);

    // Pass 2: strip trailing non-code lines, then try transform
    const stripped = stripTrailingNonCode(cleaned);
    try {
        return transform(stripped, TRANSFORM_OPTS).code;
    } catch (_) {
        // Fall through to iterative fallback
    }

    // Pass 3: iterative fallback — remove one non-blank line at a time from the end
    const lines = stripped.split('\n');
    let attempts = 0;
    for (let end = lines.length - 1; end >= 1 && attempts < 30; end--) {
        if (lines[end]!.trim() === '') continue; // skip blank lines — no need to retry
        attempts++;
        try {
            return transform(lines.slice(0, end).join('\n'), TRANSFORM_OPTS).code;
        } catch (_) {
            // keep stripping
        }
    }

    console.error('[DynamicComponentLoader] Sucrase transform failed after all cleanup attempts');
    console.error('Original snippet:', raw.substring(0, 300));
    return null;
}

/** Remove structural noise that has nothing to do with code logic. */
function structuralClean(src: string): string {
    return src
        // Strip markdown opening fences: ```tsx, ```jsx, ```js, etc.
        .replace(/^```[^\n]*\n?/gm, '')
        // Strip markdown closing fences
        .replace(/```[^\n]*$/gm, '')
        // Strip AI output delimiter if included in payload
        .replace(/\/\/ --- CODE BELOW ---[^\n]*\n?/, '')
        // Strip `import type { ... } from '...'` — sucrase may not fully eliminate these
        .replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*\n?/g, '');
}

/**
 * Pop lines from the end that are clearly not JavaScript:
 *   - blank lines
 *   - lines starting with CJK characters (Chinese/Japanese/Korean prose)
 *   - markdown fence lines
 *
 * Stops as soon as it hits a line that contains recognisable JS syntax.
 */
function stripTrailingNonCode(src: string): string {
    const lines = src.split('\n');
    let end = lines.length;
    while (end > 0) {
        const line = lines[end - 1]!.trim();
        if (
            line === '' ||
            line.startsWith('```') ||
            /^[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(line)
        ) {
            end--;
        } else {
            break;
        }
    }
    return lines.slice(0, end).join('\n');
}
