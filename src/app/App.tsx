import React, {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion, AnimatePresence } from "motion/react";

import { Dock } from "@/app/components/ui/shell/Dock";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { CardPersonaVarsInjector } from "@/app/components/persona/CardPersonaVarsInjector";
import { AudioProvider } from "@/app/context/AudioContext";

// Hooks
import { useCanvasCamera } from "@/app/hooks/useCanvasCamera";
import { useCardManager } from "@/app/hooks/useCardManager";
import { useDeviceManager } from "@/app/hooks/useDeviceManager";
import { useCardGrouping } from "@/app/hooks/useCardGrouping";
import { useGrimoireExpiry } from "@/app/hooks/useGrimoireExpiry";

// UI Components
import { DragLayer } from "@/app/components/ui/canvas/DragLayer";
import { levelModule } from "@/modules/level/LevelModule";
import { SceneManager } from "@/app/components/ui/shell/SceneManager";
import { useGameInteractions } from "@/app/hooks/useGameInteractions";
import { ProgressionHUD } from "@/app/components/ui/shell/ProgressionHUD";
import { LevelUpOverlay } from "@/app/components/ui/system/LevelUpOverlay";
import { GrimoireOverlay } from "@/app/components/ui/grimoire/GrimoireOverlay";

// Store & Utils
import { useGameStore } from "@store/index";
import { useShallow } from "zustand/react/shallow";
import { getLoc, mapLanguageCode } from "@/app/utils/localization";
import { cardFocusRegistry } from "@/app/utils/cardFocusRegistry";



interface InnerAppProps {
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

const InnerApp = React.memo((props: InnerAppProps) => {
  return <SceneManager {...props} />;
});


function GameShell() {
  // 1. App State & Settings (Zustand Integration)
  const { 
    learningLang, 
    systemLang, 
    setLearningLang, 
    setSystemLang, 
    activeModelId, 
    setActiveModelId,
    viewMode
  } = useGameStore(useShallow(s => ({
    learningLang: s.learningLang,
    systemLang: s.systemLang,
    setLearningLang: s.setLearningLang,
    setSystemLang: s.setSystemLang,
    activeModelId: s.activeModelId,
    setActiveModelId: s.setActiveModelId,
    viewMode: s.viewMode
  })));

  const { 
    isDeckOpen, 
    openDeck, 
    closeDeck 
  } = useGameStore(useShallow(s => ({
    isDeckOpen: s.deckState.isOpen,
    openDeck: s.openDeck,
    closeDeck: s.closeDeck
  })));

  const { 
    isConfigOpen, 
    setConfigOpen 
  } = useGameStore(useShallow(s => ({
    isConfigOpen: s.isConfigOpen,
    setConfigOpen: s.setConfigOpen
  })));

  useEffect(() => {
    window.addEventListener('pointerdown', cardFocusRegistry.dispatch, { capture: true });
    return () => window.removeEventListener('pointerdown', cardFocusRegistry.dispatch, { capture: true });
  }, []);

  const { 
    zoomedCardIds, 
    activeGrimoireId, 
    fillGrimoireSlot 
  } = useGameStore(useShallow(s => ({
    zoomedCardIds: s.zoomedCardIds,
    activeGrimoireId: s.activeGrimoireId,
    fillGrimoireSlot: s.fillGrimoireSlot
  })));

  const isZoomed = zoomedCardIds.length > 0;

  const toggleDeck = useCallback(() => {
    if (!isDeckOpen) {
      setConfigOpen(false);
      openDeck('archive');
    } else {
      closeDeck();
    }
  }, [isDeckOpen, setConfigOpen, openDeck, closeDeck]);

  const toggleConfig = useCallback(() => {
    if (!isConfigOpen) {
      closeDeck();
    }
    setConfigOpen(!isConfigOpen);
  }, [isConfigOpen, closeDeck, setConfigOpen]);

  const closeMenus = useCallback(() => {
    closeDeck();
    setConfigOpen(false);
  }, [closeDeck, setConfigOpen]);

  const camera = useCanvasCamera();
  const data = useCardManager();
  const deviceManager = useDeviceManager();
  const grouping = useCardGrouping({
    items: data.items,
    setItems: data.setItems,
    learningLang
  });

  const {
    allCanvasItems,
    drop,
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
    handleRetrieveCard,
    handleRetrieveDevice,
    handleStoreDeviceWithEject,
  } = useGameInteractions({
    camera,
    data,
    deviceManager,
    grouping,
    activeGrimoireId,
    fillGrimoireSlot,
  });

  const mappedLearningLang = useMemo(() => mapLanguageCode(learningLang), [learningLang]);
  const mappedSystemLang = useMemo(() => mapLanguageCode(systemLang), [systemLang]);

  useGrimoireExpiry();

  return (
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <InnerApp
        viewMode={viewMode}
        camera={camera}
        data={data}
        deviceManager={deviceManager}
        grouping={grouping}
        isDeckOpen={isDeckOpen}
        closeDeck={closeDeck}
        allCanvasItems={allCanvasItems}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleUpdatePosition={handleUpdatePosition}
        handleDropIntoSlot={handleDropIntoSlot}
        handleDropIntoSummoner={handleDropIntoSummoner}
        handleCardDropIntoRepository={handleCardDropIntoRepository}
        handleCardEnterDevice={handleCardEnterDevice}
        stableSetCardLocationCanvas={stableSetCardLocationCanvas}
        handleDeviceDragEnd={handleDeviceDragEnd}
        handleDeviceDropIntoRepository={handleDeviceDropIntoRepository}
        handleSynthesisComplete={handleSynthesisComplete}
        mappedLearningLang={mappedLearningLang}
        mappedSystemLang={mappedSystemLang}
        systemLang={systemLang}
      />

      <DragLayer
        systemLang={systemLang}
        learningLang={learningLang}
        getLoc={getLoc}
      />

      {isConfigOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={closeMenus}
        />
      )}

      <ProgressionHUD />
      <LevelUpOverlay />
      <GrimoireOverlay />

      <Dock
        isDeckOpen={isDeckOpen}
        toggleDeck={toggleDeck}
        isConfigOpen={isConfigOpen}
        toggleConfig={toggleConfig}
        repositoryItems={data.repositoryItems}
        onRetrieve={handleRetrieveCard}
        onStore={data.storeCard}
        learningLang={learningLang}
        setLearningLang={setLearningLang}
        systemLang={systemLang}
        setSystemLang={setSystemLang}
        isZoomed={isZoomed}
        mergedVariants={grouping.mergedVariants}
        deviceItems={deviceManager.repositoryDevices}
        onRetrieveDevice={handleRetrieveDevice}
        onStoreDevice={handleStoreDeviceWithEject}
        activeModelId={activeModelId}
        setActiveModelId={setActiveModelId}
      />
    </div>
  );
}

export default function App() {

  return (
    <PersonaProvider>
      <CardPersonaVarsInjector />
      <AudioProvider>
        <DndProvider backend={HTML5Backend}>
          <GameShell />
        </DndProvider>
      </AudioProvider>
    </PersonaProvider>
  );
}
