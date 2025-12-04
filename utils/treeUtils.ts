
import type { MindMapData, MindMapNodeData } from '../types';
import { MIN_NODE_HEIGHT, MIN_NODE_WIDTH } from '../constants';

/**
 * Deeply clones a node and all its descendants, generating new UUIDs for each.
 * Cleans up operational data (IDs, status, comments) to treat the copy as a new node.
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

        // Create a clean node object, keeping only structural and content properties
        // This ensures the copied node acts like a "newly added" node
        const newNode: MindMapNodeData = {
            // 1. Identity & Structure
            uuid: newUuid,
            parentUuid: currentParentUuid,
            childNodeList: [], // Will be populated below
            
            // 2. Content (Preserved)
            name: originalNode.name,
            nodeType: originalNode.nodeType,
            priorityLevel: originalNode.priorityLevel,
            
            // 3. Layout (Reset to default minimums to allow re-measurement)
            // We do NOT copy originalNode.width/height because the original might include 
            // space for icons (review, score, etc.) that are being stripped in this clone.
            // Resetting ensures the new node measures itself based purely on its text content.
            width: originalNode.width,
            height: originalNode.height,
            position: { x: 0, y: 0 }, // Position will be set by autoLayout

            // 4. State (Reset to defaults)
            isCollapsed: false, // Expand by default
            id: undefined, // Clear DB ID
            parentId: undefined, // Clear DB Parent ID
            generateModeName: undefined, // Treat as manual/new
            
            // 5. Business Logic / Execution Status (Cleared)
            caseTags: undefined,
            functionTestCaseStatusCode: undefined,
            apiTestCaseStatusCode: undefined,
            uiTestCaseStatusCode: undefined,
            finalTestCaseStatusCode: undefined,
            
            functionTestCaseDTO: undefined,
            apiTestCaseDTO: undefined,
            uiTestCaseDTO: undefined,
            
            // 6. Review & Scoring (Cleared)
            hasRemark: false,
            hasScore: false,
            scoreInfo: undefined,
            RemarkHistory: [],
            reviewStatusCode: 'pending_review',
            reviewStatusName: '待评审',
            
            sortNumber: undefined, // Will be set by parent loop or paste logic
        };

        const newChildUuids: string[] = [];
        if (originalNode.childNodeList) {
            originalNode.childNodeList.forEach((childUuid, index) => {
                const childNode = cloneRecursive(childUuid, newUuid);
                // Ensure sort number is correct within the new tree (defaulting to index + 1 here, but will be fixed by caller)
                childNode.sortNumber = index + 1;
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

/**
 * Updates the sortNumber for all children of a specific parent node.
 * - If parent is USE_CASE: Steps are numbered from 0, skipping Preconditions.
 * - Otherwise: All children are numbered from 1.
 * 
 * @param parentNode The parent node data
 * @param allNodes The map of all nodes (will be modified in shallow copy and returned)
 * @returns A NEW object reference for the nodes map with updated sort numbers
 */
export const updateChildSortNumbers = (
    parentNode: MindMapNodeData,
    allNodes: Record<string, MindMapNodeData>
): Record<string, MindMapNodeData> => {
    const updatedNodes = { ...allNodes };
    const childrenUuids = parentNode.childNodeList || [];

    if (parentNode.nodeType === 'USE_CASE') {
        let stepIndex = 0;
        childrenUuids.forEach(uuid => {
            const child = updatedNodes[uuid];
            if (child) {
                if (child.nodeType === 'STEP') {
                    updatedNodes[uuid] = { ...child, sortNumber: stepIndex++ };
                } else {
                    // Ensure non-steps (like preconditions) don't have misleading sort numbers from previous states
                    // or keep them if they are useful for other logic. 
                    // For now, we leave them or reset them if needed.
                    // If we strictly follow "Precondition does not participate", we might want to clear it?
                    // But keeping index+1 or original might be safer for React keys/consistency.
                    // Let's NOT clear it to avoid regressions, just ensure STEPs are correct.
                }
            }
        });
    } else {
        childrenUuids.forEach((uuid, index) => {
            const child = updatedNodes[uuid];
            if (child) {
                updatedNodes[uuid] = { ...child, sortNumber: index + 1 };
            }
        });
    }

    return updatedNodes;
};
