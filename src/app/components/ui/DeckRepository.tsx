import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { X, Box, ArrowDownAZ, ArrowUpAZ, SlidersHorizontal } from 'lucide-react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';
import { DefaultInterfacePersona as InterfacePersona } from '@/app/components/persona/default/Interface.persona.default';
import { CompactCardVisual } from '@/app/components/ui/CompactCardVisual';
import type { CardItem } from '@/app/hooks/logic/useCardManager';
import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';
import { mapLanguageCode } from '@/app/utils/localization';

interface DeckRepositoryProps {
    isOpen: boolean;
    onClose: () => void;
    items: CardItem[];
    onRetrieve?: (uid: string) => void;
    onStore?: (uid: string) => void;
    systemLanguage?: string;
    learningLanguage?: string;
}

type SortDir = 'asc' | 'desc';
type SortKey = 'word' | 'pos' | 'level' | 'durability';

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
    };
    return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

export const DeckRepository: React.FC<DeckRepositoryProps> = ({
    isOpen,
    onClose,
    items,
    onRetrieve,
    onStore,
    systemLanguage = 'ENGLISH',
    learningLanguage = 'ENGLISH'
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [sortKey, setSortKey] = useState<SortKey>('word');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Resolve language code for display data lookup
    const langCode = mapLanguageCode(learningLanguage) as Language;

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

    // Horizontal scroll via vertical mouse wheel
    const handleWheel = (e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
        }
    };

    const toggleSortDir = () => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');

    // Drop target for storing cards
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'CARD',
        drop: (item: { uid: string }) => {
            if (item.uid) {
                onStore?.(item.uid);
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

                            {/* --- CONTENT LAYER --- */}
                            <div className="relative z-10 flex items-center justify-between w-full h-full">

                                {/* LEFT: Title */}
                                <div className="flex items-center gap-2">
                                    <Box size={14} style={{ color: InterfacePersona.tokens.colors.highlight }} />
                                    <span className="text-[10px] tracking-[0.2em] font-bold uppercase"
                                        style={{
                                            fontFamily: InterfacePersona.tokens.typography.label.family,
                                            color: InterfacePersona.tokens.colors.highlight
                                        }}>
                                        {getLoc('REPOSITORY', systemLanguage)}
                                    </span>
                                    {items.length > 0 && (
                                        <span className="text-[9px] tracking-wider opacity-60"
                                            style={{ color: InterfacePersona.tokens.colors.textLabel }}>
                                            ({items.length})
                                        </span>
                                    )}
                                </div>

                                {/* RIGHT: Controls */}
                                <div className="flex items-center gap-4">

                                    {/* Sort Controls */}
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

                                    {/* Close Button */}
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
                                        <RepoCard
                                            key={item.cardData.uid}
                                            item={item}
                                            langCode={langCode}
                                            onRetrieve={onRetrieve}
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

// --- CARD COMPONENT ---
interface RepoCardProps {
    item: CardItem;
    langCode: Language;
    onRetrieve?: (uid: string) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({ item, langCode, onRetrieve }) => {
    const SCALE = 0.5;
    const ORIGINAL_WIDTH = 250;
    const ORIGINAL_HEIGHT = 350;

    const ACTUAL_WIDTH = ORIGINAL_WIDTH * SCALE;
    const ACTUAL_HEIGHT = ORIGINAL_HEIGHT * SCALE;

    const learningData = item.cardData.displayData[langCode];



    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'CARD',
        item: {
            uid: item.cardData.rawSense.uid,
            width: ACTUAL_WIDTH,
            height: ACTUAL_HEIGHT,
            sourceWidth: ACTUAL_WIDTH,
            sourceHeight: ACTUAL_HEIGHT,
            title: learningData?.word || item.cardData.uid,
            difficulty: learningData?.level || 'A1',
            pos: learningData?.pos || 'n.',
            durability: item.cardData.senseInfo.durability
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [item.cardData.rawSense.uid, ACTUAL_WIDTH, ACTUAL_HEIGHT, learningData]);

    React.useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    return (
        <div
            ref={drag}
            className={`flex-shrink-0 cursor-pointer relative group ${isDragging ? 'opacity-50' : ''}`}
            style={{ width: ACTUAL_WIDTH, height: ACTUAL_HEIGHT }}
            title="Drag to canvas"
        >
            <div
                className="origin-top-left relative overflow-hidden transition-transform duration-200 group-hover:scale-105"
                style={{
                    width: '100%',
                    height: '100%',
                    boxShadow: CardPersona.tokens.shadows.base,
                    borderRadius: CardPersona.tokens.layout.radius,
                }}
            >
                <CompactCardVisual
                    learningData={learningData || {
                        word: item.cardData.uid,
                        pronunciation: '',
                        pos: 'n.' as any,
                        level: 'A1' as any,
                        definition: '',
                        flavorContents: []
                    }}
                    senseInfo={item.cardData.senseInfo}
                    visual={item.cardData.visual}
                    persona={CardPersona}
                    width={ACTUAL_WIDTH}
                    height={ACTUAL_HEIGHT}
                    isActive={false}
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/0 hover:bg-white/5 transition-colors duration-200 pointer-events-auto rounded-[inherit]" />
            </div>
        </div>
    );
};
