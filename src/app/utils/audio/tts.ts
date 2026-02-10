import type { Language } from '../../../../schemas/schemas/SenseEntity.schema';

/**
 * Interface for TTS Providers.
 * Abstraction layer to allow swapping between Web Speech API and future Cloud TTS APIs.
 */
export interface ITTSProvider {
    /**
     * Speak the provided text in the requested language.
     * @param text Text to speak
     * @param language Target language (will be mapped to specific locale)
     */
    speak(text: string, language: Language): Promise<void>;

    /**
     * Stop any currently playing audio immediately.
     */
    cancel(): void;
}

/**
 * Native Web Speech API Provider.
 * Handles browser inconsistencies, voice selection, and language mapping.
 */
class WebSpeechProvider implements ITTSProvider {
    private voices: SpeechSynthesisVoice[] = [];
    private initialized = false;
    private volume = 1.0;

    // Priority keywords for voice selection (Natural sounding voices)
    private readonly VOICE_PRIORITIES = ['Google', 'Neural', 'Premium', 'Enhanced', 'Natural'];

    // Map strict schema languages to BCP 47 locales
    private readonly LANG_MAP: Record<string, string> = {
        'en': 'en-US',
        'zh-CN': 'zh-CN',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'ja': 'ja-JP',
        'es': 'es-ES',
        'it': 'it-IT',
        'pt': 'pt-BR' // Defaulting to Brazilian Portuguese for 'pt'
    };

    constructor() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.initVoices();
            // Browsers load voices asynchronously
            window.speechSynthesis.onvoiceschanged = () => {
                this.initVoices();
            };
        }
    }

    private initVoices() {
        this.voices = window.speechSynthesis.getVoices();
        this.initialized = true;
    }

    setVolume(v: number) {
        this.volume = Math.max(0, Math.min(1, v));
    }

    /**
     * Get the best available voice for a given locale.
     * Prioritizes "Google", "Neural", etc.
     */
    private getBestVoice(locale: string): SpeechSynthesisVoice | null {
        if (!this.initialized || this.voices.length === 0) {
            this.initVoices();
        }

        // Filter for specific locale
        const localeVoices = this.voices.filter(v => v.lang.startsWith(locale) || v.lang.startsWith(locale.split('-')[0]!));

        if (localeVoices.length === 0) return null;

        // Sort by quality keywords
        localeVoices.sort((a, b) => {
            const aScore = this.getVoiceScore(a.name);
            const bScore = this.getVoiceScore(b.name);
            return bScore - aScore; // Descending
        });

        return localeVoices[0] || null;
    }

    private getVoiceScore(name: string): number {
        let score = 0;
        this.VOICE_PRIORITIES.forEach((keyword, index) => {
            if (name.includes(keyword)) score += (this.VOICE_PRIORITIES.length - index);
        });
        return score;
    }

    async speak(text: string, language: Language): Promise<void> {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // 1. Cancel existing speech (debounce/cut-off)
        this.cancel();

        // 2. Validate input
        if (!text) return;

        const locale = this.LANG_MAP[language] || 'en-US';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = locale;
        utterance.volume = this.volume;

        // 3. Select Voice
        const voice = this.getBestVoice(locale);
        if (voice) {
            utterance.voice = voice;
        }

        // 4. Speak
        // Wrap in a promise to allow awaiting completion if needed in future
        // For now, we fire-and-forget but return a resolved promise
        window.speechSynthesis.speak(utterance);

        return Promise.resolve();
    }

    cancel() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }
}

// Singleton Instance
export const tts = new WebSpeechProvider();
