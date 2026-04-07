
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
;(function guardSVGAttrs() {
    if (typeof Element === 'undefined') return;          // SSR / non-browser guard

    // SVG attributes that must be valid lengths/numbers — framer-motion may write
    // "undefined" into these when an animated value is never properly initialised.
    const SVG_NUMERIC_ATTRS = new Set([
        'd',                                    // <path>
        'cx', 'cy', 'r', 'rx', 'ry',           // <circle> <ellipse>
        'x', 'y', 'x1', 'y1', 'x2', 'y2',     // <line> <rect> positioning
        'width', 'height',                      // <rect>
        'points',                               // <polygon> <polyline>
    ]);

    const _orig = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name: string, value: any) {
        if (SVG_NUMERIC_ATTRS.has(name) && (value == null || String(value) === 'undefined')) return;
        _orig.call(this, name, value);
    };
})();

// ---------------------------------------------------------------------------
// Safe motion.* SVG wrappers
// ---------------------------------------------------------------------------
// framer-motion writes animated values directly to the DOM via element.setAttribute(),
// bypassing React entirely. Our React.createElement patch cannot intercept this.
//
// Defence-in-depth: sanitise numeric SVG props BEFORE they reach framer-motion's
// animation engine, so its MotionValues are never initialised with undefined.
// (The setAttribute guard above is the last-resort backstop for anything missed here.)

// Fallback values for SVG numeric attributes when the AI leaves them undefined.
// Position attrs → 50 (centre of the 0-0-100-100 viewBox) so the shape stays
// visible near the middle rather than jumping to a corner.
// Size attrs → 0 so the shape becomes invisible rather than visually wrong.
const _SVG_FALLBACKS: Record<string, string | number> = {
    d: 'M 0 0',
    cx: 50, cy: 50,                     // circle / ellipse centre → viewBox centre
    r: 0, rx: 0, ry: 0,                 // radii → 0 (invisible, not distorted)
    x: 50,  y: 50,                      // rect / general position → centre
    x1: 50, y1: 50, x2: 50, y2: 50,    // line endpoints → centre (collapses to point)
    width: 0, height: 0,                // size → 0 (invisible)
    points: '',
};
const _SVG_NUMERIC_KEYS = new Set(Object.keys(_SVG_FALLBACKS));

const _safeVal = (key: string, val: unknown): unknown =>
    (val === undefined || val === 'undefined')
        ? (_SVG_FALLBACKS[key] ?? 0)
        : val;

function _sanitizeSVGProps(props: Record<string, unknown>): Record<string, unknown> {
    let p = { ...props };

    // (a) direct numeric SVG props
    for (const key of _SVG_NUMERIC_KEYS) {
        if (key in p) p[key] = _safeVal(key, p[key]);
    }

    // (b) variants — if ANY variant defines a numeric SVG key, ALL variants must
    //     have a valid value for it so framer-motion can interpolate without hitting undefined.
    if (p.variants && typeof p.variants === 'object') {
        const variants = p.variants as Record<string, unknown>;
        const affectedKeys = [..._SVG_NUMERIC_KEYS].filter(key =>
            Object.values(variants).some(v => v && typeof v === 'object' && key in (v as object))
        );
        if (affectedKeys.length > 0) {
            // For each affected key, find the best valid fallback from existing variant values
            const bestFallback: Record<string, unknown> = {};
            for (const key of affectedKeys) {
                bestFallback[key] =
                    Object.values(variants)
                        .map((v: any) => v?.[key])
                        .find((val: any) => val !== undefined && val !== 'undefined')
                    ?? _SVG_FALLBACKS[key]
                    ?? 0;
            }
            p.variants = Object.fromEntries(
                Object.entries(variants).map(([k, v]) => {
                    if (!v || typeof v !== 'object') return [k, v];
                    const vo = v as Record<string, unknown>;
                    const fixes: Record<string, unknown> = {};
                    for (const key of affectedKeys) {
                        fixes[key] = _safeVal(key, key in vo ? vo[key] : bestFallback[key]);
                    }
                    return [k, { ...vo, ...fixes }];
                })
            );
            // Ensure direct props exist so framer-motion doesn't read from empty DOM attrs
            const initialKey = typeof p.initial === 'string' ? p.initial : null;
            for (const key of affectedKeys) {
                if (!(key in p)) {
                    const fromVariant = initialKey
                        ? (p.variants as Record<string, any>)[initialKey]?.[key]
                        : undefined;
                    p[key] = _safeVal(key, fromVariant ?? bestFallback[key]);
                }
            }
        }
    }

    // (c) inline animate / initial objects
    const fixTarget = (t: unknown): unknown => {
        if (!t || typeof t !== 'object' || Array.isArray(t)) return t;
        const o = t as Record<string, unknown>;
        const fixes: Record<string, unknown> = {};
        for (const key of _SVG_NUMERIC_KEYS) {
            if (key in o) fixes[key] = _safeVal(key, o[key]);
        }
        return Object.keys(fixes).length ? { ...o, ...fixes } : o;
    };
    if ('animate' in p) p.animate = fixTarget(p.animate);
    if ('initial' in p && typeof p.initial === 'object' && p.initial !== null) {
        p.initial = fixTarget(p.initial);
    }

    return p;
}

// SVG element types that can carry animated numeric attributes.
const _SVG_MOTION_ELEMENTS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polygon', 'polyline']);

// Replace motion.{svg elements} in the require scope via a Proxy.
// Wrappers sanitise numeric SVG props before framer-motion sees them.
const _safeMotionCache = new Map<string, (props: any) => any>();

const _safeMotion = new Proxy(Motion.motion as object, {
    get(target: any, prop: string | symbol) {
        if (typeof prop === 'string' && _SVG_MOTION_ELEMENTS.has(prop)) {
            if (!_safeMotionCache.has(prop)) {
                const original = target[prop];
                const Wrapper = (wProps: Record<string, unknown>) =>
                    React.createElement(original, _sanitizeSVGProps(wProps) as any);
                Wrapper.displayName = `SafeMotion.${prop}`;
                _safeMotionCache.set(prop, Wrapper);
            }
            return _safeMotionCache.get(prop)!;
        }
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
