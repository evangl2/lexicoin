import React from 'react';
import { Focus } from "lucide-react";
import { DefaultCanvasPersona } from "@/app/components/persona/default/Canvas.persona.default";

interface CanvasControlProps {
    onCenter: () => void;
    systemLang: string;
    getLoc: (key: string, lang: string) => string;
}

export const CanvasControl: React.FC<CanvasControlProps> = ({ onCenter, systemLang, getLoc }) => {
    return (
        <div className="absolute top-6 right-6 flex flex-col items-end gap-4 z-50 pointer-events-none">
            {/* Center Button (Pointer Events Auto) */}
            <div className="pointer-events-auto">
                <button
                    onClick={onCenter}
                    className="group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90"
                    style={{
                        background: DefaultCanvasPersona.tokens.ui.controlButton.background,
                        borderWidth: '1px',
                        borderColor: DefaultCanvasPersona.tokens.ui.controlButton.border,
                        color: DefaultCanvasPersona.tokens.ui.controlButton.text,
                        boxShadow: DefaultCanvasPersona.tokens.ui.controlButton.shadow,
                        backdropFilter: `blur(${DefaultCanvasPersona.tokens.ui.controlButton.backdropBlur})`,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = DefaultCanvasPersona.tokens.ui.controlButton.borderHover;
                        e.currentTarget.style.boxShadow = DefaultCanvasPersona.tokens.ui.controlButton.hoverShadow;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = DefaultCanvasPersona.tokens.ui.controlButton.border;
                        e.currentTarget.style.boxShadow = DefaultCanvasPersona.tokens.ui.controlButton.shadow;
                    }}
                    title={getLoc('Center', systemLang)}
                >
                    <Focus size={20} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
        </div>
    );
};
