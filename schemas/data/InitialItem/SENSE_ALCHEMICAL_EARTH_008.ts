import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_EARTH_ALCHEMICAL: VisualEntry = {
    "uid": "SENSE_ALCHEMICAL_EARTH_008",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'motion/react';


    const EarthTotem = ({ isActive = false }) => {
        // Kinetic Variants for Tectonic Shifting
        const tectonicVariants = {
            active: (i) => ({
                x: i % 2 === 0 ? [0, 1.5, 0] : [0, -1.5, 0],
                y: [0, -0.5, 0],
                transition: {
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.4
                }
            }),
            dormant: { x: 0, y: 0 }
        };


        // Kinetic Variants for "Root" growth or pressure
        const pressureVariants = {
            active: {
                strokeDashoffset: [0, -20],
                opacity: [0.3, 0.7, 0.3],
                transition: { duration: 3, repeat: Infinity, ease: "linear" }
            },
            dormant: { strokeDashoffset: 0, opacity: 0.2 }
        };


        return (
            <div className= "flex items-center justify-center w-full h-full bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-64 h-64 drop-shadow-2xl"
        xmlns = "http://www.w3.org/2000/svg"
            >
            <defs>
            {/* Mineral & Stone Gradient */ }
            < linearGradient id = "stoneGradient" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "100%" >
                <stop offset="0%" stopColor = "#4D3E3E" />
                    <stop offset="40%" stopColor = "#2D2424" />
                        <stop offset="100%" stopColor = "#1A1515" />
                            </linearGradient>


        {/* Crystalline Highlight */ }
        <linearGradient id="crystalFacet" x1 = "0%" y1 = "0%" x2 = "0%" y2 = "100%" >
            <stop offset="0%" stopColor = "#94A3B8" stopOpacity = "0.6" />
                <stop offset="100%" stopColor = "#334155" stopOpacity = "0" />
                    </linearGradient>


        {/* Deep Earth Shadow Filter */ }
        <filter id="crush" >
            <feDropShadow dx="0" dy = "1" stdDeviation = "0.8" floodOpacity = "0.8" />
                </filter>


        {/* Clipping for the Tectonic Sections */ }
        <clipPath id="earthContainer" >
            <polygon points="15,20 85,20 50,90" />
                </clipPath>
                </defs>


        {/* Layer 1: The Alchemical Anchor (Inverted Triangle with Bar) */ }
        <g stroke="#78350F" fill = "none" strokeWidth = "2" >
            <polygon points="15,20 85,20 50,90" strokeOpacity = "0.5" />
                <line x1="32.5" y1 = "55" x2 = "67.5" y2 = "55" strokeOpacity = "0.9" />
                    </g>


        {/* Layer 2: Tectonic Plates (Fractional Blocks) */ }
        <g clipPath="url(#earthContainer)" filter = "url(#crush)" >
            <motion.rect 
            x="15" y = "20" width = "70" height = "25" fill = "#3E2723"
        custom = { 1} variants = { tectonicVariants } animate = { isActive? "active": "dormant" }
            />
            <motion.path 
            d="M15 45 L85 45 L70 70 L30 70 Z" fill = "url(#stoneGradient)"
        custom = { 2} variants = { tectonicVariants } animate = { isActive? "active": "dormant" }
            />
            <motion.path 
            d="M30 70 L70 70 L50 90 Z" fill = "#1B1616"
        custom = { 3} variants = { tectonicVariants } animate = { isActive? "active": "dormant" }
            />
            </g>


        {/* Layer 3: Crystalline Facets (The "Salt" of the Earth) */ }
        <motion.polygon
          points="50,55 65,70 50,85 35,70"
        fill = "url(#crystalFacet)"
        style = {{ mixBlendMode: 'overlay' }
    }
          animate={ isActive? { opacity: [0.3, 0.6, 0.3] }: { opacity: 0.4 }}
transition = {{ duration: 4, repeat: Infinity }}
        />


{/* Layer 4: Deep Pressure Veins */ }
<motion.path
          d="M32.5 55 L50 90 L67.5 55"
fill = "none"
stroke = "#F59E0B"
strokeWidth = "0.5"
strokeDasharray = "2 4"
variants = { pressureVariants }
animate = { isActive? "active": "dormant" }
    />


    {/* Layer 5: Foundation Base Line */ }
    < line x1 = "20" y1 = "92" x2 = "80" y2 = "92" stroke = "#451A03" strokeWidth = "3" strokeLinecap = "round" opacity = "0.8" />
        <rect x="45" y = "91" width = "10" height = "2" fill = "#92400E" rx = "0.5" />
            </svg>
            </div>
  );
};


export default EarthTotem; "
};
