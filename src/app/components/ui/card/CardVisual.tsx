import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
// HELPER FUNCTIONS (Typography & Icons)
// ============================================================================

// Temporary Mock Icons for testing persona switching
const PERSONA_ICONS: Record<string, React.ReactNode> = {
  'default': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 5 L19 18 L5 18 Z" />
      <circle cx="12" cy="13" r="2.5" fill="currentColor" fillOpacity="0.4" stroke="none" />
    </svg>
  ),
  'scifi': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  'ancient': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 22h20L12 2zm0 3l6 14H6l6-14z" />
    </svg>
  )
};

/**
 * Calculate responsive title class based on text length and character set
 * Handles both Latin and CJK characters with appropriate spacing
 */
const getTitleClass = (text: string, isCompact: boolean) => {
  if (isCompact) return "text-5xl tracking-widest font-black mr-[-0.1em]";

  const len = text.length;
  // Adjust sizing logic for Chinese characters which are visually denser
  const isChinese = /[\u4e00-\u9fa5]/.test(text);

  if (isChinese) {
    return "text-4xl tracking-[0.3em] font-bold mr-[-0.3em]";
  }

  if (len > 14) return "text-xl tracking-wider mr-[-0.05em]";
  if (len > 8) return "text-2xl tracking-widest mr-[-0.1em]";
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
  /**
   * Learning language display data
   * Contains word, definition, and flavor text in the target learning language
   */
  learningData: LanguageDisplayData;

  /**
   * System language display data
   * Contains word translation in the familiar system language for assistance
   */
  systemData: LanguageDisplayData;

  /**
   * Semantic metadata (ontology, frequency, fingerprint, personas, durability)
   * Used for filtering, sorting, and game mechanics
   */
  senseInfo: SenseInfo;

  /**
   * Visual asset data (SVG payload + loading status)
   * Supports async loading with Persona-specific loading states
   */
  visual: VisualData;

  /**
   * System language - retained for future UI localization
   * Currently unused as all text comes from learningData/systemData
   */
  systemLanguage?: Language;

  /**
   * Learning language code - used to determine if bilingual display is needed
   */
  learningLanguage?: Language;
  // ========== Interaction States ==========
  isActive?: boolean;
  isOver?: boolean;

  // ========== Motion Values (Physics) ==========
  flipScaleX?: any;
  frontOpacity?: any;
  backOpacity?: any;

  bgParallaxX?: any;
  bgParallaxY?: any;
  fgParallaxX?: any;
  fgParallaxY?: any;

  // Glare physics input (for glare calculation)
  displayRotateY?: any;
  smoothXVelocity?: any;
  smoothYVelocity?: any;
  isExpanded?: boolean;

  // ========== Layout Options ==========
  layoutMode?: 'default' | 'compact';
  persona?: any;

  // ==========/ Selection Overlay /==========
  onDefinitionClick?: () => void;
  isOverlayOpen?: boolean;
  selectionItems?: ContentItem[];
  selectedDefId?: string;
  onSelectDefinition?: (item: ContentItem) => void;
  definitionOverride?: string;
  visualFeedback?: 'merge' | 'split' | null;
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

  // Glare physics input
  displayRotateY,
  smoothXVelocity,
  smoothYVelocity,
  isExpanded = false,

  layoutMode = 'default',

  persona,

  // Selection Overlay Defaults
  onDefinitionClick,
  isOverlayOpen = false,
  selectionItems = [],
  selectedDefId = '',
  onSelectDefinition = () => { },
  definitionOverride,
  visual,
  visualFeedback,
}) => {
  // ========== Extract Display Data ==========
  // Learning language data (primary)
  const { word, pronunciation, pos, level, definition: learningDefinition, flavorContents } = learningData;
  // System language word and definition
  const { word: systemWord, definition: systemDefinition } = systemData;

  const { durability } = senseInfo;

  // Flavor Carousel State
  const [flavorIndex, setFlavorIndex] = useState(0);
  const [flavorDirection, setFlavorDirection] = useState(0);

  // Persona Switching State (for Flavor Text Box)
  const [activePersonaId, setActivePersonaId] = useState(0);

  // 1. Calculate Available Personas from Content
  // We extract unique persona keys from the flavor contents to create the switchable list.
  const availablePersonas = React.useMemo(() => {
    // Get unique personas from content
    const personas = Array.from(new Set(flavorContents.map(item => item.persona)));

    // Ensure 'default' is always first if present
    personas.sort((a, b) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return a.localeCompare(b);
    });

    // Fallback if no personas found (shouldn't happen with valid data)
    if (personas.length === 0) return ['default'];
    return personas;
  }, [flavorContents]);

  // Get current persona name (e.g., 'default', 'formal', 'slang')
  const currentPersonaName = availablePersonas[activePersonaId] || availablePersonas[0];

  // Filter content for the current persona
  const currentFlavorContents = React.useMemo(() => {
    return flavorContents.filter(item => item.persona === currentPersonaName);
  }, [flavorContents, currentPersonaName]);

  // 1. Priority: External persona > Default (Alchemy)
  // Note: We DO NOT change the visual skin (Persona object) based on flavor text persona.
  // The skin remains consistent for the card.
  const Persona = persona || DefaultPersona;

  // 2. Wheel Propagation Control
  // We MUST use native listeners to stop propagation because the Canvas (parent) likely uses native listeners.
  // AND we must use native listeners for our custom logic (Flavor) because if we put a stopPropagation on the
  // parent container, React's synthetic events on children might be blocked (event delegation issue).

  const backFaceRef = useWheelStopPropagation(); // Blocks zoom on general back face
  const flavorContainerRef = React.useRef<HTMLDivElement>(null);

  // Native wheel listener for Flavor Text (Persona Switch)
  // We attach this directly to the DOM node so it fires BEFORE it bubbles to backFaceRef or Canvas.
  useEffect(() => {
    const el = flavorContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation(); // Stop bubbling to backFaceRef (redundant but safe) and Canvas (critical)

      // Logic from previous onWheel
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

    // Passive: false is required to use stopPropagation/preventDefault if needed, 
    // though here we just need the event.
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [availablePersonas.length]); // Re-bind if length changes (unlikely but correct)

  // Sub-Components
  const fallbackMotionValue = useMotionValue(0);
  const safeDisplayRotateY = displayRotateY || fallbackMotionValue;
  const safeSmoothXVelocity = smoothXVelocity || fallbackMotionValue;
  const safeSmoothYVelocity = smoothYVelocity || fallbackMotionValue;

  // Compute glare position from rotation (always called)
  const glarePos = useTransform(safeDisplayRotateY, [-20, 20], ["0%", "100%"]);

  // Compute movement intensity from velocity (always called)
  const movementIntensity = useTransform(
    [safeSmoothXVelocity, safeSmoothYVelocity],
    (values: number[]) => {
      const [vx = 0, vy = 0] = values;
      const speed = Math.sqrt(vx * vx + vy * vy);
      return Math.min(speed / 1000, Persona.physics.glare.opacityCap);
    }
  );

  // Target opacity: hide when expanded
  const targetGlareOpacity = isExpanded ? 0 : movementIntensity;

  // Glare gradient template using persona color (always called)
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

  // --- Pointer Events Calculation ---
  // Optimized: Use MotionValues for pointer-events to prevent re-renders on every frame
  const safeFrontOpacity = useEnsureMotionValue(frontOpacity, 1);
  const safeBackOpacity = useEnsureMotionValue(backOpacity, 0);


  // --- Flip / Front / Back: ref-driven DOM updates (avoids GPU compositing layers) ---
  const flipWrapperRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const flipEl = flipWrapperRef.current;
    const frontEl = frontFaceRef.current;
    const backEl = backFaceRef.current;

    const applyFlip = (v: number) => {
      if (!flipEl) return;
      flipEl.style.transform = `scaleX(${v})`;
    };
    const applyFront = (v: number) => {
      if (!frontEl) return;
      frontEl.style.opacity = String(v);
      frontEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    };
    const applyBack = (v: number) => {
      if (!backEl) return;
      backEl.style.opacity = String(v);
      backEl.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    };

    // Apply initial values synchronously to avoid first-render flash
    const flipVal = typeof flipScaleX === 'object' && flipScaleX !== null ? flipScaleX.get() : (flipScaleX ?? 1);
    applyFlip(flipVal);
    applyFront(safeFrontOpacity.get());
    applyBack(safeBackOpacity.get());

    // Subscribe to future changes
    const unsubs: (() => void)[] = [];
    if (typeof flipScaleX === 'object' && flipScaleX !== null && typeof flipScaleX.on === 'function') {
      unsubs.push(flipScaleX.on('change', applyFlip));
    }
    unsubs.push(safeFrontOpacity.on('change', applyFront));
    unsubs.push(safeBackOpacity.on('change', applyBack));

    return () => unsubs.forEach(u => u());
  }, [flipScaleX, safeFrontOpacity, safeBackOpacity]);

  // ========== Layout Configuration ==========
  // Compact mode is now handled by CompactCardVisual.tsx
  // This component handles the standard "detailed" card view.

  // ========== Display Text Preparation ==========
  // Note: pronunciation may be undefined for some words
  const displayPhonetic = pronunciation ?? '';

  // --- Sub-Components ---

  const renderHeader = () => (
    <>
      {!Persona.visuals.ScrapLabel && (
        <div className="absolute inset-x-6 bottom-2 top-3 bg-black/20 border-b border-t rounded-sm -z-10 opacity-60"
          style={{
            borderColor: Persona.tokens.colors.borderSubtle,
            backgroundColor: Persona.tokens.colors.bgPanel
          }}
        />
      )}

      <div className={`flex flex-col items-center justify-center w-full relative z-10 -mt-1`}>
        {!Persona.visuals.ScrapLabel && (
          <div className="absolute -top-4 w-[1px] h-5 bg-gradient-to-b from-transparent" style={{ '--tw-gradient-to': Persona.definitions.colors.goldBase } as any} />
        )}

        {Persona.visuals.ScrapLabel ? (
          <Persona.visuals.ScrapLabel>
            {level}
          </Persona.visuals.ScrapLabel>
        ) : (
          <span className={`text-xl drop-shadow-[0_0_12px_rgba(240,208,130,0.4)] font-bold tracking-[0.2em]`}
            style={{
              fontFamily: Persona.tokens.typography.label.family,
              color: Persona.tokens.colors.textHighlight,
              background: Persona.tokens.typography.label.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            {level}
          </span>
        )}
      </div>
    </>
  );



  const renderText = () => (
    <div className="flex flex-col items-center justify-end w-full h-full pb-0 relative z-40">
      {displayPhonetic && (
        <div className="mb-0.5 w-full text-center">
          <span className="font-serif text-[10px] tracking-[0.2em] opacity-50 mix-blend-plus-lighter inline-block"
            style={{ color: Persona.tokens.colors.goldBright || Persona.tokens.colors.textHighlight }}>
            {displayPhonetic}
          </span>
        </div>
      )}

      <div className={`flex items-baseline justify-center mb-1 w-full text-center relative z-10`}>


        <div className="flex flex-col itemscenter justify-center gap-2.5 px-4 mb-1.5">
          {/* Main title: Learning language word */}
          <h2 className={`leading-tight capitalize pb-[0.1em] ${getTitleClass(word, false)}`}
            style={{
              fontFamily: Persona.tokens.typography.label.family,
              backgroundImage: Persona.definitions.gradients.goldText || Persona.tokens.typography.label.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              textAlign: 'center'
            }}>
            {word}
          </h2>

          {/* System language translation (bilingual support) */}
          {/* Show systemWord only if languages are different */}
          {learningLanguage !== systemLanguage && (
            <span className="text-sm opacity-70 text-center font-medium"
              style={{
                fontFamily: Persona.tokens.typography.body.family,
                color: Persona.tokens.colors.goldMetallic,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))'
              }}>
              {systemWord}
            </span>
          )}
        </div>


      </div>


    </div>
  );

  return (
    <>
      {isOver && (
        <div className="absolute inset-[-10px] rounded-[30px] border-2 border-dashed z-[60] animate-pulse pointer-events-none"
          style={{
            borderColor: Persona.tokens.colors.goldMetallic,
            boxShadow: `0 0 20px ${Persona.tokens.colors.goldMetallic}`
          }} />
      )}

      <div
        className="absolute -inset-[3px] rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: Persona.definitions.gradients?.goldMetallic || Persona.tokens.colors.goldMetallic,
          zIndex: -1,
          filter: 'blur(5px)'
        }}
      />

      <div ref={flipWrapperRef} className="relative w-full h-full">

        {/* ================= FRONT FACE ================= */}
        <div
          ref={frontFaceRef}
          className="absolute inset-0 overflow-hidden flex flex-col isolate antialiased"
          style={{
            borderRadius: Persona.tokens.layout.radius,
            background: Persona.tokens.colors.bgFront,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <Persona.visuals.Background />
          {Persona.visuals.TextureOverlay && <Persona.visuals.TextureOverlay />}

          <div className="absolute inset-0 pointer-events-none z-50 border-[2px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderOuter || 'transparent' }} />
          <div className="absolute inset-[4px] pointer-events-none z-50 border-[1px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderInner || 'transparent' }} />
          <Persona.visuals.Corners />

          {/* --- CONTENT LAYOUT --- */}
          {/* STANDARD MODE LAYOUT */}
          <>
            <div className={`relative z-30 w-full h-[15%] flex items-center justify-center px-5 pt-3`}>
              {renderHeader()}
            </div>
            <div className="relative z-20 w-full h-[55%] flex items-center justify-center px-4 pt-0 pb-0 -translate-y-2" style={{ perspective: '1000px' }}>
              {/* MEMOIZED VISUAL */}
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
              {renderText()}
            </div>
          </>

          <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10 mix-blend-overlay"
            style={{ backgroundImage: Persona.definitions.assets.noiseTexture || 'none' }}
          />
          {/* Glare effect — only mount when card is active to avoid a permanent GPU layer per card */}
          {isActive && (
            <motion.div style={{ background: glareBackground, opacity: movementIntensity }} className="absolute inset-0 z-40 pointer-events-none mix-blend-plus-lighter" />
          )}

          {/* Feedback Effect (Memoized) */}
          <VisualFeedbackOverlay visualFeedback={visualFeedback || null} persona={Persona} />

        </div>

        {/* ================= BACK FACE ================= */}
        <div
          ref={backFaceRef}
          className="absolute inset-0 overflow-hidden flex flex-col items-stretch p-5 isolate antialiased back-face-content"
          style={{
            borderRadius: Persona.tokens.layout.radius,
            backgroundColor: Persona.tokens.colors.bgBack,
            border: `2px solid ${Persona.tokens.colors.goldMetallic || Persona.definitions.colors.goldBase}`,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {/* Dynamic Scrollbar Styling */}
          <style>{`
            .custom-scrollbar-${Persona.identity.name}::-webkit-scrollbar,
            .back-scrollable::-webkit-scrollbar {
              width: 4px;
              background-color: transparent;
            }
            .definition-scrollable::-webkit-scrollbar {
              width: 2px;
              background-color: transparent;
            }
            .custom-scrollbar-${Persona.identity.name}::-webkit-scrollbar-thumb,
            .back-scrollable::-webkit-scrollbar-thumb {
              background-color: ${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic};
              border-radius: 10px;
            }
            .definition-scrollable::-webkit-scrollbar-thumb {
              background-color: ${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic};
              border-radius: 2px;
            }
          `}</style>

          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: Persona.definitions.assets.backPattern || 'none',
              backgroundSize: "120px 60px"
            }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: Persona.definitions.gradients?.backSheen || Persona.definitions.gradients.backSheen }} />

          {/* VISUAL CONSISTENCY PRIORITY: Border and decorations must match front face exactly */}
          {/* Double border system - same as front face L614-615 */}
          <div className="absolute inset-0 pointer-events-none z-50 border-[2px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderOuter || 'transparent' }} />
          <div className="absolute inset-[4px] pointer-events-none z-50 border-[1px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderInner || 'transparent' }} />

          {/* Corner decorations - same as front face L616 */}
          <Persona.visuals.Corners />

          {/* Top decorative element - alchemy aesthetic */}
          {Persona.visuals.BackTopDecoration && (
            <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
              <Persona.visuals.BackTopDecoration />
            </div>
          )}

          {/* Ontology Badge - Refined & Compact */}
          <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-40
                          px-1.5 pt-[2px] pb-0 border-[0.5px] rounded-full
                          flex items-center justify-center
                          text-[7px] leading-none font-serif tracking-[0.1em] uppercase
                          opacity-50 mix-blend-plus-lighter select-none whitespace-nowrap"
            style={{
              borderColor: Persona.tokens.colors.goldMetallic || '#D4AF37',
              color: Persona.tokens.colors.goldBright || '#F0D082',
              background: 'transparent',
              boxShadow: `0 0 2px ${Persona.tokens.colors.goldMetallic}20`
            }}>
            {senseInfo.ontology}
          </div>

          <div className={`relative flex flex-col w-full h-full z-10 custom-scrollbar-${Persona.identity.name}`}>

            {/* --- HEADER SECTION --- */}
            <div className="flex items-baseline mb-3 px-1 shrink-0">
              <h3 className="text-3xl font-bold font-serif mr-3 leading-tight pb-[0.1em]"
                style={{
                  fontFamily: Persona.tokens.typography.label.family,
                  backgroundImage: Persona.definitions.gradients.goldText || `linear-gradient(to bottom, ${Persona.tokens.colors.goldBright}, ${Persona.tokens.colors.goldDeep})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                }}>
                {word}
              </h3>
              <span className="text-lg italic font-serif opacity-80"
                style={{
                  fontFamily: Persona.tokens.typography.body.family,
                  color: Persona.tokens.colors.goldMetallic
                }}>
                {pos}
              </span>
            </div>

            {/* --- CONTENT SECTIONS --- */}
            <div className="flex-1 flex flex-col min-h-0 gap-2">

              {/* --- DEFINITION SECTION --- */}
              {/* Alchemy-themed interactive box with hover and click states */}
              {/* Fixed height ratios: Moved from flex-[2] to flex-[3] to increase definition space relative to flavor */}
              <div
                className="flex-[3] rounded-md pt-1.5 pb-4 pl-4 pr-0.5 cursor-pointer transition-all duration-300 relative group flex flex-col min-h-0 overflow-hidden"
                style={{
                  backgroundColor: Persona.tokens.colors.definitionBoxBg || 'rgba(10, 10, 10, 0.6)',
                  border: `2px solid ${Persona.tokens.colors.borderOuter}`,
                  boxShadow: Persona.tokens.shadows.definitionBox || `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.5),
                    0 2px 8px rgba(0, 0, 0, 0.4)
                  `,
                  background: `
                    ${Persona.tokens.gradients?.definitionBoxOverlay || Persona.definitions.gradients?.definitionBoxOverlay},
                    ${Persona.tokens.colors.definitionBoxBg || 'rgba(10, 10, 10, 0.6)'}
                  `
                }}
                // Note: Multi-definition selection deferred to future
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = Persona.tokens.colors.goldMetallic || '#D4AF37';
                  e.currentTarget.style.boxShadow = `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.2),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.5),
                    0 0 20px rgba(212, 175, 55, 0.3),
                    0 2px 8px rgba(0, 0, 0, 0.4)
                  `;
                  e.currentTarget.style.transform = 'scale(1.01)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Persona.tokens.colors.borderOuter || '';
                  e.currentTarget.style.boxShadow = `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.5),
                    0 2px 8px rgba(0, 0, 0, 0.4)
                  `;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDefinitionClick?.();
                }}
              >
                {/* Header with alchemy styling - shrink for refinement */}
                <div className="text-[8px] uppercase font-serif tracking-[0.1em] mb-0.5 select-none flex items-center gap-1.5 pr-3.5"
                  style={{
                    color: Persona.tokens.colors.goldMetallic,
                    opacity: 0.6,
                    letterSpacing: '0.1em'
                  }}
                >
                  <span className="scale-90 origin-left">DEFINITION</span>
                  <span className="opacity-30">•</span>
                  {/* Note: Multi-definition selection UI deferred to future */}
                </div>

                {/* Content with optimized typography */}
                {/* Content with optimized typography and scrolling */}
                <div
                  className="flex items-start gap-3 w-full h-full overflow-y-auto definition-scrollable pr-0"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic} transparent`
                  }}
                  onWheel={(e) => e.stopPropagation()}
                >

                  {/* Definition Text (from CardEntity.displayData) */}
                  <p
                    className="text-base font-sans leading-relaxed flex-1 select-none pr-0.5"
                    style={{
                      color: Persona.tokens.colors.textPrimary,
                      fontFamily: Persona.tokens.typography.body.family,
                      lineHeight: '1.65',
                      letterSpacing: '0.01em'
                    }}
                  >
                    {definitionOverride || systemDefinition}
                  </p>
                </div>
              </div>

              {/* --- FLAVOR CAROUSEL SECTION --- */}
              {/* Carousel container with optimized alchemy styling */}
              <div
                className="flex-1 rounded-md py-1.5 px-0.5 flex flex-col min-h-0 relative group/flavor"
                style={{
                  backgroundColor: Persona.tokens.colors.flavorBoxBg || 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${Persona.tokens.colors.borderSubtle}`,
                  boxShadow: Persona.tokens.shadows.flavorBox || `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.05),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3),
                    0 1px 4px rgba(0, 0, 0, 0.3)
                  `,
                  cursor: 'default'
                }}
                ref={flavorContainerRef}
              >
                {/* Carousel Content */}

                {/* Persona Icon - Alchemy Symbol (Transmutation Circle) */}
                {/* Persona Icon - Dynamic based on active persona */}
                <div className="absolute top-0 left-0 text-white opacity-70 pointer-events-none z-10">
                  {PERSONA_ICONS[currentPersonaName || 'default'] || PERSONA_ICONS['default']}
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

          {/* --- FLAVOR INDICATORS --- */}
          {/* Positioned OUTSIDE the flex boxes, at the absolute bottom edge of the card back component */}
          {currentFlavorContents.length > 1 && (
            <div className="absolute bottom-[12px] left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none z-50">
              {currentFlavorContents.map((item, idx) => {
                const isActive = idx === flavorIndex;
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
                      ${isActive ? 'opacity-100 scale-x-125' : 'opacity-20 hover:opacity-50'}
                    `}
                    style={{ backgroundColor: 'white' }}
                    title={item.type}
                  />
                );
              })}
            </div>
          )}

          {/* Multi-definition selection UI deferred to future */}

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
        </div>
      </div>
    </>
  );
});

// ============================================================================
// MEMOIZED SUB-COMPONENTS
// ============================================================================

const MemoizedCardVisual = React.memo(({
  isCompact,
  visualPayload,
  isActive,
  fallbackWord,
  Persona,
  bgParallaxX,
  bgParallaxY,
  fgParallaxX,
  fgParallaxY,
  durability
}: any) => {
  // Replace motion.div parallax layers with plain div + direct style updates.
  // This removes 3 GPU compositing layers per card (will-change:transform promoted layers).
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
      style={{ boxShadow: isCompact ? 'none' : Persona.tokens.shadows.innerDepth }}
    >
      <div ref={bgRef} className="absolute inset-[-20%]"
        style={{
          background: Persona.tokens.colors.bgDeep,
          opacity: 0.8
        }}
      >
        <div className="w-full h-full opacity-[0.15]"
          style={{
            backgroundImage: Persona.definitions.assets.deepPattern || Persona.definitions.assets.backPattern,
            backgroundSize: "120px 60px"
          }}
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
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${durability}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full opacity-90"
              style={{
                background: `linear-gradient(to right, ${Persona.tokens.colors.goldMetallic}, ${Persona.tokens.colors.goldBright}, ${Persona.tokens.colors.goldMetallic})`,
                boxShadow: `0 0 10px ${Persona.tokens.colors.goldMetallic}`
              }}
            />
          </div>
        )
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isCompact === nextProps.isCompact &&
    prevProps.visualPayload === nextProps.visualPayload &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.fallbackWord === nextProps.fallbackWord &&
    prevProps.durability === nextProps.durability &&
    prevProps.bgParallaxX === nextProps.bgParallaxX &&
    prevProps.bgParallaxY === nextProps.bgParallaxY
  );
});

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
        willChange: "opacity, transform" // GPU Hint
      }}
    >
      {/* Static SVG Icon */}
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
