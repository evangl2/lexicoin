import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DefaultCardPersona as DefaultPersona } from '@/app/components/persona/default/Card.persona.default';
import { AlchemyVisual } from '@/app/components/AlchemyVisual';

// --- Types & Data ---

export type ContentItem = { id: string; en: string; zh: string; pos?: string };
export type ElementData = {
  definitions: ContentItem[];
  flavors: ContentItem[];
};

export const ELEMENT_DATA: Record<string, ElementData> = {
  fire: {
    definitions: [
      { id: 'd1', en: "The state of burning that produces flames that send out heat and light, and might produce smoke.", zh: "燃烧产生火焰、发出热和光，并可能产生烟雾的状态。", pos: "n." },
      { id: 'd2', en: "Strong emotion, especially anger or enthusiasm.", zh: "强烈的情感，尤指愤怒或热情。", pos: "n." },
      { id: 'd3', en: "Shots from guns or other weapons.", zh: "来自枪支或其他武器的射击。", pos: "n." },
    ],
    flavors: [
      { id: 'f1', en: "It warms the soul and burns the flesh.", zh: "它温暖灵魂，亦焚烧肉体。" },
      { id: 'f2', en: "A spark is all it takes to start a catastrophe.", zh: "星星之火，足以燎原。" },
      { id: 'f3', en: "Dance with the flames, but do not touch them.", zh: "与烈焰共舞，但勿触及其锋芒。" },
    ]
  },
  water: {
    definitions: [
      { id: 'd1', en: "A clear liquid, without colour or taste, that falls from the sky as rain and is necessary for animal and plant life.", zh: "一种无色无味的透明液体，作为雨水从天而降，是动植物生命所必需的。", pos: "n." },
      { id: 'd2', en: "An area of water, such as a sea, lake, or swimming pool.", zh: "一片水域，如海洋、湖泊或游泳池。", pos: "n." },
      { id: 'd3', en: "To pour water on to plants or the soil that they are growing in.", zh: "给植物或其生长的土壤浇水。", pos: "v." },
    ],
    flavors: [
      { id: 'f1', en: "Be formless, shapeless, like water.", zh: "像水一样，无形无状。" },
      { id: 'f2', en: "The gentle drop hollows the stone not by force but by persistence.", zh: "水滴石穿，非力使然，乃恒心也。" },
      { id: 'f3', en: "Beneath the calm surface lies the deep abyss.", zh: "平静的水面下隐藏着深渊。" },
    ]
  },
  earth: {
    definitions: [
      { id: 'd1', en: "The planet third in order of distance from the Sun, between Venus and Mars; the world on which we live.", zh: "距离太阳第三远的行星，位于金星和火星之间；我们要生活的世界。", pos: "n." },
      { id: 'd2', en: "The usually brown, heavy and loose substance of which the ground is made.", zh: "构成地面的通常为棕色、沉重且松散的物质（土壤）。", pos: "n." },
      { id: 'd3', en: "The wire that connects an electrical device to the ground to make it safe.", zh: "将电气设备连接到地面的导线，以确保安全（接地线）。", pos: "n." },
    ],
    flavors: [
      { id: 'f1', en: "From dust we come, and to dust we shall return.", zh: "尘归尘，土归土。" },
      { id: 'f2', en: "Stable as the mountain, nurturing as the soil.", zh: "稳如泰山，厚德载物。" },
      { id: 'f3', en: "The roots go deep where the gold is buried.", zh: "根深之处，必有黄金。" },
    ]
  },
  air: {
    definitions: [
      { id: 'd1', en: "The mixture of gases that surrounds the earth and that we breathe.", zh: "环绕地球并供我们呼吸的混合气体。", pos: "n." },
      { id: 'd2', en: "Space or area above the ground.", zh: "地面以上的空间或区域。", pos: "n." },
      { id: 'd3', en: "To express your opinions or complaints publicly.", zh: "公开表达你的观点或不满。", pos: "v." },
    ],
    flavors: [
      { id: 'f1', en: "The wind does not break a tree that bends.", zh: "懂得弯腰的树不会被风折断。" },
      { id: 'f2', en: "Invisible, yet it moves the world.", zh: "无形无影，却推动着世界。" },
      { id: 'f3', en: "Whispers of the ancients carry on the breeze.", zh: "古人的低语随微风飘扬。" },
    ]
  },
  wind: {
    definitions: [
      { id: 'd1', en: "A natural current of air that moves fast enough for you to feel it.", zh: "一股移动速度快到你能感觉到的自然气流。", pos: "n." },
      { id: 'd2', en: "Breath or the ability to breathe.", zh: "呼吸或呼吸的能力。", pos: "n." },
      { id: 'd3', en: "Gas in the stomach or intestines that causes you discomfort.", zh: "胃或肠道中引起不适的气体。", pos: "n." },
    ],
    flavors: [
      { id: 'f1', en: "The wind of change blows straight into the face of time.", zh: "变革之风直面时间吹拂。" },
      { id: 'f2', en: "It goes where it lists, and no one knows whence it comes.", zh: "风随意思吹，无人知晓其从何而来。" },
      { id: 'f3', en: "Swift as a shadow, sharp as a blade.", zh: "疾如魅影，利如锋刃。" },
    ]
  },
  ether: {
    definitions: [
      { id: 'd1', en: "The clear sky; the upper regions of air beyond the clouds.", zh: "晴空；云层之上的高空。", pos: "n." },
      { id: 'd2', en: "A hypothetical substance supposed to occupy all space.", zh: "假想的充满所有空间的物质（以太）。", pos: "n." },
    ],
    flavors: [
      { id: 'f1', en: "The fifth element, the quintessence.", zh: "第五元素，精髓所在。" },
      { id: 'f2', en: "Beyond the material world lies the ether.", zh: "物质世界之外，即是以太。" },
    ]
  },
  void: {
    definitions: [
      { id: 'd1', en: "A completely empty space.", zh: "完全空虚的空间。", pos: "n." },
      { id: 'd2', en: "An emptying; a vacuum.", zh: "排空；真空。", pos: "n." },
    ],
    flavors: [
      { id: 'f1', en: "When you gaze long into the abyss, the abyss gazes also into you.", zh: "当你凝视深渊时，深渊也在凝视你。" },
      { id: 'f2', en: "Silence is the language of the void.", zh: "沉默是虚空的语言。" },
    ]
  }
};

export const getElementLabel = (title: string, lang: string = "ENGLISH") => {
  const t = title.toLowerCase();

  if (lang === '简体中文') {
    if (t === 'fire') return '火';
    if (t === 'water') return '水';
    if (t === 'earth') return '土';
    if (t === 'air' || t === 'wind') return '风';
    if (t === 'ether') return '以太';
    if (t === 'void') return '虚空';
  }

  // Default to Capitalized English
  return title.charAt(0).toUpperCase() + title.slice(1);
};

export const getPhonetic = (title: string, lang: string = "ENGLISH") => {
  const t = title.toLowerCase();

  if (lang === '简体中文') {
    if (t === 'fire') return 'huǒ';
    if (t === 'water') return 'shuǐ';
    if (t === 'earth') return 'tǔ';
    if (t === 'air') return 'fēng';
    if (t === 'wind') return 'fēng';
    if (t === 'ether') return 'yǐ tài';
    if (t === 'void') return 'xū kōng';
  }

  // English IPA
  if (t === 'fire') return '/ˈfaɪ.ər/';
  if (t === 'water') return '/ˈwɔː.tər/';
  if (t === 'earth') return '/ɜːθ/';
  if (t === 'air') return '/eər/';
  if (t === 'wind') return '/wɪnd/';
  if (t === 'ether') return '/ˈiː.θər/';
  if (t === 'void') return '/vɔɪd/';

  return '';
};

// --- Helper Functions ---

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

const getDefClass = (text: string) => {
  const len = text.length;
  if (len > 150) return "text-sm leading-relaxed tracking-wide";
  if (len > 80) return "text-base leading-relaxed tracking-wide";
  return "text-lg leading-relaxed tracking-wide";
};

const getFlavorClass = (text: string) => {
  const len = text.length;
  if (len > 100) return "text-[10px] leading-tight tracking-wide";
  if (len > 50) return "text-xs leading-relaxed tracking-wide";
  return "text-sm leading-relaxed tracking-wide";
};

// --- Selection Overlay Component ---
// Refactored to accept 'tokens' prop for dynamic styling
const SelectionOverlay: React.FC<{
  title: string;
  items: ContentItem[];
  selectedId: string;
  onSelect: (item: ContentItem) => void;
  onClose: () => void;
  lang: string;
  tokens: any;
}> = ({ title, items, selectedId, onSelect, onClose, lang, tokens }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute inset-0 z-50 flex flex-col text-left p-4 overflow-hidden"
      style={{ backgroundColor: tokens.colors.bgOverlay }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 border-b pb-2" style={{ borderColor: tokens.colors.borderInner }}>
        <div className="flex items-center" style={{ color: tokens.colors.textHighlight }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          <span className="font-serif tracking-widest text-xs uppercase opacity-80">SELECT</span>
        </div>
        <button
          onClick={onClose}
          className="transition-colors"
          style={{ color: tokens.colors.textSecondary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 w-full">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`
              p-3 rounded-sm border cursor-pointer transition-all duration-200 group relative
            `}
            style={{
              backgroundColor: item.id === selectedId ? tokens.colors.selectionActive : 'rgba(255,255,255,0.05)',
              borderColor: item.id === selectedId ? tokens.colors.textHighlight : 'rgba(0,0,0,0)',
              boxShadow: item.id === selectedId ? `0 0 10px ${tokens.colors.selectionActive}` : 'none'
            }}
          >
            <p className="text-xs font-serif leading-relaxed" style={{ color: tokens.colors.textPrimary }}>
              {lang === '简体中文' ? item.zh : item.en}
            </p>
            {item.id === selectedId && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45" style={{ backgroundColor: tokens.colors.textHighlight, boxShadow: `0 0 4px ${tokens.colors.textHighlight}` }} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export interface CardVisualProps {
  title: string;
  difficultyLevel?: string;
  partOfSpeech?: string;
  durability?: number;
  learningLanguage?: string;
  systemLanguage?: string;

  isActive?: boolean;
  isOver?: boolean;

  // Motion Values
  flipScaleX?: any;
  frontOpacity?: any;
  backOpacity?: any;

  bgParallaxX?: any;
  bgParallaxY?: any;
  fgParallaxX?: any;
  fgParallaxY?: any;

  glareBackground?: any;
  targetGlareOpacity?: any;

  layoutMode?: 'default' | 'compact';

  persona?: any;
}

export const CardVisual: React.FC<CardVisualProps> = ({
  title,
  difficultyLevel = "A1",
  partOfSpeech = "n.",
  durability = 100,
  learningLanguage = "ENGLISH",
  systemLanguage = "ENGLISH",
  isActive = false,
  isOver = false,

  flipScaleX = 1,
  frontOpacity = 1,
  backOpacity = 0,

  bgParallaxX = 0,
  bgParallaxY = 0,
  fgParallaxX = 0,
  fgParallaxY = 0,

  glareBackground = 'none',
  targetGlareOpacity = 0,
  layoutMode = 'default',

  persona,
}) => {
  // 1. Priority: External persona > Default (Alchemy)
  const Persona = persona || DefaultPersona;

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

  // --- Back Face State ---
  const elementKey = title.toLowerCase();
  const elementData = ELEMENT_DATA[elementKey] || ELEMENT_DATA['earth']; // Fallback

  const [selectedDefId, setSelectedDefId] = useState(elementData.definitions[0]?.id);
  const [selectedFlavorId, setSelectedFlavorId] = useState(elementData.flavors[0]?.id);
  const [activeSelectionMode, setActiveSelectionMode] = useState<'def' | 'flavor' | null>(null);

  const selectedDef = elementData.definitions.find(d => d.id === selectedDefId) || elementData.definitions[0];
  const selectedFlavor = elementData.flavors.find(f => f.id === selectedFlavorId) || elementData.flavors[0];

  const selectedDefIndex = elementData.definitions.findIndex(d => d.id === selectedDefId);
  const displayIndex = selectedDefIndex !== -1 ? selectedDefIndex + 1 : 1;
  const displayPos = selectedDef.pos || partOfSpeech;

  const isCompact = layoutMode === 'compact';

  // --- Dynamic Content Logic ---
  const displayTitle = getElementLabel(title, learningLanguage);
  const displayPhonetic = getPhonetic(title, learningLanguage);

  // Deduplication Logic: If System Lang == Learning Lang, hide System Label
  const rawSystemLabel = getElementLabel(title, systemLanguage);
  const displaySystemLabel = (systemLanguage === learningLanguage) ? null : rawSystemLabel;

  // Back Face Content
  const displayDefText = learningLanguage === '简体中文' ? selectedDef.zh : selectedDef.en;
  const displayFlavorText = learningLanguage === '简体中文' ? selectedFlavor.zh : selectedFlavor.en;

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
            {difficultyLevel}
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
            {difficultyLevel}
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
        <AlchemyVisual element={title} isActive={isActive} />
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
            {partOfSpeech}
          </span>
        )}

        {Persona.visuals.ScrapLabel && (
          <div className="mr-2 mb-1">
            <Persona.visuals.ScrapLabel color={Persona.definitions.colors.crayonBlue || '#5BC0DE'}>
              {partOfSpeech}
            </Persona.visuals.ScrapLabel>
          </div>
        )}

        <h2 className={`leading-none capitalize ${getTitleClass(displayTitle, isCompact)}`}
          style={{
            fontFamily: Persona.tokens.typography.label.family,
            backgroundImage: Persona.definitions.gradients.goldText || Persona.tokens.typography.label.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
            textAlign: 'center'
          }}>
          {displayTitle}
        </h2>

        {!Persona.visuals.ScrapLabel && !isCompact && (
          <span className="font-serif italic text-xs opacity-60 font-medium tracking-wider whitespace-nowrap ml-3"
            style={{
              fontFamily: Persona.tokens.typography.body.family,
              color: Persona.tokens.colors.goldMetallic
            }}>
            {partOfSpeech}
          </span>
        )}

        {!Persona.visuals.ScrapLabel && isCompact && (
          <span className="font-serif italic tracking-wider whitespace-nowrap mt-2 text-base opacity-90 font-bold"
            style={{
              fontFamily: Persona.tokens.typography.body.family,
              color: Persona.tokens.colors.goldMetallic
            }}>
            {partOfSpeech}
          </span>
        )}
      </div>

      {displaySystemLabel && !isCompact && (
        <>
          <div className="flex items-center justify-center w-full px-12 opacity-50 mb-1">
            <div className="h-[1px] w-full max-w-[120px]"
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${Persona.tokens.colors.goldMetallic}, transparent)` }}
            />
          </div>

          <p className="font-serif text-lg uppercase tracking-[0.15em] drop-shadow-lg opacity-95 font-bold leading-none"
            style={{
              fontFamily: Persona.tokens.typography.body.family,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              color: Persona.tokens.colors.textLight || Persona.tokens.colors.textPrimary
            }}>
            {displaySystemLabel}
          </p>
        </>
      )}
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
          <motion.div style={{ background: glareBackground, opacity: targetGlareOpacity }} className="absolute inset-0 z-40 pointer-events-none mix-blend-plus-lighter" />
        </motion.div>

        {/* ================= BACK FACE ================= */}
        <motion.div
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
            .custom-scrollbar-${Persona.identity.name}::-webkit-scrollbar-thumb,
            .back-scrollable::-webkit-scrollbar-thumb {
              background-color: ${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic};
              border-radius: 10px;
            }
          `}</style>

          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: Persona.definitions.assets.backPattern || 'none',
              backgroundSize: "120px 60px"
            }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: Persona.definitions.gradients?.backSheen || Persona.definitions.gradients.backSheen }} />
          <Persona.visuals.Corners />

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
                {displayTitle}
              </h3>
              <span className="text-lg italic font-serif opacity-80"
                style={{
                  fontFamily: Persona.tokens.typography.body.family,
                  color: Persona.tokens.colors.goldMetallic
                }}>
                {partOfSpeech}
              </span>
            </div>

            {/* --- CONTENT SECTIONS --- */}
            <div className="flex-1 flex flex-col min-h-0 gap-2">

              {/* --- DEFINITION SECTION --- */}
              <div
                className="flex-[2] overflow-y-auto back-scrollable rounded-md py-3 px-3 cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic} transparent`
                }}
                onClick={() => {
                  setActiveSelectionMode(activeSelectionMode === 'def' ? null : 'def');
                }}
              >
                <div className="flex items-start">
                  <span className="font-serif font-bold mr-2 mt-1 text-base opacity-90 shrink-0"
                    style={{
                      fontFamily: Persona.tokens.typography.label.family,
                      color: Persona.tokens.colors.goldMetallic
                    }}>
                    {displayIndex}.
                  </span>
                  <p className={`font-serif ${getDefClass(displayDefText)} transition-colors duration-300`}
                    style={{
                      color: Persona.tokens.colors.textLight || '#e5e5e5',
                      fontFamily: Persona.tokens.typography.body.family,
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}>
                    {displayDefText}
                  </p>
                </div>
              </div>

              {/* --- FLAVOR SECTION --- */}
              <div
                className="flex-[1] overflow-y-auto back-scrollable rounded-md py-3 px-3 cursor-pointer transition-all duration-300 border border-transparent hover:border-white/10"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${Persona.tokens.colors.scrollbarThumb || Persona.tokens.colors.goldMetallic} transparent`
                }}
                onClick={() => {
                  setActiveSelectionMode(activeSelectionMode === 'flavor' ? null : 'flavor');
                }}
              >
                <div className="flex items-start h-full">
                  <div className="w-0.5 self-stretch mr-2 opacity-60 shrink-0 my-1"
                    style={{
                      background: `linear-gradient(to bottom, transparent, ${Persona.tokens.colors.goldMetallic}, transparent)`
                    }}
                  />
                  <p className={`font-serif italic ${getFlavorClass(displayFlavorText)} transition-all duration-300 bg-clip-text text-transparent`}
                    style={{
                      backgroundImage: Persona.definitions.gradients.goldText || `linear-gradient(to bottom, ${Persona.tokens.colors.goldBright}, ${Persona.tokens.colors.goldDeep})`,
                      fontFamily: Persona.tokens.typography.body.family,
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                    "{displayFlavorText}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {activeSelectionMode && (
              <SelectionOverlay
                title={activeSelectionMode === 'def' ? "SELECT DEFINITION" : "SELECT FLAVOR"}
                items={activeSelectionMode === 'def' ? elementData.definitions : elementData.flavors}
                selectedId={activeSelectionMode === 'def' ? selectedDefId : selectedFlavorId}
                onSelect={(item) => {
                  if (activeSelectionMode === 'def') setSelectedDefId(item.id);
                  else setSelectedFlavorId(item.id);
                  setActiveSelectionMode(null);
                }}
                onClose={() => setActiveSelectionMode(null)}
                lang={systemLanguage}
                tokens={Persona.tokens}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
};
