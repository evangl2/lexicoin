import type { ElementData } from '@/app/types/CardContent';

/**
 * Static data dictionary containing all element definitions and flavor texts.
 * Supports bilingual content (English and Simplified Chinese).
 * 
 * Elements included: fire, water, earth, air, wind, ether, void
 */
export const ELEMENT_DATA: Record<string, ElementData> = {
    fire: {
        definitions: [
            { id: 'd1', en: "The state of burning that produces flames that send out heat and light, and might produce smoke.", zh: "燃烧产生火焰、发出热和光，并可能产生烟雾的状态。", pos: "n." },
            { id: 'd2', en: "Strong emotion, especially anger or enthusiasm.", zh: "强烈的情感，尤指愤怒或热情。", pos: "n." },
            { id: 'd3', en: "Shots from guns or other weapons.", zh: "来自枪支或其他武器的射击。", pos: "n." },
        ],
        flavors: [
            { id: 'f1', en: "It warms the soul and burns the flesh.", zh: "它温暖灵魂，亦焚烧肉体。" },
            { id: 'f2', en: "A spark is all it takes to start a catastrophe.", zh: "星星之火，足以燎原。" },
            { id: 'f3', en: "Dance with the flames, but do not touch them.", zh: "与烈焰共舞，但勿触及其锋芒。" },
        ]
    },
    water: {
        definitions: [
            { id: 'd1', en: "A clear liquid, without colour or taste, that falls from the sky as rain and is necessary for animal and plant life.", zh: "一种无色无味的透明液体，作为雨水从天而降，是动植物生命所必需的。", pos: "n." },
            { id: 'd2', en: "An area of water, such as a sea, lake, or swimming pool.", zh: "一片水域，如海洋、湖泊或游泳池。", pos: "n." },
            { id: 'd3', en: "To pour water on to plants or the soil that they are growing in.", zh: "给植物或其生长的土壤浇水。", pos: "v." },
        ],
        flavors: [
            { id: 'f1', en: "Be formless, shapeless, like water.", zh: "像水一样，无形无状。" },
            { id: 'f2', en: "The gentle drop hollows the stone not by force but by persistence.", zh: "水滴石穿，非力使然，乃恒心也。" },
            { id: 'f3', en: "Beneath the calm surface lies the deep abyss.", zh: "平静的水面下隐藏着深渊。" },
        ]
    },
    earth: {
        definitions: [
            { id: 'd1', en: "The planet third in order of distance from the Sun, between Venus and Mars; the world on which we live.", zh: "距离太阳第三远的行星，位于金星和火星之间；我们要生活的世界。", pos: "n." },
            { id: 'd2', en: "The usually brown, heavy and loose substance of which the ground is made.", zh: "构成地面的通常为棕色、沉重且松散的物质（土壤）。", pos: "n." },
            { id: 'd3', en: "The wire that connects an electrical device to the ground to make it safe.", zh: "将电气设备连接到地面的导线，以确保安全（接地线）。", pos: "n." },
        ],
        flavors: [
            { id: 'f1', en: "From dust we come, and to dust we shall return.", zh: "尘归尘，土归土。" },
            { id: 'f2', en: "Stable as the mountain, nurturing as the soil.", zh: "稳如泰山，厚德载物。" },
            { id: 'f3', en: "The roots go deep where the gold is buried.", zh: "根深之处，必有黄金。" },
        ]
    },
    air: {
        definitions: [
            { id: 'd1', en: "The mixture of gases that surrounds the earth and that we breathe.", zh: "环绕地球并供我们呼吸的混合气体。", pos: "n." },
            { id: 'd2', en: "Space or area above the ground.", zh: "地面以上的空间或区域。", pos: "n." },
            { id: 'd3', en: "To express your opinions or complaints publicly.", zh: "公开表达你的观点或不满。", pos: "v." },
        ],
        flavors: [
            { id: 'f1', en: "The wind does not break a tree that bends.", zh: "懂得弯腰的树不会被风折断。" },
            { id: 'f2', en: "Invisible, yet it moves the world.", zh: "无形无影，却推动着世界。" },
            { id: 'f3', en: "Whispers of the ancients carry on the breeze.", zh: "古人的低语随微风飘扬。" },
        ]
    },
    wind: {
        definitions: [
            { id: 'd1', en: "A natural current of air that moves fast enough for you to feel it.", zh: "一股移动速度快到你能感觉到的自然气流。", pos: "n." },
            { id: 'd2', en: "Breath or the ability to breathe.", zh: "呼吸或呼吸的能力。", pos: "n." },
            { id: 'd3', en: "Gas in the stomach or intestines that causes you discomfort.", zh: "胃或肠道中引起不适的气体。", pos: "n." },
        ],
        flavors: [
            { id: 'f1', en: "The wind of change blows straight into the face of time.", zh: "变革之风直面时间吹拂。" },
            { id: 'f2', en: "It goes where it lists, and no one knows whence it comes.", zh: "风随意思吹，无人知晓其从何而来。" },
            { id: 'f3', en: "Swift as a shadow, sharp as a blade.", zh: "疾如魅影，利如锋刃。" },
        ]
    },
    ether: {
        definitions: [
            { id: 'd1', en: "The clear sky; the upper regions of air beyond the clouds.", zh: "晴空；云层之上的高空。", pos: "n." },
            { id: 'd2', en: "A hypothetical substance supposed to occupy all space.", zh: "假想的充满所有空间的物质（以太）。", pos: "n." },
        ],
        flavors: [
            { id: 'f1', en: "The fifth element, the quintessence.", zh: "第五元素，精髓所在。" },
            { id: 'f2', en: "Beyond the material world lies the ether.", zh: "物质世界之外，即是以太。" },
        ]
    },
    void: {
        definitions: [
            { id: 'd1', en: "A completely empty space.", zh: "完全空虚的空间。", pos: "n." },
            { id: 'd2', en: "An emptying; a vacuum.", zh: "排空；真空。", pos: "n." },
        ],
        flavors: [
            { id: 'f1', en: "When you gaze long into the abyss, the abyss gazes also into you.", zh: "当你凝视深渊时，深渊也在凝视你。" },
            { id: 'f2', en: "Silence is the language of the void.", zh: "沉默是虚空的语言。" },
        ]
    }
};
