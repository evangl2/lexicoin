import {
  useEffect,
  useCallback,
} from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Canvas } from "@/app/components/ui/Canvas";
import { Card } from "@/app/components/ui/Card";
import { Dock } from "@/app/components/ui/Dock";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";
import { useMotionValue } from "motion/react";

// Hooks
import { useCanvasCamera } from "@/app/hooks/logic/useCanvasCamera";
import { useCardManager } from "@/app/hooks/logic/useCardManager";
import { useCardGrouping } from "@/app/utils/mergeSplit/useCardGrouping";
import { usePhysics } from "@/app/hooks/usePhysics";

// UI Components
import { DragLayer } from "@/app/components/ui/DragLayer";
import { CanvasControl } from "@/app/components/ui/CanvasControl";

// Store & Utils
import { useGameStore } from "@/store/index";
import { getLoc, mapLanguageCode } from "@/app/utils/localization";
import { useState } from "react";


function InnerApp() {
  // 1. App State & Settings (Zustand Integration)
  const learningLang = useGameStore(s => s.learningLang);
  const systemLang = useGameStore(s => s.systemLang);
  const setLearningLang = useGameStore(s => s.setLearningLang);
  const setSystemLang = useGameStore(s => s.setSystemLang);

  const isDeckOpen = useGameStore(s => s.deckState.isOpen);
  const isConfigOpen = useGameStore(s => s.isConfigOpen);
  const openDeck = useGameStore(s => s.openDeck);
  const closeDeck = useGameStore(s => s.closeDeck);
  const setConfigOpen = useGameStore(s => s.setConfigOpen);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  // UI Logic (Migrated from useAppUI)
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

  // 2. Camera State
  const camera = useCanvasCamera();

  // 3. Data Manager (CRUD + Persistence)
  const data = useCardManager();

  // 4. Grouping Logic (Merge/Split + Smart Camera)
  const grouping = useCardGrouping({
    items: data.items,
    setItems: data.setItems,
    learningLang
  });

  // 5. Physics Engine
  usePhysics(
    data.items.map((item: any) => ({
      id: item.cardData.rawSense.uid,
      x: item.mx,
      y: item.my,
      width: item.width,
      height: item.height,
    })),
    draggingId,
  );

  // --- Interaction Logic ---

  // Drop from Repository to Canvas (via Dock double-click, handled by retrieveCard)
  // Note: react-dnd drop zone kept for future drag-from-repo support
  const [, drop] = useDrop(() => ({
    accept: ['CARD'],
    drop: (item: { uid: string, width: number, height: number }, monitor) => {
      if (monitor.didDrop()) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset || !item.uid) return;

      const cx = camera.x.get();
      const cy = camera.y.get();
      const s = camera.scale.get();

      // Transform screen coordinates to canvas coordinates
      // formula: canvas_pos = (screen_pos - camera_pos) / scale
      const dropX = (clientOffset.x - cx) / s;
      const dropY = (clientOffset.y - cy) / s;

      // Center the card on the cursor
      // Note: item.width/height are in canvas units (unscaled)
      const x = dropX - (item.width / 2);
      const y = dropY - (item.height / 2);

      data.retrieveCard(item.uid, x, y);
    },
  }));

  // 2. Check Deck Collision (Canvas -> Repository)
  const checkDeckCollision = (id: string) => {
    if (!isDeckOpen) return;

    const targetItem = data.canvasItems.find((i: any) => i.cardData.rawSense.uid === id);
    if (!targetItem) return;

    const cx = camera.x.get();
    const cy = camera.y.get();
    const s = camera.scale.get();

    // Calculate approximate screen position of the card center
    const screenX = cx + targetItem.mx.get() * s;
    const screenY = cy + targetItem.my.get() * s;

    // Deck Zone Definition
    const deckHeight = 260;
    const bottomOffset = 135;
    const topEdgeY = window.innerHeight - (bottomOffset + deckHeight);
    const bottomEdgeY = window.innerHeight - bottomOffset + 50;

    const deckWidth = window.innerWidth * 0.8;
    const deckXStart = (window.innerWidth - deckWidth) / 2;
    const deckXEnd = deckXStart + deckWidth;

    if (screenY > topEdgeY && screenY < bottomEdgeY && screenX > deckXStart && screenX < deckXEnd) {
      data.storeCard(id);
    }
  };




  // Handle card retrieval from repository
  const handleRetrieveCard = useCallback((uid: string) => {
    // Place card near center with slight random offset
    const x = (Math.random() - 0.5) * 400;
    const y = (Math.random() - 0.5) * 300;
    data.retrieveCard(uid, x, y);
  }, [data]);


  // --- Z-Index / Focus Management ---
  const [focusedCardCount, setFocusedCardCount] = useState(0);

  const handleCardFocus = useCallback(() => {
    setFocusedCardCount(prev => prev + 1);
  }, []);

  const handleCardBlur = useCallback(() => {
    setFocusedCardCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          zIndex: focusedCardCount > 0 ? 60 : 0,
          position: 'relative'
        }}
      >
        <Canvas scale={camera.scale} x={camera.x} y={camera.y}>
          {/* Render Active Canvas Items */}
          {data.canvasItems.map((item: any) => (
            <Card
              key={item.cardData.rawSense.uid}
              cardData={item.cardData}
              variants={grouping.mergedVariants[item.cardData.uid] || []}
              learningLanguage={mapLanguageCode(learningLang)}
              systemLanguage={mapLanguageCode(systemLang)}
              x={item.mx}
              y={item.my}
              width={item.width}
              height={item.height}
              canvasScale={camera.scaleState}
              canvasX={camera.x}
              canvasY={camera.y}
              onDragStart={() => setDraggingId(item.cardData.rawSense.uid)}
              onDragEnd={() => {
                checkDeckCollision(item.cardData.rawSense.uid);
                data.saveItems();
                setDraggingId(null);
              }}
              updatePosition={() => { }}
              onDelete={() => data.deleteItem(item.cardData.rawSense.uid)}
              groupFeedback={grouping.groupFeedback}
              onFocus={handleCardFocus}
              onBlur={handleCardBlur}
            />
          ))}

          {/* Render Exiting Items (Ghost Animations) */}
          {grouping.exitingItems.map((item) => (
            <Card
              key={'exiting-' + item.cardData.rawSense.uid}
              cardData={item.cardData}
              variants={[]}
              learningLanguage={mapLanguageCode(learningLang)}
              systemLanguage={mapLanguageCode(systemLang)}
              x={item.mx}
              y={item.my}
              width={item.width}
              height={item.height}
              canvasScale={camera.scaleState}
              canvasX={camera.x}
              canvasY={camera.y}
              updatePosition={() => { }}
              isHidden={false}
              onDragStart={undefined}
              onDragEnd={undefined}
              externalScale={item.scale}
            />
          ))}

        </Canvas>
      </div>

      {/* Drag Preview Layer */}
      <DragLayer
        scaleState={camera.scaleState}
        systemLang={systemLang}
        learningLang={learningLang}
        getLoc={getLoc}
      />

      {/* Menu Overlay */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={closeMenus}
        />
      )}

      {/* UI Controls */}
      <CanvasControl
        onCenter={camera.centerCamera}
        systemLang={systemLang}
        getLoc={getLoc}
      />

      {/* Bottom Dock */}
      <Dock
        isDeckOpen={isDeckOpen}
        toggleDeck={toggleDeck}
        isConfigOpen={isConfigOpen}
        toggleConfig={toggleConfig}
        repositoryItems={data.repositoryItems}
        onRetrieve={(uid) => data.retrieveCard(uid, window.innerWidth / 2, window.innerHeight / 2)}
        onStore={data.storeCard}
        learningLang={learningLang}
        setLearningLang={setLearningLang}
        systemLang={systemLang}
        setSystemLang={setSystemLang}
      />
    </div>
  );
}

export default function App() {
  // Zustand Audio Integration
  const muted = useGameStore(s => s.audio.muted);
  const volume = useGameStore(s => s.audio.volume);

  return (
    <PersonaProvider>
      <AudioProvider isMuted={muted} volume={volume}>
        <DndProvider backend={HTML5Backend}>
          <InnerApp />
        </DndProvider>
      </AudioProvider>
    </PersonaProvider>
  );
}
