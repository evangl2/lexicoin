import {
  useState,
  useEffect,
  useCallback,
} from "react";
import { useMotionValue, MotionValue } from "motion/react";
import { motionValue } from "motion";
import { DndProvider, useDrop, useDragLayer } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Canvas } from "@/app/components/Canvas";
import { Card } from "@/app/components/Card";
import { DragPreviewCard } from "@/app/components/DragPreviewCard";
import { PropVisual } from "@/app/components/PropVisual";
import { Dock } from "@/app/components/Dock";
import { usePhysics } from "@/app/hooks/usePhysics";
import { DefaultCanvasPersona } from "@/app/components/persona/default/Canvas.persona.default";
import { PersonaProvider } from "@/app/context/PersonaContext";
import { Focus } from "lucide-react";

import type { CardEntity } from "@/types/CardEntity";
import { sensesToCards } from "@/pipelines/senseToCard";
import { INITIAL_SENSES } from "../../schemas/data/initialSenses";
import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';

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
interface CardItem {
  cardData: CardEntity; // Actual card data
  mx: MotionValue<number>;
  my: MotionValue<number>;
  width: number;
  height: number;
}

// ========== Initial Card Data ==========
// Transform INITIAL_SENSES to CardEntity using senseToCard pipeline
const INITIAL_CARD_ENTITIES: CardEntity[] = sensesToCards(INITIAL_SENSES);

// Initial positions for first 2 cards
const INITIAL_POSITIONS = [
  { x: -250, y: -250 },
  { x: 250, y: -250 },
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


function InnerApp() {
  const canvasX = useMotionValue(0);
  const canvasY = useMotionValue(0);
  const canvasScale = useMotionValue(1);
  const [scaleState, setScaleState] = useState(1);
  const [items, setItems] = useState<CardItem[]>([]);
  const [storedItems, setStoredItems] = useState<SavedItem[]>(INITIAL_DECK_ITEMS);
  const [propItems, setPropItems] = useState<SavedItem[]>(INITIAL_PROP_ITEMS);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Settings State
  const [learningLang, setLearningLang] = useState('ENGLISH');
  const [systemLang, setSystemLang] = useState('ENGLISH'); // Default English to start

  // Map UI language names to CardEntity Language codes
  const mapLanguageCode = (uiLang: string): Language => {
    const langMap: Record<string, Language> = {
      'ENGLISH': 'en',
      '简体中文': 'zh-CN',
      'FRANÇAIS': 'fr',
      'DEUTSCH': 'de',
      '日本語': 'ja',
      'ESPAÑOL': 'es',
      'ITALIANO': 'it',
      'PORTUGUÊS': 'pt',
    };
    return langMap[uiLang] || 'en'; // Default to 'en'
  };

  // Helper to close all menus
  const closeMenus = useCallback(() => {
    setIsDeckOpen(false);
    setIsConfigOpen(false);
  }, []);

  // Sync scale state
  useEffect(() => {
    return canvasScale.on("change", setScaleState);
  }, [canvasScale]);

  // Load from local storage (positions only - data comes from INITIAL_CARD_ENTITIES)
  useEffect(() => {
    const saved = localStorage.getItem("canvas-items");
    let positions = INITIAL_POSITIONS;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Extract positions from saved data
        positions = parsed.map((p: any) => ({ x: p.x, y: p.y }));
      } catch (e) {
        console.error("Failed to parse saved positions", e);
      }
    }

    // Combine CardEntity data with positions
    const initialCards = INITIAL_CARD_ENTITIES.slice(0, 2).map((cardData, idx) => {
      const pos = positions[idx] || { x: 0, y: 0 };
      return {
        cardData: {
          ...cardData,
          position: pos // Update position in CardEntity
        },
        width: 250,
        height: 350,
        mx: motionValue(pos.x),
        my: motionValue(pos.y),
      };
    });

    setItems(initialCards);
    setIsLoaded(true);
  }, []);

  // Save positions to local storage (CardEntity data is static)
  const saveItems = useCallback(() => {
    if (!isLoaded) return;
    const dataToSave = items.map((item) => ({
      uid: item.cardData.rawSense.uid,
      x: item.mx.get(),
      y: item.my.get(),
    }));
    localStorage.setItem("canvas-items", JSON.stringify(dataToSave));
  }, [items, isLoaded]);

  // Physics Hook
  usePhysics(
    items.map((item) => ({
      id: item.cardData.rawSense.uid,
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
  const [, drop] = useDrop(() => ({
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

      // TODO: Later implement dragging from Deck -> Canvas with CardEntity
      // For now, we only support cards already on canvas
      console.warn('Deck -> Canvas drag not yet implemented for CardEntity');
    },
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
      // TODO: Later implement Canvas -> Deck with CardEntity
      console.warn('Canvas -> Deck drag not yet implemented for CardEntity');
      // For now, just remove from canvas
      setItems(prev => prev.filter(i => i.cardData.rawSense.uid !== id));
    }
  };

  const handleItemDropOnCard = (droppedItem: SavedItem) => {
    // Consume the item (Remove from props)
    console.log("Used item on card:", droppedItem.title);
    setPropItems(prev => prev.filter(i => i.id !== droppedItem.id));
  };

  // Save when items list changes
  useEffect(() => { if (isLoaded) saveItems(); }, [items.length, isLoaded, saveItems]);

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.cardData.rawSense.uid !== id));
  };

  const handleUpdateImage = (id: string, url: string) => {
    // TODO: Implement image update for CardEntity visual field
    console.warn('Image update not yet implemented for CardEntity');
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
            key={item.cardData.rawSense.uid}
            cardData={item.cardData}
            learningLanguage={mapLanguageCode(learningLang)}
            systemLanguage={mapLanguageCode(systemLang)}
            x={item.mx}
            y={item.my}
            width={item.width}
            height={item.height}
            canvasScale={scaleState}
            onDragStart={() => setDraggingId(item.cardData.rawSense.uid)}
            onDragEnd={() => {
              setDraggingId(null);
              checkDeckCollision(item.cardData.rawSense.uid);
              saveItems();
            }}
            updatePosition={() => { }}
            onDelete={() => handleDelete(item.cardData.rawSense.uid)}
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
