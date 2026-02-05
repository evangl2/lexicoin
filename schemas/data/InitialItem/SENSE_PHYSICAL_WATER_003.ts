import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_WATER_PHYSICAL: VisualEntry = {
  "uid": "SENSE_PHYSICAL_WATER_003",
  "id": "default",
  "meta": {
    "stability": 100.0,
    "firstDiscoverer": "UNKNOWN",
    "firstDiscoveredAt": 0
  },
  "payload": "import React from 'react';
import { motion } from 'framer-motion';


  const FireSenseWater = ({ isActive = false }) => {
    // Kinetic Variants
    const liquidVariant = {
      active: {
        d: [
          "M50 15 Q65 35 75 50 T50 85 T25 50 T50 15",
          "M50 18 Q70 30 80 55 T50 82 T20 45 T50 18",
          "M50 15 Q65 35 75 50 T50 85 T25 50 T50 15"
        ],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }
      },
      dormant: {}
    };


    const causticVariant = {
      active: {
        opacity: [0.3, 0.6, 0.3],
        rotate: [0, 5, -5, 0],
        scale: [1, 1.05, 0.95, 1],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    };


    const bubbleVariant = {
      active: (i) => ({
        y: [-5, -40],
        opacity: [0, 0.8, 0],
        transition: {
          duration: 3 + i,
          repeat: Infinity,
          delay: i * 0.8,
          ease: "linear"
        }
      })
    };


    return (
      <div className= "w-full h-full flex items-center justify-center bg-transparent p-4" >
      <svg
        viewBox="0 0 100 100"
    className = "w-full h-full drop-shadow-2xl"
    style = {{ filter: 'drop-shadow(0 0 10px rgba(173, 216, 230, 0.3))' }
  }
      >
  <defs>
  {/* Main Body Gradient - Simulating depth and transparency */ }
  < radialGradient id = "liquidGrad" cx = "50%" cy = "40%" r = "60%" >
    <stop offset="0%" stopColor = "#ffffff" stopOpacity = "0.4" />
      <stop offset="50%" stopColor = "#e0f2fe" stopOpacity = "0.2" />
        <stop offset="100%" stopColor = "#7dd3fc" stopOpacity = "0.5" />
          </radialGradient>


{/* Caustic Filter for Internal Light Play */ }
<filter id="causticBlur" >
  <feGaussianBlur in="SourceGraphic" stdDeviation = "0.8" />
    </filter>


{/* Rim Lighting */ }
<linearGradient id="rimLight" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "100%" >
  <stop offset="0%" stopColor = "#fff" stopOpacity = "0.8" />
    <stop offset="40%" stopColor = "#fff" stopOpacity = "0" />
      <stop offset="100%" stopColor = "#0ea5e9" stopOpacity = "0.3" />
        </linearGradient>


{/* Mask for internal elements */ }
<clipPath id="dropletMask" >
  <path d="M50 15 Q65 35 75 50 T50 85 T25 50 T50 15" />
    </clipPath>
    </defs>


{/* Shadow/Base Perspective */ }
<ellipse cx="50" cy = "88" rx = "20" ry = "4" fill = "rgba(0,0,0,0.1)" />


  {/* The Core Liquid Vessel */ }
  < motion.path
variants = { liquidVariant }
animate = { isActive? "active": "dormant" }
d = "M50 15 Q65 35 75 50 T50 85 T25 50 T50 15"
fill = "url(#liquidGrad)"
stroke = "url(#rimLight)"
strokeWidth = "0.5"
  />


  {/* Refractive Caustics (Visible within mask) */ }
  < g clipPath = "url(#dropletMask)" >
    <motion.path
            variants={ causticVariant }
animate = { isActive? "active": "dormant" }
d = "M40 40 Q50 45 60 40 T70 60 T40 70 Z"
fill = "none"
stroke = "white"
strokeWidth = "0.2"
strokeDasharray = "1 2"
filter = "url(#causticBlur)"
opacity = "0.4"
  />

  {/* Internal Rising Bubbles (Living Fluids) */ }
{
  [1, 2, 3].map((i) => (
    <motion.circle
              key= { i }
              cx = { 40 + (i * 5) }
              cy = { 80}
              r = { 1 + (i * 0.5) }
              fill = "white"
              opacity = "0.6"
              variants = { bubbleVariant }
              custom = { i }
              animate = { isActive? "active": "dormant" }
    />
          ))
}
</g>


{/* Surface Specular Highlight (The "Glint") */ }
<motion.ellipse
          cx="42"
cy = "35"
rx = "3"
ry = "6"
fill = "white"
opacity = "0.4"
rotate = "-20"
animate = { isActive? {
  opacity: [0.4, 0.6, 0.4],
    scale: [1, 1.1, 1],
          } : { }}
transition = {{ duration: 3, repeat: Infinity }}
        />
  </svg>
  </div>
  );
};


export default FireSenseWater; "
};
