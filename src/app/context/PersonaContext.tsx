/**
 * PERSONA CONTEXT
 * 
 * Provides global Persona access, supporting:
 * 1. Runtime skin switching
 * 2. Automatic Deep Merge Fallback
 * 3. Convenient Hooks
 * 
 * Usage:
 * ```tsx
 * // Wrap App
 * <PersonaProvider>
 *   <App />
 * </PersonaProvider>
 * 
 * // Use in components
 * const { card, canvas, interface: ui } = usePersona();
 * // Or use convenient hooks
 * const cardPersona = useCardPersona();
 * ```
 */

import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import type {
    CardPersona,
    CanvasPersona,
    InterfacePersona,
} from '@/app/types/persona.types';
import { deepMerge } from '@/app/utils/deepMerge';
import { getPersona, getAvailablePersonas, DEFAULT_PERSONA_NAME } from '@/app/components/persona/registry';

// ==================== CONTEXT TYPE ====================

interface PersonaContextValue {
    /** Current Card Persona (Merged full version) */
    card: CardPersona;

    /** Current Canvas Persona (Merged full version) */
    canvas: CanvasPersona;

    /** Current Interface Persona (Merged full version) */
    interface: InterfacePersona;

    /** Currently active skin name */
    activeSkin: string;

    /** Switch skin */
    setSkin: (name: string) => void;

    /** Available skins list */
    availableSkins: string[];

    /** Reset to default skin */
    resetToDefault: () => void;
}

// ==================== CONTEXT ====================

const PersonaContext = createContext<PersonaContextValue | null>(null);

// ==================== PROVIDER ====================

interface PersonaProviderProps {
    children: ReactNode;
    /** Initial skin name */
    initialSkin?: string;
}

export const PersonaProvider: React.FC<PersonaProviderProps> = ({
    children,
    initialSkin = DEFAULT_PERSONA_NAME
}) => {
    const [activeSkin, setActiveSkin] = useState(initialSkin);

    // Get available skin list
    const availableSkins = useMemo(() => getAvailablePersonas(), []);

    // Merge Personas
    const mergedPersona = useMemo(() => {
        const defaultBundle = getPersona(DEFAULT_PERSONA_NAME);
        const customBundle = activeSkin !== DEFAULT_PERSONA_NAME
            ? getPersona(activeSkin)
            : null;

        // If default skin, return full type directly
        if (!customBundle) {
            return {
                card: defaultBundle.card as CardPersona,
                canvas: defaultBundle.canvas as CanvasPersona,
                interface: defaultBundle.interface as InterfacePersona,
            };
        }

        // Deep merge with fallback - Use type assertions to ensure full type return
        const mergedCard = deepMerge(
            defaultBundle.card as unknown as Record<string, unknown>,
            customBundle.card as unknown as Record<string, unknown>
        ) as unknown as CardPersona;

        const mergedCanvas = deepMerge(
            defaultBundle.canvas as unknown as Record<string, unknown>,
            customBundle.canvas as unknown as Record<string, unknown>
        ) as unknown as CanvasPersona;

        const mergedInterface = deepMerge(
            defaultBundle.interface as unknown as Record<string, unknown>,
            customBundle.interface as unknown as Record<string, unknown>
        ) as unknown as InterfacePersona;

        return {
            card: mergedCard,
            canvas: mergedCanvas,
            interface: mergedInterface,
        };
    }, [activeSkin]);

    // Switch Skin
    const setSkin = useCallback((name: string) => {
        if (availableSkins.includes(name)) {
            setActiveSkin(name);
        } else {
            console.warn(`Persona "${name}" not found. Available: ${availableSkins.join(', ')}`);
        }
    }, [availableSkins]);

    // Reset to Default
    const resetToDefault = useCallback(() => {
        setActiveSkin(DEFAULT_PERSONA_NAME);
    }, []);

    const value: PersonaContextValue = {
        ...mergedPersona,
        activeSkin,
        setSkin,
        availableSkins,
        resetToDefault,
    };

    return (
        <PersonaContext.Provider value={value}>
            {children}
        </PersonaContext.Provider>
    );
};

// ==================== HOOKS ====================

/**
 * Get full Persona Context
 */
export const usePersona = (): PersonaContextValue => {
    const ctx = useContext(PersonaContext);
    if (!ctx) {
        throw new Error('usePersona must be used within PersonaProvider');
    }
    return ctx;
};

/**
 * 获取 Card Persona
 */
export const useCardPersona = (): CardPersona => {
    return usePersona().card;
};

/**
 * 获取 Canvas Persona
 */
export const useCanvasPersona = (): CanvasPersona => {
    return usePersona().canvas;
};

/**
 * 获取 Interface Persona
 */
export const useInterfacePersona = (): InterfacePersona => {
    return usePersona().interface;
};

/**
 * 获取皮肤切换功能
 */
export const useSkinSwitcher = () => {
    const { activeSkin, setSkin, availableSkins, resetToDefault } = usePersona();
    return { activeSkin, setSkin, availableSkins, resetToDefault };
};
