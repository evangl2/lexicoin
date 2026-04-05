
import { transform, type Transform } from 'sucrase';
import React from 'react';
import * as Motion from 'motion/react';

// ---------------------------------------------------------------------------
// Global setAttribute guard
// ---------------------------------------------------------------------------
// framer-motion's renderSVG calls element.setAttribute() directly inside its
// own animation loop — this completely bypasses React and any props-level fix.
// The only reliable interception point is setAttribute itself.
//
// This patch is extremely surgical: it only acts when name === 'd' and the
// value is nullish or the literal string "undefined". All other calls pass
// through unchanged.  Applied once at module load time.
;(function guardSVGPathD() {
    if (typeof Element === 'undefined') return;          // SSR / non-browser guard
    const _orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name: string, value: any) {
        if (name === 'd' && (value == null || String(value) === 'undefined')) return;
        _orig.call(this, name, value);
    };
})();

// ---------------------------------------------------------------------------
// Safe motion.path wrapper
// ---------------------------------------------------------------------------
// framer-motion writes animated values directly to the DOM via element.setAttribute(),
// bypassing React entirely. Our React.createElement patch cannot intercept this.
//
// The fix: intercept BEFORE framer-motion's animation engine starts — replace
// motion.path in the require scope with a wrapper that sanitises `d` values in
// all the locations framer-motion reads them from:
//   • direct `d` prop
//   • `variants[state].d`  (missing in some states → framer reads undefined from DOM)
//   • inline `animate.d` / `initial.d` objects

const _safeD = (val: unknown): unknown =>
    val === undefined || val === 'undefined' ? 'M 0 0' : val;

function _sanitizePathProps(props: Record<string, unknown>): Record<string, unknown> {
    let p = { ...props };

    // (a) direct d prop
    if ('d' in p) p.d = _safeD(p.d);

    // (b) variants — if ANY variant defines `d`, ALL variants must have a valid `d`.
    //     Without this, framer-motion reads the current DOM value (empty → undefined).
    if (p.variants && typeof p.variants === 'object') {
        const variants = p.variants as Record<string, unknown>;
        const anyHasD = Object.values(variants).some(
            v => v && typeof v === 'object' && 'd' in (v as object)
        );
        if (anyHasD) {
            // Use the first valid path string as fallback for states that lack `d`
            const validD =
                Object.values(variants)
                    .map((v: any) => v?.d)
                    .find((d: any) => d && d !== 'undefined') ?? 'M 0 0';

            p.variants = Object.fromEntries(
                Object.entries(variants).map(([k, v]) => {
                    if (!v || typeof v !== 'object') return [k, v];
                    const vo = v as Record<string, unknown>;
                    return [k, { ...vo, d: _safeD('d' in vo ? vo.d : validD) }];
                })
            );

            // Ensure a direct `d` prop exists so framer-motion never has to read
            // the (possibly absent) DOM attribute as its starting value.
            if (!('d' in p)) {
                const initialKey = typeof p.initial === 'string' ? p.initial : null;
                const initialD = initialKey
                    ? (p.variants as Record<string, any>)[initialKey]?.d
                    : undefined;
                p.d = _safeD(initialD ?? validD);
            }
        }
    }

    // (c) inline animate / initial objects
    const fixTarget = (t: unknown): unknown => {
        if (!t || typeof t !== 'object' || Array.isArray(t)) return t;
        const o = t as Record<string, unknown>;
        return 'd' in o ? { ...o, d: _safeD(o.d) } : o;
    };
    if ('animate' in p) p.animate = fixTarget(p.animate);
    if ('initial' in p && typeof p.initial === 'object' && p.initial !== null) {
        p.initial = fixTarget(p.initial);
    }

    return p;
}

// Thin wrapper: sanitise props, then delegate to the real motion.path.
// Must be a plain function (not forwardRef) — AI code never uses refs on paths.
function _SafeMotionPath(props: Record<string, unknown>) {
    return React.createElement(Motion.motion.path, _sanitizePathProps(props) as any);
}

// Replace motion.path in the require scope via a Proxy on the motion namespace.
// All other motion.* components pass through unchanged.
const _safeMotion = new Proxy(Motion.motion as object, {
    get(target: any, prop: string | symbol) {
        if (prop === 'path') return _SafeMotionPath;
        return target[prop];
    },
});

const _safeMotionModule = { ...Motion, motion: _safeMotion };

// ---------------------------------------------------------------------------
// Require scope
// ---------------------------------------------------------------------------
const SCOPE = {
    react: React,
    'motion/react': _safeMotionModule,
    'framer-motion': _safeMotionModule,
};

const TRANSFORM_OPTS: { transforms: Transform[]; production: boolean } = {
    transforms: ['typescript', 'jsx', 'imports'],
    production: true,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile and load a React component from an AI-generated source code string.
 *
 * Uses sucrase for fast runtime TSX → JS transpilation, then executes in a
 * sandboxed Function scope.  Handles common AI output contamination:
 *   - Markdown code fences
 *   - Trailing prose / Chinese description text without comment markers
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

        // Patch React.createElement for issues that ARE at the props level:
        //   • `transformOrigin` as a direct JSX prop leaks to the DOM → move into style
        const patchedReact = {
            ...React,
            createElement: (type: any, props: any, ...children: any[]) => {
                if (props && typeof props === 'object' && 'transformOrigin' in props) {
                    const { transformOrigin, ...rest } = props as Record<string, unknown>;
                    return React.createElement(type, {
                        ...rest,
                        style: { ...(rest.style as object | undefined), transformOrigin },
                    }, ...children);
                }
                return React.createElement(type, props, ...children);
            },
        };

        const execute = new Function('require', 'exports', 'module', 'React', transformedCode);
        execute(require, exports, module, patchedReact);

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
