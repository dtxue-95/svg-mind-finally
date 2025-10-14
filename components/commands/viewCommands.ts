import type { MindMapNodeData, CanvasTransform } from '../../types';

const PADDING = 50; // px padding around the content when fitting to view

/**
 * Calculates the transform required to fit all mind map nodes into the canvas view.
 * @param nodes - A record of all nodes in the mind map.
 * @param canvasRect - The bounding client rectangle of the canvas.
 * @returns A new CanvasTransform object.
 */
export const fitView = (
    nodes: Record<string, MindMapNodeData>,
    canvasRect: DOMRect
): Partial<CanvasTransform> => {
    const nodeList = Object.values(nodes);
    if (nodeList.length === 0) {
        return { scale: 1, translateX: 0, translateY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodeList.forEach(node => {
        if (node.position && typeof node.width !== 'undefined' && typeof node.height !== 'undefined') {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            maxY = Math.max(maxY, node.position.y + node.height);
        }
    });

    if (minX === Infinity) { // No nodes had position or dimensions
        return { scale: 1, translateX: 0, translateY: 0 };
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth <= 0 || contentHeight <= 0) {
        // Center the single node or line of nodes
        const scale = 1;
        const translateX = canvasRect.width / 2 - (minX * scale) - (contentWidth * scale / 2);
        const translateY = canvasRect.height / 2 - (minY * scale) - (contentHeight * scale / 2);
        return { scale, translateX, translateY };
    }

    const scaleX = (canvasRect.width - PADDING * 2) / contentWidth;
    const scaleY = (canvasRect.height - PADDING * 2) / contentHeight;
    
    // Calculate the ideal scale to fit the content.
    let scale = Math.min(scaleX, scaleY);

    // Clamp the scale within the allowed min/max zoom levels (10% to 400%).
    scale = Math.max(0.1, Math.min(scale, 4.0));

    const scaledContentWidth = contentWidth * scale;
    const scaledContentHeight = contentHeight * scale;

    const translateX = (canvasRect.width - scaledContentWidth) / 2 - minX * scale;
    const translateY = (canvasRect.height - scaledContentHeight) / 2 - minY * scale;

    return { scale, translateX, translateY };
};

/**
 * Calculates the transform required to center the view on a specific node.
 * @param nodes - A record of all nodes.
 * @param nodeUuid - The UUID of the node to center on.
 * @param canvasRect - The bounding client rectangle of the canvas.
 * @param currentScale - The current zoom scale of the canvas.
 * @returns A new CanvasTransform object with updated translateX and translateY.
 */
export const centerView = (
    nodes: Record<string, MindMapNodeData>,
    nodeUuid: string,
    canvasRect: DOMRect,
    currentScale: number
): Partial<CanvasTransform> => {
    const node = nodes[nodeUuid];
    if (!node || !node.position || typeof node.width === 'undefined' || typeof node.height === 'undefined') {
        return {}; // Return empty object to not change transform
    }

    const nodeCenterX = node.position.x + node.width / 2;
    const nodeCenterY = node.position.y + node.height / 2;

    const translateX = canvasRect.width / 2 - nodeCenterX * currentScale;
    const translateY = canvasRect.height / 2 - nodeCenterY * currentScale;

    return { translateX, translateY };
};