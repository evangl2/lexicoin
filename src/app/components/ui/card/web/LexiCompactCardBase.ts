/**
 * LexiCompactCardBase.ts
 *
 * Abstract base class for lexi-compact-card-* custom elements.
 *
 * Observed attributes:
 *   mode       — 'repository' | 'icon' | 'word'  (CSS :host([mode="..."]) drives layout)
 *   durability — 0-100 number string             (sets --_durability CSS custom property)
 *   is-active  — boolean presence/absence        (CSS :host([is-active]) drives pulse ring)
 */

import { getCompactStyleSheets } from './compactStyleLoader';

const OBSERVED_ATTRIBUTES = ['mode', 'durability', 'is-active'] as const;

export abstract class LexiCompactCardBase extends HTMLElement {

  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES];
  }

  protected abstract readonly personaId: string;
  protected abstract readonly templateHTML: string;

  connectedCallback(): void {
    if (this.shadowRoot) return;

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.adoptedStyleSheets = getCompactStyleSheets(this.personaId);

    const tpl = document.createElement('template');
    tpl.innerHTML = this.templateHTML;
    shadow.appendChild(tpl.content.cloneNode(true));
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'durability' && newValue !== oldValue) {
      // Write --_durability on the host so all [part="durability-fill"] elements
      // in the active layout receive the correct width via var(--_durability).
      const pct = Math.min(100, Math.max(0, Number(newValue) || 100));
      this.style.setProperty('--_durability', `${pct}%`);
    }
    // mode and is-active: handled entirely by CSS :host([attr]) selectors.
  }
}
