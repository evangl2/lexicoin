import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, LayoutTemplate, Target, Library, Settings, LucideIcon } from 'lucide-react';
import { DeckRepository, StoredCard } from './DeckRepository';
import { ConfigMenu } from './ConfigMenu';
import { useInterfacePersona } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';

interface DockProps {
   isDeckOpen?: boolean;
   toggleDeck?: () => void;
   isConfigOpen?: boolean;
   toggleConfig?: () => void;
   deckItems?: StoredCard[];
   propItems?: StoredCard[];
   learningLang?: string;
   setLearningLang?: (val: string) => void;
   systemLang?: string;
   setSystemLang?: (val: string) => void;
}

// Localization Helper
const getLoc = (key: string, lang: string = 'ENGLISH') => {
   const isZh = lang === '简体中文';
   const dict: Record<string, { en: string; zh: string }> = {
      'DECK': { en: 'DECK', zh: '卡组' },
      'CANVAS': { en: 'CANVAS', zh: '画布' },
      'FOCUS': { en: 'FOCUS', zh: '聚焦' },
      'LIBRARY': { en: 'LIBRARY', zh: '资料' },
      'CONFIG': { en: 'CONFIG', zh: '设置' },
   };
   return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

export const Dock: React.FC<DockProps> = ({
   isDeckOpen = false,
   toggleDeck,
   isConfigOpen = false,
   toggleConfig,
   deckItems = [],
   propItems = [],
   learningLang = 'ENGLISH',
   setLearningLang = () => { },
   systemLang = 'ENGLISH',
   setSystemLang = () => { }
}) => {
   const interfacePersona = useInterfacePersona();
   const [activeId, setActiveId] = useState<number>(1); // Default active: Canvas
   const [isHovered, setIsHovered] = useState(false);
   const [isBackdropActive, setIsBackdropActive] = useState(false);

   // --- Backrop Visibility Logic with Delay ---
   useEffect(() => {
      const isActive = isHovered || isDeckOpen || isConfigOpen;
      let timer: NodeJS.Timeout;

      if (isActive) {
         setIsBackdropActive(true);
      } else {
         // Wait 3 seconds before starting the fade out
         timer = setTimeout(() => {
            setIsBackdropActive(false);
         }, interfacePersona.dock.behavior.fadeDelay);
      }

      return () => {
         if (timer) clearTimeout(timer);
      };
   }, [isHovered, isDeckOpen, isConfigOpen, interfacePersona.dock.behavior.fadeDelay]);

   // --- Auto-Resize Logic (HUD Scaling) ---
   const [scale, setScale] = useState<number>(1);

   useEffect(() => {
      const handleResize = () => {
         const baseWidth = interfacePersona.dock.layout.baseWidth;
         const currentWidth = window.innerWidth;
         const newScale = Math.max(
            interfacePersona.dock.metrics.scaleMin,
            Math.min(interfacePersona.dock.metrics.scaleMax, currentWidth / baseWidth)
         );
         setScale(newScale);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
   }, [interfacePersona.dock.layout.baseWidth, interfacePersona.dock.metrics.scaleMin, interfacePersona.dock.metrics.scaleMax]);

   const handleNodeClick = (index: number) => {
      // 0 = DECK, 1 = CANVAS
      if (index === 0) {
         if (activeId === 1) {
            toggleDeck?.();
         } else {
            setActiveId(1);
         }
      } else if (index === 4) { // CONFIG
         toggleConfig?.();
      } else {
         setActiveId(index);
         if (isDeckOpen && toggleDeck) {
            toggleDeck();
         }
         // Close Config if open when switching to other tabs (optional but good UX)
         if (isConfigOpen && toggleConfig) {
            toggleConfig();
         }
      }
   };

   return (
      // Outer Container (Global Bottom Offset: 48px)
      <div
         className="fixed inset-x-0 z-50 flex justify-center pointer-events-none select-none"
         style={{ bottom: interfacePersona.dock.layout.bottomPosition }}
      >

         {/* Deck Repository Overlay */}
         <div className="absolute pointer-events-auto" style={{ bottom: interfacePersona.interfaceLayout.dockOffset }}>
            <DeckRepository
               isOpen={isDeckOpen}
               onClose={() => toggleDeck?.()}
               items={deckItems}
               propItems={propItems}
               systemLanguage={systemLang}
               learningLanguage={learningLang}
            />
         </div>

         {/* Config Menu Overlay */}
         <div className="absolute pointer-events-auto" style={{ bottom: interfacePersona.interfaceLayout.dockOffset }}>
            <ConfigMenu
               isOpen={isConfigOpen}
               onClose={() => toggleConfig?.()}
               learningLang={learningLang}
               setLearningLang={setLearningLang}
               systemLang={systemLang}
               setSystemLang={setSystemLang}
            />
         </div>

         {/* Inner Container: Handles Scaling and Layout */}
         <div
            className="relative flex flex-col items-center justify-end transition-transform duration-200 ease-out"
            style={{
               transform: `scale(${scale})`,
               transformOrigin: 'bottom center'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
         >
            {/* THE GROWTH VISUAL */}
            <Slot slot={interfacePersona.slots.DockBackdrop} props={{ isActive: isBackdropActive }} />

            {/* Main Interactive Zone */}
            <div className="pointer-events-auto relative group z-10 scale-90 origin-bottom">

               {/* Obsidian Base Plate */}
               <motion.div
                  className="relative flex items-center justify-center"
                  style={{
                     paddingInline: 32, // Simplified layout
                     paddingBlock: 16,
                     gap: interfacePersona.dock.layout.nodeGap
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
               >
                  {/* Frame Structure - No Texture */}
                  <div className="absolute inset-0 rounded-full overflow-visible"
                     style={{
                        backdropFilter: `blur(${interfacePersona.dock.style.blurStrength})`,
                        backgroundColor: interfacePersona.palette.colors.bgElevated,
                        boxShadow: `0 0 20px ${interfacePersona.palette.colors.bgVoid}, inset 0 0 0 1px ${interfacePersona.palette.colors.borderFaint}`,
                     }}
                  >
                     {/* Inner Gold Rim */}
                     <div className="absolute rounded-full"
                        style={{ inset: interfacePersona.dock.style.rimInset }} />
                     {/* Outer Gold Accent */}
                     <div className="absolute rounded-full"
                        style={{ inset: interfacePersona.dock.style.accentInset }} />

                     {/* Decorative Side Accents */}
                     <div className="absolute top-1/2 rounded-full -translate-y-1/2"
                        style={{
                           left: interfacePersona.dock.style.accentInset.split(' ')[2], // Extract from inset roughly or use layout token if available
                           // Actually better to use absolute positioning or new tokens.
                           // For now, let's use the style properties directly for dimensions
                           marginLeft: '20px',
                           width: interfacePersona.dock.style.sideAccentWidth,
                           height: interfacePersona.dock.style.sideAccentHeight,
                           backgroundColor: interfacePersona.palette.colors.accent,
                           opacity: interfacePersona.dock.style.radialOpacity,
                           boxShadow: `0 0 10px ${interfacePersona.palette.colors.accent}`
                        }}
                     />
                     <div className="absolute top-1/2 rounded-full -translate-y-1/2"
                        style={{
                           right: '20px', // Simplified
                           width: interfacePersona.dock.style.sideAccentWidth,
                           height: interfacePersona.dock.style.sideAccentHeight,
                           backgroundColor: interfacePersona.palette.colors.accent,
                           opacity: interfacePersona.dock.style.radialOpacity,
                           boxShadow: `0 0 10px ${interfacePersona.palette.colors.accent}`
                        }}
                     />
                  </div>

                  {/* Dock Nodes */}
                  {[
                     { icon: Layers, label: getLoc("DECK", systemLang), rune: "🜂" },
                     { icon: LayoutTemplate, label: getLoc("CANVAS", systemLang), rune: "🜄" },
                     { icon: Target, label: getLoc("FOCUS", systemLang), isCenter: true, rune: "☉" },
                     { icon: Library, label: getLoc("LIBRARY", systemLang), rune: "☾" },
                     { icon: Settings, label: getLoc("CONFIG", systemLang), rune: "♄" }
                  ].map((item, index) => (
                     <RuneLockNode
                        key={index}
                        index={index}
                        icon={item.icon}
                        label={item.label}
                        isActive={activeId === index}
                        isCenter={item.isCenter}
                        rune={item.rune}
                        onClick={() => handleNodeClick(index)}
                        isDeckOpen={index === 0 && isDeckOpen}
                        isConfigOpen={index === 4 && isConfigOpen}
                     />
                  ))}

               </motion.div>
            </div>
         </div>
      </div>
   );
};

/* --- The Rune Lock Node --- */
interface RuneLockNodeProps {
   icon: LucideIcon;
   label: string;
   isActive: boolean;
   isCenter?: boolean;
   rune: string;
   index: number;
   onClick: () => void;
   isDeckOpen?: boolean;
   isConfigOpen?: boolean;
}

const RuneLockNode: React.FC<RuneLockNodeProps> = ({ icon: Icon, label, isActive, isCenter, rune, onClick, isDeckOpen, isConfigOpen }) => {
   const interfacePersona = useInterfacePersona();
   const isVisuallyActive = isActive || isDeckOpen || isConfigOpen;

   return (
      <div
         className="group relative flex flex-col items-center justify-center cursor-pointer z-10"
         style={{
            width: interfacePersona.dock.layout.nodeSize,
            height: interfacePersona.dock.layout.nodeSize,
         }}
         onClick={onClick}
      >

         {/* 1. The Mechanical Lock Mechanism (Rings) */}
         <div className={`absolute inset-0 pointer-events-none flex items-center justify-center transition-all duration-700`}
            style={{
               transform: isVisuallyActive ? `scale(${interfacePersona.dock.metrics.activeScale})` : 'scale(1)',
            }}
         >

            {/* Complex Inner Ring */}
            <div className={`
             absolute rounded-full border-dashed 
             transition-all duration-1000 
             ${isVisuallyActive ? '' : 'rotate-0 opacity-20'}
         `}
               style={{
                  inset: '2px', // Simplified
                  borderColor: isVisuallyActive ? interfacePersona.palette.colors.borderStrong : interfacePersona.palette.colors.borderBase,
                  borderWidth: '1px',
                  animation: isVisuallyActive ? interfacePersona.motion.animations.spinFast : 'none'
               }} />

            {/* Complex Outer Ring (Runes) */}
            <div className={`
             absolute rounded-full border-dotted 
             flex items-center justify-center
             transition-all duration-1000 
             ${isVisuallyActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
         `}
               style={{
                  inset: '-4px', // Simplified
                  borderColor: interfacePersona.palette.colors.borderFaint,
                  borderWidth: '1px',
                  animation: isVisuallyActive ? interfacePersona.motion.animations.spinRune : 'none'
               }}>
               {/* Decorative ticks */}
               {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                  <div key={deg} className="absolute w-[1px]"
                     style={{
                        height: '4px',
                        backgroundColor: interfacePersona.palette.colors.borderBase,
                        transform: `rotate(${deg}deg) translateY(-18px)` // Adjusted offset
                     }} />
               ))}
            </div>
         </div>

         {/* 2. The Core Icon */}
         <div className="relative z-10">
            <Icon
               size={interfacePersona.dock.metrics.iconSize}
               strokeWidth={isVisuallyActive ? 1.5 : 1}
               className={`transition-all duration-500`}
               style={{
                  color: isVisuallyActive ? interfacePersona.palette.colors.accent : interfacePersona.palette.colors.textMuted,
                  filter: isVisuallyActive ? `drop-shadow(${interfacePersona.effects.shadows.glow})` : 'none',
                  transform: isVisuallyActive ? 'scale(1.2)' : 'scale(1)'
               }}
            />
            {isVisuallyActive && <div className="absolute inset-0 blur-xl rounded-full animate-pulse z-[-1]"
               style={{ backgroundColor: interfacePersona.palette.colors.accent, opacity: 0.3 }}
            />}
         </div>

         {/* 3. Floating Rune */}
         <div className={`
         absolute transition-all duration-700 select-none text-2xl
         ${isVisuallyActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
            style={{
               top: -30,
               fontFamily: interfacePersona.typography.fonts.decorative,
               color: interfacePersona.palette.colors.textSecondary,
               filter: `drop-shadow(${interfacePersona.effects.shadows.glow})`
            }}>
            {rune}
         </div>

         {/* 4. Label */}
         <div className={`
         absolute opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none
         flex flex-col items-center
      `}
            style={{
               bottom: -20
            }}>
            <span className="font-light shadow-black drop-shadow-md whitespace-nowrap bg-black/50 px-2 py-0.5 rounded border backdrop-blur-sm"
               style={{
                  fontFamily: interfacePersona.typography.fonts.heading,
                  fontSize: "9px",
                  letterSpacing: "0.3em",
                  color: interfacePersona.palette.colors.textHighlight,
                  borderColor: interfacePersona.palette.colors.borderFaint
               }}>
               {label}
            </span>
         </div>

      </div>
   );
};
