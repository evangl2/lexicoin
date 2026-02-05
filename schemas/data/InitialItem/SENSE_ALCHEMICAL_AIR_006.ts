import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_AIR_ALCHEMICAL: VisualEntry = {
    "uid": "SENSE_ALCHEMICAL_AIR_006",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'motion/react';


    const AirTotem = ({ isActive = false }) => {
        // Kinetic Variants for the 'Breath' expansion
        const breathVariants = {
            active: {
                scale: [1, 1.05, 1],
                opacity: [0.4, 0.7, 0.4],
                transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            },
            dormant: { scale: 1, opacity: 0.3 }
        };


        // Kinetic Variants for the wind currents
        const streamVariants = {
            active: (i) => ({
                strokeDashoffset: [0, -100],
                opacity: [0, 1, 0],
                transition: {
                    duration: 3 + i,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.5
                }
            }),
            dormant: { strokeDashoffset: 0, opacity: 0.2 }
        };


        return (
            <div className= "flex items-center justify-center w-full h-full bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-64 h-64"
        xmlns = "http://www.w3.org/2000/svg"
            >
            <defs>
            {/* Ethereal Gradient */ }
            < linearGradient id = "airGradient" x1 = "0%" y1 = "0%" x2 = "100%" y2 = "100%" >
                <stop offset="0%" stopColor = "#E0F2F1" stopOpacity = "0.1" />
                    <stop offset="50%" stopColor = "#B2EBF2" stopOpacity = "0.6" />
                        <stop offset="100%" stopColor = "#FFFFFF" stopOpacity = "0.2" />
                            </linearGradient>


        {/* Blur for Atmospheric Depth */ }
        <filter id="haze" x = "-20%" y = "-20%" width = "140%" height = "140%" >
            <feGaussianBlur stdDeviation="1.2" />
                </filter>


        {/* Glow for the 'Soul' nodes */ }
        <filter id="soulGlow" >
            <feGaussianBlur stdDeviation="0.8" result = "blur" />
                <feComposite in="SourceGraphic" in2 = "blur" operator = "over" />
                    </filter>
                    </defs>


        {/* Layer 1: The Alchemical Anchor (Triangle with Bar) */ }
        <g stroke="#94A3B8" fill = "none" strokeWidth = "1" >
            <polygon points="50,15 85,85 15,85" strokeOpacity = "0.4" />
                <line x1="32.5" y1 = "50" x2 = "67.5" y2 = "50" strokeOpacity = "0.8" strokeWidth = "1.5" />
                    </g>


        {/* Layer 2: The Inner Breath (Pulsing Core) */ }
        <motion.ellipse
          cx="50" cy = "55" rx = "25" ry = "30"
        fill = "url(#airGradient)"
        filter = "url(#haze)"
        variants = { breathVariants }
        animate = { isActive? "active": "dormant" }
            />


            {/* Layer 3: Communication Streams (Wind Paths) */ }
            < g filter = "url(#soulGlow)" >
            {
                [1, 2, 3].map((i) => (
                    <motion.path
              key= { i }
              custom = { i }
              variants = { streamVariants }
              animate = { isActive? "active": "dormant" }
              d = {`M ${20 + i * 5} ${80 - i * 10} Q 50 ${40 - i * 5} ${80 - i * 5} ${20 + i * 5}`}
        stroke = "#F0F9FF"
        strokeWidth = "0.5"
        strokeDasharray = "10 20"
        fill = "none"
            />
          ))}
</g>


{/* Layer 4: Intellectual Nodes (Data/Thought flow) */ }
<g fill="#BAE6FD" >
    <motion.circle 
            cx="50" cy = "50" r = "1.5"
animate = { isActive? { opacity: [0.2, 1, 0.2] } : { opacity: 0.5 }}
transition = {{ duration: 2, repeat: Infinity }}
          />
    < circle cx = "32.5" cy = "50" r = "1" opacity = "0.8" />
        <circle cx="67.5" cy = "50" r = "1" opacity = "0.8" />
            </g>


{/* Layer 5: The "Soul" Particles (Wisps) */ }
{
    isActive && [...Array(6)].map((_, i) => (
        <motion.circle
            key= {`wisp-${i}`}
cx = { 40 + Math.random() * 20 }
cy = { 30 + Math.random() * 40 }
r = "0.4"
fill = "#FFF"
animate = {{
    y: [0, -20],
        x: [0, (i % 2 === 0 ? 5 : -5)],
            opacity: [0, 0.8, 0],
            }}
transition = {{
    duration: 4,
        repeat: Infinity,
            delay: i * 0.7,
                ease: "easeOut"
}}
          />
        ))}
</svg>
    </div>
  );
};


export default AirTotem; "
};
