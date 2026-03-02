import fs from 'fs';
let content = fs.readFileSync('src/app/components/ui/Dock.tsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { motion } from 'motion/react';",
  "import { motion, useTransform } from 'motion/react';\nimport { useWindowDimensions } from '@/app/hooks/useWindowDimensions';"
);

// 2. State & Effect
const targetStartStr = "   // --- Auto-Resize Logic (HUD Scaling) ---";
const targetEndStr = "   }, [interfacePersona.dock.layout.baseWidth, interfacePersona.dock.metrics.scaleMin, interfacePersona.dock.metrics.scaleMax]);";
const startIndex = content.indexOf(targetStartStr);
const endIndex = content.indexOf(targetEndStr) + targetEndStr.length;

if (startIndex !== -1 && endIndex !== -1) {
   const replacementStr = `   // --- Auto-Resize Logic (HUD Scaling) via MotionValues ---
   // ⚡ Bolt Optimization: Eliminated React re-renders on window resize by mapping
   // window dimensions to CSS transforms directly through Framer Motion.
   const { windowWidth } = useWindowDimensions();
   const dockScale = useTransform(windowWidth, (width) => {
      const baseWidth = interfacePersona.dock.layout.baseWidth;
      const newScale = Math.max(
         interfacePersona.dock.metrics.scaleMin,
         Math.min(interfacePersona.dock.metrics.scaleMax, width / baseWidth)
      );
      return newScale;
   });

   // Apply the zoomed modifier. Note: isZoomed is a react prop, but we can compute the final transform
   const dockTransform = useTransform(dockScale, (scale) => {
      return \`scale(\${scale * (isZoomed ? 0.75 : 1)})\`;
   });`;

   content = content.slice(0, startIndex) + replacementStr + content.slice(endIndex);
}

// 3. Update inner container div -> motion.div
const divSearch = `         {/* Inner Container: Handles Scaling and Layout */}
         <div
            className="relative flex flex-col items-center justify-end transition-all duration-500 ease-out"
            style={{
               transform: \`scale(\${scale * (isZoomed ? 0.75 : 1)})\`,
               opacity: isZoomed ? 0.4 : 1,
               transformOrigin: 'bottom center',
               filter: isZoomed ? 'blur(2px)' : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
         >`;

const divReplace = `         {/* Inner Container: Handles Scaling and Layout */}
         <motion.div
            className="relative flex flex-col items-center justify-end transition-all duration-500 ease-out"
            style={{
               transform: dockTransform,
               opacity: isZoomed ? 0.4 : 1,
               transformOrigin: 'bottom center',
               filter: isZoomed ? 'blur(2px)' : 'none'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
         >`;

content = content.replace(divSearch, divReplace);

// We also need to change its closing tag from </div> to </motion.div>
// Let's find where this div closes. It contains the dock nodes and ends before `</div> </div>` at the end of Dock component
// Actually, let's just do a regex replace for the closing tag.
// It's the `</div>` before `</div>` and `</div>`... Wait, there are multiple nodes.
// Here's the structure:
// <div className="fixed bottom-0...">
//   <div> <DeckRepository /> </div>
//   <div> <ConfigMenu /> </div>
//   <motion.div> ... </motion.div>
// </div>
// Let's replace the last `</div>` before the outer `</div> </div>`
const lastDivsRegex = /<\/div>\n      <\/div>\n   \);\n\};\n\n\/\* --- The Rune Lock Node ---\ \*\//;
content = content.replace(/<\/div>\n      <\/div>\n   \);\n\};\n\n\/\* --- The Rune Lock Node --- \*\//, "</motion.div>\n      </div>\n   );\n};\n\n/* --- The Rune Lock Node --- */");

fs.writeFileSync('src/app/components/ui/Dock.tsx', content);
