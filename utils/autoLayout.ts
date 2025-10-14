import type { MindMapData, MindMapNodeData } from '../types';
import { HORIZONTAL_SPACING, VERTICAL_SPACING } from '../constants';

export const autoLayout = (currentMindMap: MindMapData): MindMapData => {
    const newPositions: { [key: string]: { x: number, y: number } } = {};

    // A recursive function to lay out a branch of the mind map.
    // It's a pre-order traversal.
    const layoutBranch = (nodeUuid: string, x: number, startY: number): { height: number } => {
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return { height: 0 };

        const children = (node.isCollapsed ? [] : node.childNodeList)?.map(childUuid => currentMindMap.nodes[childUuid]) ?? [];
        
        let subtreeHeight = 0;
        let currentY = startY;

        // If the node has children, recursively lay them out first to determine the total height of the subtree.
        if (children.length > 0) {
            const childrenHeights = children.map(child => {
                if (!child || !child.uuid) return 0;
                // The x position for a child is its parent's x + parent's width + spacing.
                const childLayout = layoutBranch(child.uuid, x + (node.width ?? 0) + HORIZONTAL_SPACING, currentY);
                currentY += childLayout.height + VERTICAL_SPACING;
                return childLayout.height;
            });
            // The total height of the subtree is the sum of children's heights and the spacing between them.
            subtreeHeight = childrenHeights.reduce((a, b) => a + b, 0) + (children.length - 1) * VERTICAL_SPACING;
        }

        const nodeHeight = node.height ?? 0;
        // The total height of the branch is the maximum of the node's own height or its subtree's height.
        const totalBranchHeight = Math.max(nodeHeight, subtreeHeight);

        // Position the current node. X is passed in. Y is vertically centered relative to its children's collective block.
        const nodeY = startY + (totalBranchHeight - nodeHeight) / 2;
        newPositions[nodeUuid] = { x, y: nodeY };

        return { height: totalBranchHeight };
    };

    // Start the layout process from the root node at position (0, 0).
    if (currentMindMap.rootUuid) {
        layoutBranch(currentMindMap.rootUuid, 0, 0);
    }
    

    // Normalize all Y positions to ensure the minimum Y is 0, preventing nodes from appearing off-screen.
    const allY = Object.values(newPositions).map(p => p.y);
    const minY = allY.length > 0 ? Math.min(...allY) : 0;


    const finalNodes: Record<string, MindMapNodeData> = { ...currentMindMap.nodes };
    for (const uuid in newPositions) {
        if (finalNodes[uuid]) {
            finalNodes[uuid] = {
                ...finalNodes[uuid],
                position: {
                    x: newPositions[uuid].x,
                    y: newPositions[uuid].y - minY,
                },
            };
        }
    }

    return { ...currentMindMap, nodes: finalNodes };
};