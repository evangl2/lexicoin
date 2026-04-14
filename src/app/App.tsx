import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useMotionValue, motion, AnimatePresence } from "motion/react";

import { Canvas } from "@/app/components/ui/canvas/Canvas";
import { Card } from "@/app/components/ui/card/Card";
import { Dock } from "@/app/components/ui/shell/Dock";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { CardPersonaVarsInjector } from "@/app/components/persona/CardPersonaVarsInjector";
import { AudioProvider } from "@/app/context/AudioContext";

// Hooks
import { useCanvasCamera } from "@/app/hooks/useCanvasCamera";
import { useCardManager } from "@/app/hooks/useCardManager";
import { useDeviceManager } from "@/app/hooks/useDeviceManager"; // Added
import { useCardGrouping } from "@/app/hooks/useCardGrouping";
import { useViewportCulling } from "@/app/hooks/useViewportCulling";
import { snapPosition, applySnap } from "@/app/hooks/useGridSnap";

// UI Components
import { DragLayer } from "@/app/components/ui/canvas/DragLayer";
import { CanvasControl } from "@/app/components/ui/canvas/CanvasControl";
import { SynthesisCircle } from "@/app/components/ui/visual/SynthesisCircle";
import { GrimoireSummoner } from "@/app/components/ui/visual/GrimoireSummoner";
import { Grimoire } from "@/app/components/ui/visual/Grimoire";
import { ProgressionHUD } from "@/app/components/ui/shell/ProgressionHUD";
import { LevelUpOverlay } from "@/app/components/ui/system/LevelUpOverlay";
import { GrimoireOverlay } from "@/app/components/ui/visual/GrimoireOverlay";
import { LibraryInterface } from "@/app/components/ui/visual/LibraryInterface";
import { levelModule } from "@/modules/level/LevelModule";

// Store & Utils
import { useGameStore } from "@store/index";
import { useShallow } from "zustand/react/shallow";
import { getLoc, mapLanguageCode } from "@/app/utils/localization";
import { cardFocusRegistry } from "@/app/utils/cardFocusRegistry";

const EMPTY_VARIANTS: any[] = [];

function InnerApp() {
  // 1. App State & Settings (Zustand Integration)
  const learningLang = useGameStore(s => s.learningLang);
  const systemLang = useGameStore(s => s.systemLang);
  const setLearningLang = useGameStore(s => s.setLearningLang);
  const setSystemLang = useGameStore(s => s.setSystemLang);
  const activeModelId = useGameStore(s => s.activeModelId);
  const setActiveModelId = useGameStore(s => s.setActiveModelId);

  const isDeckOpen = useGameStore(s => s.deckState.isOpen);
  const isConfigOpen = useGameStore(s => s.isConfigOpen);
  const openDeck = useGameStore(s => s.openDeck);
  const closeDeck = useGameStore(s => s.closeDeck);
  const setConfigOpen = useGameStore(s => s.setConfigOpen);
  const viewMode = useGameStore(s => s.viewMode);

  // useRef instead of useState: drag state doesn't need to trigger a re-render.
  // Previously, setDraggingId() caused App.tsx to re-render → all N cards reconciled → 5 sync
  // React flushes × ~10ms each = 50ms jank per click (confirmed via perf trace 2026-04-04).
  const draggingIdRef = useRef<string | null>(null);

  // Shared signal for canvas zoom state — passed to Canvas, useViewportCulling, and Card.
  // Lets those systems defer expensive work (LOD checks, O(n) culling) until zoom settles.
  const isZoomingRef = useRef<boolean>(false);

  // Shared signal for canvas pan state — reserved for future LOD-during-pan optimization.
  const isPanningRef = useRef<boolean>(false);

  // Tracks expanded/flipped card UIDs for viewport culling — updated imperatively by Card,
  // never triggers a React re-render. Decouples culling from Zustand zoomedCardIds so that
  // expand/collapse no longer forces an App re-render just to update the visible set.
  const expandedIdsRef = useRef<Set<string>>(new Set());

  // Single global pointerdown listener that delegates to all registered card handlers.
  // Replaces N per-card window listeners (one per expanded/flipped card) with one.
  useEffect(() => {
    window.addEventListener('pointerdown', cardFocusRegistry.dispatch, { capture: true });
    return () => window.removeEventListener('pointerdown', cardFocusRegistry.dispatch, { capture: true });
  }, []);

  // Expanded/flipped card IDs — needed early for viewport culling to keep elevated cards alive.
  // useShallow: prevents re-render when unrelated store fields change (only re-renders when
  // array content actually differs, not just on new array reference from any store update).
  const zoomedCardIds = useGameStore(useShallow(s => s.zoomedCardIds));
  const activeGrimoires = useGameStore(useShallow(s => s.activeGrimoires));

  // Separate boolean for isZoomed (passed to Dock) — avoids array comparison overhead there
  const isZoomed = zoomedCardIds.length > 0;

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

  // All non-slotted canvas items (not affected by viewport culling)
  const allCanvasItems = useMemo(() =>
    data.canvasItems.filter((item: any) => !slottedCardIds.has(item.cardData.rawSense.uid)),
    [data.canvasItems, slottedCardIds]
  );

  // Stable ref so useDrop (factory) can always read the latest canvas items
  const allCanvasItemsRef = useRef(allCanvasItems);
  allCanvasItemsRef.current = allCanvasItems;

  // Viewport culling — only render cards visible on screen (+ 350px margin)
  const cullItems = useMemo(
    () => allCanvasItems.map((item: any) => ({
      uid: item.cardData.rawSense.uid,
      mx: item.mx,
      my: item.my,
      width: item.width,
      height: item.height,
    })),
    [allCanvasItems],
  );

  const culledVisibleIds = useViewportCulling(
    cullItems,
    camera.x,
    camera.y,
    camera.scale,
    expandedIdsRef,
    draggingIdRef,
    isZoomingRef,
  );

  const visibleCanvasItems = useMemo(
    () => allCanvasItems.filter((item: any) => culledVisibleIds.has(item.cardData.rawSense.uid)),
    [allCanvasItems, culledVisibleIds],
  );

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

      const rawX = dropX - (item.width / 2);
      const rawY = dropY - (item.height / 2);

      const occupied = allCanvasItemsRef.current.map((ci: any) => ({
        id: ci.cardData.rawSense.uid,
        x: ci.mx.get(),
        y: ci.my.get(),
      }));
      const { x, y } = snapPosition(rawX, rawY, occupied);

      if (item.type === 'DEVICE') {
        deviceManager.retrieveDevice(item.uid, x, y);
      } else {
        data.retrieveCard(item.uid, x, y);
      }
    },
  }));

  const handleDragStart = useCallback((id: string) => {
    draggingIdRef.current = id;
  }, []);

  const handleDragEnd = useCallback((id: string) => {
    draggingIdRef.current = null;

    const draggedItem = allCanvasItems.find((item: any) => item.cardData.rawSense.uid === id);
    if (draggedItem) {
      const occupied = allCanvasItems.map((item: any) => ({
        id: item.cardData.rawSense.uid,
        x: item.mx.get(),
        y: item.my.get(),
      }));
      const snapped = snapPosition(draggedItem.mx.get(), draggedItem.my.get(), occupied, id);
      applySnap(draggedItem.mx, draggedItem.my, snapped.x, snapped.y);
    }

    data.saveItems(grouping.mergedVariants);
  }, [data, grouping.mergedVariants, allCanvasItems]);

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

  const mappedLearningLang = useMemo(() => mapLanguageCode(learningLang), [learningLang]);
  const mappedSystemLang = useMemo(() => mapLanguageCode(systemLang), [systemLang]);

  // 7. Initialize Progression System
  useEffect(() => {
    levelModule.initialize();
  }, []);

  return (
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
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
            <Canvas scale={camera.scale} x={camera.x} y={camera.y} isZoomingRef={isZoomingRef} isPanningRef={isPanningRef} expandedIdsRef={expandedIdsRef}>
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

                  onDropIntoSlot={handleDropIntoSlot}
                  onDropIntoRepository={handleCardDropIntoRepository}
                  isZoomingRef={isZoomingRef}
                  expandedIdsRef={expandedIdsRef}
                  isPanningRef={isPanningRef}
                />
              ))}

              {/* Render Active Devices */}
              {deviceManager.canvasDevices.map(device => {
                if (device.type === 'grimoire-summoner') {
                  return (
                    <GrimoireSummoner
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
                  );
                }
                return (
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
                    systemlang={mappedSystemLang}
                    learninglang={mappedLearningLang}
                    onSynthesisComplete={(newCard) => {
                      const spread = 50 + Math.random() * 50;
                      const angle = Math.random() * Math.PI * 2;
                      setTimeout(() => {
                        data.setCardLocation(newCard.uid, 'canvas', {
                          x: device.mx.get() + Math.cos(angle) * spread,
                          y: device.my.get() + Math.sin(angle) * spread,
                        });
                      }, 50);
                    }}
                  />
                );
              })}

              {/* Render Active Grimoires */}
              {activeGrimoires.map((grimoire) => (
                <Grimoire
                  key={grimoire.id}
                  grimoire={grimoire}
                  x={grimoire.x}
                  y={grimoire.y}
                  canvasScale={camera.scale}
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
                  isZoomingRef={isZoomingRef}
                  expandedIdsRef={expandedIdsRef}
                  isPanningRef={isPanningRef}
                />
              ))}

            </Canvas>

            {/* UI Controls specific to world */}
            <CanvasControl
              onCenter={camera.centerCamera}
              systemLang={systemLang}
              getLoc={getLoc}
            />
          </motion.div>
        ) : viewMode === 'LIBRARY' ? (
          <LibraryInterface key="library" />
        ) : null}
      </AnimatePresence>

      {/* Drag Preview Layer (Always top) */}
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

      {/* Progression Shell */}
      <ProgressionHUD />
      <LevelUpOverlay />
      <GrimoireOverlay />

      {/* Bottom Dock (Always visible for navigation) */}
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
        isZoomed={isZoomed}
        mergedVariants={grouping.mergedVariants}
        deviceItems={deviceManager.repositoryDevices}
        onRetrieveDevice={(uid) => deviceManager.retrieveDevice(uid, window.innerWidth / 2, window.innerHeight / 2)}
        onStoreDevice={(uid) => {
          deviceManager.storeDevice(uid, (cardUid, x, y) => {
            data.setCardLocation(cardUid, 'canvas', { x, y });
          });
        }}
        activeModelId={activeModelId}
        setActiveModelId={setActiveModelId}
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
      <CardPersonaVarsInjector />
      <AudioProvider isMuted={muted} volume={volume}>
        <DndProvider backend={HTML5Backend}>
          <InnerApp />
        </DndProvider>
      </AudioProvider>
    </PersonaProvider>
  );
}
