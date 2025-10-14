
import type { MindMapData, MindMapNodeData } from '../types';

/**
 * Finds the chain of nodes from the root to a given node.
 * @param mindMap The mind map data.
 * @param nodeUuid The UUID of the target node.
 * @returns An object containing arrays of ancestor UUIDs and nodes, in order from root to the node itself.
 */
export const getNodeChainByUuid = (mindMap: MindMapData, nodeUuid: string): { uuids: string[], nodes: MindMapNodeData[] } => {
    const chainNodes: MindMapNodeData[] = [];
    const chainUuids: string[] = [];
    let currentNode = mindMap.nodes[nodeUuid];

    // Traverse up from the node to the root
    while (currentNode) {
        chainNodes.unshift(currentNode); // Add to the beginning
        chainUuids.unshift(currentNode.uuid!);
        currentNode = currentNode.parentUuid ? mindMap.nodes[currentNode.parentUuid] : undefined;
    }

    return { uuids: chainUuids, nodes: chainNodes };
};