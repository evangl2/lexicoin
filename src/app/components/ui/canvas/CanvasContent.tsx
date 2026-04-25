import React, { useMemo } from "react";
import { Card } from "@/app/components/ui/card/Card";
import { GrimoireSummoner } from "@/app/components/ui/grimoire/GrimoireSummoner";
import { SynthesisCircle } from "@/app/components/ui/visual/SynthesisCircle";
import { Grimoire } from "@/app/components/ui/grimoire/Grimoire";
import { useViewportCulling } from "@/app/hooks/useViewportCulling";
import { useCanvasContext } from "@/app/context/CanvasContext";

const EMPTY_VARIANTS: any[] = [];

interface CanvasContentProps {
  allCanvasItems: any[];
  camera: { x: any; y: any; scale: any };
  mergedVariants: Record<string, any[]>;
  groupFeedback: { merge: string[]; split: string[]; timestamp: number } | null;
  exitingItems: any[];
  mappedLearningLang: any;
  mappedSystemLang: any;
  canvasDevices: any[];
  activeGrimoires: any[];
  inputCards: any[];
  setCardLocation: (uid: string, location: any, pos?: { x: number; y: number }) => void;
  updateDeviceState: (uid: string, state: any) => void;
  handleDragStart: (id: string) => void;
  stableHandleDragEnd: (id: string) => void;
  handleUpdatePosition: (id: string, x: number, y: number) => void;
  stableHandleDropIntoSlot: (cardId: string, deviceUid: string, slotId: number) => void;
  stableHandleDropIntoSummoner: (cardId: string, deviceUid: string) => void;
  stableHandleCardDropIntoRepository: (uid: string) => void;
  stableHandleCardEnterDevice: (uid: string, deviceId?: string) => void;
  stableSetCardLocationCanvas: (uid: string) => void;
  handleDeviceDragEnd: (uid: string) => void;
  handleDeviceDropIntoRepository: (uid: string) => void;
  onSynthesisComplete: (card: any, deviceUid: string) => void;
}

export const CanvasContent = React.memo(({
  allCanvasItems,
  camera,
  mergedVariants,
  groupFeedback,
  exitingItems,
  mappedLearningLang,
  mappedSystemLang,
  canvasDevices,
  activeGrimoires,
  inputCards,
  setCardLocation,
  updateDeviceState,
  handleDragStart,
  stableHandleDragEnd,
  handleUpdatePosition,
  stableHandleDropIntoSlot,
  stableHandleDropIntoSummoner,
  stableHandleCardDropIntoRepository,
  stableHandleCardEnterDevice,
  stableSetCardLocationCanvas,
  handleDeviceDragEnd,
  handleDeviceDropIntoRepository,
  onSynthesisComplete,
}: CanvasContentProps) => {
  const { expandedIdsRef, draggingIdRef, isZoomingRef, isPanningRef } = useCanvasContext();
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
  );

  const visibleCanvasItems = useMemo(
    () => allCanvasItems.filter((item: any) => culledVisibleIds.has(item.cardData.rawSense.uid)),
    [allCanvasItems, culledVisibleIds],
  );

  return (
    <>
      {visibleCanvasItems.map((item: any) => (
        <Card
          key={item.cardData.rawSense.uid}
          cardData={item.cardData}
          variants={mergedVariants[item.cardData.uid] || EMPTY_VARIANTS}
          learningLanguage={mappedLearningLang}
          systemLanguage={mappedSystemLang}
          x={item.mx}
          y={item.my}
          width={item.width}
          height={item.height}
          canvasScale={camera.scale}
          canvasX={camera.x}
          canvasY={camera.y}
          onDragStart={handleDragStart}
          onDragEnd={stableHandleDragEnd}
          updatePosition={handleUpdatePosition}
          isMerging={groupFeedback?.merge.includes(item.cardData.rawSense.uid) || false}
          isSplitting={groupFeedback?.split.includes(item.cardData.rawSense.uid) || false}
          onDropIntoSlot={stableHandleDropIntoSlot}
          onDropIntoSummoner={stableHandleDropIntoSummoner}
          onDropIntoRepository={stableHandleCardDropIntoRepository}
          onCardEnterDevice={stableHandleCardEnterDevice}
        />
      ))}

      {canvasDevices.map((device: any) => {
        if (device.type === 'grimoire-summoner') {
          return (
            <GrimoireSummoner
              key={device.uid}
              uid={device.uid}
              x={device.mx}
              y={device.my}
              state={device.state}
              updateState={updateDeviceState}
              inputCards={inputCards}
              canvasScale={camera.scale}
              onDragEnd={handleDeviceDragEnd}
              onCardEnter={stableHandleCardEnterDevice}
              onCardEject={stableSetCardLocationCanvas}
              mergedVariants={mergedVariants}
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
            updateState={updateDeviceState}
            inputCards={inputCards}
            canvasScale={camera.scale}
            onDragEnd={handleDeviceDragEnd}
            onCardEnter={stableHandleCardEnterDevice}
            onCardEject={stableSetCardLocationCanvas}
            mergedVariants={mergedVariants}
            onDropIntoRepository={handleDeviceDropIntoRepository}
            systemlang={mappedSystemLang}
            learninglang={mappedLearningLang}
            onSynthesisComplete={onSynthesisComplete}
          />
        );
      })}

      {activeGrimoires.map((grimoire: any) => (
        <Grimoire
          key={grimoire.id}
          grimoire={grimoire}
          x={grimoire.x}
          y={grimoire.y}
          canvasScale={camera.scale}
        />
      ))}

      {exitingItems.map((item: any) => (
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
          canvasScale={camera.scale}
          canvasX={camera.x}
          canvasY={camera.y}
          updatePosition={handleUpdatePosition}
          isMerging={false}
          isSplitting={false}
          isHidden={false}
          externalScale={item.scale}
          onDropIntoSummoner={stableHandleDropIntoSummoner}
          onCardEnterDevice={stableHandleCardEnterDevice}
        />
      ))}
    </>
  );
});
