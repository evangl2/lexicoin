import { useLayoutEffect } from 'react';
import { DefaultCardPersona as P } from '@/app/components/persona/default/Card.persona.default';

/**
 * CardPersonaVarsInjector
 *
 * Injects all DefaultCardPersona token values as CSS custom properties onto
 * document.documentElement once at app startup. Components in CardVisual.tsx
 * and CompactCardVisual.tsx consume these via var(--card-*) instead of
 * carrying inline style references to the Persona object on every render.
 *
 * Also injects the scrollbar stylesheet into <head> once, replacing the
 * per-card <style> tag that previously caused N style recalculations.
 *
 * When Card persona is eventually wired to PersonaContext, upgrade this
 * component to read from usePersona().card and re-inject on skin change.
 */
export function CardPersonaVarsInjector() {
  useLayoutEffect(() => {
    const root = document.documentElement;

    // ── Colors ──────────────────────────────────────────────────────────────
    root.style.setProperty('--card-color-gold-metallic',   P.tokens.colors.goldMetallic ?? '#D4AF37');
    root.style.setProperty('--card-color-gold-bright',     P.tokens.colors.goldBright   ?? P.definitions.colors.goldBright);
    root.style.setProperty('--card-color-gold-deep',       P.tokens.colors.goldDeep     ?? P.definitions.colors.goldDeep);
    root.style.setProperty('--card-color-bg-front',        P.tokens.colors.bgFront);
    root.style.setProperty('--card-color-bg-back',         P.tokens.colors.bgBack);
    root.style.setProperty('--card-color-bg-deep',         P.tokens.colors.bgDeep);
    root.style.setProperty('--card-color-bg-panel',        P.tokens.colors.bgPanel);
    root.style.setProperty('--card-color-text-primary',    P.tokens.colors.textPrimary);
    root.style.setProperty('--card-color-text-highlight',  P.tokens.colors.textHighlight);
    root.style.setProperty('--card-color-text-secondary',  P.tokens.colors.textSecondary);
    root.style.setProperty('--card-color-border-outer',    P.tokens.colors.borderOuter);
    root.style.setProperty('--card-color-border-inner',    P.tokens.colors.borderInner);
    root.style.setProperty('--card-color-border-subtle',   P.tokens.colors.borderSubtle);
    root.style.setProperty('--card-color-scrollbar-thumb', P.tokens.colors.scrollbarThumb);
    root.style.setProperty('--card-color-def-box-bg',      P.tokens.colors.definitionBoxBg);
    root.style.setProperty('--card-color-flavor-box-bg',   P.tokens.colors.flavorBoxBg);

    // definitions.colors used directly in some spots
    root.style.setProperty('--card-def-color-gold-base',   P.definitions.colors.goldBase);

    // ── Typography ───────────────────────────────────────────────────────────
    root.style.setProperty('--card-font-label',           P.tokens.typography.label.family);
    root.style.setProperty('--card-font-body',            P.tokens.typography.body.family);
    root.style.setProperty('--card-gradient-label-text',  P.tokens.typography.label.gradient);

    // ── Layout ───────────────────────────────────────────────────────────────
    root.style.setProperty('--card-radius',       P.tokens.layout.radius);
    root.style.setProperty('--card-border-width', P.tokens.layout.borderWidth);
    root.style.setProperty('--card-border-thin',  P.tokens.layout.borderThin);

    // ── Shadows ──────────────────────────────────────────────────────────────
    root.style.setProperty('--card-shadow-inner-depth', P.tokens.shadows.innerDepth);
    root.style.setProperty('--card-shadow-def-box',     P.tokens.shadows.definitionBox);
    root.style.setProperty('--card-shadow-flavor-box',  P.tokens.shadows.flavorBox);
    root.style.setProperty('--card-shadow-sel-glow',    P.tokens.shadows.selectionGlow);

    // ── Gradients ────────────────────────────────────────────────────────────
    root.style.setProperty('--card-gradient-gold-text',       P.definitions.gradients.goldText);
    root.style.setProperty('--card-gradient-gold-metallic',   P.definitions.gradients.goldMetallic);
    root.style.setProperty('--card-gradient-back-sheen',      P.definitions.gradients.backSheen);
    root.style.setProperty('--card-gradient-def-box-overlay', P.definitions.gradients.definitionBoxOverlay);

    // ── Assets (textures as CSS url() strings) ───────────────────────────────
    root.style.setProperty('--card-texture-noise',        P.definitions.assets.noiseTexture);
    root.style.setProperty('--card-texture-back-pattern', P.definitions.assets.backPattern);
    root.style.setProperty('--card-texture-deep-pattern', P.definitions.assets.deepPattern);

    // ── Physics / Glare ──────────────────────────────────────────────────────
    root.style.setProperty('--card-glare-opacity-cap', String(P.physics.glare.opacityCap));
    root.style.setProperty('--card-glare-color',       P.physics.glare.color);

    // ── Scrollbar stylesheet (replaces per-card <style> tag) ─────────────────
    const STYLE_ID = 'card-persona-scrollbars';
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .back-scrollable::-webkit-scrollbar { width: 4px; background-color: transparent; }
        .back-scrollable::-webkit-scrollbar-thumb {
          background-color: var(--card-color-scrollbar-thumb);
          border-radius: 10px;
        }
        .definition-scrollable::-webkit-scrollbar { width: 2px; background-color: transparent; }
        .definition-scrollable::-webkit-scrollbar-thumb {
          background-color: var(--card-color-scrollbar-thumb);
          border-radius: 2px;
        }
      `;
      document.head.appendChild(style);
    }
  }, []); // runs once — upgrade to [cardPersona] when Card connects to PersonaContext

  return null;
}
