import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_FIRE_PHYSICAL: VisualEntry = {
  "uid": "SENSE_PHYSICAL_FIRE_001",
  "id": "default",
  "meta": {
    "stability": 100.0,
    "firstDiscoverer": "UNKNOWN",
    "firstDiscoveredAt": 0
  },
  "payload": "import React from 'react';
import { motion } from 'framer-motion';


  const FireTotem = ({ isActive = false }) => {
    // Variants for the flickering flame paths
    const flameVariants = {
      dormant: {
        scaleY: 1,
        opacity: 0.9,
        transition: { duration: 0.5 }
      },
      active: (i) => ({
        scaleY: [1, 1.15, 0.95, 1.1],
        scaleX: [1, 0.95, 1.05, 1],
        opacity: [0.8, 1, 0.9, 1],
        transition: {
          duration: 2 + i * 0.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }),
    };


    // Variants for the ember particles
    const emberVariants = {
      dormant: { y: 0, opacity: 0 },
      active: (i) => ({
        y: [0, -40],
        x: [0, Math.sin(i) * 10, Math.cos(i) * 5],
        opacity: [0, 1, 0],
        transition: {
          duration: 3,
          repeat: Infinity,
          delay: i * 0.8,
          ease: "easeOut",
        },
      }),
    };


    return (
      <div className= "flex items-center justify-center w-full h-full bg-transparent" >
      <svg
        viewBox="0 0 100 100"
    className = "w-64 h-64 overflow-visible"
    style = {{ filter: 'drop-shadow(0 0 10px rgba(255, 80, 0, 0.4))' }
  }
      >
  <defs>
  {/* Heat Gradient: From Core White to Exterior Crimson */ }
  < radialGradient id = "coreHeat" cx = "50%" cy = "75%" r = "50%" >
    <stop offset="0%" stopColor = "#FFFFFF" />
      <stop offset="20%" stopColor = "#FFD700" />
        <stop offset="50%" stopColor = "#FF4500" />
          <stop offset="100%" stopColor = "#8B0000" stopOpacity = "0" />
            </radialGradient>


{/* Turbulence Filter for the 'Heat Haze' effect */ }
<filter id="heatHaze" >
  <feTurbulence
              type="fractalNoise"
baseFrequency = { isActive? "0.05": "0.00" }
numOctaves = "2"
result = "noise"
  >
  <animate
                attributeName="baseFrequency"
values = "0.05; 0.07; 0.05"
dur = "3s"
repeatCount = "indefinite"
  />
  </feTurbulence>
  < feDisplacementMap in="SourceGraphic" in2 = "noise" scale = { isActive? "5": "0" } />
    </filter>


{/* Soft Glow Mask */ }
<filter id="bloom" >
  <feGaussianBlur stdDeviation="2" result = "blur" />
    <feComposite in="SourceGraphic" in2 = "blur" operator = "over" />
      </filter>
      </defs>


{/* The Base/Hearth (Static shape) */ }
<ellipse cx="50" cy = "85" rx = "15" ry = "5" fill = "#222" opacity = "0.4" />


  <g filter="url(#heatHaze)" >
    {/* Outer Flame Layer */ }
    < motion.path
d = "M50 85 C30 85 20 60 50 20 C80 60 70 85 50 85 Z"
fill = "url(#coreHeat)"
variants = { flameVariants }
custom = { 1}
animate = { isActive? "active": "dormant" }
style = {{ originY: "85%", opacity: 0.6 }}
          />


{/* Middle Flame Layer */ }
<motion.path
            d="M50 80 C35 80 30 65 50 35 C70 65 65 80 50 80 Z"
fill = "#FF8C00"
variants = { flameVariants }
custom = { 2}
animate = { isActive? "active": "dormant" }
style = {{ originY: "80%", mixBlendMode: "screen" }}
          />


{/* Core Plasma Layer */ }
<motion.path
            d="M50 75 C42 75 40 68 50 50 C60 68 58 75 50 75 Z"
fill = "#FFF5EE"
variants = { flameVariants }
custom = { 3}
animate = { isActive? "active": "dormant" }
style = {{ originY: "75%", filter: "url(#bloom)" }}
          />
  </g>


{/* Embers/Particles */ }
{
  [1, 2, 3].map((i) => (
    <motion.circle
            key= { i }
            cx = { 40 + i * 5 }
            cy = "70"
            r = "0.8"
            fill = "#FFD700"
            variants = { emberVariants }
            custom = { i }
            animate = { isActive? "active": "dormant" }
    />
        ))
}


{/* Final Specular Highlight (The 'Eye' of the flame) */ }
<motion.circle
          cx="50"
cy = "70"
r = "4"
fill = "white"
initial = {{ opacity: 0.2 }}
animate = { isActive? { opacity: [0.2, 0.5, 0.2] } : { opacity: 0.2 }}
transition = {{ duration: 1.5, repeat: Infinity }}
style = {{ filter: 'blur(2px)' }}
        />
  </svg>
  </div>
  );
};


export default FireTotem; "
};
