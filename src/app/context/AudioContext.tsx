import React, { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '@store/index';
import { tts } from '@/app/utils/audio/tts';
import type { Language } from '@schemas/schemas/SenseEntity.schema';

interface AudioContextType {
    speak: (text: string, language: Language) => Promise<void>;
    stop: () => void;
    playSFX: (effectName: string) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};

interface AudioProviderProps {
    children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
    const isMuted = useGameStore(s => s.audio.muted);
    const volume = useGameStore(s => s.audio.volume);

    const isMutedRef = useRef(isMuted);
    const volumeRef = useRef(volume);
    isMutedRef.current = isMuted;
    volumeRef.current = volume;

    const speak = useCallback(async (text: string, language: Language) => {
        if (isMutedRef.current) return;
        if ('setVolume' in tts) {
            (tts as any).setVolume(volumeRef.current);
        }
        await tts.speak(text, language);
    }, []);

    const stop = useCallback(() => {
        tts.cancel();
    }, []);

    const playSFX = useCallback((effectName: string) => {
        if (isMutedRef.current) return;
        console.log(`[Audio] Playing SFX: ${effectName} at volume ${volumeRef.current}`);
        // Future: Implement actual SFX playback logic mapping names to assets
    }, []);

    const value = useMemo(() => ({
        speak,
        stop,
        playSFX
    }), [speak, stop, playSFX]);

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
};
