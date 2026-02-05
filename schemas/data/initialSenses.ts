import type { SenseEntity } from '../schemas/SenseEntity.schema';


export const SENSE_PHYSICAL_FIRE_001: SenseEntity = {
    "uid": "SENSE_PHYSICAL_FIRE_001",
    "fingerprint": {
        "items": [
            { "word": "combustion", "tier": 1 },
            { "word": "flame", "tier": 1 },
            { "word": "heat", "tier": 1 },
            { "word": "oxidation", "tier": 2 },
            { "word": "incandescence", "tier": 2 },
            { "word": "energy", "tier": 3 }
        ]
    },
    "frequency": { "value": 100, "meta": { "stability": 100.0 } },
    "ontology": { "value": "PROCESS", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A rapid chemical reaction of a substance with oxygen, involving the production of heat and light.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "物质燃烧过程中散发光、火焰和热的化学现象。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Phénomène de combustion vive dégageant de la chaleur et de la lumière.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Die Erscheinung einer Verbrennung mit Licht- und Wärmeentwicklung.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "物質が酸素と化合し、熱と光を放ちながら燃焼する現象。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Fenómeno de combustión caracterizado por la emisión de calor y luz.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Manifestazione visibile della combustione che produce luce, calore e fiamme.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Reação química de combustão que resulta na emissão de calor e luz.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "A great servant but a terrible master; use it to cook, or be cooked.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "星星之火可以燎原，也能烤熟你手里的红薯。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'étincelle qui a civilisé l'homme avant de brûler ses erreurs.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Wer mit dem Feuer spielt, lernt entweder Magie oder Schmerz.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "文明の夜明けを照らし、すべてを灰に帰す情熱の赤。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Prometeo nos lo dio, pero nosotros preferimos usarlo para la barbacoa.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'unica cosa che cresce più mangia, e muore se beve.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "O calor que abraça o frio enquanto devora a própria lenha.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "Keep the fire burning to stay warm throughout the night.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "他们在营地中央升起了一堆火。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "Nous nous sommes réunis autour d'un grand feu de joie.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Das Feuer knisterte gemütlich im Kamin.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "暗闇の中で火を灯して道を照らした。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "El fuego de la chimenea calentaba toda la sala.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Hanno acceso un fuoco per segnalare la loro posizione.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "O bombeiro conseguiu apagar o fogo rapidamente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "fire", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/faɪər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 98, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "火", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "huǒ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 99, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "feu", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/fø/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 95, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Feuer", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfɔʏɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 94, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "火", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "hi", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "fuego", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfwe.ɡo/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "fuoco", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfwɔ.ko/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 93, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "fogo", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfo.ɡu/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 92, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const SENSE_ALCHEMICAL_FIRE_002: SenseEntity = {
    "uid": "SENSE_ALCHEMICAL_FIRE_002",
    "fingerprint": {
        "items": [
            { "word": "element", "tier": 1 },
            { "word": "transformation", "tier": 1 },
            { "word": "passion", "tier": 2 },
            { "word": "purification", "tier": 2 },
            { "word": "energy", "tier": 3 },
            { "word": "spirit", "tier": 3 }
        ]
    },
    "frequency": { "value": 30, "meta": { "stability": 100.0 } },
    "ontology": { "value": "ABSTRACT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A classical alchemy element acting as the primary agent of transformation, purification, and intense passion.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "炼金术四大元素之一，被视为转化、净化与激情的原动力及核心媒介。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Élément classique de l'alchimie, agent principal de transformation, de purification et de passion.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Klassisches alchemistisches Element, das als Hauptakteur für Transformation, Reinigung und Leidenschaft gilt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "四元素の一つ。変容、浄化、情熱を司る根源的な媒体としての火を指す。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Elemento alquímico que actúa como agente principal de transformación, purificación y pasión desbordante.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Elemento alchemico classico, agente primario di trasformazione, purificazione e passione ardente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Elemento clássico da alquimia, o principal agente de transformação, purificação e paixão intensa.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "Prometheus gave us this to cook with, yet we mostly use it to burn bridges.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "它是文明的火种，也是保险公司的噩梦。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'amour est un feu, mais il ne cuit pas la soupe.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Feuer ist ein guter Diener, aber ein schrecklicher Herr.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "火遊びは楽しいが、燃え上がるのは心だけにしておきたいものだ。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Quien juega con fuego se quema... o termina haciendo una gran barbacoa.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Il fuoco purifica tutto, tranne una coscienza sporca.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Fogo no olhar é paixão; fogo na cozinha é desespero.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "The alchemist channeled the element of fire to initiate the Great Work.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "炼金术士引导火元素来启动“大功告成”的转化过程。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'alchimiste canalise l'élément feu pour initier le Grand Œuvre.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Der Alchemist kanalisierte das Element Feuer, um das Große Werk zu beginnen.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "錬金術師は「大いなる業」を開始するために火の元素を操った。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "El alquimista canalizó el elemento fuego para iniciar la Gran Obra.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'alchimista ha canalizzato l'elemento fuoco per dare inizio alla Grande Opera.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "O alquimista canalizou o elemento fogo para iniciar a Grande Obra.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "fire", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfaɪər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 98, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "火", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "huǒ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 99, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "feu", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/fø/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Feuer", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfɔʏɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "火", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "ひ (hi)", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 98, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "fuego", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfweɣo/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "fuoco", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfwɔko/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "fogo", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈfoɡu/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const SENSE_PHYSICAL_WATER_003: SenseEntity = {
    "uid": "SENSE_PHYSICAL_WATER_003",
    "fingerprint": {
        "items": [
            { "word": "water", "tier": 1 },
            { "word": "liquid", "tier": 1 },
            { "word": "substance", "tier": 2 },
            { "word": "hydration", "tier": 2 },
            { "word": "life", "tier": 3 },
            { "word": "transparency", "tier": 3 }
        ]
    },
    "frequency": { "value": 100, "meta": { "stability": 100.0 } },
    "ontology": { "value": "OBJECT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A transparent, odorless, tasteless liquid essential for all known forms of life.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "一种无色、无味、透明的液体，是地球上所有生命体生存的基础。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Liquide transparent, inodore et insipide, indispensable à la vie et composant les mers.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Eine farblose, geruchlose und geschmacksneutrale Flüssigkeit, die lebensnotwendig ist.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "無色、無臭、透明な液体で、海や川を形成し生物の生存に不可欠な物質。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Líquido transparente, inodoro e insípido, esencial para la vida en la Tierra.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Liquido trasparente, inodore e insapore, fondamentale per ogni forma di vita conosciuta.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Líquido transparente e insípido, essencial para a sobrevivência de todos os seres vivos.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "High-quality H2O: because being 70% cucumber isn't as cool as it sounds.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "上善若水。它利万物而不争，除非你急着要赶路它却在下雨。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "Dans le vin la vérité, dans l'eau l'hygiène. On choisit son camp.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Bier besteht zu 90% aus Wasser. Ein hervorragendes Mischverhältnis.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "水清ければ魚棲まず。潔癖すぎると誰も寄り付かないものです。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Agua que no has de beber, déjala correr. O guárdala para el whisky.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'acqua è preziosa, specialmente quando è mischiata con del buon caffè.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Água mole em pedra dura, tanto bate até que fura... ou que a pedra mude.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "Make sure to drink plenty of water after your morning run.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "运动完记得多喝点水补充水分。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "S'il vous plaît, apportez-moi une carafe d'eau.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Ich hätte gerne ein Glas Wasser ohne Kohlensäure.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "コップ一杯の水をください。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "¿Me das un vaso de agua, por favor?", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Bevete molta acqua durante le giornate calde.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "É importante beber pelo menos dois litros de água por dia.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "water", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈwɔːtər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "水", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "shuǐ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "eau", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/o/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Wasser", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈvasɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "水", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "mizu", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "agua", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɡwa/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "acqua", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈakkwa/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "água", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɡwɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const SENSE_ALCHEMICAL_WATER_003: SenseEntity = {
    "uid": "SENSE_ALCHEMICAL_WATER_003",
    "fingerprint": {
        "items": [
            { "word": "element", "tier": 1 },
            { "word": "fluidity", "tier": 1 },
            { "word": "intuition", "tier": 2 },
            { "word": "emotion", "tier": 2 },
            { "word": "subconscious", "tier": 3 },
            { "word": "receptivity", "tier": 3 }
        ]
    },
    "frequency": { "value": 28, "meta": { "stability": 100.0 } },
    "ontology": { "value": "ABSTRACT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A classical alchemy element representing fluidity, intuition, emotion, and the subconscious mind.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "炼金术四大元素之一，象征流动性、直觉、情感与潜意识的原理。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Élément classique de l'alchimie symbolisant la fluidité, l'intuition, les émotions et le subconscient.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Klassisches alchemistisches Element, das Fluidität, Intuition, Emotionen und das Unterbewusstsein verkörpert.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "四元素の一つ。流動性、直観、感情、および無意識の原理を象徴する。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Elemento alquímico clásico que representa la fluidez, la intuición, las emociones y el subconsciente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Elemento alchemico classico che rappresenta la fluidità, l'intuizione, le emozioni e il subconscio.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Elemento clássico da alquimia que representa a fluidez, a intuição, as emoções e o subconsciente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "Be like it: adapt to any shape, yet remain strong enough to wear down mountains.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "它是生命的源泉，也是当你犯傻时，别人怀疑你脑子里进过的东西。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'eau est la force motrice de la nature, et l'ennemi juré du bon vin.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Wasser hat kein Gedächtnis, weshalb wir oft vergessen, genug davon zu trinken.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "水は方円の器に従うが、人の心までは御しきれない。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "El agua todo lo cura, pero no te saca de la hipoteca.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'acqua fa male, il vino fa cantare; scegli con saggezza.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Água mole em pedra dura tanto bate até que fura... ou a pedra se cansa.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "In alchemy, the element of water governs the tides of our deepest feelings.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "在炼金术中，水元素主宰着我们内心深处的情感潮汐。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "En alchimie, l'élément eau régit les marées de nos sentiments les plus profonds.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "In der Alchemie regiert das Element Wasser die Gezeiten unserer tiefsten Gefühle.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "錬金術において、水の元素は私たちの最も深い感情の潮流を支配している。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "En alquimia, el elemento agua gobierna las mareas de nuestros sentimientos más profundos.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "In alchimia, l'elemento acqua governa le maree dei nostri sentimenti più profondi.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Na alquimia, o elemento água governa as marés dos nossos sentimentos mais profundos.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "water", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈwɔːtər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "水", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "shuǐ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "eau", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/o/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 99, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Wasser", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈvasɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "水", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "みず (mizu)", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "agua", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɣwa/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "acqua", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈakkwa/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "água", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɡwɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }

};



export const SENSE_PHYSICAL_AIR_005: SenseEntity = {
    "uid": "SENSE_PHYSICAL_AIR_005",
    "fingerprint": {
        "items": [
            { "word": "atmosphere", "tier": 1 },
            { "word": "gas", "tier": 1 },
            { "word": "oxygen", "tier": 2 },
            { "word": "nitrogen", "tier": 2 },
            { "word": "breath", "tier": 3 },
            { "word": "ether", "tier": 3 }
        ]
    },
    "frequency": { "value": 100, "meta": { "stability": 100.0 } },
    "ontology": { "value": "OBJECT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "The invisible mixture of gases (mainly nitrogen and oxygen) surrounding the Earth.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "地球大气层中由氮、氧等组成的无色无味混合气体。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Mélange invisible de gaz entourant la Terre, composé principalement d'azote et d'oxygène.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Das unsichtbare Gasgemisch aus Stickstoff und Sauerstoff, das die Erde umgibt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "地球を包む、主に窒素と酸素からなる透明な気体。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Mezcla invisible de gases que rodea la Tierra, compuesta principalmente de nitrógeno y oxígeno.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Miscela invisibile di gas che circonda la Terra, composta principalmente da azoto e ossigeno.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Mistura invisível de gases que envolve a Terra, composta principalmente por nitrogênio e oxigênio.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "It is free, yet you will miss it more than gold when it's gone.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "世上唯一免费却又最离不开的奢侈品。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "La seule chose gratuite dont on ne peut se passer.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Umsonst, aber ohne sie ist alles andere wertlos.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "目には見えないが、命を繋ぐ最も重い「無」。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Lo único gratis que te mantiene con vida.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "È ovunque, tranne quando cerchi di afferrarla.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "A coisa mais leve que sustenta todo o seu peso.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "I stepped outside to get some fresh air.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "我打算去外面呼吸一点新鲜空气。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "Je sors pour prendre un peu l'air.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Ich gehe kurz raus an die frische Luft.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "外に行って新鮮な空気を吸ってくるよ。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Voy afuera a tomar un poco de aire fresco.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Vado fuori a prendere una boccata d'aria.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Vou lá fora apanhar um pouco de ar fresco.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "air", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɛər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "空气", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "kōng qì", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "air", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɛʁ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Luft", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/lʊft/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "空気", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "くうき", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "aire", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaj.ɾe/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "aria", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈa.rja/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "ar", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɾ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": true, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};


export const SENSE_ALCHEMICAL_AIR_006: SenseEntity = {
    "uid": "SENSE_ALCHEMICAL_AIR_006",
    "fingerprint": {
        "items": [
            { "word": "intellect", "tier": 1 },
            { "word": "mind", "tier": 1 },
            { "word": "breath", "tier": 2 },
            { "word": "alchemy", "tier": 2 },
            { "word": "communication", "tier": 3 },
            { "word": "soul", "tier": 3 }
        ]
    },
    "frequency": { "value": 35, "meta": { "stability": 100.0 } },
    "ontology": { "value": "ABSTRACT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A classical element representing the intellect, soul, and communication; the metaphysical 'breath of life'.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "古典四大元素之一，象征智慧、思想与交流，被视为维持生命与灵魂流动的“呼吸”。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Élément alchimique fondamental symbolisant l'intellect, l'esprit et le souffle vital de la communication.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Ein fundamentales alchemistisches Element, das den Intellekt, den Geist und den 'Atem des Lebens' darstellt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "知性や精神、コミュニケーションを象徴する四元素の一つ。形而上学的な「生命の息吹」。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Elemento alquímico que representa el intelecto, el alma y la comunicación; el 'aliento de vida'.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Elemento alchemico fondamentale che simboleggia l'intelletto, l'anima e il 'soffio vitale' della mente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Elemento alquímico que representa o intelecto, a alma e a comunicação; o 'sopro da vida'.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "Mind is invisible wind; you only see it when it moves something.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "思想如风，了无形迹，却能吹动万物的命运。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'esprit est un souffle : invisible, mais capable de tempêtes.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Der Geist ist wie der Wind: ungreifbar und doch allmächtig.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "心は風のごとし。姿は見えずとも、世界を動かす。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "El pensamiento es el viento del alma: invisible pero potente.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'intelletto è aria: sostiene tutto ma non pesa nulla.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "A mente sopra onde quer, e a alma dança no seu ritmo.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "In alchemy, the element of air governs the clarity of the mind.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "在炼金术中，风元素掌管着思想的明晰。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'élément air régit la clarté mentale dans les traités hermétiques.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "In der Alchemie regiert das Element Luft die Klarheit des Denkens.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "錬金術において、風の元素は思考の明晰さを司る。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "En la alquimia, el aire gobierna la agudeza del intelecto.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "L'elemento aria governa la comunicazione tra il corpo e l'anima.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "O elemento ar está ligado à sabedoria e à transmissão de ideias.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "air", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɛər/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "风", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "fēng", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "air", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɛʁ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Luft", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/lʊft/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "風", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "かぜ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "aire", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaj.ɾe/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "aria", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈa.rja/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "ar", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈaɾ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 100, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const SENSE_PHYSICAL_EARTH_007: SenseEntity = {
    "uid": "SENSE_PHYSICAL_EARTH_007",
    "fingerprint": {
        "items": [
            { "word": "soil", "tier": 1 },
            { "word": "dirt", "tier": 1 },
            { "word": "ground", "tier": 2 },
            { "word": "land", "tier": 2 },
            { "word": "substance", "tier": 3 },
            { "word": "surface", "tier": 3 }
        ]
    },
    "frequency": { "value": 98, "meta": { "stability": 100.0 } },
    "ontology": { "value": "OBJECT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "The loose surface material of the globe in which plants grow; soil or dirt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "地球表面由矿物质、有机物等组成的松散物质，可供植物生长。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Matière meuble qui forme la couche superficielle du globe et où poussent les végétaux.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Das lockere Material der Erdoberfläche, in dem Pflanzen wurzeln und wachsen.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "地球の表面を覆っている、植物が育つもととなる物質。土壌。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Material desmenuzado que compone la superficie del globo, donde crecen las plantas.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Il materiale sciolto che costituisce la parte superficiale del globo terrestre.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Material fragmentário que compõe a superfície do globo, propício ao crescimento vegetal.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "We come from it, we return to it; in between, we just try not to track it onto the carpet.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "生于此，归于此，中间这辈子，千万别混到没钱买饭只能‘吃土’。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "La terre ne ment jamais, mais elle salit horriblement les pantalons blancs.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Alles wird wieder zu Erde – außer Plastik, das hat leider andere Pläne.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "人は土から生まれ土に還る。その割に、都会の人は土を嫌う。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Todos somos barro, pero algunos tienen más piedras que otros.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Siamo fatti di terra, eppure ci lamentiamo se le scarpe si sporcano.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "A terra tudo dá, mas a quem não trabalha, ela só dá pó.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "He spent the afternoon digging in the earth to plant the roses.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "他整个下午都在地里挖土种玫瑰。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "Il a passé l'après-midi à remuer la terre pour planter des rosiers.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Er verbrachte den Nachmittag damit, in der Erde zu graben, um Rosen zu pflanzen.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "彼は午後中、バラを植えるために土を掘っていた。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Pasó la tarde cavando en la tierra para plantar las rosas.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Ha passato il pomeriggio a scavare nella terra per piantare le rose.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Ele passou a tarde cavando a terra para plantar as rosas.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "earth", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɜːrθ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 95, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "土", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "tǔ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 98, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "terre", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/tɛʁ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Erde", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈeːɐ̯də/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 94, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "土", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "つち (tsuchi)", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 95, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "tierra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtjera/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "terra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtɛrra/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "terra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtɛʁɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const SENSE_ALCHEMICAL_EARTH_008: SenseEntity = {
    "uid": "SENSE_ALCHEMICAL_EARTH_008",
    "fingerprint": {
        "items": [
            { "word": "element", "tier": 1 },
            { "word": "foundation", "tier": 1 },
            { "word": "solid", "tier": 2 },
            { "word": "stability", "tier": 2 },
            { "word": "matter", "tier": 3 },
            { "word": "tangible", "tier": 3 }
        ]
    },
    "frequency": { "value": 25, "meta": { "stability": 100.0 } },
    "ontology": { "value": "ABSTRACT", "meta": { "stability": 100.0 } },
    "meaning": {
        "en": { "value": "A classical alchemy element representing solidity, physical matter, and the nurturing foundation of the world.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "zh-CN": { "value": "炼金术四大元素之一，象征固体、稳定性、物质性及大地的滋养与根基。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "fr": { "value": "Élément classique symbolisant la solidité, la matière physique et la fondation nourricière du monde.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "de": { "value": "Klassisches Element, das Festigkeit, Materie und das nährende Fundament der Welt darstellt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "ja": { "value": "四元素の一つ。固形、物質的実体、安定、そして万物を育む基礎を象徴する。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "es": { "value": "Elemento alquímico clásico que representa la solidez, la materia física y la base nutritiva del mundo.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "it": { "value": "Elemento alchemico classico che rappresenta la solidità, la materia fisica e la base del mondo.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
        "pt": { "value": "Elemento clássico da alquimia que representa a solidez, a matéria física e o fundamento do mundo.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
    },
    "flavorText": [
        {
            "persona": "default",
            "text": {
                "en": { "value": "The densest of elements; even philosophers can't think their way through six feet of it.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "它是万物之母，但也最沉默，从来不反驳你踩在它头上的每一脚。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "L'élément le plus lourd, mais celui sur lequel reposent tous les châteaux en Espagne.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "Das Element der Beständigkeit – es bleibt liegen, egal wie sehr man sich aufregt.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "地に足をつけるのは美徳だが、埋まるのは勘弁願いたいものだ。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "Es el elemento más estable, hasta que decide que es hora de un terremoto.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Senza questo elemento, anche l'alchimista più brillante cadrebbe nel vuoto.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "O suporte de tudo; o elemento que não voa, não queima e não escorre.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "example": {
                "en": { "value": "In hermetic tradition, the element of earth anchors the spirit to the material plane.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "zh-CN": { "value": "在神秘学传统中，土元素将精神锚定在物质层面。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "fr": { "value": "Dans la tradition hermétique, l'élément terre ancre l'esprit au plan matériel.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "de": { "value": "In der hermetischen Tradition verankert das Element Erde den Geist in der Materie.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "ja": { "value": "神秘学の伝統において、土の元素は精神を物質界に繋ぎ止める役割を持つ。", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "es": { "value": "En la tradición hermética, el elemento tierra ancla el espíritu al plano material.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "it": { "value": "Nella tradizione ermetica, l'elemento terra ancora lo spirito al piano materiale.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } },
                "pt": { "value": "Na tradição hermética, o elemento terra ancora o espírito ao plano material.", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }
            },
            "meta": { "stability": 100.0 }
        }
    ],
    "shells": {
        "en": [{ "text": { "value": "earth", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ɜːrθ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 95, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "zh-CN": [{ "text": { "value": "土", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "tǔ", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 98, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "fr": [{ "text": { "value": "terre", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/tɛʁ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "de": [{ "text": { "value": "Erde", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈeːɐ̯də/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 94, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "ja": [{ "text": { "value": "土", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "つち (tsuchi)", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 95, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "es": [{ "text": { "value": "tierra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtjera/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 97, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "it": [{ "text": { "value": "terra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtɛrra/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }],
        "pt": [{ "text": { "value": "terra", "meta": { "stability": 100.0, "firstDiscoverer": "UNKNOWN", "firstDiscoveredAt": 0 } }, "pronunciation": { "value": "/ˈtɛʁɐ/", "meta": { "stability": 100.0 } }, "pos": { "value": "n.", "meta": { "stability": 100.0 } }, "level": { "value": "A1", "meta": { "stability": 100.0 } }, "wordFrequency": { "value": 96, "meta": { "stability": 100.0 } }, "absoluteSynonyms": { "value": false, "meta": { "stability": 100.0 } }, "nuances": { "value": { "register": ["neutral"], "intensity": "normal", "sentiment": "neutral", "domain": ["common"], "chrono": ["modern"] }, "meta": { "stability": 100.0 } }, "meta": { "stability": 100.0 } }]
    }
};



export const INITIAL_SENSES: SenseEntity[] = [
    SENSE_PHYSICAL_FIRE_001,
    SENSE_ALCHEMICAL_FIRE_002,
    SENSE_PHYSICAL_WATER_003,
    SENSE_ALCHEMICAL_WATER_003,
    SENSE_PHYSICAL_AIR_005,
    SENSE_ALCHEMICAL_AIR_006,
    SENSE_PHYSICAL_EARTH_007,
    SENSE_ALCHEMICAL_EARTH_008,
];
