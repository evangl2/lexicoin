/**
 * styleLoader.ts
 *
 * Constructs the adoptedStyleSheets singletons that all lexi-card-chrome
 * instances share.  Each CSSStyleSheet is created ONCE; every shadow root
 * receives the *same object reference*, so the browser keeps only one parsed
 * stylesheet in memory regardless of card count.
 *
 * Vite `?inline` import → CSS string at build time, no extra network request.
 */

import baseCSS    from './styles/base.css?inline';
import defaultCSS from './styles/default.css?inline';

// ── Base sheet (shared by ALL personas) ──────────────────────────────────────

const baseSheet = new CSSStyleSheet();
baseSheet.replaceSync(baseCSS);

// ── Per-persona sheets (one singleton each) ──────────────────────────────────

const personaSheets: Map<string, CSSStyleSheet> = new Map();

function buildPersonaSheet(personaId: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  let css = '';
  switch (personaId) {
    case 'default':
      css = defaultCSS;
      break;
    // Phase 3: add 'cyberpunk' branch here
    default:
      console.warn(`[LexiCardChrome] No persona stylesheet for "${personaId}", using empty sheet.`);
  }
  sheet.replaceSync(css);
  return sheet;
}

/**
 * Returns [baseSheet, personaSheet] for the given personaId.
 * Both objects are singletons — safe to assign to multiple shadow roots.
 */
export function getStyleSheets(personaId: string): CSSStyleSheet[] {
  if (!personaSheets.has(personaId)) {
    personaSheets.set(personaId, buildPersonaSheet(personaId));
  }
  return [baseSheet, personaSheets.get(personaId)!];
}
