/**
 * CompactCardVisual.tsx
 *
 * React bridge for lexi-compact-card-* custom elements.
 * Maintains the same external API (props) as the previous pure-React version.
 *
 * Three modes:
 *   repository — slot: visual-repo, word-repo, level, ontology
 *   icon       — slot: visual-icon
 *   word       — slot: word-word
 */

import React, { useEffect, useRef } from 'react';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import { DynamicVisual } from '@/app/components/ui/visual/DynamicVisual';
import { TieredText } from '@/app/components/ui/text/TieredText';
import { usePersona } from '@/app/context/PersonaContext';
import { ensureCompactCardRegistered } from './web/registry';

export type CompactMode = 'repository' | 'icon' | 'word';

export interface CompactCardVisualProps {
  mode: CompactMode;
  learningData: LanguageDisplayData;
  senseInfo: SenseInfo;
  visual: VisualData;
  isActive?: boolean;
}

const COMPACT_TIERS = [
  { id: 'compact-xl', fontSize: 32, lineHeight: 1.1, tracking: '0.02em', weight: 700, opacity: 1,    label: 'XL' },
  { id: 'compact-lg', fontSize: 26, lineHeight: 1.1, tracking: '0.01em', weight: 600, opacity: 1,    label: 'LG' },
  { id: 'compact-md', fontSize: 20, lineHeight: 1.2, tracking: '0em',    weight: 500, opacity: 0.95, label: 'MD' },
  { id: 'compact-sm', fontSize: 16, lineHeight: 1.25, tracking: '0em',   weight: 500, opacity: 0.9,  label: 'SM' },
];

const PERSONA_TAG = {
  default:  'lexi-compact-card-default',
  cyberpunk: 'lexi-compact-card-cyberpunk',
} as const satisfies Record<string, string>;

const CompactCardVisualInner: React.FC<CompactCardVisualProps> = ({
  mode,
  learningData,
  senseInfo,
  visual,
  isActive = false,
}) => {
  const { card: Persona, activeSkin } = usePersona();
  const personaId = activeSkin === 'cyberpunk' ? 'cyberpunk' : 'default';

  // Synchronous registration — must complete before the tag appears in the DOM.
  ensureCompactCardRegistered(personaId);

  const Tag = (PERSONA_TAG[personaId as keyof typeof PERSONA_TAG] ?? PERSONA_TAG.default) as any;

  const { word, level } = learningData;
  const { durability, ontology } = senseInfo;

  const ScrapLabel = Persona.visuals.ScrapLabel;

  const elRef = useRef<HTMLElement>(null);

  // ── Attribute sync (presence/absence for booleans; string for others) ───────

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.setAttribute('mode', mode);
  }, [mode]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.setAttribute('durability', String(durability ?? 100));
  }, [durability]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (isActive) el.setAttribute('is-active', '');
    else          el.removeAttribute('is-active');
  }, [isActive]);

  // ── Shared word TieredText (used in repository and word modes) ───────────────

  const wordSlotContent = (
    <TieredText
      text={word}
      tiers={COMPACT_TIERS}
      style={{
        fontFamily: 'var(--card-font-label)',
        color: 'var(--card-color-text-highlight)',
        backgroundImage: 'var(--card-gradient-label-text)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: mode === 'repository' ? '0 2px 10px var(--card-color-bg-deep)' : undefined,
      }}
    />
  );

  // ── Level badge (repository mode only) ──────────────────────────────────────

  const levelSlotContent = ScrapLabel ? (
    <div className="drop-shadow-lg p-1">
      <ScrapLabel>{level}</ScrapLabel>
    </div>
  ) : (
    <div className="p-1 drop-shadow-md">
      <span
        className="text-xs font-bold tracking-widest"
        style={{
          fontFamily: 'var(--card-font-label)',
          color: 'var(--card-color-text-highlight)',
          background: 'var(--card-gradient-label-text)',
          WebkitBackgroundClip: Persona.tokens?.typography?.label?.gradient ? 'text' : undefined,
          WebkitTextFillColor: Persona.tokens?.typography?.label?.gradient ? 'transparent' : undefined,
        }}
      >
        {level}
      </span>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Tag
      ref={elRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* ── Repository slots ────────────────────────────────────────────── */}
      {mode === 'repository' && (
        <>
          {/* Visual watermark (opacity-40, absolute, handled by shadow DOM CSS) */}
          <div slot="visual-repo" style={{ display: 'block', width: '100%', height: '100%' }}>
            <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
          </div>

          {/* Word text */}
          <div slot="word-repo" style={{ display: 'contents' }}>
            {wordSlotContent}
          </div>

          {/* Level badge (top-right) */}
          <span slot="level" style={{ display: 'contents' }}>
            {levelSlotContent}
          </span>

          {/* Ontology badge (optional) */}
          {ontology && (
            <span slot="ontology">{ontology}</span>
          )}
        </>
      )}

      {/* ── Icon slot ───────────────────────────────────────────────────── */}
      {mode === 'icon' && (
        <div slot="visual-icon" style={{ display: 'block', width: '100%', height: '100%' }}>
          <DynamicVisual code={visual.payload} fallbackElement={word} isActive={false} />
        </div>
      )}

      {/* ── Word slot ───────────────────────────────────────────────────── */}
      {mode === 'word' && (
        <div slot="word-word" style={{ display: 'contents' }}>
          {wordSlotContent}
        </div>
      )}
    </Tag>
  );
};

export const CompactCardVisual = React.memo(CompactCardVisualInner);

CompactCardVisual.displayName = 'CompactCardVisual';
