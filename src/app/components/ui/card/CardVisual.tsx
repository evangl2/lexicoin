import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useTransform, useMotionTemplate, useMotionValue, type MotionValue } from 'motion/react';
import { motion } from 'motion/react';
import { DefaultCardPersona as DefaultPersona } from '@/app/components/persona/default/Card.persona.default';
import { DynamicVisual } from '@/app/components/ui/visual/DynamicVisual';
import { useWheelStopPropagation } from '@/app/hooks/useWheelStopPropagation';
import { FlavorCarousel } from '@/app/components/ui/text/FlavorCarousel';
import { tts } from '@/app/utils/audio/tts';
import { SelectionOverlay } from '@/app/components/ui/canvas/SelectionOverlay';
import type { ContentItem } from '@/app/types/CardContent';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

// ============================================================================
// HELPER FUNCTIONS (Typography)
// ============================================================================

/**
 * Calculate responsive title class based on text length and character set
 * Handles both Latin and CJK characters with appropriate spacing
 */
export const getTitleClass = (text: string, isCompact: boolean) => {
  if (isCompact) return "text-5xl tracking-widest font-black mr-[-0.1em]";

  const len = text.length;
  const isChinese = /[\u4e00-\u9fa5]/.test(text);

  if (isChinese) return "text-4xl tracking-[0.3em] font-bold mr-[-0.3em]";
  if (len > 14)  return "text-xl tracking-wider mr-[-0.05em]";
  if (len > 8)   return "text-2xl tracking-widest mr-[-0.1em]";
  return "text-3xl tracking-widest mr-[-0.1em]";
};

// Helper to ensure we always have a MotionValue
const useEnsureMotionValue = (value: number | MotionValue<number> | undefined, defaultValue: number) => {
  const motionValue = useMotionValue(typeof value === 'number' ? value : defaultValue);

  useEffect(() => {
    if (typeof value === 'number') {
      motionValue.set(value);
    } else if (value === undefined) {
      motionValue.set(defaultValue);
    }
  }, [value, motionValue, defaultValue]);

  return (typeof value === 'object' && value !== null) ? value : motionValue;
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CardVisualProps {
  learningData: LanguageDisplayData;
  systemData: LanguageDisplayData;
  senseInfo: SenseInfo;
  visual: VisualData;
  systemLanguage?: Language;
  learningLanguage?: Language;

  isActive?: boolean;
  isOver?: boolean;

  flipScaleX?: any;
  frontOpacity?: any;
  backOpacity?: any;

  bgParallaxX?: any;
  bgParallaxY?: any;
  fgParallaxX?: any;
  fgParallaxY?: any;

  displayRotateY?: any;
  smoothXVelocity?: any;
  smoothYVelocity?: any;
  isExpanded?: boolean;

  layoutMode?: 'default' | 'compact';
  persona?: any;

  onDefinitionClick?: () => void;
  isOverlayOpen?: boolean;
  selectionItems?: ContentItem[];
  selectedDefId?: string;
  onSelectDefinition?: (item: ContentItem) => void;
  definitionOverride?: string;
  visualFeedback?: 'merge' | 'split' | null;
  backFaceMounted?: boolean;
}

export const CardVisual = React.memo<CardVisualProps>(({
  learningData,
  systemData,
  senseInfo,
  learningLanguage,
  systemLanguage,
  isActive = false,
  isOver = false,

  flipScaleX = 1,
  frontOpacity = 1,
  backOpacity = 0,

  bgParallaxX = 0,
  bgParallaxY = 0,
  fgParallaxX = 0,
  fgParallaxY = 0,

  displayRotateY,
  smoothXVelocity,
  smoothYVelocity,
  isExpanded = false,

  layoutMode = 'default',
  persona,

  onDefinitionClick,
  isOverlayOpen = false,
  selectionItems = [],
  selectedDefId = '',
  onSelectDefinition = () => { },
  definitionOverride,
  visual,
  visualFeedback,
  backFaceMounted = false,
}) => {
  const { word, pronunciation, pos, level, definition: learningDefinition, flavorContents } = learningData;
  const { word: systemWord, definition: systemDefinition } = systemData;
  const { durability } = senseInfo;

  const [flavorIndex, setFlavorIndex] = useState(0);
  const [flavorDirection, setFlavorDirection] = useState(0);
  const [activePersonaId, setActivePersonaId] = useState(0);

  const availablePersonas = React.useMemo(() => {
    const personas = Array.from(new Set(flavorContents.map(item => item.persona)));
    personas.sort((a, b) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return a.localeCompare(b);
    });
    if (personas.length === 0) return ['default'];
    return personas;
  }, [flavorContents]);

  const currentPersonaName = availablePersonas[activePersonaId] || availablePersonas[0];

  const currentFlavorContents = React.useMemo(() => {
    return flavorContents.filter(item => item.persona === currentPersonaName);
  }, [flavorContents, currentPersonaName]);

  const Persona = persona || DefaultPersona;

  const backFaceRef = useWheelStopPropagation();
  const flavorContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = flavorContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
      if (Math.abs(e.deltaY) > 20) {
        const direction = e.deltaY > 0 ? 1 : -1;
        setActivePersonaId(prev => {
          let next = prev + direction;
          if (next < 0) next = availablePersonas.length - 1;
          if (next >= availablePersonas.length) next = 0;
          return next;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [availablePersonas.length]);

  const fallbackMotionValue = useMotionValue(0);
  const safeDisplayRotateY   = displayRotateY    || fallbackMotionValue;
  const safeSmoothXVelocity  = smoothXVelocity   || fallbackMotionValue;
  const safeSmoothYVelocity  = smoothYVelocity   || fallbackMotionValue;

  const glarePos = useTransform(safeDisplayRotateY, [-20, 20], ["0%", "100%"]);

  const movementIntensity = useTransform(
    [safeSmoothXVelocity, safeSmoothYVelocity],
    (values: number[]) => {
      const [vx = 0, vy = 0] = values;
      const speed = Math.sqrt(vx * vx + vy * vy);
      return Math.min(speed / 1000, Persona.physics.glare.opacityCap);
    }
  );

  const targetGlareOpacity = isExpanded ? 0 : movementIntensity;

  const glareBackground = useMotionTemplate`
    linear-gradient(
      115deg,
      transparent 0%,
      rgba(192, 160, 98, 0.0) ${glarePos},
      ${Persona.physics.glare.color} calc(${glarePos} + 10%),
      rgba(192, 160, 98, 0.0) calc(${glarePos} + 25%),
      transparent 100%
    )
  `;

  const safeFrontOpacity = useEnsureMotionValue(frontOpacity, 1);
  const safeBackOpacity  = useEnsureMotionValue(backOpacity, 0);

  const flipWrapperRef = useRef<HTMLDivElement>(null);
  const frontFaceRef   = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const flipEl  = flipWrapperRef.current;
    const frontEl = frontFaceRef.current;
    const backEl  = backFaceRef.current;

    const applyFlip  = (v: number) => { if (flipEl)  flipEl.style.transform    = `scaleX(${v})`; };
    const applyFront = (v: number) => { if (frontEl) { frontEl.style.opacity = String(v); frontEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none'; } };
    const applyBack  = (v: number) => { if (backEl)  { backEl.style.opacity  = String(v); backEl.style.pointerEvents  = v > 0.5 ? 'auto' : 'none'; } };

    const flipVal = typeof flipScaleX === 'object' && flipScaleX !== null ? flipScaleX.get() : (flipScaleX ?? 1);
    applyFlip(flipVal);
    applyFront(safeFrontOpacity.get());
    applyBack(safeBackOpacity.get());

    const unsubs: (() => void)[] = [];
    if (typeof flipScaleX === 'object' && flipScaleX !== null && typeof flipScaleX.on === 'function') {
      unsubs.push(flipScaleX.on('change', applyFlip));
    }
    unsubs.push(safeFrontOpacity.on('change', applyFront));
    unsubs.push(safeBackOpacity.on('change', applyBack));

    return () => unsubs.forEach(u => u());
  }, [flipScaleX, safeFrontOpacity, safeBackOpacity]);

  const displayPhonetic = pronunciation ?? '';

  return (
    <>
      {isOver && (
        <div
          className="absolute inset-[-10px] rounded-[30px] border-2 border-dashed z-[60] animate-pulse pointer-events-none"
          style={{
            borderColor: 'var(--card-color-gold-metallic)',
            boxShadow: '0 0 20px var(--card-color-gold-metallic)',
          }}
        />
      )}

      <div
        className="absolute -inset-[3px] rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'var(--card-gradient-gold-metallic)',
          zIndex: -1,
          filter: 'blur(5px)',
        }}
      />

      <div ref={flipWrapperRef} className="relative w-full h-full">

        {/* ================= FRONT FACE ================= */}
        <div
          ref={frontFaceRef}
          className="absolute inset-0 overflow-hidden flex flex-col isolate antialiased"
          style={{
            borderRadius: 'var(--card-radius)',
            background: 'var(--card-color-bg-front)',
            backfaceVisibility: isActive ? 'visible' : 'hidden',
            WebkitBackfaceVisibility: isActive ? 'visible' : 'hidden',
          }}
        >
          <Persona.visuals.Background />
          {Persona.visuals.TextureOverlay && <Persona.visuals.TextureOverlay />}

          <div className="absolute inset-0 pointer-events-none z-50 border-[2px] rounded-[inherit]" style={{ borderColor: 'var(--card-color-border-outer)' }} />
          <div className="absolute inset-[4px] pointer-events-none z-50 border-[1px] rounded-[inherit]" style={{ borderColor: 'var(--card-color-border-inner)' }} />
          <Persona.visuals.Corners />

          <>
            <div className="relative z-30 w-full h-[15%] flex items-center justify-center px-5 pt-3">
              <CardFrontHeader level={level} ScrapLabel={Persona.visuals.ScrapLabel} />
            </div>
            <div className="relative z-20 w-full h-[55%] flex items-center justify-center px-4 pt-0 pb-0 -translate-y-2" style={{ perspective: '1000px' }}>
              <MemoizedCardVisual
                isCompact={false}
                visualPayload={visual.payload}
                isActive={isActive}
                fallbackWord={word}
                Persona={Persona}
                bgParallaxX={bgParallaxX}
                bgParallaxY={bgParallaxY}
                fgParallaxX={fgParallaxX}
                fgParallaxY={fgParallaxY}
                durability={durability}
              />
              <div className="absolute -bottom-5 w-full px-12 opacity-80">
                <Persona.visuals.Divider />
              </div>
            </div>
            <div className="relative z-30 h-[30%] flex flex-col items-center justify-start px-4 pt-0 text-center">
              <CardFrontText
                word={word}
                pronunciation={displayPhonetic}
                systemWord={systemWord}
                learningLanguage={learningLanguage}
                systemLanguage={systemLanguage}
              />
            </div>
          </>

          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none z-10 mix-blend-overlay"
            style={{ backgroundImage: 'var(--card-texture-noise)' }}
          />

          {isActive && (
            <motion.div
              style={{ background: glareBackground, opacity: movementIntensity }}
              className="absolute inset-0 z-40 pointer-events-none mix-blend-plus-lighter"
            />
          )}

          <VisualFeedbackOverlay visualFeedback={visualFeedback || null} persona={Persona} />
        </div>

        {/* ================= BACK FACE ================= */}
        {/* Outer div always in DOM so backFaceRef is always set (needed for flip opacity animation).
            Content is lazy-mounted: only rendered after the card is first expanded or flipped.
            This avoids ~60 DOM nodes on cards that have never been opened. */}
        <div
          ref={backFaceRef}
          className="absolute inset-0 overflow-hidden flex flex-col items-stretch p-5 isolate antialiased back-face-content"
          style={{
            borderRadius: 'var(--card-radius)',
            backgroundColor: 'var(--card-color-bg-back)',
            border: '2px solid var(--card-color-gold-metallic)',
            backfaceVisibility: isActive ? 'visible' : 'hidden',
            WebkitBackfaceVisibility: isActive ? 'visible' : 'hidden',
          }}
        >
        {backFaceMounted && <>
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'var(--card-texture-back-pattern)', backgroundSize: '120px 60px' }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'var(--card-gradient-back-sheen)' }}
          />

          <div className="absolute inset-0 pointer-events-none z-50 border-[2px] rounded-[inherit]" style={{ borderColor: 'var(--card-color-border-outer)' }} />
          <div className="absolute inset-[4px] pointer-events-none z-50 border-[1px] rounded-[inherit]" style={{ borderColor: 'var(--card-color-border-inner)' }} />

          <Persona.visuals.Corners />

          {Persona.visuals.BackTopDecoration && (
            <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
              <Persona.visuals.BackTopDecoration />
            </div>
          )}

          {/* Ontology Badge */}
          <div
            className="absolute top-[8px] left-1/2 -translate-x-1/2 z-40
                        px-1.5 pt-[2px] pb-0 border-[0.5px] rounded-full
                        flex items-center justify-center
                        text-[7px] leading-none font-serif tracking-[0.1em] uppercase
                        opacity-50 mix-blend-plus-lighter select-none whitespace-nowrap"
            style={{
              borderColor: 'var(--card-color-gold-metallic)',
              color: 'var(--card-color-gold-bright)',
              background: 'transparent',
              boxShadow: '0 0 2px rgba(212,175,55,0.125)',
            }}
          >
            {senseInfo.ontology}
          </div>

          <div className="relative flex flex-col w-full h-full z-10 back-scrollable">

            {/* Header */}
            <div className="flex items-baseline mb-3 px-1 shrink-0">
              <h3
                className="text-3xl font-bold font-serif mr-3 leading-tight pb-[0.1em]"
                style={{
                  fontFamily: 'var(--card-font-label)',
                  backgroundImage: 'var(--card-gradient-gold-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                }}
              >
                {word}
              </h3>
              <span
                className="text-lg italic font-serif opacity-80"
                style={{
                  fontFamily: 'var(--card-font-body)',
                  color: 'var(--card-color-gold-metallic)',
                }}
              >
                {pos}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 gap-2">

              {/* Definition Box */}
              <div
                className="flex-[3] rounded-md pt-1.5 pb-4 pl-4 pr-0.5 cursor-pointer transition-all duration-300 relative group flex flex-col min-h-0 overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-color-def-box-bg)',
                  border: '2px solid var(--card-color-border-outer)',
                  boxShadow: 'var(--card-shadow-def-box)',
                  background: 'var(--card-gradient-def-box-overlay), var(--card-color-def-box-bg)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--card-color-gold-metallic)';
                  e.currentTarget.style.boxShadow = `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.2),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.5),
                    0 0 20px rgba(212, 175, 55, 0.3),
                    0 2px 8px rgba(0, 0, 0, 0.4)
                  `;
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--card-color-border-outer)';
                  e.currentTarget.style.boxShadow = 'var(--card-shadow-def-box)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDefinitionClick?.();
                }}
              >
                <div
                  className="text-[8px] uppercase font-serif tracking-[0.1em] mb-0.5 select-none flex items-center gap-1.5 pr-3.5"
                  style={{ color: 'var(--card-color-gold-metallic)', opacity: 0.6, letterSpacing: '0.1em' }}
                >
                  <span className="scale-90 origin-left">DEFINITION</span>
                  <span className="opacity-30">•</span>
                </div>

                <div
                  className="flex items-start gap-3 w-full h-full overflow-y-auto definition-scrollable pr-0"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--card-color-scrollbar-thumb) transparent' }}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <p
                    className="text-base font-sans leading-relaxed flex-1 select-none pr-0.5"
                    style={{
                      color: 'var(--card-color-text-primary)',
                      fontFamily: 'var(--card-font-body)',
                      lineHeight: '1.65',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {definitionOverride || systemDefinition}
                  </p>
                </div>
              </div>

              {/* Flavor Box */}
              <div
                className="flex-1 rounded-md py-1.5 px-0.5 flex flex-col min-h-0 relative group/flavor"
                style={{
                  backgroundColor: 'var(--card-color-flavor-box-bg)',
                  border: '1px solid var(--card-color-border-subtle)',
                  boxShadow: 'var(--card-shadow-flavor-box)',
                  cursor: 'default',
                }}
                ref={flavorContainerRef}
              >
                {/* Persona icon (flavor text persona, not skin) */}
                <div className="absolute top-0 left-0 text-white opacity-70 pointer-events-none z-10">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 5 L19 18 L5 18 Z" />
                    <circle cx="12" cy="13" r="2.5" fill="currentColor" fillOpacity="0.4" stroke="none" />
                  </svg>
                </div>

                <FlavorCarousel
                  items={currentFlavorContents}
                  persona={Persona}
                  tokens={Persona.tokens}
                  currentIndex={flavorIndex}
                  direction={flavorDirection}
                  onNavigate={(newIndex, newDir) => {
                    setFlavorDirection(newDir);
                    setFlavorIndex(newIndex);
                  }}
                  onContentClick={() => {
                    const text = currentFlavorContents[flavorIndex]?.text;
                    if (text && learningLanguage) {
                      tts.speak(text, learningLanguage);
                    }
                  }}
                />
              </div>

            </div>
          </div>

          {/* Flavor indicators */}
          {currentFlavorContents.length > 1 && (
            <div className="absolute bottom-[12px] left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none z-50">
              {currentFlavorContents.map((item, idx) => {
                const isActiveIdx = idx === flavorIndex;
                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlavorDirection(idx > flavorIndex ? 1 : -1);
                      setFlavorIndex(idx);
                    }}
                    className={`
                      w-3 h-px rounded-full transition-all duration-300 pointer-events-auto
                      ${isActiveIdx ? 'opacity-100 scale-x-125' : 'opacity-20 hover:opacity-50'}
                    `}
                    style={{ backgroundColor: 'white' }}
                    title={item.type}
                  />
                );
              })}
            </div>
          )}

          {isOverlayOpen && (
            <SelectionOverlay
              items={selectionItems}
              selectedId={selectedDefId}
              onSelect={onSelectDefinition}
              systemLang={systemLanguage || 'en'}
              learningLang={learningLanguage || 'en'}
              tokens={Persona.tokens}
            />
          )}
        </>}
        </div>
      </div>
    </>
  );
});

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * CardFrontHeader — level badge at top of card front face.
 * Extracted from inline renderHeader() to benefit from React.memo bail-out.
 * Styles use CSS vars; only ScrapLabel slot component still requires Persona reference.
 */
const CardFrontHeader = React.memo(({
  level,
  ScrapLabel,
}: {
  level: string;
  ScrapLabel: React.FC<{ children: React.ReactNode }> | null | undefined;
}) => (
  <>
    {!ScrapLabel && (
      <div
        className="absolute inset-x-6 bottom-2 top-3 bg-black/20 border-b border-t rounded-sm -z-10 opacity-60"
        style={{
          borderColor: 'var(--card-color-border-subtle)',
          backgroundColor: 'var(--card-color-bg-panel)',
        }}
      />
    )}
    <div className="flex flex-col items-center justify-center w-full relative z-10 -mt-1">
      {!ScrapLabel && (
        <div
          className="absolute -top-4 w-[1px] h-5 bg-gradient-to-b from-transparent"
          style={{ '--tw-gradient-to': 'var(--card-def-color-gold-base)' } as React.CSSProperties}
        />
      )}
      {ScrapLabel ? (
        <ScrapLabel>{level}</ScrapLabel>
      ) : (
        <span
          className="text-xl drop-shadow-[0_0_12px_rgba(240,208,130,0.4)] font-bold tracking-[0.2em]"
          style={{
            fontFamily: 'var(--card-font-label)',
            color: 'var(--card-color-text-highlight)',
            background: 'var(--card-gradient-label-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {level}
        </span>
      )}
    </div>
  </>
));
CardFrontHeader.displayName = 'CardFrontHeader';

/**
 * CardFrontText — word title + phonetic + translation at bottom of card front face.
 * Extracted from inline renderText() to benefit from React.memo bail-out.
 * getTitleClass result is memoized so the CJK regex only runs when word changes.
 */
const CardFrontText = React.memo(({
  word,
  pronunciation,
  systemWord,
  learningLanguage,
  systemLanguage,
}: {
  word: string;
  pronunciation: string;
  systemWord: string;
  learningLanguage?: Language;
  systemLanguage?: Language;
}) => {
  const titleClass = useMemo(() => getTitleClass(word, false), [word]);

  return (
    <div className="flex flex-col items-center justify-end w-full h-full pb-0 relative z-40">
      {pronunciation && (
        <div className="mb-0.5 w-full text-center">
          <span
            className="font-serif text-[10px] tracking-[0.2em] opacity-50 mix-blend-plus-lighter inline-block"
            style={{ color: 'var(--card-color-gold-bright)' }}
          >
            {pronunciation}
          </span>
        </div>
      )}
      <div className="flex items-baseline justify-center mb-1 w-full text-center relative z-10">
        <div className="flex flex-col itemscenter justify-center gap-2.5 px-4 mb-1.5">
          <h2
            className={`leading-tight capitalize pb-[0.1em] ${titleClass}`}
            style={{
              fontFamily: 'var(--card-font-label)',
              backgroundImage: 'var(--card-gradient-gold-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              textAlign: 'center',
            }}
          >
            {word}
          </h2>
          {learningLanguage !== systemLanguage && (
            <span
              className="text-sm opacity-70 text-center font-medium"
              style={{
                fontFamily: 'var(--card-font-body)',
                color: 'var(--card-color-gold-metallic)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
              }}
            >
              {systemWord}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
CardFrontText.displayName = 'CardFrontText';

// ============================================================================
// MEMOIZED VISUAL AREA (parallax + SVG + durability)
// ============================================================================

export const MemoizedCardVisual = React.memo(({
  isCompact,
  visualPayload,
  isActive,
  fallbackWord,
  Persona,
  bgParallaxX,
  bgParallaxY,
  fgParallaxX,
  fgParallaxY,
  durability,
}: any) => {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateBg = () => {
      if (!bgRef.current) return;
      const x = bgParallaxX?.get?.() ?? 0;
      const y = bgParallaxY?.get?.() ?? 0;
      bgRef.current.style.transform = `translateX(${x}px) translateY(${y}px)`;
    };
    const updateFg = () => {
      if (!fgRef.current) return;
      const x = fgParallaxX?.get?.() ?? 0;
      const y = fgParallaxY?.get?.() ?? 0;
      fgRef.current.style.transform = `translateX(${x}px) translateY(${y}px)`;
    };
    const unsubBgX = bgParallaxX?.on?.('change', updateBg);
    const unsubBgY = bgParallaxY?.on?.('change', updateBg);
    const unsubFgX = fgParallaxX?.on?.('change', updateFg);
    const unsubFgY = fgParallaxY?.on?.('change', updateFg);
    return () => { unsubBgX?.(); unsubBgY?.(); unsubFgX?.(); unsubFgY?.(); };
  }, [bgParallaxX, bgParallaxY, fgParallaxX, fgParallaxY]);

  return (
    <div
      className="relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center"
      style={{ boxShadow: isCompact ? 'none' : 'var(--card-shadow-inner-depth)' }}
    >
      <div
        ref={bgRef}
        className="absolute inset-[-20%]"
        style={{ background: 'var(--card-color-bg-deep)', opacity: 0.8 }}
      >
        <div
          className="w-full h-full opacity-[0.15]"
          style={{ backgroundImage: 'var(--card-texture-deep-pattern)', backgroundSize: '120px 60px' }}
        />
      </div>

      <Persona.visuals.Frame />

      <div
        ref={fgRef}
        className={`absolute inset-0 flex items-center justify-center z-40 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]
            ${isCompact ? 'scale-[1.0] opacity-30 mix-blend-screen' : ''}`}
      >
        <DynamicVisual code={visualPayload} isActive={isActive} fallbackElement={fallbackWord} />
      </div>

      {Persona.visuals.DurabilityBar ? (
        <div className="absolute bottom-0 inset-x-0 z-50 flex justify-center">
          <Persona.visuals.DurabilityBar progress={durability} />
        </div>
      ) : (
        !isCompact && (
          <div className="absolute bottom-0 left-0 right-0 z-50 w-full h-[4px] bg-black/20 flex justify-center items-center">
            {/* Fix 5: CSS transition replaces motion.div animate — no FM animation loop per card */}
            <div
              className="h-full opacity-90"
              style={{
                width: `${durability}%`,
                transition: 'width 0.5s ease-out',
                background: 'linear-gradient(to right, var(--card-color-gold-metallic), var(--card-color-gold-bright), var(--card-color-gold-metallic))',
                boxShadow: '0 0 10px var(--card-color-gold-metallic)',
              }}
            />
          </div>
        )
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isCompact      === nextProps.isCompact      &&
    prevProps.visualPayload  === nextProps.visualPayload  &&
    prevProps.isActive       === nextProps.isActive       &&
    prevProps.fallbackWord   === nextProps.fallbackWord   &&
    prevProps.durability     === nextProps.durability     &&
    prevProps.bgParallaxX    === nextProps.bgParallaxX    &&
    prevProps.bgParallaxY    === nextProps.bgParallaxY    &&
    prevProps.Persona        === nextProps.Persona        // Fix 4: was missing
  );
});
MemoizedCardVisual.displayName = 'MemoizedCardVisual';

// ============================================================================
// FEEDBACK OVERLAY
// ============================================================================

const VisualFeedbackOverlay = React.memo(({ visualFeedback, persona }: { visualFeedback: 'merge' | 'split' | null, persona: any }) => {
  if (!visualFeedback || !persona.tokens.feedback) return null;

  const config = persona.tokens.feedback[visualFeedback];

  return (
    <motion.div
      className="absolute inset-[-4px] z-[70] pointer-events-none rounded-[26px] border-[3px]"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        borderColor: config.color,
        boxShadow: config.glow,
        willChange: "opacity, transform",
      }}
    >
      <div className="absolute top-2 right-2 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill={config.color}>
          {config.svg && (
            <>
              <path d={config.svg.path} />
              {config.svg.secondaryPath && (
                <path d={config.svg.secondaryPath} fillOpacity={0.5} />
              )}
              {config.svg.strokePath && (
                <path
                  d={config.svg.strokePath}
                  fill="none"
                  stroke={config.color}
                  strokeWidth={config.svg.strokeWidth || "1"}
                  strokeDasharray={config.svg.strokeDash || "none"}
                />
              )}
            </>
          )}
        </svg>
      </div>
    </motion.div>
  );
});
VisualFeedbackOverlay.displayName = 'VisualFeedbackOverlay';
