import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TieredText } from '@/app/components/ui/TieredText';
import type { FlavorContentItem } from '@/types/CardEntity';

interface FlavorCarouselProps {
    items: FlavorContentItem[];
    persona: any;
    tokens: any;
    currentIndex: number;
    direction: number;
    onNavigate: (newIndex: number, newDirection: number) => void;
    onContentClick?: () => void;
}

export const FlavorCarousel: React.FC<FlavorCarouselProps> = ({
    items,
    persona,
    tokens,
    currentIndex,
    direction,
    onNavigate,
    onContentClick
}) => {

    // No internal state - fully controlled

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    const isMultiple = items.length > 1;

    const handlePaginate = (newDirection: number) => {
        let next = currentIndex + newDirection;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        onNavigate(next, newDirection);
    };

    // Icons - Explicitly using currentColor or hardcoded high-contrast color if needed
    // Using a more robust arrow icon
    const ArrowIcon = ({ className }: { className?: string }) => (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M15 18l-6-6 6-6" />
        </svg>
    );

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 10 : -10, // Even tighter enter/exit
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 10 : -10,
            opacity: 0
        })
    };

    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden group/carousel">
            {/* Left Arrow - Absolute & Compact */}
            {isMultiple && (
                <button
                    onClick={(e) => { e.stopPropagation(); handlePaginate(-1); }}
                    className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center z-20 
                               opacity-0 group-hover/flavor:opacity-100 transition-opacity duration-200
                               hover:bg-black/20 cursor-pointer
                               text-neutral-400 hover:text-white"
                    style={{ color: tokens.colors.goldMetallic }}
                    aria-label="Previous"
                >
                    <ArrowIcon />
                </button>
            )}

            {/* Content Area - Reduced margin to allow more text space */}
            <div className="w-full h-full relative px-1">
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 400, damping: 25 },
                            opacity: { duration: 0.15 }
                        }}
                        className="w-full h-full flex flex-col items-center justify-center text-center absolute inset-0 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onContentClick?.();
                        }}
                    >

                        {currentItem && (
                            <TieredText
                                text={currentItem.text}
                                className="font-serif italic"
                                style={{
                                    fontFamily: persona.tokens.typography.label.family,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                }}
                                gradient={persona.definitions.gradients.goldText}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Right Arrow - Absolute & Compact */}
            {isMultiple && (
                <button
                    onClick={(e) => { e.stopPropagation(); handlePaginate(1); }}
                    className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center z-20 
                               opacity-0 group-hover/flavor:opacity-100 transition-opacity duration-200
                               hover:bg-black/20 cursor-pointer
                               text-neutral-400 hover:text-white"
                    style={{ color: tokens.colors.goldMetallic }}
                    aria-label="Next"
                >
                    <div className="transform rotate-180">
                        <ArrowIcon />
                    </div>
                </button>
            )}
        </div>
    );
};
