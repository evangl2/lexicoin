import React from 'react';
import { motion } from 'motion/react';

interface AlchemyVisualProps {
  element: string; // "Fire", "Water", "Earth", "Air"
  isActive?: boolean;
}

export const AlchemyVisual: React.FC<AlchemyVisualProps> = ({ element = '', isActive = false }) => {
  const type = (element || '').toLowerCase();

  const commonFilter = (
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Heavy drop shadow for stereoscopic pop */}
      <filter id="popShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="10" stdDeviation="5" floodColor="#000" floodOpacity="0.8" />
      </filter>
    </defs>
  );

  // --- FIRE ---
  if (type === 'fire' || type === '火') {
    return (
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <svg width="75%" height="75%" viewBox="0 0 100 100" className="overflow-visible" shapeRendering="geometricPrecision" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.8))' }}>
          {commonFilter}
          <defs>
            <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#C04000" />
              <stop offset="50%" stopColor="#FF8000" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 50 5 L 95 90 L 5 90 Z"
            fill="transparent"
            stroke="#FFD700"
            strokeWidth="1"
            strokeOpacity={0.3}
            filter="url(#glow)"
            style={{ opacity: 1, transformOrigin: "50% 60%" }}
            animate={isActive ? { scale: [1, 1.05, 1], strokeOpacity: [0.3, 0.6, 0.3] } : { scale: 1, strokeOpacity: 0.3 }}
            transition={isActive ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
          />
          {/* Main Triangle */}
          <path d="M 50 10 L 90 85 L 10 85 Z" fill="none" stroke="url(#fireGrad)" strokeWidth="4" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />

          {/* Floating Core */}
          <motion.circle cx="50" cy="65" r="12" fill="#FF4500" opacity={0.8} filter="url(#glow)"
            animate={isActive ? { scale: [0.9, 1.1, 0.9], y: [0, -5, 0] } : { scale: 1, y: 0 }}
            transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
          />
        </svg>
      </div>
    );
  }

  // --- WATER ---
  if (type === 'water' || type === '水') {
    return (
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <svg width="75%" height="75%" viewBox="0 0 100 100" className="overflow-visible" shapeRendering="geometricPrecision" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.8))' }}>
          {commonFilter}
          <defs>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00BFFF" />
              <stop offset="100%" stopColor="#1E90FF" />
            </linearGradient>
          </defs>
          {/* Main Cup */}
          <path d="M 10 15 L 90 15 L 50 85 Z" fill="none" stroke="url(#waterGrad)" strokeWidth="4" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />

          {/* Ripples */}
          <motion.circle cx="50" cy="35" r="10" stroke="#00BFFF" strokeWidth="2" fill="none" opacity={0.8}
            animate={isActive ? { r: [5, 25], opacity: [0.8, 0], strokeWidth: [2, 0.5] } : { r: 5, opacity: 0, strokeWidth: 2 }}
            transition={isActive ? { duration: 2.5, repeat: Infinity, ease: "easeOut" } : { duration: 0.5 }}
          />
        </svg>
      </div>
    );
  }

  // --- EARTH ---
  if (type === 'earth' || type === '土') {
    return (
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <svg width="70%" height="70%" viewBox="0 0 100 100" className="overflow-visible" shapeRendering="geometricPrecision" style={{ filter: 'drop-shadow(0px 15px 20px rgba(0,0,0,0.9))' }}>
          {commonFilter}
          <defs>
            <linearGradient id="earthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B4513" />
              <stop offset="100%" stopColor="#CD853F" />
            </linearGradient>
          </defs>
          {/* Rotating Cube Frame */}
          <motion.rect
            x="15" y="15" width="70" height="70"
            fill="none"
            stroke="url(#earthGrad)"
            strokeWidth="4"
            filter="url(#glow)"
            animate={isActive ? { rotate: [0, 5, 0, -5, 0] } : { rotate: 0 }}
            transition={isActive ? { duration: 10, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
            style={{ transformOrigin: "50% 50%" }}
          />
          {/* Crossbar */}
          <motion.path d="M 15 50 L 85 50" stroke="#CD853F" strokeWidth="2" opacity={0.6}
            animate={isActive ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.6 }}
            transition={isActive ? { duration: 4, repeat: Infinity } : { duration: 0.5 }}
          />

          {/* Core Cube */}
          <rect x="35" y="35" width="30" height="30" fill="#8B4513" opacity="0.8" />
        </svg>
      </div>
    );
  }

  // --- AIR / WIND ---
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <svg width="75%" height="75%" viewBox="0 0 100 100" className="overflow-visible" shapeRendering="geometricPrecision" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.8))' }}>
        {commonFilter}
        <defs>
          <linearGradient id="airGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0FFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>

        {/* Air Triangle */}
        <path d="M 50 10 L 90 85 L 10 85 Z" fill="none" stroke="url(#airGrad)" strokeWidth="4" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 25 60 L 75 60" stroke="#E0FFFF" strokeWidth="2" strokeOpacity={0.8} filter="url(#glow)" />

        {/* Orbiting Particle */}
        <motion.circle cx="50" cy="50" r="3" fill="#fff"
          animate={isActive ? {
            cx: [50, 70, 50, 30, 50],
            cy: [30, 50, 70, 50, 30],
            scale: [0.8, 1.2, 0.8, 1.2, 0.8]
          } : { cx: 50, cy: 30, scale: 1 }}
          transition={isActive ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
        />
      </svg>
    </div>
  );
};
