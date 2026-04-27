/**
 * TypeScript declarations for lexi-card-chrome and lexi-compact-card custom elements.
 * Extends JSX.IntrinsicElements so React recognises all tags and provides
 * attribute autocompletion (React 19 custom-element support).
 */

import type { LexiCardChromeBase } from './LexiCardChromeBase';
import type { LexiCompactCardBase } from './LexiCompactCardBase';

// ── DOM registry ──────────────────────────────────────────────────────────────

declare global {
  interface HTMLElementTagNameMap {
    'lexi-card-chrome-default':   LexiCardChromeBase;
    'lexi-card-chrome-cyberpunk': LexiCardChromeBase;
    'lexi-compact-card-default':   LexiCompactCardBase;
    'lexi-compact-card-cyberpunk': LexiCompactCardBase;
  }
}

// ── lexi-card-chrome attribute contract ──────────────────────────────────────

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

// ── lexi-compact-card attribute contract ─────────────────────────────────────

export interface LexiCompactCardHTMLAttributes {
  /** Layout mode — drives shadow DOM CSS layout switching. */
  mode?: 'repository' | 'icon' | 'word';
  /** Durability value 0-100 — sets --_durability CSS custom property. */
  durability?: string;
  /** Active state. Presence = true, absence = false. */
  'is-active'?: string;
}

// ── JSX intrinsic elements ────────────────────────────────────────────────────

type ChromeProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & LexiCardChromeHTMLAttributes;

type CompactProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & LexiCompactCardHTMLAttributes;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lexi-card-chrome-default':   ChromeProps;
      'lexi-card-chrome-cyberpunk': ChromeProps;
      'lexi-compact-card-default':   CompactProps;
      'lexi-compact-card-cyberpunk': CompactProps;
    }
  }
}
