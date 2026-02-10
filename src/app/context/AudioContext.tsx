import React, { createContext, useContext, useCallback, useMemo } from 'react';
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
    isMuted: boolean;
    volume: number;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children, isMuted, volume }) => {

    // Wrap speak to respect global mute/volume settings
    const speak = useCallback(async (text: string, language: Language) => {
        if (isMuted) return;

        // Pass volume setting to tts instance if it supports it
        // We'll update tts.ts next to handle a volume parameter or property
        if ('setVolume' in tts) {
            (tts as any).setVolume(volume);
        }

        await tts.speak(text, language);
    }, [isMuted, volume]);

    const stop = useCallback(() => {
        tts.cancel();
    }, []);

    const playSFX = useCallback((effectName: string) => {
        if (isMuted) return;
        console.log(`[Audio] Playing SFX: ${effectName} at volume ${volume}`);
        // Future: Implement actual SFX playback logic mapping names to assets
    }, [isMuted, volume]);

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
