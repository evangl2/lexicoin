/**
 * LexiCardChrome.tsx
 *
 * React bridge component for lexi-card-chrome-* custom elements.
 *
 * Responsibilities:
 *   1. Synchronously register the persona's custom element (idempotent)
 *   2. Select the correct tag based on `persona` prop
 *   3. Forward `hostRef` to the host element so Card.tsx can write to shadow DOM
 *   4. Sync boolean-ish attributes via useEffect (presence/absence pattern — TDD §6.6)
 *   5. Wrap each slot's ReactNode in a slot-attributed container element
 *
 * Non-responsibilities (handled by Card.tsx):
 *   - MotionValue subscriptions (flip, glare)
 *   - Drag / drop wiring
 *   - Canvas position & scale transforms
 */

import React, {
  useEffect,
  useCallback,
  type ReactNode,
  type Ref,
} from 'react';
import { ensurePersonaRegistered } from './registry';

export interface LexiCardChromeSlots {
  // ── Front face ──────────────────────────────────────────────────────────────
  /** Level badge — renders inside [part="header"]. */
  level: ReactNode;
  /** Core visual area — renders inside [part="visual"]. */
  visual: ReactNode;
  /** Primary word — renders inside [part="word-col"]. */
  word: ReactNode;
  /** Phonetic pronunciation — renders inside [part="pronunciation-row"]. */
  pronunciation: ReactNode;
  /** System-language translation — renders inside [part="word-col"] after word. */
  systemWord: ReactNode;

  // ── Back face (lazy-mounted: only provided after first flip/expand) ──────────
  /** Ontology badge text — renders inside [part="back-ontology"]. */
  ontology?: ReactNode;
  /** Back face word heading — renders inside [part="back-header"]. */
  wordBack?: ReactNode;
  /** Part of speech — renders inside [part="back-header"] after word. */
  pos?: ReactNode;
  /** Definition box (interactive: scroll, click, hover) — [part="back-def-wrap"]. */
  definition?: ReactNode;
  /** Flavor carousel box — renders inside [part="back-flavor-wrap"]. */
  flavor?: ReactNode;
  /**
   * Absolute overlay content (flavor indicators + SelectionOverlay).
   * Projected into slot[name="back-overlay"] which sits outside flip-wrapper,
   * so back-face overflow:hidden never clips it.  Slotted element should have
   * position:absolute relative to :host (which has position:relative).
   */
  backOverlay?: ReactNode;
}

export interface LexiCardChromeProps {
  /** Persona ID — drives tag selection and custom element registration. */
  persona: 'default' | 'cyberpunk';
  /** Activates backface-visibility and glare effect (TDD §4.4). */
  isActive: boolean;
  /** Card is in expanded/inspection state. */
  isExpanded: boolean;
  /** Card is showing its back face. */
  isFlipped: boolean;
  /** Card is a drop target currently hovered. */
  isOver: boolean;
  /** LOD switch — compact hides decoration layers via CSS. */
  layoutMode: 'default' | 'compact';
  /** Visual feedback pulse (merge = white, split = gold). */
  visualFeedback: 'merge' | 'split' | null;
  /** All slot content (front face required, back face optional until first flip). */
  slots: LexiCardChromeSlots;
  /**
   * Ref forwarded to the custom element host.
   * Card.tsx uses this to access shadowRoot for imperative MotionValue writes.
   */
  hostRef?: Ref<HTMLElement>;
}

// ── Tag map ──────────────────────────────────────────────────────────────────

// Mapping is declared outside the component so it is never re-created.
const PERSONA_TAG = {
  default:  'lexi-card-chrome-default',
  cyberpunk: 'lexi-card-chrome-cyberpunk',
} as const satisfies Record<string, string>;

// ── Component ────────────────────────────────────────────────────────────────

export const LexiCardChrome = React.memo<LexiCardChromeProps>(({
  persona,
  isActive,
  isExpanded,
  isFlipped,
  isOver,
  layoutMode,
  visualFeedback,
  slots,
  hostRef,
}) => {
  // Must run synchronously before the JSX tag reaches the DOM (TDD §6.7).
  // ensurePersonaRegistered is idempotent; subsequent calls are no-ops.
  ensurePersonaRegistered(persona);

  const tag = PERSONA_TAG[persona] ?? PERSONA_TAG.default;

  // Internal ref always tracks the host element.
  // hostRef (from Card.tsx) is merged in via the callback ref below.
  const innerRef = React.useRef<HTMLElement>(null);

  const mergedRef = useMergedRef(innerRef, hostRef ?? null);

  // ── Attribute sync (TDD §6.6 — presence/absence, not true/false strings) ──

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    syncBoolAttr(el, 'is-active', isActive);
  }, [isActive]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    syncBoolAttr(el, 'is-expanded', isExpanded);
  }, [isExpanded]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    syncBoolAttr(el, 'is-flipped', isFlipped);
  }, [isFlipped]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    syncBoolAttr(el, 'is-over', isOver);
  }, [isOver]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.setAttribute('layout-mode', layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (visualFeedback) {
      el.setAttribute('visual-feedback', visualFeedback);
    } else {
      el.removeAttribute('visual-feedback');
    }
  }, [visualFeedback]);

  // ── Render ───────────────────────────────────────────────────────────────

  // `tag` is a valid custom element name (guaranteed by PERSONA_TAG map).
  // Cast through `any` is required because TypeScript doesn't accept dynamic
  // JSX tag strings even when the IntrinsicElements declaration is present.
  const Tag = tag as any;

  return (
    <Tag
      ref={mergedRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* ── Front-face slot content ─────────────────────────────────────── */}

      {/*
       * display:contents on slot wrappers (TDD §6.10 + layout correctness):
       *   The wrapper element itself generates NO box — its children participate
       *   directly in the shadow DOM's flex layout at the slot position.
       *   This prevents extra div/span boxes from causing alignment offsets.
       *
       * Exception: the visual wrapper needs explicit sizing so that
       * MemoizedCardVisual fills the [part="visual"] area correctly.
       */}

      {/* Level badge — slotted into [part="header"] inner flex wrapper */}
      <div slot="level">
        {slots.level}
      </div>

      {/* Visual area — explicit 100%×100% so MemoizedCardVisual fills the slot */}
      <div slot="visual">
        {slots.visual}
      </div>

      {/* Pronunciation — inside [part="pronunciation-row"] */}
      <span slot="pronunciation">
        {slots.pronunciation}
      </span>

      {/* Primary word — inside [part="word-col"] */}
      <div slot="word">
        {slots.word}
      </div>

      {/* System-language translation — inside [part="word-col"] after word */}
      <div slot="system-word">
        {slots.systemWord}
      </div>

      {/* ── Back-face slot content (lazy: only present after first flip/expand) ── */}

      {slots.ontology != null && (
        <span slot="ontology">{slots.ontology}</span>
      )}

      {slots.wordBack != null && (
        <div slot="word-back">{slots.wordBack}</div>
      )}

      {slots.pos != null && (
        <span slot="pos">{slots.pos}</span>
      )}

      {slots.definition != null && (
        <div slot="definition">{slots.definition}</div>
      )}

      {slots.flavor != null && (
        <div slot="flavor">{slots.flavor}</div>
      )}

      {slots.backOverlay != null && (
        <div slot="back-overlay">{slots.backOverlay}</div>
      )}
    </Tag>
  );
});

LexiCardChrome.displayName = 'LexiCardChrome';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Boolean-ish attribute sync (TDD §6.6).
 * Presence  = true  → setAttribute(attr, '')
 * Absence   = false → removeAttribute(attr)
 */
function syncBoolAttr(el: Element, attr: string, value: boolean): void {
  if (value) {
    el.setAttribute(attr, '');
  } else {
    el.removeAttribute(attr);
  }
}

/**
 * Merges two refs into a single callback ref.
 * Both refs receive the same node on mount and `null` on unmount.
 * Memoised on `refB` identity so React doesn't recreate the callback every render.
 */
function useMergedRef<T>(
  refA: React.MutableRefObject<T | null>,
  refB: Ref<T> | null,
): React.RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      refA.current = node;
      if (refB === null) return;
      if (typeof refB === 'function') {
        refB(node);
      } else {
        (refB as React.MutableRefObject<T | null>).current = node;
      }
    },
    // refA is a stable ref object — excluded intentionally.
    // refB identity drives memoisation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refB],
  );
}
