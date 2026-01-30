/**
 * Slot Renderer
 * 
 * Safely render optional Slot components, supporting:
 * 1. Slot undefined → Do not render
 * 2. Slot is null → Do not render (Explicitly disabled)
 * 3. Slot exists → Render component
 * 
 * Usage Example:
 * ```tsx
 * // Basic Usage
 * <Slot slot={persona.slots.Background} />
 * 
 * // With params
 * <Slot slot={persona.slots.DurabilityBar} props={{ progress: 0.75 }} />
 * 
 * // With fallback
 * <Slot slot={persona.slots.Frame} fallback={<DefaultFrame />} />
 * ```
 */

import React from 'react';

// ==================== SLOT COMPONENT ====================

interface SlotProps<P = object> {
    /** Slot component, can be undefined or null */
    slot?: React.FC<P> | null;
    /** Props passed to Slot */
    props?: P;
    /** Fallback when Slot does not exist */
    fallback?: React.ReactNode;
    /** Wrapper className */
    className?: string;
    /** Wrapper style */
    style?: React.CSSProperties;
}

/**
 * Slot Renderer Component
 * 
 * Safely render optional Slot component
 */
export function Slot<P extends object = object>({
    slot: SlotComponent,
    props = {} as P,
    fallback = null,
    className,
    style,
}: SlotProps<P>): React.ReactElement | null {
    // Slot undefined or explicitly disabled
    if (SlotComponent === undefined || SlotComponent === null) {
        return fallback as React.ReactElement | null;
    }

    // Render Slot
    const element = <SlotComponent {...props} />;

    // If container style exists, add wrapper div
    if (className || style) {
        return (
            <div className={className} style={style}>
                {element}
            </div>
        );
    }

    return element;
}

// ==================== SLOT HOOK ====================

/**
 * useSlot Hook
 * 
 * Safely use Slot in function component
 * 
 * @example
 * const background = useSlot(persona.slots.Background);
 * const durabilityBar = useSlot(persona.slots.DurabilityBar, { progress: 0.5 });
 */
export function useSlot<P extends object = object>(
    slot: React.FC<P> | undefined | null,
    props?: P
): React.ReactElement | null {
    if (!slot) return null;
    const Component = slot;
    return <Component {...(props || {} as P)} />;
}

// ==================== SLOT UTILITIES ====================

/**
 * Check if Slot is available
 */
export function isSlotAvailable(slot: React.FC<any> | undefined | null): boolean {
    return slot !== undefined && slot !== null;
}

/**
 * Conditional Render Slot
 * Render only if condition is true and Slot exists
 */
export function SlotIf<P extends object = object>({
    condition,
    slot,
    props,
    fallback,
}: {
    condition: boolean;
    slot?: React.FC<P> | null;
    props?: P;
    fallback?: React.ReactNode;
}): React.ReactElement | null {
    if (!condition) return null;
    return <Slot slot={slot} props={props} fallback={fallback} />;
}

// ==================== CUSTOM SLOTS RENDERER ====================

interface CustomSlotsProps {
    /** Custom slots map */
    customSlots?: Record<string, React.FC<any>>;
    /** Allowed slot names list (Optional filter) */
    allowedSlots?: string[];
    /** Shared props passed to all custom slots */
    sharedProps?: Record<string, any>;
}

/**
 * Render all custom slots
 * 
 * Used for Persona extension custom visual components
 */
export function CustomSlots({
    customSlots,
    allowedSlots,
    sharedProps = {},
}: CustomSlotsProps): React.ReactElement | null {
    if (!customSlots) return null;

    const slots = allowedSlots
        ? Object.entries(customSlots).filter(([name]) => allowedSlots.includes(name))
        : Object.entries(customSlots);

    if (slots.length === 0) return null;

    return (
        <>
            {slots.map(([name, Component]) => (
                <Component key={name} {...sharedProps} />
            ))}
        </>
    );
}
