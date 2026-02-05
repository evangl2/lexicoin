import type { VisualEntry } from '../../schemas/SenseEntity.schema';

export const VISUAL_AIR_PHYSICAL: VisualEntry = {
    "uid": "SENSE_PHYSICAL_AIR_005",
    "id": "default",
    "meta": {
        "stability": 100.0,
        "firstDiscoverer": "UNKNOWN",
        "firstDiscoveredAt": 0
    },
    "payload": "import React from 'react';
import { motion } from 'framer-motion';


    const AirTotem = ({ isActive = false }) => {
        // Kinetic Variants for Gaseous Flow
        const flowVariants = {
            active: (i) => ({
                d: [
                    "M20,50 Q35,40 50,50 T80,50",
                    "M20,52 Q35,60 50,52 T80,52",
                    "M20,50 Q35,40 50,50 T80,50"
                ],
                opacity: [0.2, 0.5, 0.2],
                transition: {
                    duration: 5 + i,
                    repeat: Infinity,
                    ease: "easeInOut",
                }
            }),
            dormant: { opacity: 0.3 }
        };


        const particleVariants = {
            active: (i) => ({
                x: [0, 10, -10, 0],
                y: [0, -15, 5, 0],
                opacity: [0.1, 0.4, 0.1],
                transition: {
                    duration: 4 + i,
                    repeat: Infinity,
                    ease: "linear",
                }
            }),
            dormant: { opacity: 0.2 }
        };


        const rotationVariant = {
            active: {
                rotate: 360,
                transition: { duration: 20, repeat: Infinity, ease: "linear" }
            },
            dormant: { rotate: 0 }
        };


        return (
            <div className= "w-full h-full flex items-center justify-center bg-transparent" >
            <svg
        viewBox="0 0 100 100"
        className = "w-4/5 h-4/5 overflow-visible"
            >
            <defs>
            {/* Atmospheric Haze Filter */ }
            < filter id = "airBlur" x = "-20%" y = "-20%" width = "140%" height = "140%" >
                <feGaussianBlur in="SourceGraphic" stdDeviation = "1.5" />
                    </filter>


        {/* Molecular Gradient */ }
        <radialGradient id="moleculeGrad" cx = "50%" cy = "50%" r = "50%" >
            <stop offset="0%" stopColor = "#E0F2FE" stopOpacity = "0.8" />
                <stop offset="100%" stopColor = "#BAE6FD" stopOpacity = "0" />
                    </radialGradient>


        {/* Wind Current Gradient */ }
        <linearGradient id="currentGrad" x1 = "0%" y1 = "50%" x2 = "100%" y2 = "50%" >
            <stop offset="0%" stopColor = "#F8FAFC" stopOpacity = "0" />
                <stop offset="50%" stopColor = "#E2E8F0" stopOpacity = "0.6" />
                    <stop offset="100%" stopColor = "#F8FAFC" stopOpacity = "0" />
                        </linearGradient>
                        </defs>


        {/* Layer 1: The Containment Sphere (Atmospheric Boundary) */ }
        <circle
          cx="50"
        cy = "50"
        r = "42"
        fill = "none"
        stroke = "url(#moleculeGrad)"
        strokeWidth = "0.5"
        strokeDasharray = "1 3"
        className = "opacity-40"
            />


            {/* Layer 2: Swirling Gas Currents */ }
            < motion.g
        variants = { rotationVariant }
        animate = { isActive? "active": "dormant" }
        style = {{ originX: "50px", originY: "50px" }
    }
        >
{
    [1, 2, 3].map((i) => (
        <motion.path
              key= {`stream-${i}`}
variants = { flowVariants }
custom = { i }
animate = { isActive? "active": "dormant" }
d = "M20,50 Q35,40 50,50 T80,50"
fill = "none"
stroke = "url(#currentGrad)"
strokeWidth = { 1 + i }
filter = "url(#airBlur)"
style = {{
    rotate: i * 120,
        originX: "50px",
            originY: "50px",
                transform: `translateY(${(i - 2) * 5}px)`
}}
            />
          ))}
</motion.g>


{/* Layer 3: Nitrogen/Oxygen Clusters (Molecular Detail) */ }
{
    [...Array(6)].map((_, i) => (
        <motion.circle
            key= {`mol-${i}`}
cx = { 30 + (i * 8) }
cy = { 25 + (i * 10) % 50 }
r = { 1.5 + (i % 2) }
fill = "url(#moleculeGrad)"
variants = { particleVariants }
custom = { i }
animate = { isActive? "active": "dormant" }
    />
        ))}


{/* Layer 4: Central Core Pressure Node */ }
<motion.ellipse
          cx="50"
cy = "50"
rx = "15"
ry = "15"
fill = "none"
stroke = "#F1F5F9"
strokeWidth = "0.2"
animate = { isActive? {
    scale: [1, 1.1, 1],
        opacity: [0.1, 0.3, 0.1]
} : { }}
transition = {{ duration: 4, repeat: Infinity }}
        />
    </svg>
    </div>
  );
};


export default AirTotem; "
};
