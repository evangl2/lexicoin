import type { ConfigState } from './slices/createConfigSlice';
import type { CardState } from './slices/createCardStateSlice';
import type { ProgressionState } from './slices/createProgressionSlice';
import type { GrimoireState, GrimoireActions } from './slices/createGrimoireSlice';
import type {
    PlayerState,
    ViewMode,
    CanvasView,
    DragState,
    Notification,
    LocalizedText,
    Sense,
    UUID,
    PersonaType,
    InventoryItem,
    Construction,
} from '../../types/index';

export interface LibraryFilter {
    query?: string;
    type?: 'SENSE' | 'CONSTRUCTION';
    discovered?: boolean;
}

export interface GameStore extends ConfigState, CardState, ProgressionState, GrimoireState, GrimoireActions {
    // Player State
    player: PlayerState;
    updatePlayer: (updates: Partial<PlayerState>) => void;
    consumeEchoCharge: () => void;
    resetEchoCharges: () => void;
    recoverStamina: () => void;

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
    addNotification: (message: string | LocalizedText, type?: Notification['type'], duration?: number) => void;
    removeNotification: (id: UUID) => void;

    // Senses (cached from SenseModule)
    senses: Sense[];
    setSenses: (senses: Sense[]) => void;
    addSense: (sense: Sense) => void;

    // Deck Drawer State
    deckState: {
        isOpen: boolean;
        activeTab: 'archive' | 'items';
    };
    openDeck: (tab: 'archive' | 'items') => void;
    closeDeck: () => void;
    setDeckTab: (tab: 'archive' | 'items') => void;

    // Config Menu State (Runtime only)
    isConfigOpen: boolean;
    toggleConfig: () => void;
    setConfigOpen: (isOpen: boolean) => void;

    // Module Status
    modulesReady: boolean;
    setModulesReady: (ready: boolean) => void;

    // Persona State
    activePersona?: PersonaType;
    setActivePersona: (personaId: PersonaType) => void;
    personaResonance: Record<PersonaType, number>;
    updateResonance: (personaId: PersonaType, amount: number) => void;

    // Construction State (cached from ConstructionModule)
    constructions: Construction[];
    setConstructions: (constructions: Construction[]) => void;
    addConstruction: (construction: Construction) => void;

    // Inventory State (cached from ItemModule)
    inventory: InventoryItem[];
    setInventory: (items: InventoryItem[]) => void;
    addInventoryItem: (item: InventoryItem) => void;
    removeInventoryItem: (instanceId: UUID) => void;

    // Review State
    activeReviewSession?: UUID;
    setActiveReviewSession: (sessionId?: UUID) => void;
    reviewDueSenses: UUID[];
    setReviewDueSenses: (senseIds: UUID[]) => void;

    // Library State
    libraryFilter: LibraryFilter;
    setLibraryFilter: (filter: Partial<LibraryFilter>) => void;
    clearLibraryFilter: () => void;

    // Card Zoom State (runtime only, not persisted)
    zoomedCardIds: string[];
    focusCard: (uid: string) => void;
    blurCard: (uid: string) => void;

    // Synthesis Queue (runtime only, not persisted)
    // Tracks the number of in-flight synthesis jobs globally.
    // Used to enforce MAX_CONCURRENT limit across all SynthesisCircle devices.
    activeSynthesisCount: number;
    incrementSynthesisCount: () => void;
    decrementSynthesisCount: () => void;
}
