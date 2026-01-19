/**
 * DeckDrawer - Bottom Slide-up Drawer
 * 
 * Displays card collections (Archive/Items) in a grid layout
 * Slides up from bottom with smooth animations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@store/index';

// Mock data for demonstration
const MOCK_ARCHIVE_CARDS = [
    { id: '1', word: 'hello', translation: '你好', level: 1 },
    { id: '2', word: 'world', translation: '世界', level: 1 },
    { id: '3', word: 'language', translation: '语言', level: 2 },
    { id: '4', word: 'learn', translation: '学习', level: 1 },
    { id: '5', word: 'game', translation: '游戏', level: 2 },
    { id: '6', word: 'alchemy', translation: '炼金术', level: 3 },
];

const MOCK_ITEMS = [
    { id: '1', name: 'Health Potion', icon: '🧪', count: 3 },
    { id: '2', name: 'Mana Crystal', icon: '💎', count: 5 },
    { id: '3', name: 'Ancient Scroll', icon: '📜', count: 1 },
    { id: '4', name: 'Lucky Charm', icon: '🍀', count: 2 },
];

type SortOption = 'recent' | 'level' | 'alphabetical';

export const DeckDrawer: React.FC = () => {
    const deckState = useGameStore(state => state.deckState);
    const closeDeck = useGameStore(state => state.closeDeck);
    const setDeckTab = useGameStore(state => state.setDeckTab);

    const [sortBy, setSortBy] = useState<SortOption>('recent');

    const handleBackdropClick = () => {
        closeDeck();
    };

    const handleDrawerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const getSortedCards = () => {
        const cards = [...MOCK_ARCHIVE_CARDS];
        switch (sortBy) {
            case 'level':
                return cards.sort((a, b) => a.level - b.level);
            case 'alphabetical':
                return cards.sort((a, b) => a.word.localeCompare(b.word));
            default:
                return cards;
        }
    };

    return (
        <AnimatePresence>
            {deckState.isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={handleBackdropClick}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-b from-stone-900 to-stone-950 border-t-2 border-amber-700/30 shadow-2xl z-50 rounded-t-3xl overflow-hidden"
                        onClick={handleDrawerClick}
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center py-3 cursor-pointer" onClick={closeDeck}>
                            <div className="w-16 h-1.5 bg-white/20 rounded-full" />
                        </div>

                        {/* Header with Tabs */}
                        <div className="px-6 pb-4 border-b border-white/10">
                            <div className="flex items-center justify-between">
                                {/* Tabs */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDeckTab('archive')}
                                        className={`px-6 py-2 rounded-lg font-medium transition-all ${deckState.activeTab === 'archive'
                                                ? 'bg-amber-600 text-white shadow-lg'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        📚 Archive
                                    </button>
                                    <button
                                        onClick={() => setDeckTab('items')}
                                        className={`px-6 py-2 rounded-lg font-medium transition-all ${deckState.activeTab === 'items'
                                                ? 'bg-amber-600 text-white shadow-lg'
                                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        🎒 Items
                                    </button>
                                </div>

                                {/* Sort Options (only for Archive) */}
                                {deckState.activeTab === 'archive' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/60 text-sm">Sort:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="bg-white/10 text-white text-sm px-3 py-1.5 rounded border border-white/20 focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="recent">Recent</option>
                                            <option value="level">Level</option>
                                            <option value="alphabetical">A-Z</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="h-[calc(100%-8rem)] overflow-y-auto px-6 py-6">
                            {deckState.activeTab === 'archive' ? (
                                <ArchiveContent cards={getSortedCards()} />
                            ) : (
                                <ItemsContent items={MOCK_ITEMS} />
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Archive Tab Content
const ArchiveContent: React.FC<{ cards: typeof MOCK_ARCHIVE_CARDS }> = ({ cards }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map((card, index) => (
                <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-br from-amber-900/20 to-amber-950/40 border border-amber-700/30 rounded-xl p-4 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer group"
                >
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-amber-500 font-mono">Lv.{card.level}</span>
                            <span className="text-xs text-white/40">#{card.id}</span>
                        </div>
                        <h3 className="text-white font-bold text-lg group-hover:text-amber-400 transition-colors">
                            {card.word}
                        </h3>
                        <p className="text-white/60 text-sm">{card.translation}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// Items Tab Content
const ItemsContent: React.FC<{ items: typeof MOCK_ITEMS }> = ({ items }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gradient-to-br from-purple-900/20 to-purple-950/40 border border-purple-700/30 rounded-xl p-4 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer group relative"
                >
                    {/* Count Badge */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        {item.count}
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <span className="text-5xl group-hover:scale-110 transition-transform">
                            {item.icon}
                        </span>
                        <h3 className="text-white font-medium text-sm text-center group-hover:text-purple-400 transition-colors">
                            {item.name}
                        </h3>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
