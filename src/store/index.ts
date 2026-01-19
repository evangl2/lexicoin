/**
 * Zustand Store - Global State Management
 * 
 * Combines all state slices into a single store
 * Integrates with MessageBus for module communication
 */

import { create } from 'zustand';
import type {
    PlayerState,
    ViewMode,
    CanvasView,
    DragState,
    Notification,
    Language,
    ModelId,
    Sense,
    UUID
} from '@types/index';
import { generateId } from '@utils/helpers';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface GameStore {
    // Player State
    player: PlayerState;
    updatePlayer: (updates: Partial<PlayerState>) => void;

    // UI State
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    canvasView: CanvasView;
    setCanvasView: (view: Partial<CanvasView>) => void;
    resetCanvasView: () => void;

    // Drag State
    dragState: DragState;
    startDrag: (item: any, itemType: DragState['itemType'], source: DragState['source'], startPos: { x: number; y: number }) => void;
    updateDragPosition: (pos: { x: number; y: number }) => void;
    endDrag: () => void;

    // Notifications
    notifications: Notification[];
    addNotification: (message: string, type?: Notification['type'], duration?: number) => void;
    removeNotification: (id: UUID) => void;

    // Senses (cached from SenseModule)
    senses: Sense[];
    setSenses: (senses: Sense[]) => void;
    addSense: (sense: Sense) => void;

    // Module Status
    modulesReady: boolean;
    setModulesReady: (ready: boolean) => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialPlayer: PlayerState = {
    id: generateId(),
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    phase: 'GENESIS',
    settings: {
        interfaceLang: 'zh',
        learningLang: 'en',
        modelId: 'gemini-2.0-flash',
        soundEnabled: true,
        musicEnabled: true,
    },
    stats: {
        totalSyntheses: 0,
        successfulSyntheses: 0,
        totalEvolutions: 0,
        sensesCollected: 0,
        tokensSpent: 0,
    },
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
};

const initialCanvasView: CanvasView = {
    x: 0,
    y: 0,
    scale: 1,
};

const initialDragState: DragState = {
    isDragging: false,
    item: null,
    itemType: 'SENSE',
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    source: 'CANVAS',
};

// ============================================================================
// STORE CREATION
// ============================================================================

export const useGameStore = create<GameStore>((set, get) => ({
    // Player State
    player: initialPlayer,
    updatePlayer: (updates) => set((state) => ({
        player: { ...state.player, ...updates }
    })),

    // UI State
    viewMode: 'WORLD',
    setViewMode: (mode) => set({ viewMode: mode }),

    canvasView: initialCanvasView,
    setCanvasView: (view) => set((state) => ({
        canvasView: { ...state.canvasView, ...view }
    })),
    resetCanvasView: () => set({ canvasView: initialCanvasView }),

    // Drag State
    dragState: initialDragState,
    startDrag: (item, itemType, source, startPos) => set({
        dragState: {
            isDragging: true,
            item,
            itemType,
            source,
            startPos,
            currentPos: startPos,
            offset: { x: 0, y: 0 },
        }
    }),
    updateDragPosition: (pos) => set((state) => ({
        dragState: { ...state.dragState, currentPos: pos }
    })),
    endDrag: () => set({ dragState: initialDragState }),

    // Notifications
    notifications: [],
    addNotification: (message, type = 'INFO', duration = 3000) => {
        const notification: Notification = {
            id: generateId(),
            type,
            message: { en: message, zh: message }, // TODO: Proper localization
            duration,
            createdAt: Date.now(),
        };

        set((state) => ({
            notifications: [...state.notifications, notification]
        }));

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                get().removeNotification(notification.id);
            }, duration);
        }
    },
    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),

    // Senses
    senses: [],
    setSenses: (senses) => set({ senses }),
    addSense: (sense) => set((state) => ({
        senses: [...state.senses, sense]
    })),

    // Module Status
    modulesReady: false,
    setModulesReady: (ready) => set({ modulesReady: ready }),
}));
