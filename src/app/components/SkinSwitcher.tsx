/**
 * SKIN SWITCHER DEMO
 * 
 * UI component for demonstrating and testing Persona skin switching.
 * Can be placed in settings menu or debug panel.
 */

import React from 'react';
import { useSkinSwitcher } from '@/app/context/PersonaContext';

interface SkinSwitcherProps {
    /** Show full list */
    showList?: boolean;
    /** Custom styles */
    className?: string;
}

export const SkinSwitcher: React.FC<SkinSwitcherProps> = ({
    showList = true,
    className = '',
}) => {
    const { activeSkin, setSkin, availableSkins, resetToDefault } = useSkinSwitcher();

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {/* Current skin display */}
            <div className="text-xs text-[#C0A062]/70 uppercase tracking-widest">
                Current Skin
            </div>
            <div className="text-sm text-[#F0D082] font-medium">
                {activeSkin}
            </div>

            {/* Skin List */}
            {showList && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {availableSkins.map((skin) => (
                        <button
                            key={skin}
                            onClick={() => setSkin(skin)}
                            className={`
                px-3 py-1.5 rounded text-xs uppercase tracking-wide
                transition-all duration-200
                ${activeSkin === skin
                                    ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#F0D082]'
                                    : 'bg-[#0a0a0a] border border-[#C0A062]/30 text-[#C0A062]/80 hover:border-[#D4AF37]/50'
                                }
              `}
                        >
                            {skin}
                        </button>
                    ))}
                </div>
            )}

            {/* Reset Button */}
            <button
                onClick={resetToDefault}
                className="
          mt-2 px-3 py-1 text-xs uppercase tracking-wide
          bg-transparent border border-[#C0A062]/20 text-[#C0A062]/60
          rounded hover:border-[#D4AF37]/40 hover:text-[#C0A062]
          transition-all duration-200
        "
            >
                Reset to Default
            </button>
        </div>
    );
};

/**
 * Simplified Skin Selector (Dropdown)
 */
export const SkinSelect: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { activeSkin, setSkin, availableSkins } = useSkinSwitcher();

    return (
        <select
            value={activeSkin}
            onChange={(e) => setSkin(e.target.value)}
            className={`
        px-3 py-1.5 rounded text-sm
        bg-[#0a0a0a] border border-[#C0A062]/40 text-[#F0D082]
        focus:outline-none focus:border-[#D4AF37]
        ${className}
      `}
        >
            {availableSkins.map((skin) => (
                <option key={skin} value={skin}>
                    {skin}
                </option>
            ))}
        </select>
    );
};
