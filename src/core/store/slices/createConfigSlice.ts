import { StateCreator } from 'zustand';
import type { GameStore } from '../interfaces';
import { DEFAULT_MODEL_ID } from '@/config/constants';

export interface ConfigState {
    // Language
    learningLang: string;
    systemLang: string;
    setLearningLang: (lang: string) => void;
    setSystemLang: (lang: string) => void;

    // Visuals
    activeSkin: string;
    setActiveSkin: (skin: string) => void;

    // Audio
    audio: {
        muted: boolean;
        volume: number;
    };
    setMuted: (muted: boolean) => void;
    setVolume: (volume: number) => void;

    // AI Model
    activeModelId: string;
    setActiveModelId: (modelId: string) => void;
}

export const createConfigSlice: StateCreator<GameStore, [], [], ConfigState> = (set) => ({
    // Defaults matching existing code
    learningLang: 'ENGLISH',
    systemLang: 'ENGLISH',
    setLearningLang: (lang) => set({ learningLang: lang }),
    setSystemLang: (lang) => set({ systemLang: lang }),

    activeSkin: 'default',
    setActiveSkin: (skin) => set({ activeSkin: skin }),

    audio: {
        muted: false,
        volume: 0.8,
    },
    setMuted: (muted) => set((state) => ({
        audio: { ...state.audio, muted }
    })),
    setVolume: (volume) => set((state) => ({
        audio: { ...state.audio, volume }
    })),

    activeModelId: DEFAULT_MODEL_ID,
    setActiveModelId: (modelId) => set({ activeModelId: modelId }),
});
