import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown } from 'lucide-react';
import { AI_MODELS } from '@/config/constants';
import { useInterfacePersona, useSkinSwitcher } from '@/app/context/PersonaContext';
import { Slot } from '@/app/components/persona/slots';
import { exportImportService } from '@/core/services/ExportImportService';
import { useGameStore } from '@store/index';

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
  activeModelId: string;
  setActiveModelId: (val: string) => void;
}

// Localization Helper - Supports all 8 languages
const getLoc = (key: string, lang: string) => {
  // Translation dictionary for all UI strings
  const dict: Record<string, Record<string, string>> = {
    'SYSTEM CONFIGURATION': {
      'ENGLISH': 'SYSTEM CONFIGURATION',
      '简体中文': '系统设置',
      'FRANÇAIS': 'CONFIGURATION SYSTÈME',
      'DEUTSCH': 'SYSTEMKONFIGURATION',
      '日本語': 'システム設定',
      'ESPAÑOL': 'CONFIGURACIÓN DEL SISTEMA',
      'ITALIANO': 'CONFIGURAZIONE DI SISTEMA',
      'PORTUGUÊS': 'CONFIGURAÇÃO DO SISTEMA'
    },
    'LEARNING LANGUAGE': {
      'ENGLISH': 'LEARNING LANGUAGE',
      '简体中文': '学习语言',
      'FRANÇAIS': 'LANGUE D\'APPRENTISSAGE',
      'DEUTSCH': 'LERNSPRACHE',
      '日本語': '学習言語',
      'ESPAÑOL': 'IDIOMA DE APRENDIZAJE',
      'ITALIANO': 'LINGUA DI APPRENDIMENTO',
      'PORTUGUÊS': 'IDIOMA DE APRENDIZADO'
    },
    'SYSTEM LANGUAGE': {
      'ENGLISH': 'SYSTEM LANGUAGE',
      '简体中文': '系统语言',
      'FRANÇAIS': 'LANGUE DU SYSTÈME',
      'DEUTSCH': 'SYSTEMSPRACHE',
      '日本語': 'システム言語',
      'ESPAÑOL': 'IDIOMA DEL SISTEMA',
      'ITALIANO': 'LINGUA DI SISTEMA',
      'PORTUGUÊS': 'IDIOMA DO SISTEMA'
    },
    'PERSONA': {
      'ENGLISH': 'PERSONA',
      '简体中文': '虚拟化身 (Persona)',
      'FRANÇAIS': 'PERSONA',
      'DEUTSCH': 'PERSONA',
      '日本語': 'ペルソナ (Persona)',
      'ESPAÑOL': 'PERSONA',
      'ITALIANO': 'PERSONA',
      'PORTUGUÊS': 'PERSONA'
    },
    'CARD SKIN': {
      'ENGLISH': 'CARD SKIN',
      '简体中文': '卡片皮肤',
      'FRANÇAIS': 'STYLE DE CARTE',
      'DEUTSCH': 'KARTEN-SKIN',
      '日本語': 'カードスキン',
      'ESPAÑOL': 'ESTILO DE TARJETA',
      'ITALIANO': 'TEMA CARTA',
      'PORTUGUÊS': 'TEMA DO CARTÃO'
    },
    'CANVAS SKIN': {
      'ENGLISH': 'CANVAS SKIN',
      '简体中文': '画布皮肤',
      'FRANÇAIS': 'STYLE DE TOILE',
      'DEUTSCH': 'CANVAS-SKIN',
      '日本語': 'キャンバススキン',
      'ESPAÑOL': 'ESTILO DE LIENZO',
      'ITALIANO': 'TEMA TELA',
      'PORTUGUÊS': 'TEMA DA TELA'
    },
    'INTERFACE SKIN': {
      'ENGLISH': 'INTERFACE SKIN',
      '简体中文': '界面皮肤',
      'FRANÇAIS': 'STYLE D\'INTERFACE',
      'DEUTSCH': 'INTERFACE-SKIN',
      '日本語': 'インターフェーススキン',
      'ESPAÑOL': 'ESTILO DE INTERFAZ',
      'ITALIANO': 'TEMA INTERFACCIA',
      'PORTUGUÊS': 'TEMA DA INTERFACE'
    },
    'NO SIGNAL': {
      'ENGLISH': 'NO SIGNAL',
      '简体中文': '无信号',
      'FRANÇAIS': 'PAS DE SIGNAL',
      'DEUTSCH': 'KEIN SIGNAL',
      '日本語': '信号なし',
      'ESPAÑOL': 'SIN SEÑAL',
      'ITALIANO': 'NESSUN SEGNALE',
      'PORTUGUÊS': 'SEM SINAL'
    },
    'OFFLINE': {
      'ENGLISH': 'OFFLINE',
      '简体中文': '离线',
      'FRANÇAIS': 'HORS LIGNE',
      'DEUTSCH': 'OFFLINE',
      '日本語': 'オフライン',
      'ESPAÑOL': 'DESCONECTADO',
      'ITALIANO': 'NON IN LINEA',
      'PORTUGUÊS': 'DESCONECTADO'
    },
    'AI MODEL': {
      'ENGLISH': 'AI MODEL',
      '简体中文': 'AI 模型',
      'FRANÇAIS': 'MODÈLE IA',
      'DEUTSCH': 'KI-MODELL',
      '日本語': 'AIモデル',
      'ESPAÑOL': 'MODELO IA',
      'ITALIANO': 'MODELLO IA',
      'PORTUGUÊS': 'MODELO DE IA'
    }
  };

  // Return translation for current language, fallback to key if not found
  return dict[key]?.[lang] || key;
};

export const ConfigMenu: React.FC<ConfigMenuProps> = ({
  isOpen,
  onClose,
  learningLang,
  setLearningLang,
  systemLang,
  setSystemLang,
  activeModelId,
  setActiveModelId
}) => {

  // Use real Persona skin switcher
  const { activeSkin, setSkin, availableSkins } = useSkinSwitcher();
  const interfacePersona = useInterfacePersona();
  const activePersona = useGameStore(s => s.activePersona) || 'DEFAULT';
  const setActivePersona = useGameStore(s => s.setActivePersona);

  // Convert skin name to uppercase for display
  const personaOptions = ['DEFAULT', 'CHILD', 'GARDENER', 'ALCHEMIST'];

  // Unified persona change handler (Syncs visual skin + logic persona)
  const handlePersonaChange = (value: string) => {
    setActivePersona(value as any);
    const lowerValue = value.toLowerCase();
    // Try to set skin if it exists in available skins, fallback to default logic handled outside
    if (availableSkins.includes(lowerValue)) {
      setSkin(lowerValue);
    } else if (value === 'DEFAULT') {
      setSkin('default');
    }
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
                  options={[
                    'ENGLISH',
                    '简体中文',
                    'FRANÇAIS',
                    'DEUTSCH',
                    '日本語',
                    'ESPAÑOL',
                    'ITALIANO',
                    'PORTUGUÊS'
                  ]}
                  value={learningLang}
                  onChange={setLearningLang}
                />
                <Spacer />
                <ScrollSelect
                  label={getLoc('SYSTEM LANGUAGE', systemLang)}
                  options={[
                    'ENGLISH',
                    '简体中文',
                    'FRANÇAIS',
                    'DEUTSCH',
                    '日本語',
                    'ESPAÑOL',
                    'ITALIANO',
                    'PORTUGUÊS'
                  ]}
                  value={systemLang}
                  onChange={setSystemLang}
                />
              </div>

              {/* Column 2: Visuals & Persona */}
              <div className="flex flex-col px-4 py-4" style={{ backgroundColor: interfacePersona.palette.colors.bgVoid + '50' }}>
                <ScrollSelect
                  label={getLoc('PERSONA', systemLang)}
                  options={personaOptions}
                  value={activePersona}
                  onChange={handlePersonaChange}
                />
              </div>

              {/* Column 3: Data Management */}
              <div className="flex flex-col px-4 py-4 gap-2 border-r" style={{ borderColor: interfacePersona.palette.colors.borderFaint, backgroundColor: interfacePersona.palette.colors.bgVoid + '30' }}>
                <div className="text-[10px] uppercase tracking-[0.15em] mb-1 pl-1 opacity-70"
                  style={{
                    fontFamily: interfacePersona.typography.fonts.heading,
                    color: interfacePersona.palette.colors.textSecondary,
                    fontWeight: 'bold'
                  }}
                >
                  DATA MANAGEMENT
                </div>
                
                {/* Export Button */}
                <button
                  onClick={() => exportImportService.exportToFile()}
                  className="w-full h-[32px] relative border flex items-center justify-center transition-all group hover:bg-white/5 active:scale-95 shrink-0"
                  style={{ borderColor: interfacePersona.palette.colors.borderFaint }}
                >
                  <span className="text-[10px] tracking-widest font-bold" style={{ color: interfacePersona.palette.colors.textSecondary }}>EXPORT DATA</span>
                </button>

                {/* Import Button */}
                <div className="relative w-full h-[32px] shrink-0 border group transition-all" style={{ borderColor: interfacePersona.palette.colors.borderFaint }}>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (window.confirm("导入将覆盖当前设备数据，此操作不可撤销。确认继续？")) {
                          try {
                            await exportImportService.importFromFile(file);
                            window.alert("Data imported successfully! The page will now reload.");
                            window.location.reload();
                          } catch (err) {
                            // Handled internally by service
                          }
                        }
                        e.target.value = ''; // Reset input
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center group-hover:bg-white/5 pointer-events-none">
                    <span className="text-[10px] tracking-widest font-bold text-red-500/80 group-hover:text-red-400 transition-colors">IMPORT DATA</span>
                  </div>
                </div>
              </div>

              {/* Column 4: AI Model */}
              <div className="flex flex-col px-4 py-4" style={{ backgroundColor: interfacePersona.palette.colors.bgVoid + '40' }}>
                <ScrollSelect
                  label={getLoc('AI MODEL', systemLang)}
                  options={AI_MODELS.map((m: any) => m.label)}
                  value={AI_MODELS.find((m: any) => m.id === activeModelId)?.label || 'Flash Lite'}
                  onChange={(label) => {
                    const model = AI_MODELS.find((m: any) => m.label === label);
                    if (model) setActiveModelId(model.id);
                  }}
                />
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
