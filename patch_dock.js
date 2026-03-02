import fs from 'fs';
const content = fs.readFileSync('src/app/components/ui/Dock.tsx', 'utf8');

// 1. Import useWindowDimensions and useTransform
let newContent = content.replace(
  "import { motion } from 'motion/react';",
  "import { motion, useTransform } from 'motion/react';\nimport { useWindowDimensions } from '@/app/hooks/useWindowDimensions';"
);

// Find the section to replace:
const targetStartStr = "   // --- Auto-Resize Logic (HUD Scaling) ---";
const targetEndStr = "   }, [interfacePersona.dock.layout.baseWidth, interfacePersona.dock.metrics.scaleMin, interfacePersona.dock.metrics.scaleMax]);";
const startIndex = newContent.indexOf(targetStartStr);
const endIndex = newContent.indexOf(targetEndStr) + targetEndStr.length;

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

   newContent = newContent.slice(0, startIndex) + replacementStr + newContent.slice(endIndex);
}

// 2. We need to apply this transform to the wrapper.
// Let's find the wrapper div.
const wrapperSearch = `         <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-50 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
               transform: \`scale(\${scale * (isZoomed ? 0.75 : 1)})\`,
               paddingBottom: interfacePersona.dock.layout.safeAreaBottom,`;

const wrapperReplace = `         <motion.div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-50 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
               transform: dockTransform,
               paddingBottom: interfacePersona.dock.layout.safeAreaBottom,`;

newContent = newContent.replace(wrapperSearch, wrapperReplace);

// We also need to change the closing tag from </div> to </motion.div> for this specific wrapper.
// But wait, it's easier to just use `motion.div` and close it.
// Let's inspect the file to find where it's closed, or better yet, since we don't know the exact structure,
// Let's just output the context around `transform: \`scale(\${scale * (isZoomed ? 0.75 : 1)})\`,`
fs.writeFileSync('src/app/components/ui/Dock.tsx.new', newContent);
console.log("Done part 1.");
