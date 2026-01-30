import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import { X, Box, Sparkles, ArrowDownAZ, ArrowUpAZ, SlidersHorizontal } from 'lucide-react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { DefaultInterfacePersona as InterfacePersona } from '@/app/components/persona/default/Interface.persona.default';
import { CardVisual } from '@/app/components/CardVisual';
import { PropVisual } from '@/app/components/PropVisual';

export interface StoredCard {
  id: string;
  title: string;
  image: string;
  type?: 'CARD' | 'ITEM';
  pos?: string;
  difficulty?: number;
  durability?: number;
  count?: number;
}

interface DeckRepositoryProps {
  isOpen: boolean;
  onClose: () => void;
  items: StoredCard[];
  propItems?: StoredCard[];
  onDropToCanvas?: (item: StoredCard, offset: { x: number, y: number }) => void;
  systemLanguage?: string;
  learningLanguage?: string;
}

type SortDir = 'asc' | 'desc';
type CardSortKey = 'title' | 'pos' | 'difficulty' | 'durability';
type PropSortKey = 'title' | 'count';

// Localization Helper
const getLoc = (key: string, lang: string = 'ENGLISH') => {
  const isZh = lang === '简体中文';
  const dict: Record<string, { en: string; zh: string }> = {
    'CARDS': { en: 'CARDS', zh: '卡组' },
    'PROPS': { en: 'PROPS', zh: '道具' },
    'By Name': { en: 'By Name', zh: '按名称' },
    'By Type': { en: 'By Type', zh: '按类型' },
    'By Level': { en: 'By Level', zh: '按等级' },
    'By Durability': { en: 'By Durability', zh: '按耐久' },
    'By Quantity': { en: 'By Quantity', zh: '按数量' },
    'Empty Vessel': { en: 'Empty Vessel', zh: '空容器' },
  };
  return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

export const DeckRepository: React.FC<DeckRepositoryProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  propItems = [],
  systemLanguage = 'ENGLISH',
  learningLanguage = 'ENGLISH'
}) => {
  const [activeTab, setActiveTab] = useState<'CARDS' | 'ITEMS'>('CARDS');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sorting State
  const [cardSortKey, setCardSortKey] = useState<CardSortKey>('title');
  const [cardSortDir, setCardSortDir] = useState<SortDir>('asc');
  
  const [propSortKey, setPropSortKey] = useState<PropSortKey>('title');
  const [propSortDir, setPropSortDir] = useState<SortDir>('asc');

  // Sort Logic
  const sortedItems = useMemo(() => {
    if (activeTab === 'CARDS') {
       const list = [...items];
       list.sort((a, b) => {
          let valA: any = a[cardSortKey];
          let valB: any = b[cardSortKey];

          // Handle undefined defaults
          if (valA === undefined) valA = cardSortKey === 'title' ? '' : 0;
          if (valB === undefined) valB = cardSortKey === 'title' ? '' : 0;
          
          if (typeof valA === 'string') return valA.localeCompare(valB as string);
          return (valA as number) - (valB as number);
       });
       if (cardSortDir === 'desc') list.reverse();
       return list;
    } else {
       const list = [...propItems];
       list.sort((a, b) => {
          let valA: any = a[propSortKey];
          let valB: any = b[propSortKey];

          if (valA === undefined) valA = propSortKey === 'title' ? '' : 0;
          if (valB === undefined) valB = propSortKey === 'title' ? '' : 0;

          if (typeof valA === 'string') return valA.localeCompare(valB as string);
          return (valA as number) - (valB as number);
       });
       if (propSortDir === 'desc') list.reverse();
       return list;
    }
  }, [items, propItems, activeTab, cardSortKey, cardSortDir, propSortKey, propSortDir]);

  // Horizontal scroll via vertical mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const toggleSortDir = () => {
    if (activeTab === 'CARDS') setCardSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else setPropSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 z-40"
          style={{ 
            width: InterfacePersona.tokens.layout.menuWidth, 
            height: InterfacePersona.tokens.layout.menuHeight,
            fontFamily: InterfacePersona.tokens.typography.label.family
          }}
        >
            {/* Glass Panel */}
            <div className="w-full h-full backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col relative"
                 style={{ 
                   backgroundColor: InterfacePersona.tokens.colors.bgGlass,
                   borderColor: InterfacePersona.tokens.colors.borderBase,
                   boxShadow: InterfacePersona.tokens.shadows.panel
                 }}>
                
                {/* Header / Tabs - Dark Void Metal with Alchemy Array */}
                <div className="relative shrink-0 flex items-center justify-between px-6 z-20 overflow-hidden border-b shadow-2xl"
                     style={{
                        height: InterfacePersona.tokens.layout.tabHeight,
                        backgroundColor: InterfacePersona.tokens.colors.bgDeep,
                        borderColor: InterfacePersona.tokens.colors.borderBase
                     }}>
                    
                    <InterfacePersona.visuals.BackgroundVisuals />
                    <InterfacePersona.visuals.AlchemyGeometricOverlay />
                    <InterfacePersona.visuals.SymmetryLines />
                    
                    {/* Horizontal Guides */}
                    <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: InterfacePersona.tokens.colors.borderFaint }} />
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ backgroundColor: InterfacePersona.tokens.colors.borderFaint }} />


                    {/* --- CONTENT LAYER --- */}
                    <div className="relative z-10 flex items-center justify-between w-full h-full">
                    
                        {/* LEFT: Tabs */}
                        <div className="flex items-center gap-6">
                            <TabButton 
                                active={activeTab === 'CARDS'} 
                                onClick={() => setActiveTab('CARDS')} 
                                label={getLoc('CARDS', systemLanguage)} 
                                icon={Box}
                            />
                            
                            {/* Glowing Divider */}
                            <div className="w-[1px] h-6 bg-gradient-to-b from-transparent to-transparent"
                                 style={{ 
                                     backgroundImage: `linear-gradient(to bottom, transparent, ${InterfacePersona.tokens.colors.borderBase}, transparent)` 
                                 }} />
                            
                            <TabButton 
                                active={activeTab === 'ITEMS'} 
                                onClick={() => setActiveTab('ITEMS')} 
                                label={getLoc('PROPS', systemLanguage)} 
                                icon={Sparkles}
                            />
                        </div>

                        {/* RIGHT: Controls */}
                        <div className="flex items-center gap-4">
                            
                            {/* Sort Controls - Dark Glass / Metal */}
                            <div className="flex items-center gap-0 backdrop-blur-sm rounded-sm border overflow-hidden group/sort transition-colors"
                                 style={{
                                     backgroundColor: 'rgba(0,0,0,0.4)',
                                     borderColor: InterfacePersona.tokens.colors.borderFaint,
                                     boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                 }}>
                                <div className="relative flex items-center gap-2 px-3 py-1.5 transition-colors border-r"
                                     style={{
                                         borderColor: InterfacePersona.tokens.colors.borderFaint
                                     }}>
                                  <SlidersHorizontal size={12} className="group-hover/sort:text-[#D4AF37] transition-colors" style={{ color: InterfacePersona.tokens.colors.textLabel }} />
                                  <select 
                                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border-none p-0 w-24 appearance-none relative z-10 transition-colors"
                                    value={activeTab === 'CARDS' ? cardSortKey : propSortKey}
                                    onChange={(e) => activeTab === 'CARDS' ? setCardSortKey(e.target.value as CardSortKey) : setPropSortKey(e.target.value as PropSortKey)}
                                    style={{ 
                                        fontFamily: InterfacePersona.tokens.typography.label.family,
                                        color: InterfacePersona.tokens.colors.textLabel
                                    }}
                                  >
                                     {activeTab === 'CARDS' ? (
                                        <>
                                          <option className="bg-[#1a1a1a]" value="title">{getLoc('By Name', systemLanguage)}</option>
                                          <option className="bg-[#1a1a1a]" value="pos">{getLoc('By Type', systemLanguage)}</option>
                                          <option className="bg-[#1a1a1a]" value="difficulty">{getLoc('By Level', systemLanguage)}</option>
                                          <option className="bg-[#1a1a1a]" value="durability">{getLoc('By Durability', systemLanguage)}</option>
                                        </>
                                     ) : (
                                        <>
                                          <option className="bg-[#1a1a1a]" value="title">{getLoc('By Name', systemLanguage)}</option>
                                          <option className="bg-[#1a1a1a]" value="count">{getLoc('By Quantity', systemLanguage)}</option>
                                        </>
                                     )}
                                  </select>
                                </div>
                                
                                <button 
                                   onClick={toggleSortDir}
                                   className="w-8 h-full flex items-center justify-center transition-all"
                                   title="Toggle Order"
                                   style={{ color: InterfacePersona.tokens.colors.textLabel }}
                                >
                                   {(activeTab === 'CARDS' ? cardSortDir : propSortDir) === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
                                </button>
                            </div>

                            {/* Close Button - Glowing Rune */}
                            <button 
                                onClick={onClose} 
                                className="group flex items-center justify-center w-8 h-8 rounded-full border bg-[#0a0a0a] hover:border-[#D4AF37] hover:shadow-[0_0_10px_#D4AF37] active:scale-95 transition-all"
                                style={{ borderColor: InterfacePersona.tokens.colors.borderBase }}
                            >
                                <X size={14} className="group-hover:text-[#D4AF37] transition-colors" style={{ color: InterfacePersona.tokens.colors.textLabel }} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scroll Area - One Row Horizontal Scroll */}
                <div 
                    ref={scrollContainerRef}
                    onWheel={handleWheel}
                    className="flex-1 p-6 overflow-x-auto overflow-y-hidden custom-scrollbar relative z-10 
                               [&::-webkit-scrollbar]:h-2
                               [&::-webkit-scrollbar-track]:bg-[#0a0a0a] 
                               [&::-webkit-scrollbar-track]:border-t 
                               [&::-webkit-scrollbar-track]:border-[#D4AF37]/10
                               [&::-webkit-scrollbar-thumb]:bg-gradient-to-r 
                               [&::-webkit-scrollbar-thumb]:from-[#D4AF37]/40 
                               [&::-webkit-scrollbar-thumb]:via-[#F0D082]/60 
                               [&::-webkit-scrollbar-thumb]:to-[#D4AF37]/40 
                               [&::-webkit-scrollbar-thumb]:rounded-full 
                               [&::-webkit-scrollbar-thumb]:border 
                               [&::-webkit-scrollbar-thumb]:border-[#000]/50
                               hover:[&::-webkit-scrollbar-thumb]:bg-[#D4AF37]"
                >
                    {/* Background Textures Layer */}
                    <div className="fixed inset-0 pointer-events-none z-[-1] opacity-10 mix-blend-screen"
                         style={{ 
                           backgroundImage: CardPersona.definitions.assets.backPattern,
                           backgroundSize: "200px 100px",
                           backgroundRepeat: "repeat"
                         }} 
                    />
                    <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20"
                         style={{ 
                            background: InterfacePersona.definitions.gradients.goldRadialSubtle
                         }}
                    />
                    
                    {sortedItems.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                             style={{ color: InterfacePersona.tokens.colors.borderBase }}>
                            <div className="w-12 h-12 rounded-full border flex items-center justify-center"
                                 style={{ borderColor: InterfacePersona.tokens.colors.borderFaint }}>
                                <Box className="opacity-20" />
                            </div>
                            <span className="text-xs tracking-[0.2em] uppercase font-serif">{getLoc('Empty Vessel', systemLanguage)}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6 w-max h-full px-4">
                            {sortedItems.map(item => (
                                activeTab === 'ITEMS' 
                                ? <RepoItem key={item.id} item={item} />
                                : <RepoCard 
                                    key={item.id} 
                                    item={item} 
                                    systemLanguage={systemLanguage} 
                                    learningLanguage={learningLanguage} 
                                  />
                            ))}
                        </div>
                    )}
                </div>

                <InterfacePersona.visuals.DecorativeCorners />
                
                {/* Inner Bevel */}
                <div className="absolute inset-0 border rounded-2xl pointer-events-none" style={{ borderColor: InterfacePersona.tokens.colors.borderFaint }} />
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: any }> = ({ active, onClick, label, icon: Icon }) => (
    <button 
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-1.5 rounded-sm transition-all text-[10px] tracking-[0.2em] font-bold relative overflow-hidden group
        `}
        style={{ 
            fontFamily: InterfacePersona.tokens.typography.label.family,
            color: active ? '#0a0a0a' : InterfacePersona.tokens.colors.borderBase,
            backgroundColor: active ? InterfacePersona.tokens.colors.highlight : 'transparent',
            borderColor: active ? InterfacePersona.tokens.colors.highlight : InterfacePersona.tokens.colors.borderFaint,
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: active ? InterfacePersona.tokens.shadows.glowGoldSoft : 'none'
        }}
    >
        <Icon size={12} className={active ? "text-black" : ""} />
        {label}
        
        {/* Shine effect on hover */}
        {!active && <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
    </button>
);

// --- PROP ITEM COMPONENT ---
const RepoItem: React.FC<{ item: StoredCard }> = ({ item }) => {
    // Props are smaller icons
    const SIZE = 100;
    const [isHovered, setIsHovered] = useState(false);

    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'ITEM', // Distinct type from CARD
        item: { 
            ...item, 
            type: 'ITEM',
            sourceWidth: SIZE,
            sourceHeight: SIZE
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    return (
        <div 
            ref={drag}
            className={`flex-shrink-0 cursor-grab active:cursor-grabbing relative transition-opacity ${isDragging ? 'opacity-20' : 'opacity-100'}`}
            style={{ width: SIZE, height: SIZE }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
             <PropVisual 
                title={item.title} 
                size={SIZE} 
                isHovered={isHovered} 
             />
             
             {/* Quantity Badge */}
             {item.count !== undefined && (
                <div className="absolute -top-1 -right-1 text-black text-[10px] font-bold px-1.5 rounded-full border border-black shadow-lg z-20"
                     style={{ backgroundColor: InterfacePersona.tokens.colors.highlight }}>
                    x{item.count}
                </div>
             )}
        </div>
    );
};

// --- CARD COMPONENT ---
interface RepoCardProps {
    item: StoredCard;
    systemLanguage: string;
    learningLanguage: string;
}

const RepoCard: React.FC<RepoCardProps> = ({ item, systemLanguage, learningLanguage }) => {
    // Target Scale: 1/4 area means 0.5 dimensions.
    const SCALE = 0.5;
    const ORIGINAL_WIDTH = 250;
    const ORIGINAL_HEIGHT = 350;

    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'CARD', 
        item: { 
            ...item, 
            type: 'CARD',
            sourceWidth: ORIGINAL_WIDTH * SCALE,
            sourceHeight: ORIGINAL_HEIGHT * SCALE
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    // Metadata logic
    const difficultyLevel = item.difficulty ? `A${item.difficulty}` : "A1";
    const partOfSpeech = item.pos || "n.";
    const durability = item.durability || 100;

    return (
        <div 
            ref={drag}
            className={`flex-shrink-0 cursor-grab active:cursor-grabbing relative transition-opacity ${isDragging ? 'opacity-20' : 'opacity-100'}`}
            style={{ width: ORIGINAL_WIDTH * SCALE, height: ORIGINAL_HEIGHT * SCALE }}
        >
             <div 
                className="origin-top-left relative rounded-[11px] overflow-hidden"
                style={{ 
                    width: ORIGINAL_WIDTH, 
                    height: ORIGINAL_HEIGHT, 
                    transform: `scale(${SCALE})`,
                    boxShadow: CardPersona.tokens.shadows.base, 
                }}
             >
                 <CardVisual 
                    title={item.title}
                    difficultyLevel={difficultyLevel}
                    partOfSpeech={partOfSpeech}
                    durability={durability}
                    systemLanguage={systemLanguage}
                    learningLanguage={learningLanguage}
                    isActive={false} 
                    
                    // Static Visual State
                    flipScaleX={1}
                    frontOpacity={1}
                    backOpacity={0}
                    frontPointerEvents="auto"
                    backPointerEvents="none"
                    
                    bgParallaxX={0}
                    bgParallaxY={0}
                    fgParallaxX={0}
                    fgParallaxY={0}
                    
                    glareBackground="none"
                    targetGlareOpacity={0}
                    
                    layoutMode="compact"
                 />
                 
                 {/* Hover Overlay */}
                 <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-200 pointer-events-auto" />
             </div>
        </div>
    );
};
