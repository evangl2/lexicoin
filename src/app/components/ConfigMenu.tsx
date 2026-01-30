import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown } from 'lucide-react';
import { useInterfacePersona, useSkinSwitcher } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';

// --- Scroll Select Component (Portal Version) ---
interface ScrollSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  zIndex?: number;
}

const ScrollSelect: React.FC<ScrollSelectProps> = ({ label, options, value, onChange }) => {
  const interfacePersona = useInterfacePersona();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePos = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownStyle({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          });
        }
      };

      updatePos();
      window.addEventListener('resize', updatePos);
      window.addEventListener('scroll', updatePos, true);

      return () => {
        window.removeEventListener('resize', updatePos);
        window.removeEventListener('scroll', updatePos, true);
      };
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) return;
      if (listRef.current && listRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (selectedEl) {
        const listHeight = listRef.current.clientHeight;
        const elTop = selectedEl.offsetTop;
        const elHeight = selectedEl.offsetHeight;
        listRef.current.scrollTop = elTop - listHeight / 2 + elHeight / 2;
      }
    }
  }, [isOpen]);

  // The floating dropdown content
  const dropdownContent = (
    <motion.div
      ref={listRef}
      initial={{ opacity: 0, y: -5, scaleY: 0.95 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -5, scaleY: 0.95 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className="fixed rounded-sm flex flex-col backdrop-blur-md"
      style={{
        zIndex: 9999,
        top: dropdownStyle.top,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
        height: '140px',
        fontFamily: interfacePersona.typography.fonts.heading,
        backgroundColor: interfacePersona.palette.colors.bgSurface,
        border: `1px solid ${interfacePersona.palette.colors.borderBase}`,
        boxShadow: interfacePersona.effects.shadows.elevated,
      }}
    >
      {/* Top/Bottom Fade Gradients */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#0a0a0a] to-transparent pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none z-20" />

      {/* Scrollable List */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-[50px] scroll-smooth
                       [&::-webkit-scrollbar]:w-1.5
                       [&::-webkit-scrollbar-track]:bg-transparent
                       [&::-webkit-scrollbar-thumb]:bg-white/10
                       [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={opt}
              data-selected={isSelected}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className="w-full text-center py-2 text-xs tracking-[0.2em] relative group transition-colors flex items-center justify-center shrink-0"
              style={{
                color: isSelected ? interfacePersona.palette.colors.textHighlight : interfacePersona.palette.colors.textMuted,
                height: '32px'
              }}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeDot"
                  className="absolute left-3 w-1 h-1 rounded-full"
                  style={{ backgroundColor: interfacePersona.palette.colors.accent }}
                />
              )}
              <span className={`transition-all duration-300 ${isSelected ? 'scale-110 font-bold' : 'group-hover:text-white/60'}`}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-1 w-full relative group">
      {/* Label */}
      <div className="text-[10px] uppercase tracking-[0.15em] mb-1 pl-1 opacity-70"
        style={{
          fontFamily: interfacePersona.typography.fonts.heading, // Use heading font
          color: interfacePersona.palette.colors.textSecondary,
          fontWeight: 'bold'
        }}
      >
        {label}
      </div>

      {/* Main Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
            w-full h-[32px] relative overflow-hidden rounded-sm border transition-all duration-300 group shrink-0
            flex items-center justify-between px-3
          `}
        style={{
          backgroundColor: isOpen ? interfacePersona.palette.colors.bgElevated : 'rgba(5,5,5,0.3)',
          borderColor: isOpen ? interfacePersona.palette.colors.borderBase : interfacePersona.palette.colors.borderFaint,
          boxShadow: isOpen ? interfacePersona.effects.shadows.glowSoft : 'none'
        }}
      >
        {/* Text Value */}
        <span className={`text-[10px] tracking-widest font-bold truncate transition-colors mr-2`}
          style={{ color: isOpen ? interfacePersona.palette.colors.textHighlight : interfacePersona.palette.colors.textSecondary }}
        >
          {value}
        </span>

        {/* Icon */}
        <div className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isOpen ? interfacePersona.palette.colors.textHighlight : interfacePersona.palette.colors.textSecondary }}>
          <ChevronDown size={12} />
        </div>

        {/* Background Highlight (Subtle) */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </button>

      {/* Render Dropdown via Portal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {isOpen && dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// Invisible Spacer for alignment
const Spacer = () => (
  <div className="h-4 w-full shrink-0" /> // 16px gap
);

interface ConfigMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // State from Parent
  learningLang: string;
  setLearningLang: (val: string) => void;
  systemLang: string;
  setSystemLang: (val: string) => void;
}

// Localization Helper
const getLoc = (key: string, lang: string) => {
  const isZh = lang === '简体中文';
  const dict: Record<string, { en: string; zh: string }> = {
    'SYSTEM CONFIGURATION': { en: 'SYSTEM CONFIGURATION', zh: '系统设置' },
    'LEARNING LANGUAGE': { en: 'LEARNING LANGUAGE', zh: '学习语言' },
    'SYSTEM LANGUAGE': { en: 'SYSTEM LANGUAGE', zh: '系统语言' },
    'CARD SKIN': { en: 'CARD SKIN', zh: '卡片皮肤' },
    'CANVAS SKIN': { en: 'CANVAS SKIN', zh: '画布皮肤' },
    'INTERFACE SKIN': { en: 'INTERFACE SKIN', zh: '界面皮肤' },
    'NO SIGNAL': { en: 'NO SIGNAL', zh: '无信号' },
    'OFFLINE': { en: 'OFFLINE', zh: '离线' },
  };
  return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

export const ConfigMenu: React.FC<ConfigMenuProps> = ({
  isOpen,
  onClose,
  learningLang,
  setLearningLang,
  systemLang,
  setSystemLang
}) => {

  // Use real Persona skin switcher
  const { activeSkin, setSkin, availableSkins } = useSkinSwitcher();
  const interfacePersona = useInterfacePersona();

  // Convert skin name to uppercase for display
  const skinOptions = availableSkins.map(s => s.toUpperCase());
  const currentSkin = activeSkin.toUpperCase();

  // Unified skin change handler (Syncs all three options currently)
  const handleSkinChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setSkin(lowerValue);
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
            width: interfacePersona.interfaceLayout.menuWidth,
            height: interfacePersona.interfaceLayout.menuHeight,
            fontFamily: interfacePersona.typography.fonts.heading
          }}
        >
          {/* Glass Panel Container */}
          <div className="w-full h-full backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col relative"
            style={{
              backgroundColor: interfacePersona.palette.colors.bgGlass,
              borderColor: interfacePersona.palette.colors.borderBase,
              boxShadow: interfacePersona.effects.shadows.elevated
            }}>

            {/* Header */}
            <div className="relative shrink-0 flex items-center justify-between px-6 z-20 overflow-hidden border-b shadow-2xl"
              style={{
                height: interfacePersona.interfaceLayout.headerHeight,
                backgroundColor: interfacePersona.palette.colors.bgBase,
                borderColor: interfacePersona.palette.colors.borderBase
              }}>

              <Slot slot={interfacePersona.slots.BackgroundVisuals} />
              <Slot slot={interfacePersona.slots.GeometricOverlay} />
              <Slot slot={interfacePersona.slots.SymmetryLines} />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between w-full h-full">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-sm border"
                    style={{
                      borderColor: interfacePersona.palette.colors.borderFaint,
                      backgroundColor: interfacePersona.palette.colors.bgElevated,
                      color: interfacePersona.palette.colors.accent
                    }}>
                    <div className="w-2 h-2 rotate-45"
                      style={{ backgroundColor: interfacePersona.palette.colors.accent, boxShadow: `0 0 5px ${interfacePersona.palette.colors.accent}` }} />
                    <span className="font-bold"
                      style={{
                        fontFamily: interfacePersona.typography.fonts.heading,
                        fontSize: interfacePersona.typography.sizes.sm,
                        letterSpacing: "0.3em"
                      }}>
                      {getLoc('SYSTEM CONFIGURATION', systemLang)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="group flex items-center justify-center w-8 h-8 rounded-full border hover:shadow-[0_0_10px_#D4AF37] active:scale-95 transition-all"
                    style={{
                      borderColor: interfacePersona.palette.colors.borderBase,
                      backgroundColor: interfacePersona.palette.colors.bgBase
                    }}
                  >
                    <X size={14} className="group-hover:text-[#D4AF37] transition-colors" style={{ color: interfacePersona.palette.colors.textSecondary }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content - 5 Columns */}
            <div className="flex-1 grid grid-cols-5 gap-0 relative z-10 divide-x"
              style={{ borderColor: interfacePersona.palette.colors.borderFaint }}>

              {/* Column 1: Language */}
              <div className="flex flex-col px-4 py-4" style={{ backgroundColor: interfacePersona.palette.colors.bgVoid + '80' }}>
                <ScrollSelect
                  label={getLoc('LEARNING LANGUAGE', systemLang)}
                  options={['ENGLISH', '简体中文']}
                  value={learningLang}
                  onChange={setLearningLang}
                />
                <Spacer />
                <ScrollSelect
                  label={getLoc('SYSTEM LANGUAGE', systemLang)}
                  options={['ENGLISH', '简体中文']}
                  value={systemLang}
                  onChange={setSystemLang}
                />
              </div>

              {/* Column 2: Visuals */}
              <div className="flex flex-col px-4 py-4" style={{ backgroundColor: interfacePersona.palette.colors.bgVoid + '50' }}>
                <ScrollSelect
                  label={getLoc('CARD SKIN', systemLang)}
                  options={skinOptions}
                  value={currentSkin}
                  onChange={handleSkinChange}
                />
                <Spacer />
                <ScrollSelect
                  label={getLoc('CANVAS SKIN', systemLang)}
                  options={skinOptions}
                  value={currentSkin}
                  onChange={handleSkinChange}
                />
                <Spacer />
                <ScrollSelect
                  label={getLoc('INTERFACE SKIN', systemLang)}
                  options={skinOptions}
                  value={currentSkin}
                  onChange={handleSkinChange}
                />
              </div>

              {/* Column 3: Empty */}
              <div className="p-4 flex items-center justify-center opacity-20 relative">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#D4AF37_10px,#D4AF37_11px)] opacity-5" />
                <span className="tracking-widest" style={{ color: interfacePersona.palette.colors.textSecondary, fontSize: "10px" }}>{getLoc('NO SIGNAL', systemLang)}</span>
              </div>

              {/* Column 4: Empty */}
              <div className="p-4 flex items-center justify-center opacity-20 relative">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,#D4AF37_10px,#D4AF37_11px)] opacity-5" />
                <span className="tracking-widest" style={{ color: interfacePersona.palette.colors.textSecondary, fontSize: "10px" }}>{getLoc('OFFLINE', systemLang)}</span>
              </div>

              {/* Column 5: Empty */}
              <div className="p-4 flex items-center justify-center opacity-20 relative">
                <div className="w-12 h-12 rounded-full border flex items-center justify-center" style={{ borderColor: interfacePersona.palette.colors.borderBase }}>
                  <div className="w-1 h-1" style={{ backgroundColor: interfacePersona.palette.colors.accent }} />
                </div>
              </div>

            </div>

            <Slot slot={interfacePersona.slots.DecorativeCorners} />

            {/* Inner Bevel */}
            <div className="absolute inset-0 border rounded-2xl pointer-events-none" style={{ borderColor: interfacePersona.palette.colors.borderFaint }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
