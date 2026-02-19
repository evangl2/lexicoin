import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Box, ArrowDownAZ, ArrowUpAZ, SlidersHorizontal, Library, Hexagon, LayoutGrid, Image as ImageIcon, AlignJustify, CircuitBoard } from 'lucide-react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { DefaultInterfacePersona as InterfacePersona } from '@/app/components/persona/default/Interface.persona.default';
import { CompactCardVisual, CompactMode } from '@/app/components/ui/CompactCardVisual';
import { PropVisual } from '@/app/components/ui/PropVisual';
import { DeviceVisual } from '@/app/components/ui/DeviceVisual';
import { DeviceItem } from '@/app/hooks/logic/useDeviceManager';
import type { CardItem } from '@/app/hooks/logic/useCardManager';
import type { Language } from '@schemas/schemas/SenseEntity.schema';
import { mapLanguageCode } from '@/app/utils/localization';
import { useCardVariants } from '@/app/utils/mergeSplit/useCardVariants';
import type { CardEntity } from '@/types/CardEntity';

export interface PropItem {
    id: string;
    title: string;
    description?: string;
    image?: string;
}

interface DeckRepositoryProps {
    isOpen: boolean;
    onClose: () => void;
    items: CardItem[];
    propItems?: PropItem[];
    deviceItems?: DeviceItem[];
    onRetrieve?: (uid: string) => void;
    onRetrieveDevice?: (uid: string) => void;
    onStore?: (uid: string) => void;
    onStoreDevice?: (uid: string) => void;
    systemLanguage?: string;
    learningLanguage?: string;
    mergedVariants?: Record<string, CardEntity[]>;
}

type SortDir = 'asc' | 'desc';
type SortKey = 'word' | 'pos' | 'level' | 'durability';
type RepoTab = 'words' | 'props' | 'devices';

// Localization Helper
const getLoc = (key: string, lang: string = 'ENGLISH') => {
    const isZh = lang === '简体中文';
    const dict: Record<string, { en: string; zh: string }> = {
        'REPOSITORY': { en: 'REPOSITORY', zh: '仓库' },
        'By Name': { en: 'By Name', zh: '按名称' },
        'By Type': { en: 'By Type', zh: '按类型' },
        'By Level': { en: 'By Level', zh: '按等级' },
        'By Durability': { en: 'By Durability', zh: '按耐久' },
        'Empty Vessel': { en: 'Empty Vessel', zh: '空容器' },
        'WORDS': { en: 'WORDS', zh: '词语' },
        'PROPS': { en: 'PROPS', zh: '道具' },
        'DEVICES': { en: 'DEVICES', zh: '设备' },
        'Load More': { en: 'Load More', zh: '加载更多' },
    };
    return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

// --- SUB-COMPONENTS (Defined before main component to avoid hoisting issues) ---

const RepoModeButton: React.FC<{ isActive: boolean; onClick: () => void; icon: React.ElementType; title: string }> = ({ isActive, onClick, icon: Icon, title }) => (
    <button
        onClick={onClick}
        className={`p-1.5 rounded-md transition-all ${isActive ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        title={title}
    >
        <Icon size={14} />
    </button>
);

const EmptyState: React.FC<{ systemLanguage?: string, label?: string }> = ({ systemLanguage, label }) => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2"
        style={{ color: InterfacePersona.tokens.colors.borderBase }}>
        <div className="w-12 h-12 rounded-full border flex items-center justify-center"
            style={{ borderColor: InterfacePersona.tokens.colors.borderFaint }}>
            <Box className="opacity-20" />
        </div>
        <span className="text-xs tracking-[0.2em] uppercase font-serif">{label || getLoc('Empty Vessel', systemLanguage)}</span>
    </div>
);

interface RepoTabButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    count: number;
}

const RepoTabButton: React.FC<RepoTabButtonProps> = ({ isActive, onClick, icon: Icon, label, count }) => (
    <button
        onClick={onClick}
        className={`group relative flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all duration-300
            ${isActive ? 'bg-[#D4AF37]/10' : 'hover:bg-white/5'}
        `}
        title={label}
    >
        <div className={`absolute left-0 w-[2px] h-0 bg-[#D4AF37] transition-all duration-300 rounded-r-full
            ${isActive ? 'h-full opacity-100' : 'h-0 opacity-0'}
        `} />

        <Icon
            size={18}
            className={`transition-colors duration-300 ${isActive ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-300'}`}
        />

        {/* Count Badge */}
        {count > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                <span className="text-[8px] text-[#D4AF37] px-1 font-mono">{count}</span>
            </div>
        )}
    </button>
);

// --- DEVICE COMPONENT ---
interface RepoDeviceProps {
    item: DeviceItem;
    onRetrieve?: (uid: string) => void;
}

const RepoDevice: React.FC<RepoDeviceProps> = ({ item, onRetrieve }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'DEVICE',
        item: {
            uid: item.uid,
            title: item.name,
            type: 'DEVICE',
            sourceWidth: 100, // DeviceVisual Size
            sourceHeight: 100,
            width: 100,  // Added for App.tsx Drop Handler
            height: 100  // Added for App.tsx Drop Handler
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [item.uid, item.name]);

    React.useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    // Retrieve on click (if not dragging)
    const handleClick = () => {
        if (!isDragging && onRetrieve) {
            onRetrieve(item.uid);
        }
    };

    return (
        <div
            ref={drag}
            onClick={handleClick}
            className={`flex-shrink-0 cursor-pointer relative group ${isDragging ? 'opacity-50' : ''}`}
            title={item.name}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <DeviceVisual type={item.type} size={100} isHovered={isHovered} />
        </div>
    );
};

interface RepoPropProps {
    id: string;
    title: string;
}

const RepoProp: React.FC<RepoPropProps> = ({ id, title }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'ITEM',
        item: {
            title: title,
            type: 'ITEM',
            sourceWidth: 100,
            sourceHeight: 100
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [id, title]);

    React.useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    return (
        <div
            ref={drag}
            className={`flex-shrink-0 cursor-pointer relative group ${isDragging ? 'opacity-50' : ''}`}
            title={title}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <PropVisual
                title={title}
                size={100}
                className="group-hover:scale-105 transition-transform"
                isHovered={isHovered}
            />
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-[#D4AF37]/5 opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300 blur-xl -z-10" />
        </div>
    );
}

// --- CARD COMPONENT ---
interface RepoCardProps {
    item: CardItem;
    langCode: Language;
    mode: CompactMode;
    onRetrieve?: (uid: string) => void;
    variants?: CardEntity[];
}

const RepoCard: React.FC<RepoCardProps> = ({ item, langCode, mode, onRetrieve, variants = [] }) => {
    // Determine sizing based on mode
    let width = 125;
    let height = 175;

    if (mode === 'icon') {
        width = 80;
        height = 80;
    } else if (mode === 'word') {
        width = 140;
        height = 40;
    }

    // Use Persistent Active Variant Logic
    const { currentCardData } = useCardVariants({
        cardData: item.cardData,
        variants
    });

    const learningData = currentCardData.displayData[langCode];

    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'CARD',
        item: {
            uid: item.cardData.rawSense.uid, // Keeps Anchor UID for retrieval? Yes, retrieveCard handles it.
            width: width, // Use dynamic width
            height: height, // Use dynamic height
            sourceWidth: width,
            sourceHeight: height,
            title: learningData?.word || currentCardData.uid,
            difficulty: learningData?.level || 'A1',
            pos: learningData?.pos || 'n.',
            durability: currentCardData.senseInfo.durability,
            // Enhanced Drag Data for WYSIWYG Preview
            cardMode: mode,
            visualPayload: currentCardData.visual.payload
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [item.cardData.uid, width, height, learningData, currentCardData, mode]);

    React.useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    return (
        <div
            ref={drag}
            className={`flex-shrink-0 cursor-pointer relative group ${isDragging ? 'opacity-50' : ''}`}
            style={{ width, height }}
            title="Drag to canvas"
        >
            <div
                className="origin-top-left relative overflow-hidden transition-transform duration-200 group-hover:scale-105"
                style={{
                    width: '100%',
                    height: '100%',
                    boxShadow: mode === 'word' ? 'none' : CardPersona.tokens.shadows.base,
                    borderRadius: mode === 'word' ? '4px' : CardPersona.tokens.layout.radius,
                }}
            >
                <CompactCardVisual
                    mode={mode}
                    learningData={currentCardData.displayData[langCode]!}
                    senseInfo={currentCardData.senseInfo}
                    visual={currentCardData.visual}
                    persona={CardPersona}
                    isActive={false}
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-200 pointer-events-auto rounded-[inherit]" />
            </div>
        </div>
    );
};

export const DeckRepository: React.FC<DeckRepositoryProps> = ({
    isOpen,
    onClose,
    items,
    propItems = [],
    deviceItems = [],
    onRetrieve,
    onRetrieveDevice,
    onStore,
    onStoreDevice,
    systemLanguage = 'ENGLISH',
    learningLanguage = 'ENGLISH',
    mergedVariants = {}
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<RepoTab>('words');
    const [sortKey, setSortKey] = useState<SortKey>('word');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [cardMode, setCardMode] = useState<CompactMode>('repository');

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(20);

    // Resolve language code for display data lookup
    const langCode = mapLanguageCode(learningLanguage) as Language;

    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(20);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
        }
    }, [activeTab, sortKey, sortDir, cardMode, items]); // Reset on item change too

    // Sort Logic
    const sortedItems = useMemo(() => {
        const list = [...items];
        list.sort((a, b) => {
            const aData = a.cardData.displayData[langCode];
            const bData = b.cardData.displayData[langCode];
            const aInfo = a.cardData.senseInfo;
            const bInfo = b.cardData.senseInfo;

            let valA: string | number;
            let valB: string | number;

            switch (sortKey) {
                case 'word':
                    valA = aData?.word || '';
                    valB = bData?.word || '';
                    return (valA as string).localeCompare(valB as string);
                case 'pos':
                    valA = aData?.pos || '';
                    valB = bData?.pos || '';
                    return (valA as string).localeCompare(valB as string);
                case 'level':
                    valA = aData?.level || 'A1';
                    valB = bData?.level || 'A1';
                    return (valA as string).localeCompare(valB as string);
                case 'durability':
                    valA = aInfo?.durability ?? 100;
                    valB = bInfo?.durability ?? 100;
                    return (valA as number) - (valB as number);
                default:
                    return 0;
            }
        });
        if (sortDir === 'desc') list.reverse();
        return list;
    }, [items, sortKey, sortDir, langCode]);

    // Derived visible items
    const visibleItems = useMemo(() => sortedItems.slice(0, visibleCount), [sortedItems, visibleCount]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 20);
    };

    // Horizontal scroll via vertical mouse wheel
    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
        }
    };

    const toggleSortDir = () => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');

    // Drop target for storing cards
    const [{ isOver }, drop] = useDrop(() => ({
        accept: ['CARD', 'DEVICE'],
        drop: (item: { uid: string, type?: string }) => {
            if (item.uid) {
                if (item.type === 'DEVICE') {
                    // Handle Device Store
                    onStoreDevice?.(item.uid);
                } else {
                    onStore?.(item.uid);
                }
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [onStore]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={drop}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 z-40"
                    id="deck-repository-drop-zone"
                    style={{
                        width: InterfacePersona.tokens.layout.menuWidth,
                        height: InterfacePersona.tokens.layout.menuHeight,
                        fontFamily: InterfacePersona.tokens.typography.label.family
                    }}
                >
                    {/* Glass Panel */}
                    <div className="w-full h-full backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-row relative"
                        style={{
                            backgroundColor: InterfacePersona.tokens.colors.bgGlass,
                            borderColor: InterfacePersona.tokens.colors.borderBase,
                            boxShadow: InterfacePersona.tokens.shadows.panel
                        }}>

                        {/* --- NEW SIDEBAR NAVIGATION --- */}
                        <div className="w-16 h-full flex flex-col items-center py-4 gap-4 border-r relative z-20"
                            style={{
                                backgroundColor: InterfacePersona.tokens.colors.bgDeep,
                                borderColor: InterfacePersona.tokens.colors.borderBase
                            }}>

                            {/* Decorative Top Line */}
                            <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-[#D4AF37]/50 mb-2" />

                            {/* Words Tab */}
                            <RepoTabButton
                                isActive={activeTab === 'words'}
                                onClick={() => setActiveTab('words')}
                                icon={Library}
                                label={getLoc('WORDS', systemLanguage)}
                                count={items.length}
                            />

                            <RepoTabButton
                                isActive={activeTab === 'props'}
                                onClick={() => setActiveTab('props')}
                                icon={Hexagon}
                                label={getLoc('PROPS', systemLanguage)}
                                count={propItems.length}
                            />

                            {/* Devices Tab */}
                            <RepoTabButton
                                isActive={activeTab === 'devices'}
                                onClick={() => setActiveTab('devices')}
                                icon={CircuitBoard}
                                label={getLoc('DEVICES', systemLanguage)}
                                count={deviceItems.length}
                            />

                            <div className="flex-1" />
                        </div>

                        {/* --- MAIN CONTENT AREA --- */}
                        <div className="flex-1 flex flex-col relative w-full overflow-hidden">
                            {/* Header */}
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

                                {/* Content Title */}
                                <div className="relative z-10 flex items-center gap-2">
                                    <Box size={14} style={{ color: InterfacePersona.tokens.colors.highlight }} />
                                    <span className="text-[10px] tracking-[0.2em] font-bold uppercase"
                                        style={{
                                            fontFamily: InterfacePersona.tokens.typography.label.family,
                                            color: InterfacePersona.tokens.colors.highlight
                                        }}>
                                        {activeTab === 'words'
                                            ? getLoc('REPOSITORY', systemLanguage)
                                            : activeTab === 'props'
                                                ? getLoc('PROPS', systemLanguage)
                                                : getLoc('DEVICES', systemLanguage)
                                        }
                                    </span>
                                </div>

                                {/* Controls */}
                                {activeTab === 'words' && (
                                    <div className="relative z-10 flex items-center gap-4">
                                        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/10">
                                            <RepoModeButton
                                                isActive={cardMode === 'repository'}
                                                onClick={() => setCardMode('repository')}
                                                icon={LayoutGrid}
                                                title="Cards"
                                            />
                                            <RepoModeButton
                                                isActive={cardMode === 'icon'}
                                                onClick={() => setCardMode('icon')}
                                                icon={ImageIcon}
                                                title="Icons"
                                            />
                                            <RepoModeButton
                                                isActive={cardMode === 'word'}
                                                onClick={() => setCardMode('word')}
                                                icon={AlignJustify}
                                                title="List"
                                            />
                                        </div>

                                        <div className="w-[1px] h-4 bg-white/10" />

                                        <div className="flex items-center gap-0 backdrop-blur-sm rounded-sm border overflow-hidden group/sort transition-colors"
                                            style={{
                                                backgroundColor: 'rgba(0,0,0,0.4)',
                                                borderColor: InterfacePersona.tokens.colors.borderFaint,
                                                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                            }}>
                                            <div className="relative flex items-center gap-2 px-3 py-1.5 transition-colors border-r"
                                                style={{ borderColor: InterfacePersona.tokens.colors.borderFaint }}>
                                                <SlidersHorizontal size={12} className="group-hover/sort:text-[#D4AF37] transition-colors" style={{ color: InterfacePersona.tokens.colors.textLabel }} />
                                                <select
                                                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border-none p-0 w-24 appearance-none relative z-10 transition-colors"
                                                    value={sortKey}
                                                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                                                    style={{
                                                        fontFamily: InterfacePersona.tokens.typography.label.family,
                                                        color: InterfacePersona.tokens.colors.textLabel
                                                    }}
                                                >
                                                    <option className="bg-[#1a1a1a]" value="word">{getLoc('By Name', systemLanguage)}</option>
                                                    <option className="bg-[#1a1a1a]" value="pos">{getLoc('By Type', systemLanguage)}</option>
                                                    <option className="bg-[#1a1a1a]" value="level">{getLoc('By Level', systemLanguage)}</option>
                                                    <option className="bg-[#1a1a1a]" value="durability">{getLoc('By Durability', systemLanguage)}</option>
                                                </select>
                                            </div>

                                            <button
                                                onClick={toggleSortDir}
                                                className="w-8 h-full flex items-center justify-center transition-all"
                                                title="Toggle Order"
                                                style={{ color: InterfacePersona.tokens.colors.textLabel }}
                                            >
                                                {sortDir === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Scroll Area */}
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

                                {/* View Switcher */}
                                {activeTab === 'words' ? (
                                    sortedItems.length === 0 ? (
                                        <EmptyState systemLanguage={systemLanguage} />
                                    ) : (
                                        <div
                                            className={`w-max h-full px-4 ${cardMode === 'word'
                                                ? 'grid grid-rows-[auto_auto_auto] grid-flow-col gap-x-4 gap-y-4 content-center'
                                                : cardMode === 'icon'
                                                    ? 'grid grid-rows-[auto_auto] grid-flow-col gap-x-4 gap-y-6 content-center'
                                                    : 'flex items-center gap-6'
                                                }`}
                                        >
                                            {visibleItems.map(item => (
                                                <RepoCard
                                                    key={item.cardData.uid}
                                                    item={item}
                                                    langCode={langCode}
                                                    mode={cardMode}
                                                    onRetrieve={onRetrieve}
                                                    variants={mergedVariants[item.cardData.uid] || []}
                                                />
                                            ))}

                                            {/* Load More Button */}
                                            {visibleCount < sortedItems.length && (
                                                <div className="flex items-center justify-center min-w-[100px] h-full">
                                                    <button
                                                        onClick={handleLoadMore}
                                                        className="px-4 py-2 border border-[#D4AF37]/30 rounded text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors text-xs tracking-widest uppercase"
                                                    >
                                                        {getLoc('Load More', systemLanguage)}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : activeTab === 'props' ? (
                                    // Props View
                                    propItems.length === 0 ? (
                                        <EmptyState systemLanguage={systemLanguage} label="No Props" />
                                    ) : (
                                        <div className="flex items-center gap-6 w-max h-full px-4">
                                            {propItems.map(item => (
                                                <RepoProp
                                                    key={item.id}
                                                    id={item.id}
                                                    title={item.title}
                                                />
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    // Devices View
                                    deviceItems.length === 0 ? (
                                        <EmptyState systemLanguage={systemLanguage} label="No Devices" />
                                    ) : (
                                        <div className="flex items-center gap-6 w-max h-full px-4">
                                            {deviceItems.map(item => (
                                                <RepoDevice
                                                    key={item.uid}
                                                    item={item}
                                                    onRetrieve={onRetrieveDevice}
                                                />
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
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
