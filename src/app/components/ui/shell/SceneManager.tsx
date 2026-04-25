import React, { Suspense, lazy, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Canvas } from "@/app/components/ui/canvas/Canvas";
import { CanvasControl } from "@/app/components/ui/canvas/CanvasControl";
import { CanvasContent } from "@/app/components/ui/canvas/CanvasContent";
import { useGameStore } from "@store/index";
import { useShallow } from "zustand/react/shallow";
import { getLoc } from "@/app/utils/localization";
import { CanvasProvider } from "@/app/context/CanvasContext";

const LibraryInterface = lazy(() =>
  import('@/app/components/ui/visual/LibraryInterface').then(m => ({ default: m.LibraryInterface }))
);

interface SceneManagerProps {
  viewMode: string;
  camera: any;
  data: any;
  deviceManager: any;
  grouping: any;
  isDeckOpen: boolean;
  closeDeck: () => void;
  allCanvasItems: any[];
  handleDragStart: (id: string) => void;
  handleDragEnd: (id: string) => void;
  handleUpdatePosition: (id: string, x: number, y: number) => void;
  handleDropIntoSlot: (cardId: string, deviceUid: string, slotId: number) => void;
  handleDropIntoSummoner: (cardId: string, deviceUid: string) => void;
  handleCardDropIntoRepository: (uid: string) => void;
  handleCardEnterDevice: (uid: string, deviceId?: string) => void;
  stableSetCardLocationCanvas: (uid: string) => void;
  handleDeviceDragEnd: (uid: string) => void;
  handleDeviceDropIntoRepository: (uid: string) => void;
  handleSynthesisComplete: (newCard: any, deviceUid: string) => void;
  mappedLearningLang: any;
  mappedSystemLang: any;
  systemLang: string;
}

export const SceneManager = React.memo(({
  viewMode,
  camera,
  data,
  deviceManager,
  grouping,
  isDeckOpen,
  closeDeck,
  allCanvasItems,
  handleDragStart,
  handleDragEnd,
  handleUpdatePosition,
  handleDropIntoSlot,
  handleDropIntoSummoner,
  handleCardDropIntoRepository,
  handleCardEnterDevice,
  stableSetCardLocationCanvas,
  handleDeviceDragEnd,
  handleDeviceDropIntoRepository,
  handleSynthesisComplete,
  mappedLearningLang,
  mappedSystemLang,
  systemLang,
}: SceneManagerProps) => {
  const activeGrimoires = useGameStore(useShallow(s => s.activeGrimoires));

  return (
    <AnimatePresence mode="wait">
      {viewMode === 'WORLD' ? (
        <motion.div
          key="world"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
          onPointerDown={(e) => {
            if (isDeckOpen) closeDeck();
          }}
        >
          <CanvasProvider>
            <Canvas scale={camera.scale} x={camera.x} y={camera.y}>
              <CanvasContent
                allCanvasItems={allCanvasItems}
                camera={camera}
                mergedVariants={grouping.mergedVariants}
                groupFeedback={grouping.groupFeedback}
                exitingItems={grouping.exitingItems}
                mappedLearningLang={mappedLearningLang}
                mappedSystemLang={mappedSystemLang}
                canvasDevices={deviceManager.canvasDevices}
                activeGrimoires={activeGrimoires}
                inputCards={data.items}
                setCardLocation={data.setCardLocation}
                updateDeviceState={deviceManager.updateDeviceState}
                handleDragStart={handleDragStart}
                stableHandleDragEnd={handleDragEnd}
                handleUpdatePosition={handleUpdatePosition}
                stableHandleDropIntoSlot={handleDropIntoSlot}
                stableHandleDropIntoSummoner={handleDropIntoSummoner}
                stableHandleCardDropIntoRepository={handleCardDropIntoRepository}
                stableHandleCardEnterDevice={handleCardEnterDevice}
                stableSetCardLocationCanvas={stableSetCardLocationCanvas}
                handleDeviceDragEnd={handleDeviceDragEnd}
                handleDeviceDropIntoRepository={handleDeviceDropIntoRepository}
                onSynthesisComplete={handleSynthesisComplete}
              />
            </Canvas>
          </CanvasProvider>

          {/* UI Controls specific to world */}
          <CanvasControl
            onCenter={camera.centerCamera}
            systemLang={systemLang}
            getLoc={getLoc}
          />
        </motion.div>
      ) : viewMode === 'LIBRARY' ? (
        <Suspense key="library" fallback={<div className="flex items-center justify-center h-screen text-zinc-400">Loading library…</div>}>
          <LibraryInterface />
        </Suspense>
      ) : null}
    </AnimatePresence>
  );
});
