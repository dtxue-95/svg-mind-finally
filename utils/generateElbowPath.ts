import type { MindMapNodeData } from '../types';

/**
 * Generates the SVG path data for a right-angle elbow connector between two nodes.
 * The path starts from the middle of the source node's right edge, goes horizontally,
 * then turns 90 degrees to go vertically, and finally turns 90 degrees again
 * to connect to the middle of the target node's left edge.
 *
 * @param source The source node data.
 * @param target The target node data.
 * @returns An SVG path string (e.g., "M 100 50 L 150 50 L 150 100 L 200 100") or an empty string if data is invalid.
 */
export const generateElbowPath = (source: MindMapNodeData, target: MindMapNodeData): string => {
    // Ensure all necessary geometric data is present on both nodes.
    // If any data is missing, we cannot draw a proper connector.
    if (
        !source?.position ||
        typeof source.width !== 'number' ||
        typeof source.height !== 'number' ||
        !target?.position ||
        typeof target.height !== 'number'
    ) {
        // Return an empty string which results in no path being rendered.
        return '';
    }

    // --- Calculate Connection Points ---

    // The start point of the path is the vertical center of the source node's right edge.
    const sourceX = source.position.x + source.width;
    const sourceY = source.position.y + source.height / 2;

    // The end point of the path is the vertical center of the target node's left edge.
    const targetX = target.position.x;
    const targetY = target.position.y + target.height / 2;

    // --- Calculate Elbow Turn Point ---

    // The elbow "turn" happens at a point halfway between the source and target nodes horizontally.
    const midX = sourceX + (targetX - sourceX) / 2;

    // --- Construct SVG Path String ---

    // The path consists of three segments forming a "Z" shape:
    // 1. Move to the source point.
    // 2. Draw a horizontal line to the middle X-coordinate.
    // 3. Draw a vertical line to align with the target's Y-coordinate.
    // 4. Draw a horizontal line to the final target point.
    return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
};
