import React, { useState, useEffect } from 'react';
import { useTransform, useMotionTemplate, useMotionValue } from 'motion/react';
import { motion } from 'motion/react';
import { DefaultCardPersona as DefaultPersona } from '@/app/components/persona/default/Card.persona.default';
import { AlchemyVisual } from '@/app/components/AlchemyVisual';
import { useWheelStopPropagation } from '@/app/hooks/useWheelStopPropagation';
import type { LanguageDisplayData, SenseInfo, VisualData } from '@/types/CardEntity';
import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';

// ============================================================================
// HELPER FUNCTIONS (Typography)
// ============================================================================

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

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CardVisualProps {
  /**
   * Display data for current language
   * Pre-extracted from CardEntity.displayData[currentLanguage]
   */
  displayData: LanguageDisplayData;

  /**
   * Semantic metadata
   * Contains ontology, frequency, durability, personas, etc.
   */
  senseInfo: SenseInfo;

  /**
   * Visual asset data (SVG payload + loading status)
   * Supports async loading with Persona-specific loading states
   */
  visual: VisualData;

  /**
   * System language for UI elements
   */
  systemLanguage: Language;

  /**
   * Current display language
   */
  currentLanguage: Language;

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
}

export const CardVisual: React.FC<CardVisualProps> = ({
  displayData,
  senseInfo,
  visual,
  systemLanguage,
  currentLanguage,
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
}) => {
  // ========== Extract Display Data ==========
  const { word, pronunciation, pos, level, definition, flavorText } = displayData;
  const { durability } = senseInfo;
  // 1. Priority: External persona > Default (Alchemy)
  const Persona = persona || DefaultPersona;
  const backFaceRef = useWheelStopPropagation();

  // --- Glare Effect Calculation (from Persona) ---
  // CRITICAL: Always call hooks unconditionally per React Rules of Hooks

  // Use fallback MotionValues if not provided
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
  // Convert opacity MotionValues to pointer-events strings
  // Use useState to track the current opacity and derive pointer-events
  const [currentFrontOpacity, setCurrentFrontOpacity] = useState(1);
  const [currentBackOpacity, setCurrentBackOpacity] = useState(0);

  useEffect(() => {
    if (typeof frontOpacity === 'object' && frontOpacity.get) {
      const unsubscribe = frontOpacity.on('change', setCurrentFrontOpacity);
      setCurrentFrontOpacity(frontOpacity.get());
      return unsubscribe;
    } else {
      setCurrentFrontOpacity(frontOpacity);
    }
  }, [frontOpacity]);

  useEffect(() => {
    if (typeof backOpacity === 'object' && backOpacity.get) {
      const unsubscribe = backOpacity.on('change', setCurrentBackOpacity);
      setCurrentBackOpacity(backOpacity.get());
      return unsubscribe;
    } else {
      setCurrentBackOpacity(backOpacity);
    }
  }, [backOpacity]);

  // Determine pointer-events based on which face is more visible
  const frontPointerEvents = currentFrontOpacity > 0.5 ? 'auto' : 'none';
  const backPointerEvents = currentBackOpacity > 0.5 ? 'auto' : 'none';

  // ========== Layout Configuration ==========
  const isCompact = layoutMode === 'compact';

  // ========== Display Text Preparation ==========
  // Note: pronunciation may be undefined for some words
  const displayPhonetic = pronunciation ?? '';

  // --- Sub-Components ---

  const renderHeader = () => (
    <>
      {!isCompact && !Persona.visuals.ScrapLabel && (
        <div className="absolute inset-x-6 bottom-2 top-3 bg-black/20 border-b border-t rounded-sm -z-10 opacity-60"
          style={{
            borderColor: Persona.tokens.colors.borderSubtle,
            backgroundColor: Persona.tokens.colors.bgPanel
          }}
        />
      )}

      <div className={`flex flex-col items-center justify-center ${isCompact ? '' : 'w-full'} relative z-10 ${isCompact ? '' : '-mt-1'}`}>
        {!isCompact && !Persona.visuals.ScrapLabel && (
          <div className="absolute -top-4 w-[1px] h-5 bg-gradient-to-b from-transparent" style={{ '--tw-gradient-to': Persona.definitions.colors.goldBase } as any} />
        )}

        {Persona.visuals.ScrapLabel ? (
          <Persona.visuals.ScrapLabel>
            {level}
          </Persona.visuals.ScrapLabel>
        ) : (
          <span className={`${isCompact ? 'text-2xl drop-shadow-[0_2px_10px_rgba(240,208,130,0.4)]' : 'text-xl drop-shadow-[0_0_12px_rgba(240,208,130,0.4)]'} font-bold tracking-[0.2em]`}
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

  const renderVisual = () => (
    <motion.div
      className="relative w-full h-full rounded-sm overflow-hidden flex items-center justify-center"
      style={{ boxShadow: isCompact ? 'none' : Persona.tokens.shadows.innerDepth }}
    >
      <motion.div className="absolute inset-[-20%]"
        style={{
          x: bgParallaxX,
          y: bgParallaxY,
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
      </motion.div>

      <Persona.visuals.Frame />

      <motion.div
        className={`absolute inset-0 flex items-center justify-center z-40 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] 
            ${isCompact ? 'scale-[1.0] opacity-30 mix-blend-screen' : ''}`}
        style={{ x: fgParallaxX, y: fgParallaxY }}
      >
        <AlchemyVisual element={word} isActive={isActive} />
      </motion.div>

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
    </motion.div>
  );

  const renderText = () => (
    <div className="flex flex-col items-center justify-end w-full h-full pb-3 relative z-40">
      {displayPhonetic && !isCompact && (
        <div className="mb-1 w-full text-center">
          <span className="font-serif text-[10px] tracking-[0.2em] mr-[-0.2em] opacity-50 mix-blend-plus-lighter inline-block"
            style={{ color: Persona.tokens.colors.goldBright || Persona.tokens.colors.textHighlight }}>
            {displayPhonetic}
          </span>
        </div>
      )}

      <div className={`flex ${isCompact ? 'flex-col' : 'items-baseline'} justify-center mb-1 w-full text-center relative z-10`}>
        {!Persona.visuals.ScrapLabel && !isCompact && (
          <span className="font-serif italic text-xs tracking-wider whitespace-nowrap mr-3 opacity-0 select-none pointer-events-none"
            style={{ fontFamily: Persona.tokens.typography.body.family }}>
            {pos}
          </span>
        )}

        {Persona.visuals.ScrapLabel && (
          <div className="mr-2 mb-1">
            <Persona.visuals.ScrapLabel color={Persona.definitions.colors.crayonBlue || '#5BC0DE'}>
              {pos}
            </Persona.visuals.ScrapLabel>
          </div>
        )}

        <h2 className={`leading-none capitalize ${getTitleClass(word, isCompact)}`}
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

        {!Persona.visuals.ScrapLabel && !isCompact && (
          <span className="font-serif italic text-xs opacity-60 font-medium tracking-wider whitespace-nowrap ml-3"
            style={{
              fontFamily: Persona.tokens.typography.body.family,
              color: Persona.tokens.colors.goldMetallic
            }}>
            {pos}
          </span>
        )}

        {!Persona.visuals.ScrapLabel && isCompact && (
          <span className="font-serif italic tracking-wider whitespace-nowrap mt-2 text-base opacity-90 font-bold"
            style={{
              fontFamily: Persona.tokens.typography.body.family,
              color: Persona.tokens.colors.goldMetallic
            }}>
            {pos}
          </span>
        )}
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

      <motion.div
        className="absolute -inset-[3px] rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: Persona.definitions.gradients?.goldMetallic || Persona.tokens.colors.goldMetallic,
          zIndex: -1,
          filter: 'blur(5px)'
        }}
      />

      <motion.div className="relative w-full h-full" style={{ scaleX: flipScaleX }}>

        {/* ================= FRONT FACE ================= */}
        <motion.div
          className="absolute inset-0 overflow-hidden flex flex-col isolate antialiased"
          style={{
            opacity: frontOpacity,
            pointerEvents: frontPointerEvents,
            borderRadius: Persona.tokens.layout.radius,
            background: Persona.tokens.colors.bgFront,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          <Persona.visuals.Background />
          {Persona.visuals.TextureOverlay && <Persona.visuals.TextureOverlay />}

          <div className="absolute inset-0 pointer-events-none z-50 border-[2px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderOuter || 'transparent' }} />
          <div className="absolute inset-[4px] pointer-events-none z-50 border-[1px] rounded-[inherit]" style={{ borderColor: Persona.tokens.colors.borderInner || 'transparent' }} />
          <Persona.visuals.Corners />

          {/* --- LAYOUT SWITCHER --- */}
          {isCompact ? (
            <div className="relative z-30 w-full h-full flex flex-col px-4 pt-4 pb-3">
              <div className="flex justify-center items-center w-full relative z-30 mb-0 shrink-0 h-[15%]">
                {renderHeader()}
              </div>
              <div className="flex-1 relative flex items-center justify-center w-full min-h-0">
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-60 mix-blend-screen scale-110" style={{ perspective: '1000px' }}>
                  {renderVisual()}
                </div>
                <div className="relative z-40 flex flex-col items-center justify-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] w-full">
                  {renderText()}
                </div>
              </div>
              {Persona.visuals.DurabilityBar ? (
                <div className="w-full relative z-50 mt-auto shrink-0 flex justify-center transform scale-y-[3] origin-bottom">
                  <Persona.visuals.DurabilityBar progress={durability} />
                </div>
              ) : (
                <div className="w-full h-[6px] relative z-50 mt-auto shrink-0 bg-black/40 rounded-full overflow-hidden border flex justify-center"
                  style={{ borderColor: `${Persona.tokens.colors.goldMetallic}4D` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${durability}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full opacity-90"
                    style={{
                      background: `linear-gradient(to right, ${Persona.tokens.colors.goldMetallic}, ${Persona.tokens.colors.goldBright || '#fff'}, ${Persona.tokens.colors.goldMetallic})`,
                      boxShadow: `0 0 8px ${Persona.tokens.colors.goldMetallic}`
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`relative z-30 w-full h-[15%] flex items-center ${isCompact ? 'justify-between' : 'justify-center'} px-5 pt-3`}>
                {renderHeader()}
              </div>
              <div className="relative z-20 w-full h-[55%] flex items-center justify-center px-4 pt-0 pb-0 -translate-y-2" style={{ perspective: '1000px' }}>
                {renderVisual()}
                <div className="absolute -bottom-5 w-full px-12 opacity-80">
                  <Persona.visuals.Divider />
                </div>
              </div>
              <div className="relative z-30 h-[30%] flex flex-col items-center justify-start px-4 pt-0 text-center">
                {renderText()}
              </div>
            </>
          )}

          <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10 mix-blend-overlay"
            style={{ backgroundImage: Persona.definitions.assets.noiseTexture || 'none' }}
          />
          {/* Glare effect - skin-configurable via persona */}
          <motion.div style={{ background: glareBackground, opacity: targetGlareOpacity }} className="absolute inset-0 z-40 pointer-events-none mix-blend-plus-lighter" />
        </motion.div>

        {/* ================= BACK FACE ================= */}
        <motion.div
          ref={backFaceRef}
          className="absolute inset-0 overflow-hidden flex flex-col items-stretch p-5 isolate antialiased back-face-content"
          style={{
            opacity: backOpacity,
            pointerEvents: backPointerEvents,
            borderRadius: Persona.tokens.layout.radius,
            backgroundColor: Persona.tokens.colors.bgBack,
            border: `2px solid ${Persona.tokens.colors.goldMetallic || Persona.definitions.colors.goldBase}`,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
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

          <div className={`relative flex flex-col w-full h-full z-10 custom-scrollbar-${Persona.identity.name}`}>

            {/* --- HEADER SECTION --- */}
            <div className="flex items-baseline mb-3 px-1 shrink-0">
              <h3 className="text-3xl font-bold font-serif mr-3 leading-none"
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
                className="flex-[3] rounded-md py-4 pl-4 pr-0.5 cursor-pointer transition-all duration-300 relative group flex flex-col min-h-0 overflow-hidden"
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
                onMouseDown={(e) => {
                  e.currentTarget.style.boxShadow = `
                    inset 0 1px 0 0 rgba(240, 208, 130, 0.3),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(212, 175, 55, 0.5),
                    0 0 15px rgba(240, 208, 130, 0.4),
                    0 2px 8px rgba(0, 0, 0, 0.4)
                  `;
                }}
              >
                {/* Header with alchemy styling - shrink for refinement */}
                <div className="text-[8px] uppercase font-serif tracking-[0.1em] mb-2 select-none flex items-center gap-1.5 pr-3.5"
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
                    className="text-base font-sans leading-relaxed flex-1 select-none pr-2 indent-3"
                    style={{
                      color: Persona.tokens.colors.textPrimary,
                      fontFamily: Persona.tokens.typography.body.family,
                      lineHeight: '1.65',
                      letterSpacing: '0.01em'
                    }}
                  >
                    {definition}
                  </p>
                </div>
              </div>

              {/* --- FLAVOR TEXT SECTION --- */}
              {/* Alchemy-themed display box - subtle, complementary to definition */}
              {/* Reduced height: flex-1 vs flex-[3] creates the requested ratio shift */}
              <div
                className="flex-1 rounded-md py-1.5 px-2 flex flex-col min-h-0"
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
              >
                <div className="overflow-hidden w-full h-full flex flex-col pr-1"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {/* Alchemy Styled Flavor Text - Dynamic Typography */}
                  {(() => {
                    const text = flavorText.text;
                    const len = text.length;

                    // Intelligent typography adjustment logic - stricter sizing
                    let fontSize = 'text-sm';
                    let fontWeight = 'font-normal';
                    let letterSpacing = '0.02em';
                    let lineHeight = '1.6';

                    if (len < 30) {
                      // Now Base (Standard)
                      fontSize = 'text-base';
                      fontWeight = 'font-medium';
                      letterSpacing = '0.03em';
                      lineHeight = '1.5';
                    } else if (len < 80) {
                      // Small
                      fontSize = 'text-sm';
                      fontWeight = 'font-normal';
                      letterSpacing = '0.02em';
                      lineHeight = '1.35';
                    } else if (len < 100) {
                      //  XS
                      fontSize = 'text-xs';
                      fontWeight = 'font-normal';
                      letterSpacing = '0.01em';
                      lineHeight = '1.2';
                    } else {
                      // Tiny
                      fontSize = 'text-[10px]';
                      fontWeight = 'font-light';
                      letterSpacing = '0.01em';
                      lineHeight = '1.10';
                    }

                    return (
                      <p
                        className={`${fontSize} ${fontWeight} font-serif italic text-center w-full px-2 my-auto transition-all duration-300`}
                        style={{
                          fontFamily: Persona.tokens.typography.label.family,
                          opacity: 0.9,
                          lineHeight: lineHeight,
                          letterSpacing: letterSpacing,
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          backgroundImage: Persona.definitions.gradients.goldText || `linear-gradient(to bottom, ${Persona.tokens.colors.goldBright}, ${Persona.tokens.colors.goldDeep})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        "{text}"
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-definition selection UI deferred to future */}
        </motion.div>
      </motion.div>
    </>
  );
};
