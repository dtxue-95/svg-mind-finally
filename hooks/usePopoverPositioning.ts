import { useState, useLayoutEffect, RefObject } from 'react';

const POPOVER_MARGIN = 10; // px margin from the viewport edge

/**
 * A custom hook to calculate the optimal position for a popover element
 * to ensure it remains within the viewport.
 * @param ref - A React ref attached to the popover element.
 * @param x - The desired initial horizontal position (e.g., from a mouse click).
 * @param y - The desired initial vertical position (e.g., from a mouse click).
 * @returns A style object with calculated top, left, and opacity properties.
 */
export const usePopoverPositioning = (ref: RefObject<HTMLElement>, x: number, y: number) => {
    const [style, setStyle] = useState({
        top: y,
        left: x,
        opacity: 0, // Start with opacity 0 to prevent flicker before positioning
    });

    useLayoutEffect(() => {
        if (ref.current) {
            const popoverRect = ref.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let finalX = x;
            let finalY = y;

            // Adjust horizontal position
            if (finalX + popoverRect.width > viewportWidth) {
                finalX = viewportWidth - popoverRect.width - POPOVER_MARGIN;
            }
            finalX = Math.max(POPOVER_MARGIN, finalX);

            // Adjust vertical position
            if (finalY + popoverRect.height > viewportHeight) {
                finalY = viewportHeight - popoverRect.height - POPOVER_MARGIN;
            }
            finalY = Math.max(POPOVER_MARGIN, finalY);

            setStyle({ top: finalY, left: finalX, opacity: 1 });
        }
    }, [ref, x, y]);

    return style;
};
