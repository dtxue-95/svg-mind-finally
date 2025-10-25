import type { MindMapNodeData } from '../types';

/**
 * Generates the SVG path data for a smooth, horizontal cubic Bézier curve
 * between two nodes. The curve helps create a more organic and modern look.
 *
 * @param source The source node data.
 * @param target The target node data.
 * @returns An SVG path string for a Bézier curve or an empty string if data is invalid.
 */
export const generateCurvePath = (source: MindMapNodeData, target: MindMapNodeData): string => {
    if (
        !source?.position ||
        typeof source.width !== 'number' ||
        typeof source.height !== 'number' ||
        !target?.position ||
        typeof target.height !== 'number'
    ) {
        return '';
    }

    const sourceX = source.position.x + source.width;
    const sourceY = source.position.y + source.height / 2;

    const targetX = target.position.x;
    const targetY = target.position.y + target.height / 2;

    const controlPointX1 = sourceX + (targetX - sourceX) / 2;
    const controlPointY1 = sourceY;
    const controlPointX2 = targetX - (targetX - sourceX) / 2;
    const controlPointY2 = targetY;

    return `M ${sourceX} ${sourceY} C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${targetX} ${targetY}`;
};
