import type { MindMapNodeData } from '../types';

/**
 * Generates the SVG path data for a right-angled "elbow" connector
 * between two nodes.
 *
 * @param source The source node data.
 * @param target The target node data.
 * @returns An SVG path string for an elbow connector.
 */
export const generateElbowPath = (source: MindMapNodeData, target: MindMapNodeData): string => {
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

    const midX = sourceX + (targetX - sourceX) / 2;

    return `M ${sourceX},${sourceY} L ${midX},${sourceY} L ${midX},${targetY} L ${targetX},${targetY}`;
};
