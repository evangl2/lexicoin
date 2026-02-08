import React, { useMemo } from 'react';
import { loadDynamicComponent } from '../utils/dynamicComponentLoader';
import { AlchemyVisual } from './AlchemyVisual';

interface DynamicVisualProps {
    code: string;
    isActive?: boolean;
    fallbackElement?: string; // For AlchemyVisual fallback
}

export const DynamicVisual: React.FC<DynamicVisualProps> = ({
    code,
    isActive = false,
    fallbackElement = ''
}) => {
    // Memoize compilation to prevent re-running on every render
    const Component = useMemo(() => {
        if (!code) return null;
        return loadDynamicComponent(code);
    }, [code]);

    // Error boundary logic could be added here, but loadDynamicComponent handles basic errors

    if (Component) {
        // Render the dynamic component with passed props
        return <Component isActive={isActive} />;
    }

    // Fallback to AlchemyVisual if no code or compilation failed
    // This ensures existing functionality (like hardcoded visuals) still works if needed
    // or acts as a safe default.
    return <AlchemyVisual element={fallbackElement} isActive={isActive} />;
};
