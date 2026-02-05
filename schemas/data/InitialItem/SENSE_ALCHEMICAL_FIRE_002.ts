import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_FIRE_ALCHEMICAL: VisualEntry = {
    "uid": "SENSE_ALCHEMICAL_FIRE_002",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'motion/react';


    const FireTotem = ({ isActive = false }) => {
        // Kinetic Variants
        const flameVariants = {
            active: (i) => ({
                d: [
                    "M50 20 Q60 40 50 60 Q40 40 50 20", // Initial
                    "M50 15 Q65 35 50 65 Q35 35 50 15", // Stretch
                    "M50 22 Q55 45 50 55 Q45 45 50 22"  // Compress
                ],
                opacity: [0.8, 1, 0.8],
                transition: {
                    duration: 2 + i * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                },
            }),
            dormant: { d: "M50 20 Q60 40 50 60 Q40 40 50 20", opacity: 0.9 }
        };


        const sparkVariants = {
            active: (i) => ({
                y: [0, -40],
                x: [0, (i % 2 === 0 ? 10 : -10)],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                transition: {
                    duration: 1.5 + i * 0.3,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: i * 0.2
                }
            }),
            dormant: { y: 0, opacity: 0 }
        };


        return (
            <div className= "flex items-center justify-center w-full h-full bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-64 h-64 drop-shadow-2xl"
        xmlns = "http://www.w3.org/2000/svg"
            >
            <defs>
            {/* Primary Heat Gradient */ }
            < radialGradient id = "coreGradient" cx = "50%" cy = "70%" r = "50%" >
                <stop offset="0%" stopColor = "#FFF200" />
                    <stop offset="40%" stopColor = "#FF7A00" />
                        <stop offset="100%" stopColor = "#FF0000" stopOpacity = "0.2" />
                            </radialGradient>


        {/* Alchemical Metal Gradient */ }
        <linearGradient id="baseMetal" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "100%" >
            <stop offset="0%" stopColor = "#4A4A4A" />
                <stop offset="50%" stopColor = "#2C2C2C" />
                    <stop offset="100%" stopColor = "#121212" />
                        </linearGradient>


        {/* Glow Filter */ }
        <filter id="bloom" >
            <feGaussianBlur stdDeviation="1.5" result = "blur" />
                <feComposite in="SourceGraphic" in2 = "blur" operator = "over" />
                    </filter>
                    </defs>


        {/* Layer 1: The Alchemical Anchor (The Triangle) */ }
        <polygon
          points="50,15 85,85 15,85"
        fill = "none"
        stroke = "url(#baseMetal)"
        strokeWidth = "1.5"
        strokeLinejoin = "round"
            />
            <polygon
          points="50,18 82,83 18,83"
        fill = "none"
        stroke = "#FF4D00"
        strokeWidth = "0.5"
        opacity = "0.4"
            />


            {/* Layer 2: The Core Embers (Geometric foundation) */ }
            < rect x = "45" y = "78" width = "10" height = "2" fill = "#FF2E00" rx = "1" />

                {/* Layer 3: Representative Kinetic Flames */ }
                < g filter = "url(#bloom)" >
                    {/* Outer Flame Tendril Left */ }
                    < motion.path
        custom = { 1}
        variants = { flameVariants }
        animate = { isActive? "active": "dormant" }
        d = "M45 75 Q30 50 45 25 Q55 50 45 75"
        fill = "url(#coreGradient)"
        style = {{ mixBlendMode: 'screen' }
    }
          />
    {/* Outer Flame Tendril Right */ }
    < motion.path
custom = { 2}
variants = { flameVariants }
animate = { isActive? "active": "dormant" }
d = "M55 75 Q70 50 55 25 Q45 50 55 75"
fill = "url(#coreGradient)"
style = {{ mixBlendMode: 'screen' }}
          />
{/* Central Sovereign Flame */ }
<motion.path
            custom={ 0 }
variants = { flameVariants }
animate = { isActive? "active": "dormant" }
d = "M50 80 Q65 55 50 20 Q35 55 50 80"
fill = "url(#coreGradient)"
    />
    </g>


{/* Layer 4: Specular Sparks (Energetic Release) */ }
{
    [...Array(5)].map((_, i) => (
        <motion.circle
            key= { i }
            custom = { i }
            variants = { sparkVariants }
            animate = { isActive? "active": "dormant" }
            cx = { 45 + (i * 2) }
            cy = { 60}
            r = "0.8"
            fill = "#FFD700"
        />
        ))
}


{/* Layer 5: The Base Platform */ }
<line x1="30" y1 = "85" x2 = "70" y2 = "85" stroke = "url(#baseMetal)" strokeWidth = "3" strokeLinecap = "round" />
    <line x1="35" y1 = "89" x2 = "65" y2 = "89" stroke = "#1A1A1A" strokeWidth = "1" strokeLinecap = "round" />
        </svg>
        </div>
  );
};


export default FireTotem; "
};
