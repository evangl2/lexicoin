import React from 'react';
import { Hexagon } from 'lucide-react';
import { DefaultCardPersona as CardPersona } from '@/app/components/persona/default/Card.persona.default';

interface PropVisualProps {
  title: string;
  size?: number;
  className?: string;
  isHovered?: boolean;
}

export const PropVisual: React.FC<PropVisualProps> = ({ 
  title, 
  size = 100, 
  className = '',
  isHovered = false
}) => {
  const { tokens, definitions } = CardPersona;

  return (
    <div 
        className={`rounded-full flex flex-col items-center justify-center shadow-lg relative overflow-hidden transition-colors ${className}`}
        style={{
            width: size,
            height: size,
            backgroundColor: tokens.colors.bgBack, // #0e0e0e (approx #1a1a1a)
            borderColor: isHovered ? definitions.colors.goldBase : tokens.colors.borderInner,
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: tokens.shadows.base,
        }}
    >
       {/* Glow Effect */}
       <div 
         className="absolute inset-0 transition-opacity blur-md" 
         style={{ 
           backgroundColor: tokens.colors.borderSubtle,
           opacity: isHovered ? 1 : 0 
         }} 
       />
       
       {/* Icon */}
       <div 
         className="relative z-10 mb-1"
         style={{ color: definitions.colors.goldBase }}
       >
           <Hexagon size={size * 0.32} strokeWidth={1.5} className="animate-pulse" />
       </div>
       
       {/* Label */}
       <span 
         className="relative z-10 text-[10px] font-serif tracking-widest text-center px-1 leading-tight"
         style={{ 
           color: tokens.colors.textMuted
         }}
       >
           {title}
       </span>

       {/* Rotating Ring */}
       <div 
         className="absolute inset-2 border-dashed rounded-full animate-[spin_10s_linear_infinite]" 
         style={{
           borderWidth: '1px',
           borderColor: tokens.colors.borderInner
         }}
       />
    </div>
  );
};
