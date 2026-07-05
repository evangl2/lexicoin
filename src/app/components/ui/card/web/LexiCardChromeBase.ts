/**
 * LexiCardChromeBase.ts
 *
 * Abstract base class for all lexi-card-chrome custom elements.
 * Subclasses supply persona-specific `personaId` and `templateHTML`.
 *
 * Life-cycle contract:
 *   connectedCallback → attachShadow (once) → adoptedStyleSheets → clone template
 *   attributeChangedCallback → delegated to CSS (:host([attr]) selectors) in Phase 1
 *
 * Observed attributes (TDD §4.4):
 *   is-active | is-expanded | is-flipped | is-over | visual-feedback | layout-mode
 */

import { getStyleSheets } from './styleLoader';

const OBSERVED_ATTRIBUTES = [
  'is-active',
  'is-expanded',
  'is-flipped',
  'is-over',
  'visual-feedback',
] as const;

export abstract class LexiCardChromeBase extends HTMLElement {

  // ── Custom element API ──────────────────────────────────────────────────────

  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES];
  }

  // ── Subclass contract ───────────────────────────────────────────────────────

  /**
   * Persona identifier — used to look up the correct adoptedStyleSheets pair.
   * Must match a key handled by styleLoader.ts `getStyleSheets()`.
   */
  protected abstract readonly personaId: string;

  /**
   * Full shadow-DOM markup string.
   * Subclass should import its template via Vite `?raw` and assign here.
   * The base class clones this ONCE per element instance in connectedCallback.
   */
  protected abstract readonly templateHTML: string;

  // ── Life-cycle ──────────────────────────────────────────────────────────────

  connectedCallback(): void {
    // Guard: attachShadow() throws on a second call for the same element.
    // The element may re-enter the DOM after a temporary removal
    // (React key reconciliation can detach + reattach without destroying).
    if (this.shadowRoot) return;

    const shadow = this.attachShadow({ mode: 'open' });

    // Assign shared singleton sheets — both objects are shared by ALL instances
    // of the same persona (TDD §4.5, Appendix A).  The browser holds one
    // parsed stylesheet in memory regardless of card count.
    shadow.adoptedStyleSheets = getStyleSheets(this.personaId);

    // Clone the static template.  cloneNode(true) is a shallow DOM copy —
    // no React fiber, no event listeners, no JS overhead per card.
    const tpl = document.createElement('template');
    tpl.innerHTML = this.templateHTML;
    shadow.appendChild(tpl.content.cloneNode(true));

    // Establish initial face opacity / pointer-events imperatively so that
    // Card.tsx's MotionValue subscriptions (applyFront / applyBack) fully own
    // these properties via inline styles.  CSS stylesheet rules cannot be used
    // for these because they would fight with the imperative writes — inline
    // styles always beat author stylesheets, but the FIRST call to applyFront /
    // applyBack (which sets opacity to the current MotionValue, usually 1/0)
    // must fire AFTER connectedCallback; if the CSS initialised them to 0 we'd
    // get a 1-frame flash of the wrong state before the effect subscribes.
    const frontEl = shadow.querySelector('[part="front-face"]') as HTMLElement | null;
    const backEl  = shadow.querySelector('[part="back-face"]')  as HTMLElement | null;
    if (frontEl) {
      frontEl.style.opacity       = '1';
      frontEl.style.pointerEvents = 'auto';
    }
    if (backEl) {
      backEl.style.opacity       = '0';
      backEl.style.pointerEvents = 'none';
    }
  }

  attributeChangedCallback(
    _name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ): void {
    // Phase 1: all attribute-driven visuals are handled declaratively by CSS
    // (:host([is-active]), :host([is-over]), :host([visual-feedback="merge"]) etc.)
    // No imperative JS manipulation needed for this phase.
    //
    // Phase 2+: add layout-mode-specific DOM surgery here if required.
  }
}
