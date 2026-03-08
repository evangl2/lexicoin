import {
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useMotionValue } from "motion/react";

import { Canvas } from "@/app/components/ui/Canvas";
import { Card } from "@/app/components/ui/Card";
import { Dock } from "@/app/components/ui/Dock";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { AudioProvider } from "@/app/context/AudioContext";

// Hooks
import { useCanvasCamera } from "@/app/hooks/logic/useCanvasCamera";
import { useCardManager } from "@/app/hooks/logic/useCardManager";
import { useDeviceManager } from "@/app/hooks/logic/useDeviceManager"; // Added
import { useCardGrouping } from "@/app/utils/mergeSplit/useCardGrouping";
import { usePhysics } from "@/app/hooks/usePhysics";

// UI Components
import { DragLayer } from "@/app/components/ui/DragLayer";
import { CanvasControl } from "@/app/components/ui/CanvasControl";
import { SynthesisCircle } from "@/app/components/ui/SynthesisCircle"; // Added

// Store & Utils
import { useGameStore } from "@/store/index";
import { getLoc, mapLanguageCode } from "@/app/utils/localization";

const EMPTY_VARIANTS: any[] = [];

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
  // 3. Data Manager (CRUD + Persistence)
  const data = useCardManager();

  // 3b. Device Manager
  const deviceManager = useDeviceManager(); // Added

  // 4. Grouping Logic (Merge/Split + Smart Camera)
  const grouping = useCardGrouping({
    items: data.items,
    setItems: data.setItems,
    learningLang
  });

  // Filter out cards that are inside devices
  const slottedCardIds = useMemo(() => {
    const ids = new Set<string>();
    deviceManager.canvasDevices.forEach(d => {
      if (d.state.slot1_uid) ids.add(d.state.slot1_uid);
      if (d.state.slot2_uid) ids.add(d.state.slot2_uid);
    });
    return ids;
  }, [deviceManager.canvasDevices]);

  const visibleCanvasItems = useMemo(() =>
    data.canvasItems.filter((item: any) => !slottedCardIds.has(item.cardData.rawSense.uid)),
    [data.canvasItems, slottedCardIds]
  );

  // 5. Physics Engine
  const physicsItems = useMemo(
    () =>
      visibleCanvasItems.map((item: any) => ({
        id: item.cardData.rawSense.uid,
        x: item.mx,
        y: item.my,
        width: item.width,
        height: item.height,
      })),
    [visibleCanvasItems],
  );

  usePhysics(physicsItems, draggingId);

  // 6. Persistence Binding (Robustness Fix)
  // Ensure we auto-save whenever items (Anchors) or groupings (Variants) change.
  // This replaces the internal auto-save in useCardManager to ensure mergedVariants are always included.
  useEffect(() => {
    if (data.isLoaded) {
      data.saveItems(grouping.mergedVariants);
    }
  }, [
    data.items,        // Anchor list changed (Load/Store/Merge)
    data.isLoaded,     // Ready signal
    grouping.mergedVariants, // Merge state changed
    data.saveItems     // Stable callback
  ]);

  // --- Interaction Logic ---

  // Drop from Repository to Canvas (via Dock double-click, handled by retrieveCard)
  const [, drop] = useDrop(() => ({
    accept: ['CARD', 'DEVICE'],
    drop: (item: { uid: string, width: number, height: number, type?: string }, monitor) => {
      if (monitor.didDrop()) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset || !item.uid) return;

      const cx = camera.x.get();
      const cy = camera.y.get();
      const s = camera.scale.get();

      const dropX = (clientOffset.x - cx) / s;
      const dropY = (clientOffset.y - cy) / s;

      const x = dropX - (item.width / 2);
      const y = dropY - (item.height / 2);

      if (item.type === 'DEVICE') {
        deviceManager.retrieveDevice(item.uid, x, y);
      } else {
        data.retrieveCard(item.uid, x, y);
      }
    },
  }));

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback((id: string) => {
    // checkDeckCollision(id); // Removed
    // Pass mergedVariants to ensure "Sense Position" is updated
    data.saveItems(grouping.mergedVariants);
    setDraggingId(null);
  }, [data, grouping.mergedVariants]);

  const handleDeviceDragEnd = useCallback((uid: string) => {
    // checkDeckCollision(uid, true); // Removed
    // Device state is auto-saved or handled by manager
  }, []);

  const handleRepositoryDrop = useCallback((uid: string, isDevice: boolean = false) => {
    // Check if deck is actually open (extra safety, though UI shouldn't be visible if closed)
    const isDeckOpen = useGameStore.getState().deckState.isOpen;
    if (!isDeckOpen) return;

    if (isDevice) {
      deviceManager.storeDevice(uid);
    } else {
      data.storeCard(uid);
    }
  }, [deviceManager, data]);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    // Stable no-op callback
  }, []);

  const handleDropIntoSlot = useCallback((cardId: string, deviceUid: string, slotId: number) => {
    deviceManager.updateDeviceState(deviceUid, {
      [`slot${slotId}_uid`]: cardId,
    });
  }, [deviceManager]);

  const handleCardDropIntoRepository = useCallback((uid: string) => {
    handleRepositoryDrop(uid, false);
  }, [handleRepositoryDrop]);

  const handleDeviceDropIntoRepository = useCallback((uid: string) => {
    handleRepositoryDrop(uid, true);
  }, [handleRepositoryDrop]);

  // --- Z-Index / Focus Management ---
  const [focusedCardCount, setFocusedCardCount] = useState(0);

  const handleCardFocus = useCallback(() => {
    setFocusedCardCount(prev => prev + 1);
    // Optimization: Access store directly
    if (useGameStore.getState().deckState.isOpen) {
      useGameStore.getState().closeDeck();
    }
  }, []);

  const handleCardBlur = useCallback(() => {
    setFocusedCardCount(prev => Math.max(0, prev - 1));
  }, []);

  // Performance Optimization: Memoize language mapping to prevent O(N) recalculations on every render
  const mappedLearningLang = useMemo(() => mapLanguageCode(learningLang), [learningLang]);
  const mappedSystemLang = useMemo(() => mapLanguageCode(systemLang), [systemLang]);

  return (
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          position: 'relative',
          zIndex: 0
        }}
        onPointerDown={(e) => {
          if (isDeckOpen) closeDeck();
        }}
      >
        <Canvas scale={camera.scale} x={camera.x} y={camera.y}>
          {/* Render Active Canvas Items */}
          {visibleCanvasItems.map((item: any) => (
            <Card
              key={item.cardData.rawSense.uid}
              cardData={item.cardData}
              variants={grouping.mergedVariants[item.cardData.uid] || EMPTY_VARIANTS}
              learningLanguage={mappedLearningLang}
              systemLanguage={mappedSystemLang}
              x={item.mx}
              y={item.my}
              width={item.width}
              height={item.height}
              canvasScale={camera.scale} // Pass MotionValue
              canvasX={camera.x}
              canvasY={camera.y}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              updatePosition={handleUpdatePosition}
              groupFeedback={grouping.groupFeedback}
              onFocus={handleCardFocus}
              onBlur={handleCardBlur}
              onDropIntoSlot={handleDropIntoSlot}
              onDropIntoRepository={handleCardDropIntoRepository}
            />
          ))}

          {/* Render Active Devices */}
          {deviceManager.canvasDevices.map(device => (
            <SynthesisCircle
              key={device.uid}
              uid={device.uid}
              x={device.mx}
              y={device.my}
              state={device.state}
              updateState={deviceManager.updateDeviceState}
              inputCards={data.items}
              canvasScale={camera.scale}
              onDragEnd={handleDeviceDragEnd}
              onCardEnter={(cid) => data.setCardLocation(cid, 'device')}
              onCardEject={(cid) => data.setCardLocation(cid, 'canvas', { x: device.mx.get() + 80, y: device.my.get() + 50 })}
              mergedVariants={grouping.mergedVariants}
              onDropIntoRepository={handleDeviceDropIntoRepository}
            />
          ))}

          {/* Render Exiting Items (Ghost Animations) */}
          {grouping.exitingItems.map((item) => (
            <Card
              key={'exiting-' + item.cardData.rawSense.uid}
              cardData={item.cardData}
              variants={[]}
              learningLanguage={mappedLearningLang}
              systemLanguage={mappedSystemLang}
              x={item.mx}
              y={item.my}
              width={item.width}
              height={item.height}
              canvasScale={camera.scale} // Pass MotionValue
              canvasX={camera.x}
              canvasY={camera.y}
              updatePosition={handleUpdatePosition} // Use stable handler here too
              isHidden={false}
              externalScale={item.scale}
            />
          ))}

        </Canvas>
      </div>

      {/* Drag Preview Layer */}
      <DragLayer
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
        isZoomed={focusedCardCount > 0}
        mergedVariants={grouping.mergedVariants}
        deviceItems={deviceManager.repositoryDevices}
        onRetrieveDevice={(uid) => deviceManager.retrieveDevice(uid, window.innerWidth / 2, window.innerHeight / 2)}
        onStoreDevice={(uid) => {
          deviceManager.storeDevice(uid, (cardUid, x, y) => {
            data.setCardLocation(cardUid, 'canvas', { x, y });
          });
        }}
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
