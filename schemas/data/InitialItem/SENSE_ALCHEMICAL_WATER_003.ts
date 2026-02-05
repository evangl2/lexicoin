import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_WATER_ALCHEMICAL: VisualEntry = {
    "uid": "SENSE_ALCHEMICAL_WATER_003",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'motion/react';


    const WaterTotem = ({ isActive = false }) => {
        // Kinetic Variants for the Water Surface
        const waveVariants = {
            active: {
                d: [
                    "M18 40 Q50 35 82 40 L82 83 L18 83 Z",
                    "M18 40 Q50 45 82 40 L82 83 L18 83 Z",
                    "M18 40 Q50 35 82 40 L82 83 L18 83 Z"
                ],
                transition: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            },
            dormant: { d: "M18 40 Q50 40 82 40 L82 83 L18 83 Z" }
        };


        const rippleVariants = {
            active: (i) => ({
                opacity: [0.2, 0.5, 0.2],
                scaleX: [0.8, 1.1, 0.8],
                x: [i * 2, i * -2, i * 2],
                transition: {
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }),
            dormant: { opacity: 0.3, scaleX: 1, x: 0 }
        };


        return (
            <div className= "flex items-center justify-center w-full h-full bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-64 h-64 drop-shadow-xl"
        xmlns = "http://www.w3.org/2000/svg"
            >
            <defs>
            {/* Deep Fluid Gradient */ }
            < linearGradient id = "waterDepth" x1 = "0%" y1 = "0%" x2 = "0%" y2 = "100%" >
                <stop offset="0%" stopColor = "#4FC3F7" stopOpacity = "0.8" />
                    <stop offset="100%" stopColor = "#01579B" stopOpacity = "0.95" />
                        </linearGradient>


        {/* Caustic Reflection Pattern */ }
        <pattern id="caustics" x = "0" y = "0" width = "20" height = "20" patternUnits = "userSpaceOnUse" >
            <circle cx="10" cy = "10" r = "1" fill = "white" opacity = "0.2" >
                <animate attributeName="r" values = "1;2;1" dur = "3s" repeatCount = "indefinite" />
                    </circle>
                    </pattern>


        {/* Metallic Vessel Gradient */ }
        <linearGradient id="vesselFrame" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "0%" >
            <stop offset="0%" stopColor = "#B0BEC5" />
                <stop offset="50%" stopColor = "#ECEFF1" />
                    <stop offset="100%" stopColor = "#90A4AE" />
                        </linearGradient>


        {/* Mask for the Water inside the Triangle */ }
        <clipPath id="vesselClip" >
            <polygon points="50,95 15,15 85,15" />
                </clipPath>
                </defs>


        {/* Layer 1: The Alchemical Inverted Triangle (The Frame) */ }
        <polygon
          points="50,95 15,15 85,15"
        fill = "none"
        stroke = "url(#vesselFrame)"
        strokeWidth = "2"
        strokeLinejoin = "round"
            />


            {/* Layer 2: The Contained Fluid (Clipped) */ }
            < g clipPath = "url(#vesselClip)" >
                {/* Static Background Depth */ }
                < rect x = "0" y = "0" width = "100" height = "100" fill = "#012B4D" />

                    {/* Animated Liquid Volume */ }
                    < motion.path
        variants = { waveVariants }
        animate = { isActive? "active": "dormant" }
        fill = "url(#waterDepth)"
            />


            {/* Layer 3: Internal "Solvent" Nodes (Dissolving Matter) */ }
        {
            [...Array(4)].map((_, i) => (
                <motion.ellipse
              key= { i }
              custom = { i }
              variants = { rippleVariants }
              animate = { isActive? "active": "dormant" }
              cx = { 30 + (i * 15) }
              cy = { 55 + (i * 5) }
              rx = { 10 - i }
              ry = { 1}
              fill = "white"
                />
          ))
        }


        {/* Layer 4: Caustic Light Surface */ }
        <rect x="0" y = "0" width = "100" height = "100" fill = "url(#caustics)" style = {{ mixBlendMode: 'overlay' }
    } />
    </g>


{/* Layer 5: Refractive Highlights on Glass Edge */ }
<path
          d="M17 17 L50 92"
stroke = "white"
strokeWidth = "0.5"
strokeLinecap = "round"
opacity = "0.4"
    />
    <circle cx="50" cy = "15" r = "1.5" fill = "#B0BEC5" />
        <circle cx="15" cy = "15" r = "1.5" fill = "#B0BEC5" />
            <circle cx="85" cy = "15" r = "1.5" fill = "#B0BEC5" />
                </svg>
                </div>
  );
};


export default WaterTotem; "
};
