/**
 * TypeScript declarations for lexi-card-chrome custom elements.
 * Extends JSX.IntrinsicElements so React recognises both tags and provides
 * attribute autocompletion (React 19 custom-element support).
 */

import type { LexiCardChromeBase } from './LexiCardChromeBase';

// ── DOM registry ──────────────────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'lexi-card-chrome-default': LexiCardChromeBase;
    'lexi-card-chrome-cyberpunk': LexiCardChromeBase;
  }
}

// ── Attribute contract (kebab-case, as seen by the browser) ──────────────────

export interface LexiCardChromeHTMLAttributes {
  /** Activates backface-visibility + glare. Presence = true, absence = false. */
  'is-active'?: string;
  /** Card is in expanded/inspection state. */
  'is-expanded'?: string;
  /** Card is showing its back face. */
  'is-flipped'?: string;
  /** Card is a drop target currently hovered by a dragged item. */
  'is-over'?: string;
  /** Visual feedback animation type. */
  'visual-feedback'?: 'merge' | 'split' | '';
}

// ── JSX intrinsic elements ────────────────────────────────────────────────────

type CustomElementProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  LexiCardChromeHTMLAttributes;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lexi-card-chrome-default': CustomElementProps;
      'lexi-card-chrome-cyberpunk': CustomElementProps;
    }
  }
}
