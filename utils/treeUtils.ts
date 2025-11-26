
import type { MindMapData, MindMapNodeData } from '../types';

/**
 * Deeply clones a node and all its descendants, generating new UUIDs for each.
 * @param sourceNodeUuid The UUID of the root of the subtree to clone.
 * @param sourceMap The MindMapData containing the source nodes.
 * @param newParentUuid The UUID of the parent to attach the cloned tree to.
 * @returns An object containing the new root node's data and a record of all new nodes (keyed by new UUIDs).
 */
export const cloneNodeTree = (
    sourceNodeUuid: string,
    sourceMap: MindMapData,
    newParentUuid: string
): { newRootNode: MindMapNodeData; newNodesMap: Record<string, MindMapNodeData> } | null => {
    const sourceNode = sourceMap.nodes[sourceNodeUuid];
    if (!sourceNode) return null;

    const newNodesMap: Record<string, MindMapNodeData> = {};

    const cloneRecursive = (currentNodeUuid: string, currentParentUuid: string): MindMapNodeData => {
        const originalNode = sourceMap.nodes[currentNodeUuid];
        const newUuid = crypto.randomUUID();

        const newNode: MindMapNodeData = {
            ...originalNode,
            uuid: newUuid,
            parentUuid: currentParentUuid,
            childNodeList: [], // Will be populated after processing children
            id: undefined, // Clear DB ID as this is a new copy
            // We keep the rest of the data (name, type, priority, etc.)
        };

        // Clone DTOs to prevent reference sharing
        if (newNode.functionTestCaseDTO) newNode.functionTestCaseDTO = JSON.parse(JSON.stringify(newNode.functionTestCaseDTO));
        if (newNode.apiTestCaseDTO) newNode.apiTestCaseDTO = JSON.parse(JSON.stringify(newNode.apiTestCaseDTO));
        if (newNode.uiTestCaseDTO) newNode.uiTestCaseDTO = JSON.parse(JSON.stringify(newNode.uiTestCaseDTO));
        if (newNode.scoreInfo) newNode.scoreInfo = JSON.parse(JSON.stringify(newNode.scoreInfo));
        if (newNode.scoreInfo) newNode.scoreInfo!.id = undefined; // Clear score ID
        if (newNode.RemarkHistory) newNode.RemarkHistory = []; // Clear remarks history for copy
        newNode.hasRemark = false;
        newNode.hasScore = false; // Or keep score but new ID? Usually copy resets reviews.
        newNode.reviewStatusCode = 'pending_review'; // Reset review status
        
        const newChildUuids: string[] = [];
        if (originalNode.childNodeList) {
            originalNode.childNodeList.forEach(childUuid => {
                const childNode = cloneRecursive(childUuid, newUuid);
                newNodesMap[childNode.uuid!] = childNode;
                newChildUuids.push(childNode.uuid!);
            });
        }
        newNode.childNodeList = newChildUuids;
        
        return newNode;
    };

    const newRootNode = cloneRecursive(sourceNodeUuid, newParentUuid);
    newNodesMap[newRootNode.uuid!] = newRootNode;

    return { newRootNode, newNodesMap };
};

/**
 * Filters a list of node UUIDs to ensure that if a parent is selected, 
 * its descendants are removed from the list (implicit selection).
 * This prevents duplicating a child node separately when its parent is already being copied.
 */
export const filterSelectedNodesForCopy = (selectedUuids: Set<string>, mindMap: MindMapData): Set<string> => {
    const filtered = new Set<string>();
    
    const selectedArray = Array.from(selectedUuids);
    
    selectedArray.forEach(uuid => {
        let isDescendantOfSelected = false;
        let current = mindMap.nodes[uuid];
        
        // Traverse up to check if any ancestor is also in the selection set
        while(current && current.parentUuid) {
            if (selectedUuids.has(current.parentUuid)) {
                isDescendantOfSelected = true;
                break;
            }
            current = mindMap.nodes[current.parentUuid];
        }
        
        if (!isDescendantOfSelected) {
            filtered.add(uuid);
        }
    });
    
    return filtered;
};
