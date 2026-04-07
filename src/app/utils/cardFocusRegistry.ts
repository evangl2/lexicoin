/**
 * Global pointerdown delegation for card focus/collapse handling.
 *
 * Each Card that is expanded or flipped registers a handler here.
 * App.tsx holds a single capture-phase window listener that dispatches to all
 * registered handlers — replacing N per-card window listeners with one.
 *
 * In the common case (no card is expanded/flipped) the registry is empty
 * and dispatch is a no-op forEach over an empty Map.
 */

type PointerHandler = (e: PointerEvent) => void;

const registry = new Map<string, PointerHandler>();

export const cardFocusRegistry = {
  register(uid: string, handler: PointerHandler): void {
    registry.set(uid, handler);
  },

  unregister(uid: string): void {
    registry.delete(uid);
  },

  dispatch(e: PointerEvent): void {
    registry.forEach(handler => handler(e));
  },
};
