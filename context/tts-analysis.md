# TTS Feature Analysis

## 1. Overview
The current Text-to-Speech (TTS) implementation relies on the browser's native **Web Speech API** (`window.speechSynthesis`). It is encapsulated in a singleton provider pattern but faces integration issues with the React state management layer.

## 2. Architecture

### Core Logic (`src/app/utils/audio/tts.ts`)
- **Implements**: `ITTSProvider` interface.
- **Provider**: `WebSpeechProvider` (Singleton export `tts`).
- **Functionality**:
    - **Voice Selection**: Automatically selects the best available voice, prioritizing "Neural", "Google", "Natural", and "Premium" variants.
    - **Language Mapping**: Maps internal schema languages (e.g., `zh-CN`) to BCP 47 locales.
    - **State**: Manages its own `volume` and `voices` list.
    - **Lifecycle**: Handles asynchronous voice loading (`onvoiceschanged`).

### Context Layer (`src/app/context/AudioContext.tsx`)
- **Purpose**: Wraps the `tts` singleton to provide React context for global audio settings (`isMuted`, `volume`).
- **Exports**: `useAudio()` hook.
- **Intended Flow**: Components should use `useAudio()` to respect global mute/volume settings.

### Consumption (`src/app/components/ui/Card.tsx`)
- **Triggers**:
    - **Drag Start**: Speaks the word title.
    - **Card Expand**: Speaks the word title.
    - **Definition Select**: Speaks the selected definition.

## 3. Key Findings & Critical Issues

### ⚠️ Critical Architecture Flaw (Context Bypass)
**The `Card.tsx` component imports `tts` directly, completely bypassing `AudioContext`.**

```typescript
// src/app/components/ui/Card.tsx
import { tts } from '@/app/utils/audio/tts'; // DIRECT IMPORT

// ... later in code ...
tts.speak(title, learningLanguage); // CALLS SINGLETON DIRECTLY
```

**Consequences:**
1.  **Mute Ignored**: The global `isMuted` state is managed in `AudioContext`, but `Card.tsx` talks directly to `tts`. Therefore, **muting the application has NO EFFECT on card interactions.**
2.  **Volume Inconsistency**: `AudioProvider` only attempts to sync volume when *its* `speak` method is called. Since `Card` calls `tts.speak` directly, the volume on the `tts` instance may never be updated to match the UI slider.

### ✅ Positive Features
- **Smart Voice Selection**: The `getBestVoice` logic is robust for finding high-quality voices without user configuration.
- **Clean Abstraction**: The `ITTSProvider` interface allows for easy future swapping (e.g., to Azure/Edge TTS) without rewriting components.

## 4. Recommendations

### Immediate Fixes
1.  **Refactor `Card.tsx`**: Replace direct `tts` import with `useAudio()`.
    ```typescript
    // Change this:
    import { tts } from '@/app/utils/audio/tts';
    // To this:
    import { useAudio } from '@/app/context/AudioContext';
    // And use:
    const { speak } = useAudio();
    ```
2.  **Reactive State Sync**: Update `AudioProvider` to sync volume/mute state to the `tts` singleton immediately via `useEffect`, rather than lazily during playback.

### Future Improvements
1.  **Queue Management**: The current implementation cancels immediately (`this.cancel()`) before speaking. A queue system might be better for sequential feedback.
2.  **Cloud TTS**: The interface is ready for a switch to a higher-quality Cloud TTS service if needed.
