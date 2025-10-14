import { MindMapData, MindMapNodeData, RawNode, reverseNodeTypeMapping, reversePriorityMapping } from '../types';

/**
 * Converts a single MindMapNodeData object to a RawNode object without its descendants.
 * This is used for representing single nodes in a chain or as a parent.
 * @param node The internal node data.
 * @returns A RawNode object without children.
 */
export const convertSingleMindMapNodeToRawNode = (node?: MindMapNodeData): RawNode | undefined => {
    if (!node) return undefined;

    const rawNode: RawNode = {
        uuid: node.uuid,
        name: node.name,
        nodeType: node.nodeType ? reverseNodeTypeMapping[node.nodeType] : undefined,
        priorityLevel: node.priorityLevel ? String(reversePriorityMapping[node.priorityLevel]) : undefined,
        generateModeName: node.generateModeName,
        id: node.id,
        parentId: node.parentId,
        sortNumber: node.sortNumber,
        // Review fields
        hasRemark: node.hasRemark,
        hasScore: node.hasScore,
        scoreInfo: node.scoreInfo,
        RemarkHistory: node.RemarkHistory,
        reviewStatusCode: node.reviewStatusCode,
        reviewStatusName: node.reviewStatusName,
    };

    // Clean up undefined properties for a cleaner object
    if (rawNode.nodeType === undefined) delete rawNode.nodeType;
    if (rawNode.priorityLevel === undefined || rawNode.priorityLevel === null) delete rawNode.priorityLevel;
    if (rawNode.generateModeName === undefined) delete rawNode.generateModeName;
    if (rawNode.sortNumber === undefined) delete rawNode.sortNumber;

    return rawNode;
};

/**
 * Recursively builds a hierarchical RawNode tree from a flat MindMapData structure,
 * starting from a given node UUID.
 * @param nodeUuid The UUID of the node to start building the tree from.
 * @param allNodes The record of all nodes from the internal state.
 * @returns A hierarchical RawNode representing the specified node and its descendants.
 */
const buildRawTree = (nodeUuid: string, allNodes: Record<string, MindMapNodeData>): RawNode => {
    const node = allNodes[nodeUuid];
    if (!node) {
        console.error(`Node with uuid ${nodeUuid} not found during hierarchical conversion.`);
        return { uuid: nodeUuid, name: 'Error: Node not found' } as RawNode;
    }

    const rawNode: RawNode = convertSingleMindMapNodeToRawNode(node) ?? ({} as RawNode);

    const children = (node.childNodeList ?? [])
        .map(childUuid => buildRawTree(childUuid, allNodes))
        .filter(child => child); // Filter out any potential errors

    if (children.length > 0) {
        rawNode.childNodeList = children;
    }

    return rawNode;
};

/**
 * Converts the entire flat MindMapData object into a single hierarchical RawNode tree.
 * @param mindMapData The complete internal mind map data.
 * @returns A single hierarchical RawNode representing the entire mind map.
 */
export const convertMindMapDataToRawNode = (mindMapData: MindMapData): RawNode => {
    if (!mindMapData || !mindMapData.rootUuid || !mindMapData.nodes[mindMapData.rootUuid]) {
        return {} as RawNode; // Return an empty object for an empty or invalid mind map
    }
    return buildRawTree(mindMapData.rootUuid, mindMapData.nodes);
};

/**
 * Converts a specific node and its entire descendant tree from a flat MindMapData object
 * into a hierarchical RawNode tree.
 * @param nodeUuid The UUID of the root of the subtree to convert.
 * @param mindMapData The complete internal mind map data.
 * @returns A hierarchical RawNode representing the specified subtree.
 */
export const convertNodeToRawTree = (nodeUuid: string, mindMapData: MindMapData): RawNode => {
    if (!mindMapData.nodes[nodeUuid]) {
        return {} as RawNode;
    }
    return buildRawTree(nodeUuid, mindMapData.nodes);
};