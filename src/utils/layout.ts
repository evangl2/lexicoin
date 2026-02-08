/**
 * Layout Utilities
 * 
 * Helper functions for positioning elements on the canvas
 */

interface Point {
    x: number;
    y: number;
}

interface ItemBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Find a free position near a center point that doesn't overlap with existing items
 * Uses a spiral search pattern
 * 
 * @param centerX Center X coordinate to start search
 * @param centerY Center Y coordinate to start search
 * @param existingItems Array of existing items with position and dimensions
 * @param width Width of the item to place
 * @param height Height of the item to place
 * @param padding Padding between items
 * @returns A free Position {x, y}
 */
export function findFreePosition(
    centerX: number,
    centerY: number,
    existingItems: ItemBounds[],
    width: number,
    height: number,
    padding: number = 20
): Point {
    // If no existing items, return center
    if (existingItems.length === 0) {
        return { x: centerX, y: centerY };
    }

    const stepSize = 50; // Distance between spiral steps
    const angularStep = 0.5; // Radians per step
    let angle = 0;
    let radius = 0;
    let maxIterations = 1000; // Prevent infinite loop

    while (maxIterations > 0) {
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // Check collision at this position
        const hasCollision = existingItems.some(item => {
            return (
                x < item.x + item.width + padding &&
                x + width + padding > item.x &&
                y < item.y + item.height + padding &&
                y + height + padding > item.y
            );
        });

        if (!hasCollision) {
            return { x, y };
        }

        // Advance spiral
        angle += angularStep;
        radius = stepSize * angle; // Archemedian spiral
        maxIterations--;
    }

    // Fallback: Return center with random offset if no spot found
    return {
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100
    };
}
