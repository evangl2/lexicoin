import { useState, useCallback } from 'react';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

export const useAppUI = () => {
    // Menu States
    const [isDeckOpen, setIsDeckOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Language States
    const [learningLang, setLearningLang] = useState('ENGLISH');
    const [systemLang, setSystemLang] = useState('ENGLISH');

    // Audio States
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.8);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const toggleDeck = useCallback(() => {
        if (!isDeckOpen) setIsConfigOpen(false);
        setIsDeckOpen(prev => !prev);
    }, [isDeckOpen]);

    const toggleConfig = useCallback(() => {
        if (!isConfigOpen) setIsDeckOpen(false);
        setIsConfigOpen(prev => !prev);
    }, [isConfigOpen]);

    const closeMenus = useCallback(() => {
        setIsDeckOpen(false);
        setIsConfigOpen(false);
    }, []);

    // Localization Helper
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
        return langMap[uiLang] || 'en';
    };

    const getLoc = (key: string, lang: string = 'ENGLISH') => {
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

    return {
        isDeckOpen,
        isConfigOpen,
        learningLang,
        systemLang,
        setLearningLang,
        setSystemLang,
        isMuted,
        volume,
        setVolume,
        toggleMute,
        toggleDeck,
        toggleConfig,
        closeMenus,
        mapLanguageCode,
        getLoc
    };
};
