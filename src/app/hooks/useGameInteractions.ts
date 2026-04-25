import { useCallback, useRef, useMemo } from "react";
import { useDrop } from "react-dnd";
import { snapPosition, applySnap } from "@/app/hooks/useGridSnap";
import { useGameStore } from "@store/index";

interface UseGameInteractionsProps {
  camera: any;
  data: any;
  deviceManager: any;
  grouping: any;
  activeGrimoireId: string | null;
  fillGrimoireSlot: (grimoireId: string, slotId: string, cardUid: string) => void;
}

export function useGameInteractions({
  camera,
  data,
  deviceManager,
  grouping,
  activeGrimoireId,
  fillGrimoireSlot,
}: UseGameInteractionsProps) {
  
  // Filter out cards that are inside devices to get current canvas items
  const slottedCardIds = useMemo(() => {
    const ids = new Set<string>();
    deviceManager.canvasDevices.forEach((d: any) => {
      if (d.state.slot1_uid) ids.add(d.state.slot1_uid);
      if (d.state.slot2_uid) ids.add(d.state.slot2_uid);
      if (d.state.seed_uid) ids.add(d.state.seed_uid);
    });
    return ids;
  }, [deviceManager.canvasDevices]);

  const allCanvasItems = useMemo(() =>
    data.canvasItems.filter((item: any) => !slottedCardIds.has(item.cardData.rawSense.uid)),
    [data.canvasItems, slottedCardIds]
  );

  const allCanvasItemsRef = useRef(allCanvasItems);
  allCanvasItemsRef.current = allCanvasItems;

  const handleDragStart = useCallback((id: string) => {}, []);

  const handleDragEnd = useCallback((id: string) => {
    const draggedItem = allCanvasItemsRef.current.find((item: any) => item.cardData.rawSense.uid === id);
    if (draggedItem) {
      const occupied = allCanvasItemsRef.current.map((item: any) => ({
        id: item.cardData.rawSense.uid,
        x: item.mx.get(),
        y: item.my.get(),
      }));
      const snapped = snapPosition(draggedItem.mx.get(), draggedItem.my.get(), occupied, id);
      applySnap(draggedItem.mx, draggedItem.my, snapped.x, snapped.y);
    }
    data.saveItems(grouping.mergedVariants);
  }, [data, grouping.mergedVariants]);

  const handleDeviceDragEnd = useCallback((uid: string) => {}, []);

  const handleRepositoryDrop = useCallback((uid: string, isDevice: boolean = false) => {
    const isDeckOpen = useGameStore.getState().deckState.isOpen;
    if (!isDeckOpen) return;
    if (isDevice) {
      deviceManager.storeDevice(uid);
    } else {
      data.storeCard(uid);
    }
  }, [deviceManager, data]);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {}, []);

  const handleDropIntoSlot = useCallback((cardId: string, deviceUid: string, slotId: number) => {
    deviceManager.updateDeviceState(deviceUid, {
      [`slot${slotId}_uid`]: cardId,
    });
  }, [deviceManager]);

  const handleDropIntoSummoner = useCallback((cardId: string, deviceUid: string) => {
    deviceManager.updateDeviceState(deviceUid, { seed_uid: cardId });
  }, [deviceManager]);

  const handleCardDropIntoRepository = useCallback((uid: string) => {
    handleRepositoryDrop(uid, false);
  }, [handleRepositoryDrop]);

  const handleCardEnterDevice = useCallback((uid: string, deviceId?: string) => {
    data.setCardLocation(uid, 'device');
    if (activeGrimoireId && deviceId) {
      fillGrimoireSlot(activeGrimoireId, deviceId, uid);
    }
  }, [data, activeGrimoireId, fillGrimoireSlot]);

  const stableSetCardLocationCanvas = useCallback((uid: string) => {
    data.setCardLocation(uid, 'canvas');
  }, [data]);

  const handleDeviceDropIntoRepository = useCallback((uid: string) => {
    handleRepositoryDrop(uid, true);
  }, [handleRepositoryDrop]);

  const handleRetrieveCard = useCallback((uid: string) => {
    data.retrieveCard(uid, window.innerWidth / 2, window.innerHeight / 2);
  }, [data]);

  const handleRetrieveDevice = useCallback((uid: string) => {
    deviceManager.retrieveDevice(uid, window.innerWidth / 2, window.innerHeight / 2);
  }, [deviceManager]);

  const handleStoreDeviceWithEject = useCallback((uid: string) => {
    deviceManager.storeDevice(uid, (cardUid: string, x: number, y: number) => {
      data.setCardLocation(cardUid, 'canvas', { x, y });
    });
  }, [deviceManager, data]);

  const handleSynthesisComplete = useCallback((newCard: any, deviceUid: string) => {
    const device = deviceManager.canvasDevices.find((d: any) => d.uid === deviceUid);
    if (!device) return;
    const spread = 50 + Math.random() * 50;
    const angle = Math.random() * Math.PI * 2;
    setTimeout(() => {
      data.setCardLocation(newCard.uid, 'canvas', {
        x: device.mx.get() + Math.cos(angle) * spread,
        y: device.my.get() + Math.sin(angle) * spread
      });
    }, 50);
  }, [deviceManager.canvasDevices, data]);

  // --- Stable Proxies for performance ---
  const _handleDragEndRef = useRef(handleDragEnd);
  _handleDragEndRef.current = handleDragEnd;
  const stableHandleDragEnd = useRef((id: string) => _handleDragEndRef.current(id)).current;

  const _handleDropIntoSlotRef = useRef(handleDropIntoSlot);
  _handleDropIntoSlotRef.current = handleDropIntoSlot;
  const stableHandleDropIntoSlot = useRef((cardId: string, deviceUid: string, slotId: number) =>
    _handleDropIntoSlotRef.current(cardId, deviceUid, slotId)
  ).current;

  const _handleDropIntoSummonerRef = useRef(handleDropIntoSummoner);
  _handleDropIntoSummonerRef.current = handleDropIntoSummoner;
  const stableHandleDropIntoSummoner = useRef((cardId: string, deviceUid: string) =>
    _handleDropIntoSummonerRef.current(cardId, deviceUid)
  ).current;

  const _handleCardDropIntoRepositoryRef = useRef(handleCardDropIntoRepository);
  _handleCardDropIntoRepositoryRef.current = handleCardDropIntoRepository;
  const stableHandleCardDropIntoRepository = useRef((uid: string) =>
    _handleCardDropIntoRepositoryRef.current(uid)
  ).current;

  const _handleCardEnterDeviceRef = useRef(handleCardEnterDevice);
  _handleCardEnterDeviceRef.current = handleCardEnterDevice;
  const stableHandleCardEnterDevice = useRef((uid: string, deviceId?: string) =>
    _handleCardEnterDeviceRef.current(uid, deviceId)
  ).current;

  const _handleSynthesisCompleteRef = useRef(handleSynthesisComplete);
  _handleSynthesisCompleteRef.current = handleSynthesisComplete;
  const stableHandleSynthesisComplete = useRef((newCard: any, deviceUid: string) =>
    _handleSynthesisCompleteRef.current(newCard, deviceUid)
  ).current;

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

  return {
    allCanvasItems,
    drop,
    handleDragStart,
    handleDragEnd: stableHandleDragEnd,
    handleUpdatePosition,
    handleDropIntoSlot: stableHandleDropIntoSlot,
    handleDropIntoSummoner: stableHandleDropIntoSummoner,
    handleCardDropIntoRepository: stableHandleCardDropIntoRepository,
    handleCardEnterDevice: stableHandleCardEnterDevice,
    stableSetCardLocationCanvas,
    handleDeviceDragEnd,
    handleDeviceDropIntoRepository,
    handleSynthesisComplete: stableHandleSynthesisComplete,
    handleRetrieveCard,
    handleRetrieveDevice,
    handleStoreDeviceWithEject,
  };
}
