import {
  useEffect,
} from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Canvas } from "@/app/components/ui/Canvas";
import { Card } from "@/app/components/ui/Card";
import { Dock } from "@/app/components/ui/Dock";
import { StoredCard } from "@/app/components/ui/DeckRepository";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";
import { useMotionValue } from "motion/react";

// Hooks
import { useCanvasCamera } from "@/app/hooks/logic/useCanvasCamera";
import { useAppUI } from "@/app/hooks/logic/useAppUI";
import { useCardManager } from "@/app/hooks/logic/useCardManager";
import { useCardGrouping } from "@/app/utils/mergeSplit/useCardGrouping";
import { usePhysics } from "@/app/hooks/usePhysics";

// UI Components
import { DragLayer } from "@/app/components/ui/DragLayer";
import { CanvasControl } from "@/app/components/ui/CanvasControl";


function InnerApp() {
  // 1. App State & Settings
  const ui = useAppUI();

  // 2. Camera State
  const camera = useCanvasCamera();

  // 3. Data Manager (CRUD + Persistence)
  const data = useCardManager();

  // 4. Grouping Logic (Merge/Split + Smart Camera)
  const grouping = useCardGrouping({
    items: data.items,
    setItems: data.setItems,
    learningLang: ui.learningLang
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
    null, // draggingId - We need to track this if we want to pause physics for dragged item
    // For now, passing null means physics acts on all. 
    // Optimization: Expose draggingId from Card interaction if needed.
  );

  // --- Interaction Logic (To be potentially extracted if it grows) ---

  // 1. Drop from Deck to Canvas (Placeholder)
  const [, drop] = useDrop(() => ({
    accept: ['CARD'],
    drop: (_item: StoredCard, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      console.warn('Deck -> Canvas drag not yet implemented for CardEntity');
    },
  }));

  // 2. Check Deck Collision (Canvas -> Deck)
  const checkDeckCollision = (id: string) => {
    if (!ui.isDeckOpen) return;

    const targetItem = data.items.find((i: any) => i.cardData.rawSense.uid === id);
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
      console.warn('Canvas -> Deck drag check triggered');
      data.deleteItem(id);
    }
  };

  const handleItemDropOnCard = (droppedItem: StoredCard) => {
    console.log("Used item on card:", droppedItem.title);
    data.setPropItems(prev => prev.filter(i => i.id !== droppedItem.id));
  };


  return (
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas scale={camera.scale} x={camera.x} y={camera.y}>
        {/* Render Active Items */}
        {data.items.map((item: any) => (
          <Card
            key={item.cardData.rawSense.uid}
            cardData={item.cardData}
            variants={grouping.mergedVariants[item.cardData.uid] || []}
            learningLanguage={ui.mapLanguageCode(ui.learningLang)}
            systemLanguage={ui.mapLanguageCode(ui.systemLang)}
            x={item.mx}
            y={item.my}
            width={item.width}
            height={item.height}
            canvasScale={camera.scaleState}
            onDragStart={() => { /* setDraggingId(item.uid) if needed */ }}
            onDragEnd={() => {
              checkDeckCollision(item.cardData.rawSense.uid);
              data.saveItems();
            }}
            updatePosition={() => { }}
            onDelete={() => data.deleteItem(item.cardData.rawSense.uid)}
            onDropItem={handleItemDropOnCard}
            groupFeedback={grouping.groupFeedback}
          />
        ))}

        {/* Render Exiting Items (Ghost Animations) */}
        {grouping.exitingItems.map((item) => (
          <Card
            key={'exiting-' + item.cardData.rawSense.uid}
            cardData={item.cardData}
            variants={[]}
            learningLanguage={ui.mapLanguageCode(ui.learningLang)}
            systemLanguage={ui.mapLanguageCode(ui.systemLang)}
            x={item.mx}
            y={item.my}
            width={item.width}
            height={item.height}
            canvasScale={camera.scaleState}
            updatePosition={() => { }}
            isHidden={false}
            onDragStart={undefined}
            onDragEnd={undefined}
          />
        ))}



      </Canvas>

      {/* Drag Preview Layer */}
      <DragLayer
        scaleState={camera.scaleState}
        systemLang={ui.systemLang}
        learningLang={ui.learningLang}
        getLoc={ui.getLoc}
      />

      {/* Menu Overlay */}
      {ui.isConfigOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={ui.closeMenus}
        />
      )}

      {/* UI Controls */}
      <CanvasControl
        onCenter={camera.centerCamera}
        systemLang={ui.systemLang}
        getLoc={ui.getLoc}
      />

      {/* Bottom Dock */}
      <Dock
        isDeckOpen={ui.isDeckOpen}
        toggleDeck={ui.toggleDeck}
        isConfigOpen={ui.isConfigOpen}
        toggleConfig={ui.toggleConfig}
        deckItems={data.storedItems}
        propItems={data.propItems}
        learningLang={ui.learningLang}
        setLearningLang={ui.setLearningLang}
        systemLang={ui.systemLang}
        setSystemLang={ui.setSystemLang}
      />
    </div>
  );
}

export default function App() {
  const ui = useAppUI();
  return (
    <PersonaProvider>
      <AudioProvider isMuted={ui.isMuted} volume={ui.volume}>
        <DndProvider backend={HTML5Backend}>
          <InnerApp />
        </DndProvider>
      </AudioProvider>
    </PersonaProvider>
  );
}
