import type { Language } from 'a:/lexicoin/lexicoin/schemas/schemas/SenseEntity.schema';

export const mapLanguageCode = (uiLang: string): Language => {
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
    return langMap[uiLang] || 'en';
};

export const getLoc = (key: string, lang: string = 'ENGLISH') => {
    const isZh = lang === '简体中文';
    const dict: Record<string, { en: string; zh: string }> = {
        'Center': { en: 'Center', zh: '中心' },
        'Arrange': { en: 'Arrange', zh: '整理' },
        'Zoom': { en: 'Zoom', zh: '缩放' },
        'Double click to add card': { en: 'Double click to add card', zh: '双击添加卡片' },
        'Evolve Prism': { en: 'Evolve Prism', zh: '进化棱镜' },
        'Arcane Dust': { en: 'Arcane Dust', zh: '奥术之尘' },
        'Empty Vial': { en: 'Empty Vial', zh: '空瓶' },
        'New Card': { en: 'New Card', zh: '新卡片' },
    };
    return isZh ? (dict[key]?.zh || key) : (dict[key]?.en || key);
};
