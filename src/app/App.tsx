import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useMotionValue, MotionValue, useTransform, motion } from "motion/react";
import { motionValue } from "motion";
import { DndProvider, useDrop, useDragLayer, XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Canvas } from "@/app/components/Canvas";
import { Card } from "@/app/components/Card";
import { DragPreviewCard } from "@/app/components/DragPreviewCard";
import { PropVisual } from "@/app/components/PropVisual";
import { Dock } from "@/app/components/Dock";
import { usePhysics } from "@/app/hooks/usePhysics";
import { DefaultCanvasPersona } from "@/app/components/persona/default/Canvas.persona.default";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { LayoutGrid, Focus } from "lucide-react";
import { nanoid } from "nanoid";

// Simple types for storage
export interface SavedItem {
  id: string;
  title: string;
  image: string;
  x: number;
  y: number;
  type?: 'CARD' | 'ITEM';
  // New Sorting Fields
  pos?: string; // Part of Speech (e.g. Noun, Verb)
  difficulty?: number;
  durability?: number;
  count?: number; // For Props
}

// Runtime types with MotionValues
interface Item extends SavedItem {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  width: number;
  height: number;
}

// Initial Mock Data for Canvas
const INITIAL_ITEMS: SavedItem[] = [
  {
    id: "wind",
    title: "Wind",
    image:
      "https://images.unsplash.com/photo-1599071629350-7b79b9198c72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjB3aW5kJTIwYWJzdHJhY3R8ZW58MXx8fHwxNzY4OTA5NTQ2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    x: -250,
    y: -250,
    type: 'CARD',
    pos: 'Element', difficulty: 1, durability: 100
  },
  {
    id: "fire",
    title: "Fire",
    image:
      "https://images.unsplash.com/photo-1727593458591-aed56a590222?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXJlJTIwZmxhbWUlMjBhYnN0cmFjdHxlbnwxfHx8fDE3Njg5MDk1NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    x: 250,
    y: -250,
    type: 'CARD',
    pos: 'Element', difficulty: 2, durability: 80
  },
];

// Initial Mock Data for Deck (Cards)
const INITIAL_DECK_ITEMS: SavedItem[] = [
  { id: "water", title: "Water", image: "https://images.unsplash.com/photo-1583136803679-e51ca63be406?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXRlciUyMHdhdmUlMjBhYnN0cmFjdHxlbnwxfHx8fDE3Njg5MDk1NDZ8MA&ixlib=rb-4.1.0&q=80&w=1080", x: 0, y: 0, type: 'CARD', pos: 'Element', difficulty: 1, durability: 100 },
  { id: "earth", title: "Earth", image: "https://images.unsplash.com/photo-1768154916321-f8c94b176b3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aCUyMHNvaWwlMjByb2NrJTIwYWJzdHJhY3R8ZW58MXx8fHwxNzY4OTA5NTQ3fDA&ixlib=rb-4.1.0&q=80&w=1080", x: 0, y: 0, type: 'CARD', pos: 'Element', difficulty: 3, durability: 120 },
  { id: "ether", title: "Ether", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1080", x: 0, y: 0, type: 'CARD', pos: 'Essence', difficulty: 5, durability: 50 },
  { id: "void", title: "Void", image: "https://images.unsplash.com/photo-1518112390430-f4ab02e9c2c8?auto=format&fit=crop&q=80&w=1080", x: 0, y: 0, type: 'CARD', pos: 'Essence', difficulty: 10, durability: 999 },
];

// Initial Mock Data for Props (Items)
const INITIAL_PROP_ITEMS: SavedItem[] = [
  { id: "prism", title: "Evolve Prism", image: "", x: 0, y: 0, type: 'ITEM', count: 3 },
  { id: "dust", title: "Arcane Dust", image: "", x: 0, y: 0, type: 'ITEM', count: 15 },
  { id: "vial", title: "Empty Vial", image: "", x: 0, y: 0, type: 'ITEM', count: 1 },
];

// Localization Helper for UI
const getLoc = (key: string, lang: string = 'ENGLISH') => {
  const isZh = lang === '简体中文';
  const dict: Record<string, { en: string; zh: string }> = {
    'Center': { en: 'Center', zh: '中心' },
    'Arrange': { en: 'Arrange', zh: '整理' },
    'Zoom': { en: 'Zoom', zh: '缩放' },
    'Double click to add card': { en: 'Double click to add card', zh: '双击添加卡片' },
    // Prop Translations
    'Evolve Prism': { en: 'Evolve Prism', zh: '进化棱镜' },
    'Arcane Dust': { en: 'Arcane Dust', zh: '奥术之尘' },
    'Empty Vial': { en: 'Empty Vial', zh: '空瓶' },
    'New Card': { en: 'New Card', zh: '新卡片' },
  };
  return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};

// --- Drag Proxy Component ---
const DragProxy = ({ item, canvasX, canvasY, canvasScale, scaleState, systemLang, learningLang }: { item: Item, canvasX: MotionValue<number>, canvasY: MotionValue<number>, canvasScale: MotionValue<number>, scaleState: number, systemLang: string, learningLang: string }) => {
  // Convert Canvas Coordinates to Screen Coordinates for the Proxy
  // Formula: ScreenPos = CanvasTranslation + (ItemPos * Scale) - (Size * Scale / 2)
  const x = useTransform([canvasX, item.mx, canvasScale], ([cx, mx, s]) => cx + mx * s - (item.width * s) / 2);
  const y = useTransform([canvasY, item.my, canvasScale], ([cy, my, s]) => cy + my * s - (item.height * s) / 2);

  return (
    <motion.div
      style={{
        x, y,
        position: 'absolute',
        top: 0, left: 0,
        // Ensure it ignores pointer events so it doesn't block the mouse
        pointerEvents: 'none',
        width: item.width * scaleState,
        height: item.height * scaleState
      }}
    >
      <DragPreviewCard
        title={item.title}
        image={item.image}
        width={250}
        height={350}
        scale={scaleState}
        systemLanguage={systemLang}
        learningLanguage={learningLang}
        difficultyLevel={item.difficulty?.toString() || "A1"}
        partOfSpeech={item.pos || "n."}
        durability={item.durability || 100}
        layoutMode={scaleState < 0.6 ? 'compact' : 'default'}
      />
    </motion.div>
  )
}

function InnerApp() {
  const canvasX = useMotionValue(0);
  const canvasY = useMotionValue(0);
  const canvasScale = useMotionValue(1);
  const [scaleState, setScaleState] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [storedItems, setStoredItems] = useState<SavedItem[]>(INITIAL_DECK_ITEMS);
  const [propItems, setPropItems] = useState<SavedItem[]>(INITIAL_PROP_ITEMS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Settings State
  const [learningLang, setLearningLang] = useState('ENGLISH');
  const [systemLang, setSystemLang] = useState('ENGLISH'); // Default English to start

  // Helper to close all menus
  const closeMenus = useCallback(() => {
    setIsDeckOpen(false);
    setIsConfigOpen(false);
  }, []);

  // Sync scale state
  useEffect(() => {
    return canvasScale.on("change", setScaleState);
  }, [canvasScale]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("canvas-items");
    let initialData = INITIAL_ITEMS;
    if (saved) {
      try {
        initialData = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved items", e);
      }
    }

    setItems(
      initialData.map((item) => ({
        ...item,
        width: 250,
        height: 350,
        mx: motionValue(item.x),
        my: motionValue(item.y),
      })),
    );
    setIsLoaded(true);
  }, []);

  // Save to local storage
  const saveItems = useCallback(() => {
    if (!isLoaded) return;
    const dataToSave: SavedItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      x: item.mx.get(),
      y: item.my.get(),
      type: item.type || 'CARD',
    }));
    localStorage.setItem("canvas-items", JSON.stringify(dataToSave));
  }, [items, isLoaded]);

  // Physics Hook
  usePhysics(
    items.map((item) => ({
      id: item.id,
      x: item.mx,
      y: item.my,
      width: item.width,
      height: item.height,
    })),
    draggingId,
  );

  const handleCenter = () => {
    canvasX.set(window.innerWidth / 2);
    canvasY.set(window.innerHeight / 2);
    canvasScale.set(1);
    closeMenus(); // Also close menus
  };

  useEffect(() => { handleCenter(); }, []);

  // --- Deck Interaction Logic ---

  // 1. Drop from Deck to Canvas
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['CARD'], // ONLY Accept CARDS on Canvas background
    drop: (item: SavedItem, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const cx = canvasX.get();
      const cy = canvasY.get();
      const s = canvasScale.get();

      // Convert screen coords to canvas coords
      const x = (clientOffset.x - cx) / s;
      const y = (clientOffset.y - cy) / s;

      // Create new card on canvas
      const newItem: Item = {
        id: nanoid(), // New ID
        title: item.title,
        image: item.image,
        x,
        y,
        width: 250,
        height: 350,
        mx: motionValue(x),
        my: motionValue(y),
        type: item.type,
      };

      setItems(prev => [...prev, newItem]);

      // Remove from Deck if it was a move (Handle both lists)
      if (item.type === 'ITEM') {
        setPropItems(prev => prev.filter(i => i.id !== item.id));
      } else {
        setStoredItems(prev => prev.filter(i => i.id !== item.id));
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  // 2. Drag from Canvas to Deck (Manual Check)
  const checkDeckCollision = (id: string) => {
    if (!isDeckOpen) return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    const cx = canvasX.get();
    const cy = canvasY.get();
    const s = canvasScale.get();

    // Calculate approximate screen position of the card center
    const screenX = cx + item.mx.get() * s;
    const screenY = cy + item.my.get() * s;

    // Deck Zone Definition
    const deckHeight = 260;
    const bottomOffset = 135;
    const topEdgeY = window.innerHeight - (bottomOffset + deckHeight);
    const bottomEdgeY = window.innerHeight - bottomOffset + 50;

    const deckWidth = window.innerWidth * 0.8;
    const deckXStart = (window.innerWidth - deckWidth) / 2;
    const deckXEnd = deckXStart + deckWidth;

    if (screenY > topEdgeY && screenY < bottomEdgeY && screenX > deckXStart && screenX < deckXEnd) {
      // Collision detected! Move to Deck.
      const newItem: SavedItem = {
        id: nanoid(),
        title: item.title,
        image: item.image,
        x: 0, y: 0,
        type: item.type
      };

      if (item.type === 'ITEM') {
        setPropItems(prev => [...prev, newItem]);
      } else {
        setStoredItems(prev => [...prev, newItem]);
      }
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleItemDropOnCard = (droppedItem: SavedItem) => {
    // Consume the item (Remove from props)
    console.log("Used item on card:", droppedItem.title);
    setPropItems(prev => prev.filter(i => i.id !== droppedItem.id));
  };

  // Save when items list changes
  useEffect(() => { if (isLoaded) saveItems(); }, [items.length, isLoaded, saveItems]);

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); };
  const handleUpdateImage = (id: string, url: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, image: url } : item));
    setTimeout(saveItems, 0);
  };

  // --- CUSTOM DRAG LAYER (Deck -> Canvas) ---
  const CustomDragLayer = () => {
    const {
      isDragging,
      item,
      clientOffset,
      initialClientOffset,
      initialSourceClientOffset
    } = useDragLayer((monitor) => ({
      item: monitor.getItem(),
      clientOffset: monitor.getClientOffset(),
      initialClientOffset: monitor.getInitialClientOffset(),
      initialSourceClientOffset: monitor.getInitialSourceClientOffset(),
      isDragging: monitor.isDragging(),
    }));

    if (!isDragging || !clientOffset || !item || !initialClientOffset || !initialSourceClientOffset) {
      return null;
    }

    const isItem = (item as any).type === 'ITEM';
    const sourceWidth = (item as any).sourceWidth || (isItem ? 100 : 125);
    const sourceHeight = (item as any).sourceHeight || (isItem ? 100 : 175);

    // Target Size in Preview
    const targetWidth = isItem ? sourceWidth : (250 * scaleState);
    const targetHeight = isItem ? sourceHeight : (350 * scaleState);

    // Anchor Point
    const grabOffsetX = (initialClientOffset.x - initialSourceClientOffset.x);
    const grabOffsetY = (initialClientOffset.y - initialSourceClientOffset.y);
    const ratioX = grabOffsetX / sourceWidth;
    const ratioY = grabOffsetY / sourceHeight;

    const newLeft = clientOffset.x - (targetWidth * ratioX);
    const newTop = clientOffset.y - (targetHeight * ratioY);

    return (
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        <div
          className="absolute top-0 left-0 will-change-transform"
          style={{
            transform: `translate(${newLeft}px, ${newTop}px)`,
          }}
        >
          {isItem ? (
            <PropVisual title={getLoc(item.title, systemLang)} size={targetWidth} />
          ) : (
            <DragPreviewCard
              title={item.title}
              image={item.image}
              width={250}
              height={350}
              scale={scaleState}
              systemLanguage={systemLang}
              learningLanguage={learningLang}
              difficultyLevel={item.difficulty?.toString() || "A1"}
              partOfSpeech={item.pos || "n."}
              durability={item.durability || 100}
              layoutMode={scaleState < 0.6 ? 'compact' : 'default'}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    // Attach drop ref to the main container & Disable Context Menu
    <div
      ref={drop}
      className="w-full h-screen bg-black overflow-hidden relative font-sans text-zinc-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        scale={canvasScale}
        x={canvasX}
        y={canvasY}
      >
        {items.map((item) => (
          <Card
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            x={item.mx}
            y={item.my}
            width={item.width}
            height={item.height}
            canvasScale={scaleState}
            systemLanguage={systemLang}
            learningLanguage={learningLang}
            onDragStart={() => setDraggingId(item.id)}
            onDragEnd={() => {
              setDraggingId(null);
              checkDeckCollision(item.id);
              saveItems();
            }}
            updatePosition={() => { }}
            onDelete={() => handleDelete(item.id)}
            onChangeImage={(url) => handleUpdateImage(item.id, url)}
            onDropItem={handleItemDropOnCard}
          />
        ))}
      </Canvas>

      {/* HIGH Z-INDEX LAYER */}
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        <CustomDragLayer />
      </div>

      {/* OVERLAY for Closing Menus - Only for Config (Deck stays open) */}
      {isConfigOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={closeMenus}
        />
      )}

      {/* UI Controls (Top Right) */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-4 z-50 pointer-events-none">

        {/* Center Button (Pointer Events Auto) */}
        <div className="pointer-events-auto">
          <button
            onClick={handleCenter}
            className="group flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 active:scale-90"
            style={{
              background: DefaultCanvasPersona.tokens.ui.controlButton.background,
              borderWidth: '1px',
              borderColor: DefaultCanvasPersona.tokens.ui.controlButton.border,
              color: DefaultCanvasPersona.tokens.ui.controlButton.text,
              boxShadow: DefaultCanvasPersona.tokens.ui.controlButton.shadow,
              backdropFilter: `blur(${DefaultCanvasPersona.tokens.ui.controlButton.backdropBlur})`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = DefaultCanvasPersona.tokens.ui.controlButton.borderHover;
              e.currentTarget.style.boxShadow = DefaultCanvasPersona.tokens.ui.controlButton.hoverShadow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = DefaultCanvasPersona.tokens.ui.controlButton.border;
              e.currentTarget.style.boxShadow = DefaultCanvasPersona.tokens.ui.controlButton.shadow;
            }}
            title={getLoc('Center', systemLang)}
          >
            <Focus size={20} className="opacity-80 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      <Dock
        isDeckOpen={isDeckOpen}
        toggleDeck={() => {
          if (!isDeckOpen) setIsConfigOpen(false);
          setIsDeckOpen(!isDeckOpen);
        }}
        isConfigOpen={isConfigOpen}
        toggleConfig={() => {
          if (!isConfigOpen) setIsDeckOpen(false);
          setIsConfigOpen(!isConfigOpen);
        }}
        deckItems={storedItems}
        propItems={propItems}
        learningLang={learningLang}
        setLearningLang={setLearningLang}
        systemLang={systemLang}
        setSystemLang={setSystemLang}
      />
    </div>
  );
}

export default function App() {
  return (
    <PersonaProvider>
      <DndProvider backend={HTML5Backend}>
        <InnerApp />
      </DndProvider>
    </PersonaProvider>
  );
}
