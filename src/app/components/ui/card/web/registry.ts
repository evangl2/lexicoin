/**
 * registry.ts
 *
 * Idempotent persona registration for lexi-card-chrome custom elements.
 *
 * Usage:
 *   Call `ensurePersonaRegistered(personaId)` synchronously before any card renders.
 *   Safe to call multiple times — the `customElements.get()` guard prevents
 *   duplicate `customElements.define()` calls which would throw a DOMException.
 *
 * Why static imports (not dynamic `import()`):
 *   `customElements.define()` is synchronous and must complete before the custom
 *   element appears in the DOM (TDD §6.7).  Dynamic imports are async → race condition.
 *   Vite bundles statically-imported modules eagerly, so the class is available
 *   immediately at call time with zero extra network round-trips.
 *
 * Phase 3: add 'cyberpunk' case when LexiCardChromeDefault template is ready.
 */

import { LexiCardChromeDefault }   from './LexiCardChromeDefault';
import { LexiCardChromeCyberpunk } from './LexiCardChromeCyberpunk';

export function ensurePersonaRegistered(personaId: string): void {
  switch (personaId) {
    case 'default':
      if (!customElements.get('lexi-card-chrome-default')) {
        customElements.define('lexi-card-chrome-default', LexiCardChromeDefault);
      }
      break;

    case 'cyberpunk':
      if (!customElements.get('lexi-card-chrome-cyberpunk')) {
        customElements.define('lexi-card-chrome-cyberpunk', LexiCardChromeCyberpunk);
      }
      break;

    default:
      console.warn(
        `[LexiCardChrome] Unknown persona "${personaId}" — registration skipped.` +
        ' Falling back to lexi-card-chrome-default.',
      );
      if (!customElements.get('lexi-card-chrome-default')) {
        customElements.define('lexi-card-chrome-default', LexiCardChromeDefault);
      }
  }
}
