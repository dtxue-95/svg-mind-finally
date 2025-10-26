

import type { MindMapData, MindMapNodeData, NodeType, NodePriority, ReviewStatusCode, Remark, ScoreInfo } from '../types';
import { NODE_TYPE_PROPS } from '../constants';
import { findAllDescendantUuids, findAllDescendantUseCaseUuidsAndIds } from '../utils/findAllDescendantIds';

export type MindMapAction =
    | { type: 'SET_MIND_MAP'; payload: MindMapData }
    | { type: 'UPDATE_NODE_TEXT'; payload: { nodeUuid: string; name: string } }
    | { type: 'UPDATE_NODE_TYPE'; payload: { nodeUuid: string; nodeType: NodeType } }
    | { type: 'UPDATE_NODE_PRIORITY'; payload: { nodeUuid: string; priorityLevel: NodePriority } }
    | { type: 'UPDATE_NODE_POSITION'; payload: { nodeUuid: string; position: { x: number; y: number } } }
    | { type: 'UPDATE_NODE_SIZE'; payload: { nodeUuid: string, width: number, height: number } }
    | { type: 'REPARENT_NODE'; payload: { nodeUuid: string; newParentUuid: string; oldParentUuid: string } }
    | { type: 'REORDER_NODE'; payload: { draggedNodeUuid: string; targetSiblingUuid: string; position: 'before' | 'after' } }
    | { type: 'TOGGLE_NODE_COLLAPSE', payload: { nodeUuid: string } }
    | { type: 'EXPAND_NODES', payload: { nodeUuids: string[] } }
    | { type: 'EXPAND_ALL_NODES' }
    | { type: 'COLLAPSE_ALL_NODES' }
    | { type: 'EXPAND_TO_LEVEL', payload: { targetTypes: NodeType[] } }
    | { type: 'COLLAPSE_TO_LEVEL', payload: { targetTypes: NodeType[] } }
    | { type: 'BULK_UPDATE_REVIEW_STATUS'; payload: { startNodeUuid: string; newStatus: ReviewStatusCode; } }
    | { type: 'UPDATE_SINGLE_NODE_REVIEW_STATUS'; payload: { nodeUuid: string; newStatus: ReviewStatusCode } }
    | { type: 'ADD_REMARK'; payload: { nodeUuid: string, remark: Remark } }
    | { type: 'UPDATE_SCORE_INFO'; payload: { nodeUuid: string, scoreInfo: ScoreInfo } }
    | { type: 'PARTIAL_UPDATE_NODE', payload: { nodeUuid: string, partialData: Partial<MindMapNodeData> } }
    | { type: 'SYNC_DATA'; payload: MindMapData };

// Defines the logical hierarchy of node types for level-based operations.
const typeHierarchy: NodeType[] = ['DEMAND', 'MODULE', 'TEST_POINT', 'USE_CASE', 'PRECONDITION', 'STEP', 'EXPECTED_RESULT'];

const reviewStatusNameMapping: Record<ReviewStatusCode, string> = {
    pending_review: '待评审',
    approved: '通过',
    rejected: '未通过',
};

// --- Review Status Aggregation Logic ---

/**
 * Recursively calculates the aggregated review status for a given node based on its direct children.
 * This ensures that the entire hierarchy is considered, not just descendant use cases.
 * @param mindMap The full mind map data.
 * @param nodeUuid The UUID of the node to calculate the status for.
 * @returns The calculated ReviewStatusCode.
 */
const getAggregatedStatusRecursive = (mindMap: MindMapData, nodeUuid: string): ReviewStatusCode => {
    const node = mindMap.nodes[nodeUuid];
    if (!node) {
        // This case should ideally not be hit in a consistent data structure.
        return 'pending_review';
    }

    // Base Case 1: A USE_CASE node's status is its own. Default to 'pending_review' if not set.
    if (node.nodeType === 'USE_CASE') {
        return node.reviewStatusCode || 'pending_review';
    }

    const children = node.childNodeList?.map(uuid => mindMap.nodes[uuid]).filter(Boolean) ?? [];

    // Base Case 2: If a non-use-case node has no children, it's considered incomplete and pending.
    // This correctly handles empty modules or test points.
    if (children.length === 0) {
        return 'pending_review';
    }

    // Recursive Step: Aggregate statuses from all direct children.
    const childStatuses = children.map(child => getAggregatedStatusRecursive(mindMap, child.uuid!));
    
    // Aggregation Logic (Priority: pending > rejected > approved)
    if (childStatuses.some(s => s === 'pending_review')) {
        return 'pending_review';
    }
    if (childStatuses.some(s => s === 'rejected')) {
        return 'rejected';
    }
    if (childStatuses.every(s => s === 'approved')) {
        return 'approved';
    }
    
    // Fallback for any other mixed state, which shouldn't happen with the logic above.
    return 'pending_review';
};

/**
 * Traverses up from a given node and updates the review status of all its ancestors.
 * @param mindMap The full mind map data.
 * @param startNodeUuid The UUID of the node from which to start the upward traversal.
 * @returns An updated record of nodes.
 */
const updateAncestorReviewStatus = (mindMap: MindMapData, startNodeUuid: string): Record<string, MindMapNodeData> => {
    const newNodes = { ...mindMap.nodes };
    let parentUuid = newNodes[startNodeUuid]?.parentUuid;

    while (parentUuid) {
        const parentNode = newNodes[parentUuid];
        if (!parentNode) break;

        const newStatus = getAggregatedStatusRecursive({ ...mindMap, nodes: newNodes }, parentUuid);
        
        if (newStatus !== parentNode.reviewStatusCode) {
            newNodes[parentUuid] = {
                ...parentNode,
                reviewStatusCode: newStatus,
                reviewStatusName: reviewStatusNameMapping[newStatus],
            };
            parentUuid = parentNode.parentUuid; // Continue up the chain
        } else {
            break; // No change needed, so the chain above is also correct. Stop.
        }
    }
    
    return newNodes;
};


export const mindMapReducer = (state: MindMapData, action: MindMapAction): MindMapData => {
    switch (action.type) {
        case 'SET_MIND_MAP':
            return action.payload;
        
        case 'UPDATE_NODE_TEXT': {
            const { nodeUuid, name } = action.payload;
            if (!state.nodes[nodeUuid]) return state;
            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...state.nodes[nodeUuid],
                        name,
                    },
                },
            };
        }

        case 'UPDATE_NODE_TYPE': {
            const { nodeUuid, nodeType } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node || node.nodeType === nodeType) return state;

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        nodeType,
                        name: NODE_TYPE_PROPS[nodeType].label,
                    },
                },
            };
        }

        case 'UPDATE_NODE_PRIORITY': {
            const { nodeUuid, priorityLevel } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node || node.priorityLevel === priorityLevel) return state;

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        priorityLevel,
                    },
                },
            };
        }

        case 'UPDATE_NODE_POSITION': {
            const { nodeUuid, position } = action.payload;
            if (!state.nodes[nodeUuid]) return state;
            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...state.nodes[nodeUuid],
                        position,
                    },
                },
            };
        }

        case 'UPDATE_NODE_SIZE': {
            const { nodeUuid, width, height } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node) return state;
            if (node.width === width && node.height === height) return state;
            
            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        width,
                        height,
                    },
                },
            };
        }

        case 'REPARENT_NODE': {
            const { nodeUuid, newParentUuid, oldParentUuid } = action.payload;
            const node = state.nodes[nodeUuid];
            const oldParent = state.nodes[oldParentUuid];
            const newParent = state.nodes[newParentUuid];

            if (!node || !oldParent || !newParent) return state;

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        parentUuid: newParentUuid,
                    },
                    [oldParentUuid]: {
                        ...oldParent,
                        childNodeList: (oldParent.childNodeList ?? []).filter(uuid => uuid !== nodeUuid),
                    },
                    [newParentUuid]: {
                        ...newParent,
                        childNodeList: [...(newParent.childNodeList ?? []), nodeUuid],
                    },
                },
            };
        }
        
        case 'REORDER_NODE': {
            const { draggedNodeUuid, targetSiblingUuid, position } = action.payload;
            const draggedNode = state.nodes[draggedNodeUuid];
            const parentUuid = draggedNode?.parentUuid;
            if (!parentUuid) return state;

            const parent = state.nodes[parentUuid];
            const children = parent.childNodeList ? [...parent.childNodeList] : [];

            // Constraint check for STEP vs PRECONDITION
            if (draggedNode.nodeType === 'STEP') {
                const preconditionIndex = children.findIndex(uuid => state.nodes[uuid]?.nodeType === 'PRECONDITION');
                if (preconditionIndex !== -1) {
                    const tempChildren = children.filter(uuid => uuid !== draggedNodeUuid);
                    let targetIndex = tempChildren.indexOf(targetSiblingUuid);
                    
                    let newIndex = position === 'before' ? targetIndex : targetIndex + 1;
                    
                    if (newIndex <= preconditionIndex) {
                        console.warn('A STEP node cannot be reordered to be before a PRECONDITION node.');
                        return state; // Abort
                    }
                }
            }
            
            // Reorder logic
            const originalIndex = children.indexOf(draggedNodeUuid);
            if (originalIndex === -1) return state;
            children.splice(originalIndex, 1);

            let insertAtIndex = children.indexOf(targetSiblingUuid);
            if (insertAtIndex === -1) return state;
            if (position === 'after') {
                insertAtIndex++;
            }
            children.splice(insertAtIndex, 0, draggedNodeUuid);

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [parentUuid]: {
                        ...parent,
                        childNodeList: children,
                    }
                }
            };
        }
        
        case 'TOGGLE_NODE_COLLAPSE': {
            const { nodeUuid } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node) return state;
            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        isCollapsed: !node.isCollapsed,
                    },
                },
            };
        }

        case 'EXPAND_NODES': {
            const { nodeUuids } = action.payload;
            const newNodes = { ...state.nodes };
            let changed = false;

            nodeUuids.forEach(nodeUuid => {
                const node = newNodes[nodeUuid];
                if (node && node.isCollapsed) {
                    newNodes[nodeUuid] = { ...node, isCollapsed: false };
                    changed = true;
                }
            });

            if (!changed) return state;

            return {
                ...state,
                nodes: newNodes,
            };
        }

        case 'EXPAND_ALL_NODES': {
            const newNodes = { ...state.nodes };
            let changed = false;
            Object.keys(newNodes).forEach(uuid => {
                if (newNodes[uuid].isCollapsed) {
                    newNodes[uuid] = { ...newNodes[uuid], isCollapsed: false };
                    changed = true;
                }
            });
            if (!changed) return state;
            return { ...state, nodes: newNodes };
        }

        case 'COLLAPSE_ALL_NODES': {
            const newNodes = { ...state.nodes };
            let changed = false;
            Object.keys(newNodes).forEach(uuid => {
                if (uuid !== state.rootUuid && !newNodes[uuid].isCollapsed) {
                    newNodes[uuid] = { ...newNodes[uuid], isCollapsed: true };
                    changed = true;
                }
            });
            if (!changed) return state;
            return { ...state, nodes: newNodes };
        }

        case 'EXPAND_TO_LEVEL': {
            const { targetTypes } = action.payload;
            const targetIndices = targetTypes.map(t => typeHierarchy.indexOf(t));
            if (targetIndices.some(i => i === -1)) return state; // Invalid type
            const maxTargetIndex = Math.max(...targetIndices);
            
            const newNodes = { ...state.nodes };
            let changed = false;
            Object.keys(newNodes).forEach(uuid => {
                const node = newNodes[uuid];
                const nodeTypeIndex = typeHierarchy.indexOf(node.nodeType!);
                if (nodeTypeIndex === -1) return;
                
                // Expand up to target level, collapse AT and after target level
                const shouldBeCollapsed = nodeTypeIndex >= maxTargetIndex;
                if (node.isCollapsed !== shouldBeCollapsed) {
                    newNodes[uuid] = { ...node, isCollapsed: shouldBeCollapsed };
                    changed = true;
                }
            });
            if (!changed) return state;
            return { ...state, nodes: newNodes };
        }
        
        case 'COLLAPSE_TO_LEVEL': {
            const { targetTypes } = action.payload;
            const targetIndices = targetTypes.map(t => typeHierarchy.indexOf(t));
            if (targetIndices.some(i => i === -1)) return state; // Invalid type
            const minTargetIndex = Math.min(...targetIndices);

            const newNodes = { ...state.nodes };
            let changed = false;
            Object.keys(newNodes).forEach(uuid => {
                const node = newNodes[uuid];
                
                if (uuid === state.rootUuid) { // Root node should never be collapsed
                    if (node.isCollapsed) {
                        newNodes[uuid] = { ...node, isCollapsed: false };
                        changed = true;
                    }
                    return; // Continue to next node
                }

                const nodeTypeIndex = typeHierarchy.indexOf(node.nodeType!);
                if (nodeTypeIndex === -1) return;

                // Expand before target level, collapse at and after
                const shouldBeCollapsed = nodeTypeIndex >= minTargetIndex;
                
                if (node.isCollapsed !== shouldBeCollapsed) {
                    newNodes[uuid] = { ...node, isCollapsed: shouldBeCollapsed };
                    changed = true;
                }
            });
            if (!changed) return state;
            return { ...state, nodes: newNodes };
        }

        case 'BULK_UPDATE_REVIEW_STATUS': {
            const { startNodeUuid, newStatus } = action.payload;
            const newStatusName = reviewStatusNameMapping[newStatus];

            // Find all descendant use cases. If none, no-op.
            const { uuids: useCaseUuids } = findAllDescendantUseCaseUuidsAndIds(state, startNodeUuid);
            if (useCaseUuids.length === 0) {
                return state;
            }

            const newNodes = { ...state.nodes };

            // Step 1: Update the status for all descendant use cases.
            useCaseUuids.forEach(uuid => {
                const node = newNodes[uuid];
                if (node) {
                    newNodes[uuid] = {
                        ...node,
                        reviewStatusCode: newStatus,
                        reviewStatusName: newStatusName,
                    };
                }
            });

            // The map with updated use cases, which will be the source for aggregation.
            const mapWithUpdatedUseCases = { ...state, nodes: newNodes };

            // Step 2: Re-aggregate statuses for all intermediate parents within the subtree, including the start node.
            // The recursive aggregation function handles the bottom-up calculation correctly.
            const allSubtreeUuids = Array.from(findAllDescendantUuids(state, startNodeUuid));

            allSubtreeUuids.forEach(uuid => {
                const node = state.nodes[uuid];
                // We only need to re-aggregate for nodes that can have children (i.e., not use cases).
                if (node && node.nodeType !== 'USE_CASE') {
                    const newAggregatedStatus = getAggregatedStatusRecursive(mapWithUpdatedUseCases, uuid);
                    const currentNodeInCopy = newNodes[uuid];

                    // Update the node in our working copy if its status has changed.
                    if (currentNodeInCopy.reviewStatusCode !== newAggregatedStatus) {
                        newNodes[uuid] = {
                            ...currentNodeInCopy,
                            reviewStatusCode: newAggregatedStatus,
                            reviewStatusName: reviewStatusNameMapping[newAggregatedStatus],
                        };
                    }
                }
            });

            // Step 3: Re-aggregate for all ancestors of the startNode, using the fully updated subtree.
            const finalNodes = updateAncestorReviewStatus({ ...state, nodes: newNodes }, startNodeUuid);

            return {
                ...state,
                nodes: finalNodes,
            };
        }

        case 'UPDATE_SINGLE_NODE_REVIEW_STATUS': {
            const { nodeUuid, newStatus } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node || node.reviewStatusCode === newStatus) {
                return state;
            }

            const newNodes = { ...state.nodes };
            const newStatusName = reviewStatusNameMapping[newStatus];

            newNodes[nodeUuid] = {
                ...node,
                reviewStatusCode: newStatus,
                reviewStatusName: newStatusName,
            };

            const finalNodes = updateAncestorReviewStatus({ ...state, nodes: newNodes }, nodeUuid);

            return {
                ...state,
                nodes: finalNodes,
            };
        }
        
        case 'ADD_REMARK': {
            const { nodeUuid, remark } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node) return state;

            const newHistory = [remark, ...(node.RemarkHistory || [])];

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        RemarkHistory: newHistory,
                        hasRemark: true,
                    },
                },
            };
        }

        case 'UPDATE_SCORE_INFO': {
            const { nodeUuid, scoreInfo } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node) return state;

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: {
                        ...node,
                        scoreInfo,
                        hasScore: true,
                    },
                },
            };
        }

        case 'PARTIAL_UPDATE_NODE': {
            const { nodeUuid, partialData } = action.payload;
            const node = state.nodes[nodeUuid];
            if (!node) return state;

            const updatedNode = { ...node, ...partialData };

            return {
                ...state,
                nodes: {
                    ...state.nodes,
                    [nodeUuid]: updatedNode,
                },
            };
        }

        case 'SYNC_DATA': {
            const newMindMapData = action.payload;
            const currentMindMap = state;
            
            const mergedNodes: Record<string, MindMapNodeData> = {};

            for (const uuid in newMindMapData.nodes) {
                const newNodeData = newMindMapData.nodes[uuid];
                const oldNodeData = currentMindMap.nodes[uuid];

                if (oldNodeData) {
                    // Node exists, merge new data with old layout/view state.
                    mergedNodes[uuid] = {
                        ...newNodeData, // Take all new structural and content data
                        position: oldNodeData.position, // Keep old layout data
                        width: oldNodeData.width,
                        height: oldNodeData.height,
                        isCollapsed: oldNodeData.isCollapsed, // Also keep collapse state
                    };
                } else {
                    // New node, just add it. Layout will position it later.
                    mergedNodes[uuid] = newNodeData;
                }
            }
            
            return {
                rootUuid: newMindMapData.rootUuid,
                nodes: mergedNodes
            };
        }

        default:
            return state;
    }
};