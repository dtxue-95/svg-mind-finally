import type { MindMapData, MindMapNodeData } from '../types';

export const findAllDescendantUuids = (mindMap: MindMapData, nodeUuid: string): Set<string> => {
    const nodesToDelete = new Set<string>();
    const queue = [nodeUuid];

    while (queue.length > 0) {
        const currentUuid = queue.shift()!;
        nodesToDelete.add(currentUuid);
        const node = mindMap.nodes[currentUuid];
        if (node) {
            queue.push(...(node.childNodeList ?? []));
        }
    }

    return nodesToDelete;
};

export const countAllDescendants = (mindMap: MindMapData, nodeUuid: string): number => {
    const node = mindMap.nodes[nodeUuid];
    if (!node || !node.childNodeList || node.childNodeList.length === 0) {
        return 0;
    }

    let count = node.childNodeList.length;
    for (const childUuid of node.childNodeList) {
        const childNode = mindMap.nodes[childUuid];
        // Only count the immediate child and its descendants if it's not collapsed itself
        if (childNode && !childNode.isCollapsed) {
             count += countAllDescendants(mindMap, childUuid);
        } else if (childNode && childNode.isCollapsed) {
            // If the direct child is collapsed, we still need to count it and all its children.
            count += countAllDescendants(mindMap, childUuid);
        }
    }
    return count;
};

export const findAllAncestorUuids = (mindMap: MindMapData, nodeUuid: string): string[] => {
    const ancestors: string[] = [];
    let currentNode = mindMap.nodes[nodeUuid];

    while (currentNode && currentNode.parentUuid) {
        const parent = mindMap.nodes[currentNode.parentUuid];
        if (parent) {
            ancestors.push(parent.uuid!);
            currentNode = parent;
        } else {
            // Parent not found, break loop
            break;
        }
    }

    return ancestors;
};

export const findAllDescendantUseCaseUuidsAndIds = (mindMap: MindMapData, nodeUuid: string): { uuids: string[], ids: (string | number)[] } => {
    const useCaseUuids = new Set<string>();
    const useCaseIds = new Set<string|number>();
    
    // Use findAllDescendantUuids to get all descendant UUIDs including the starting one.
    const allDescendantUuids = findAllDescendantUuids(mindMap, nodeUuid);

    allDescendantUuids.forEach(uuid => {
        const node = mindMap.nodes[uuid];
        // Check if the node is a use case and has a valid ID.
        if (node && node.nodeType === 'USE_CASE' && node.id) {
            useCaseUuids.add(node.uuid!);
            useCaseIds.add(node.id);
        }
    });

    return { uuids: Array.from(useCaseUuids), ids: Array.from(useCaseIds) };
};

export const hasUseCaseDescendant = (mindMap: MindMapData, nodeUuid: string): boolean => {
    const node = mindMap.nodes[nodeUuid];
    if (!node) return false;

    // A quick check: if the node itself is a use case.
    if (node.nodeType === 'USE_CASE') {
        return true;
    }

    const queue = [...(node.childNodeList ?? [])];

    while (queue.length > 0) {
        const currentUuid = queue.shift()!;
        const currentNode = mindMap.nodes[currentUuid];
        if (currentNode) {
            if (currentNode.nodeType === 'USE_CASE') {
                return true; // Found one
            }
            if (currentNode.childNodeList) {
                queue.push(...currentNode.childNodeList);
            }
        }
    }

    return false; // Traversed all descendants, no use case found
};

export const isDemandNodeReadyForReview = (mindMap: MindMapData, demandNodeUuid: string): boolean => {
    const demandNode = mindMap.nodes[demandNodeUuid];
    // The demand node must exist and must have child modules to be reviewable.
    if (!demandNode || !demandNode.childNodeList || demandNode.childNodeList.length === 0) {
        return false;
    }

    // Every child module must have at least one use case descendant.
    return demandNode.childNodeList.every(moduleUuid => hasUseCaseDescendant(mindMap, moduleUuid));
};