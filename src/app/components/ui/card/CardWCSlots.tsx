import React from 'react';
import { MotionValue } from 'motion/react';
import { MemoizedCardVisual } from '@/app/components/ui/card/MemoizedCardVisual';
import { TieredText } from '@/app/components/ui/text/TieredText';
import { FlavorCarousel } from '@/app/components/ui/text/FlavorCarousel';
import { SelectionOverlay } from '@/app/components/ui/canvas/SelectionOverlay';
import { tts } from '@/app/utils/audio/tts';
import type { CardEntity } from '@/types/CardEntity';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

interface CardWCSlotsProps {
  learningData: any;
  systemData: any;
  currentCardData: CardEntity;
  learningLanguage: Language;
  systemLanguage: Language;
  isCompactLOD: boolean;
  isExpanded: boolean;
  isFlipped: boolean;
  isOverlayOpen: boolean;
  selectionItems: any[];
  selectedDefId: string;
  handleDefinitionClick: () => void;
  handleSelectDefinition: (item: any) => void;
  wcFlavorContainerRef: React.RefObject<HTMLDivElement>;
  wcCurrentFlavorContents: any[];
  wcFlavorIndex: number;
  wcFlavorDirection: number;
  setWcFlavorIndex: (val: number) => void;
  setWcFlavorDirection: (val: number) => void;
  isActive: boolean;
  visualFeedback: 'merge' | 'split' | null;
  bgParallaxX: MotionValue<number>;
  bgParallaxY: MotionValue<number>;
  fgParallaxX: MotionValue<number>;
  fgParallaxY: MotionValue<number>;
  backFaceMounted: boolean;
  WcScrapLabel: React.ComponentType<{ children: React.ReactNode }> | null | undefined;
  title: string;
  CardPersona: any;
}

/**
 * Helper function to generate the slots for LexiCardChrome.
 * Extracts the complex JSX structure for the Web Component path.
 */
export function getCardWCSlots({
  learningData,
  systemData,
  currentCardData,
  learningLanguage,
  systemLanguage,
  isCompactLOD,
  isExpanded,
  isFlipped,
  isOverlayOpen,
  selectionItems,
  selectedDefId,
  handleDefinitionClick,
  handleSelectDefinition,
  wcFlavorContainerRef,
  wcCurrentFlavorContents,
  wcFlavorIndex,
  wcFlavorDirection,
  setWcFlavorIndex,
  setWcFlavorDirection,
  isActive,
  visualFeedback,
  bgParallaxX,
  bgParallaxY,
  fgParallaxX,
  fgParallaxY,
  backFaceMounted,
  WcScrapLabel,
  title,
  CardPersona,
}: CardWCSlotsProps) {
  return {
    // ── Front face ──────────────────────────────────────────────
    level: WcScrapLabel ? (
      <WcScrapLabel>
        {learningData.level}
      </WcScrapLabel>
    ) : (
      <span style={{
        fontFamily: 'var(--card-font-label)',
        background: 'var(--card-gradient-label-text)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 12px rgba(240,208,130,0.4))',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        letterSpacing: '0.2em',
      }}>{learningData.level}</span>
    ),
    visual: (
      <MemoizedCardVisual
        isCompact={false}
        visualPayload={currentCardData.visual.payload}
        isActive={isActive}
        fallbackWord={title}
        Persona={CardPersona}
        bgParallaxX={bgParallaxX}
        bgParallaxY={bgParallaxY}
        fgParallaxX={fgParallaxX}
        fgParallaxY={fgParallaxY}
        durability={currentCardData.senseInfo.durability}
      />
    ),
    word: (
      <div className={`w-full flex justify-center items-center ${isCompactLOD && !isExpanded && !isFlipped ? 'h-[4rem]' : 'h-[2.75rem]'}`}>
        <TieredText
          text={title}
          tiers={isCompactLOD && !isExpanded && !isFlipped ? [
            { id: 'compact-xl', fontSize: 48, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'XL' },
            { id: 'compact-lg', fontSize: 40, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'LG' },
            { id: 'compact-md', fontSize: 32, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 1, label: 'MD' },
            { id: 'compact-sm', fontSize: 24, lineHeight: 1.1, tracking: '0.1em', weight: 700, opacity: 0.95, label: 'SM' },
          ] : CardPersona.tokens.typography.mainWordTiers}
          style={{
            fontFamily: 'var(--card-font-label)',
            backgroundImage: 'var(--card-gradient-gold-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
            textAlign: 'center',
            paddingBottom: '2px',
          }}
        />
      </div>
    ),
    pronunciation: learningData.pronunciation ? (
      <span
        className="font-serif text-[10px] tracking-[0.2em] opacity-50 mix-blend-plus-lighter inline-block"
        style={{ color: 'var(--card-color-gold-bright)' }}
      >
        {learningData.pronunciation}
      </span>
    ) : null,
    systemWord: learningLanguage !== systemLanguage ? (
      <span
        style={{
          fontFamily: 'var(--card-font-label)',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: '1',
          minWidth: '64px',
          height: '18px',
          paddingLeft: '10px',
          paddingRight: '10px',
          marginTop: '6px',
          borderRadius: '2px',
          background: 'linear-gradient(180deg, rgba(205,168,72,0.82) 0%, rgba(100,72,18,0.96) 38%, rgba(88,62,14,0.98) 62%, rgba(190,150,62,0.82) 100%)',
          border: '1px solid rgba(10,7,2,0.55)',
          boxShadow: [
            '0 1px 3px rgba(0,0,0,0.55)',
            'inset 0 1px 0 rgba(250,215,100,0.55)',
            'inset 0 -1px 0 rgba(0,0,0,0.65)',
          ].join(','),
          color: '#faeea0',
          textShadow: '0 1px 3px rgba(0,0,0,0.95)',
        }}
      >
        {systemData.word}
      </span>
    ) : null,

    // ── Back face (lazy-mounted) ─────────────────────────────────
    ...(backFaceMounted ? {
      ontology: currentCardData.senseInfo.ontology,

      wordBack: (
        <div className="w-full flex items-center h-[2.75rem] mr-3">
          <TieredText
            text={title}
            tiers={CardPersona.tokens.typography.mainWordTiers}
            style={{
              fontFamily: 'var(--card-font-label)',
              backgroundImage: 'var(--card-gradient-gold-text)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
              textAlign: 'left',
              paddingBottom: '2px',
            }}
          />
        </div>
      ),

      pos: (
        <span style={{
          fontSize: '1.125rem',
          fontStyle: 'italic',
          fontFamily: 'var(--card-font-body)',
          color: 'var(--card-color-gold-metallic)',
          opacity: 0.8,
        }}>
          {learningData.pos}
        </span>
      ),

      definition: (
        <div
          style={{
            flex: 1,
            borderRadius: '0.375rem',
            paddingTop: '0.375rem',
            paddingBottom: '1rem',
            paddingLeft: '1rem',
            paddingRight: '0.125rem',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            border: '2px solid var(--card-color-border-outer)',
            boxShadow: 'var(--card-shadow-def-box)',
            background: 'var(--card-gradient-def-box-overlay), var(--card-color-def-box-bg)',
            transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--card-color-gold-metallic)';
            el.style.boxShadow = 'inset 0 1px 0 0 rgba(240,208,130,0.2), inset 0 -1px 0 0 rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3), 0 2px 8px rgba(0,0,0,0.4)';
            el.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--card-color-border-outer)';
            el.style.boxShadow = 'var(--card-shadow-def-box)';
            el.style.transform = 'scale(1)';
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDefinitionClick();
          }}
        >
          <div style={{
            fontSize: '8px',
            textTransform: 'uppercase',
            fontFamily: 'var(--card-font-body)',
            letterSpacing: '0.1em',
            marginBottom: '2px',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            paddingRight: '14px',
            color: 'var(--card-color-gold-metallic)',
            opacity: 0.6,
          }}>
            <span style={{ transform: 'scale(0.9)', transformOrigin: 'left', display: 'inline-block' }}>DEFINITION</span>
            <span style={{ opacity: 0.3 }}>•</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--card-color-scrollbar-thumb) transparent',
            } as React.CSSProperties}
            onWheel={(e) => e.stopPropagation()}
          >
            <p style={{
              color: 'var(--card-color-text-primary)',
              fontFamily: 'var(--card-font-body)',
              lineHeight: 1.65,
              letterSpacing: '0.01em',
              fontSize: '1rem',
              flex: 1,
              userSelect: 'none',
              paddingRight: '2px',
              margin: 0,
            }}>
              {systemData.definition}
            </p>
          </div>
        </div>
      ),

      flavor: (
        <div
          ref={wcFlavorContainerRef}
          style={{
            flex: 1,
            borderRadius: '0.375rem',
            padding: '6px 2px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            position: 'relative',
            backgroundColor: 'var(--card-color-flavor-box-bg)',
            border: '1px solid var(--card-color-border-subtle)',
            boxShadow: 'var(--card-shadow-flavor-box)',
            cursor: 'default',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            color: 'white',
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 5 L19 18 L5 18 Z" />
              <circle cx="12" cy="13" r="2.5" fill="currentColor" fillOpacity="0.4" stroke="none" />
            </svg>
          </div>
          <FlavorCarousel
            items={wcCurrentFlavorContents}
            persona={CardPersona}
            tokens={CardPersona.tokens}
            currentIndex={wcFlavorIndex}
            direction={wcFlavorDirection}
            onNavigate={(newIndex, newDir) => {
              setWcFlavorDirection(newDir);
              setWcFlavorIndex(newIndex);
            }}
            onContentClick={() => {
              const text = wcCurrentFlavorContents[wcFlavorIndex]?.text;
              if (text) tts.speak(text, learningLanguage);
            }}
          />
        </div>
      ),

      backOverlay: (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          pointerEvents: 'none',
        }}>
          {isFlipped && wcCurrentFlavorContents.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              zIndex: 50,
              pointerEvents: 'none',
            }}>
              {wcCurrentFlavorContents.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setWcFlavorDirection(idx > wcFlavorIndex ? 1 : -1);
                    setWcFlavorIndex(idx);
                  }}
                  style={{
                    width: '12px',
                    height: '1px',
                    borderRadius: '9999px',
                    opacity: idx === wcFlavorIndex ? 1 : 0.2,
                    transform: idx === wcFlavorIndex ? 'scaleX(1.25)' : 'scaleX(1)',
                    transition: 'opacity 0.3s, transform 0.3s',
                    backgroundColor: 'white',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  title={item.type}
                />
              ))}
            </div>
          )}
          {isOverlayOpen && (
            <div style={{ pointerEvents: 'auto' }}>
              <SelectionOverlay
                items={selectionItems}
                selectedId={selectedDefId}
                onSelect={handleSelectDefinition}
                systemLang={systemLanguage}
                learningLang={learningLanguage}
                tokens={CardPersona.tokens}
              />
            </div>
          )}
        </div>
      ),
    } : {}),
  };
}
