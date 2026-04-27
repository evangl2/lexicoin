/**
 * compactStyleLoader.ts
 *
 * AdoptedStyleSheets singletons for lexi-compact-card-* elements.
 * Mirrors the pattern of styleLoader.ts but loads compact-specific CSS.
 */

import compactBaseCSS      from './styles/compact-base.css?inline';
import compactDefaultCSS   from './styles/compact-default.css?inline';
import compactCyberpunkCSS from './styles/compact-cyberpunk.css?inline';

const compactBaseSheet = new CSSStyleSheet();
compactBaseSheet.replaceSync(compactBaseCSS);

const compactPersonaSheets: Map<string, CSSStyleSheet> = new Map();

function buildCompactPersonaSheet(personaId: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  let css = '';
  switch (personaId) {
    case 'default':   css = compactDefaultCSS;   break;
    case 'cyberpunk': css = compactCyberpunkCSS; break;
    default:
      console.warn(`[LexiCompactCard] No persona stylesheet for "${personaId}", using empty sheet.`);
  }
  sheet.replaceSync(css);
  return sheet;
}

export function getCompactStyleSheets(personaId: string): CSSStyleSheet[] {
  if (!compactPersonaSheets.has(personaId)) {
    compactPersonaSheets.set(personaId, buildCompactPersonaSheet(personaId));
  }
  return [compactBaseSheet, compactPersonaSheets.get(personaId)!];
}
