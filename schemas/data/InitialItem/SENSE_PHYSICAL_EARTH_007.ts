import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_EARTH_PHYSICAL: VisualEntry = {
    "uid": "SENSE_PHYSICAL_EARTH_007",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'framer-motion';


    const EarthSoilTotem = ({ isActive = false }) => {
        // Kinetic Variants: Heavy, tectonic shifting
        const tectonicShift = {
            active: {
                y: [0, -1.5, 0.5, 0],
                rotateX: [0, 2, -1, 0],
                transition: {
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            },
            dormant: { y: 0, rotateX: 0 }
        };


        const rootPulse = {
            active: {
                strokeDashoffset: [10, 0, 10],
                opacity: [0.3, 0.7, 0.3],
                transition: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }
        };


        return (
            <div className= "w-full h-full flex items-center justify-center bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-full h-full drop-shadow-xl"
        style = {{ perspective: '800px' }
    }
      >
    <defs>
    {/* Soil Texture Filter: Creating "Grit" */ }
    < filter id = "soilGrit" >
        <feTurbulence type="fractalNoise" baseFrequency = "0.8" numOctaves = "4" result = "noise" />
            <feDiffuseLighting in="noise" lightingColor = "#543a22" surfaceScale = "2" >
                <feDistantLight azimuth="45" elevation = "60" />
                    </feDiffuseLighting>
                    </filter>


{/* Horizon Gradient: Organic to Mineral */ }
<linearGradient id="soilHorizon" x1 = "0%" y1 = "0%" x2 = "0%" y2 = "100%" >
    <stop offset="0%" stopColor = "#2d1b0e" /> {/* Humus */ }
        < stop offset = "40%" stopColor = "#543a22" /> {/* Topsoil */ }
            < stop offset = "100%" stopColor = "#a67c52" /> {/* Subsoil */ }
                </linearGradient>


{/* Specular Mineral Gradient */ }
<radialGradient id="mineralGlow" cx = "50%" cy = "50%" r = "50%" >
    <stop offset="0%" stopColor = "#fde68a" stopOpacity = "0.6" />
        <stop offset="100%" stopColor = "#fde68a" stopOpacity = "0" />
            </radialGradient>
            </defs>


{/* The Monolith Body (Geometric Assembly) */ }
<motion.g
          variants={ tectonicShift }
animate = { isActive? "active": "dormant" }
    >
    {/* Main Soil Block */ }
    < rect x = "25" y = "30" width = "50" height = "50" rx = "2" fill = "url(#soilHorizon)" />

        {/* Texture Overlay */ }
        < rect x = "25" y = "30" width = "50" height = "50" rx = "2" fill = "black" opacity = "0.2" filter = "url(#soilGrit)" />


            {/* Crystalline Mineral Deposits (Geometric Inlays) */ }
            < polygon points = "35,45 38,42 41,45 38,48" fill = "#fde68a" opacity = "0.8" >
                <motion.animate 
                attributeName="opacity"
values = "0.4;0.9;0.4"
dur = "3s"
repeatCount = "indefinite"
    />
    </polygon>

{/* Organic Fissures (Root paths) */ }
<motion.path
            d="M50 30 Q55 45 45 60 T50 80"
fill = "none"
stroke = "#1a2e05"
strokeWidth = "0.8"
strokeDasharray = "2 1"
variants = { rootPulse }
animate = { isActive? "active": "dormant" }
    />

    <motion.path
            d="M35 30 Q30 50 40 70"
fill = "none"
stroke = "#1a2e05"
strokeWidth = "0.5"
opacity = "0.4"
variants = { rootPulse }
animate = { isActive? "active": "dormant" }
    />


    {/* Surface Detail: The "Land Surface" Crust */ }
    < rect x = "25" y = "30" width = "50" height = "4" fill = "#1a1108" />
        <line x1="25" y1 = "34" x2 = "75" y2 = "34" stroke = "#78350f" strokeWidth = "0.5" opacity = "0.5" />
            </motion.g>


{/* Ambient Ground Glow */ }
<ellipse cx="50" cy = "85" rx = "30" ry = "5" fill = "url(#mineralGlow)" opacity = "0.3" />
    </svg>
    </div>
  );
};


export default EarthSoilTotem; "
};
