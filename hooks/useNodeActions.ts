
import { useCallback, Dispatch } from 'react';
import type { MindMapData, MindMapNodeData, NodeType, DataChangeCallback, ValidationConfig } from '../types';
import { NODE_TYPE_PROPS, MIN_NODE_HEIGHT, MIN_NODE_WIDTH } from '../constants';
import { findAllDescendantUuids } from '../utils/findAllDescendantIds';
import { getNodeChainByUuid } from '../utils/dataChangeUtils';
import type { MindMapAction } from '../state/mindMapReducer';
import { mindMapReducer } from '../state/mindMapReducer';
import { OperationType } from '../types';
import { convertDataChangeInfo } from '../utils/callbackDataConverter';
import { updateChildSortNumbers } from '../utils/treeUtils';

type DispatchFunction = Dispatch<MindMapAction | { type: 'UNDO' } | { type: 'REDO' }>;
type PerformLayoutFunction = (map: MindMapData) => MindMapData;

export const useNodeActions = (
    mindMap: MindMapData,
    dispatch: DispatchFunction,
    performLayout: PerformLayoutFunction,
    strictMode: boolean,
    onDataChange?: DataChangeCallback,
    validationConfig?: ValidationConfig,
    onError?: (message: string) => void
) => {
    const addChildNode = useCallback((parentUuid: string): string | undefined => {
        const parentNode = mindMap.nodes[parentUuid];
        if (!parentNode) return;

        // Validation Logic: Block adding children if parent Use Case is invalid
        if (validationConfig && parentNode.nodeType === 'USE_CASE') {
            if (validationConfig.requirePriority && !parentNode.priorityLevel) {
                if (onError) {
                    onError(`操作失败：请先为用例节点 "${parentNode.name}" 选择优先级。`);
                }
                return;
            }
        }

        const newUuid = crypto.randomUUID();
        let newNode: MindMapNodeData;
        let newMindMap: MindMapData;

        if (!strictMode) {
             newNode = {
                uuid: newUuid,
                name: '', // 优化：初始名称为空，配合 placeholder 使用
                parentUuid,
                childNodeList: [],
                position: { x: 0, y: 0 },
                height: undefined, // undefined forces re-measurement
                width: undefined,  // undefined forces re-measurement
                nodeType: 'GENERAL',
                priorityLevel: null,
                isCollapsed: false,
            };
            
            const newChildren = [...(parentNode.childNodeList ?? []), newUuid];
            const nodesWithNewChild = {
                ...mindMap.nodes,
                [newUuid]: newNode,
                [parentUuid]: {
                    ...parentNode,
                    childNodeList: newChildren,
                },
            };
            
            // Calculate sort numbers
            const finalNodes = updateChildSortNumbers(
                { ...parentNode, childNodeList: newChildren }, 
                nodesWithNewChild
            );

            newMindMap = { ...mindMap, nodes: finalNodes };

        } else {
            let newNodeType: NodeType | null = null;
            let shouldBeFirstChild = false;

            switch (parentNode.nodeType) {
                case 'DEMAND':
                    newNodeType = 'MODULE';
                    break;
                case 'MODULE':
                    newNodeType = 'TEST_POINT';
                    break;
                case 'TEST_POINT':
                    newNodeType = 'USE_CASE';
                    break;
                case 'USE_CASE': {
                    const children = (parentNode.childNodeList ?? []).map(uuid => mindMap.nodes[uuid]);
                    const hasPrecondition = children.some(child => child?.nodeType === 'PRECONDITION');
                    if (!hasPrecondition) {
                        newNodeType = 'PRECONDITION';
                        shouldBeFirstChild = true;
                    } else {
                        newNodeType = 'STEP';
                    }
                    break;
                }
                case 'STEP': {
                    const children = (parentNode.childNodeList ?? []).map(uuid => mindMap.nodes[uuid]);
                    const hasExpectedResult = children.some(child => child?.nodeType === 'EXPECTED_RESULT');
                    if (hasExpectedResult) {
                        console.warn(`Cannot add more than one 'EXPECTED_RESULT' child to a 'STEP' node in strict mode.`);
                        return; // Abort
                    }
                    newNodeType = 'EXPECTED_RESULT';
                    break;
                }
                case 'PRECONDITION':
                case 'EXPECTED_RESULT':
                    console.warn(`Cannot add child to ${parentNode.nodeType} in strict mode.`);
                    return; // Abort
                default:
                    newNodeType = 'GENERAL';
                    break;
            }

            if (!newNodeType) return; // Should not happen with the logic above

            newNode = {
                uuid: newUuid,
                name: '', // 优化：初始名称为空
                parentUuid,
                childNodeList: [],
                position: { x: 0, y: 0 },
                height: undefined, // undefined forces re-measurement
                width: undefined,  // undefined forces re-measurement
                nodeType: newNodeType,
                priorityLevel: null,
                isCollapsed: false,
            };
            
            const parentChildren = parentNode.childNodeList ?? [];
            const newChildren = shouldBeFirstChild
                ? [newUuid, ...parentChildren]
                : [...parentChildren, newUuid];
            
            const nodesWithNewChild = {
                ...mindMap.nodes,
                [newUuid]: newNode,
                [parentUuid]: {
                    ...parentNode,
                    childNodeList: newChildren,
                },
            };

            // Calculate sort numbers
            const finalNodes = updateChildSortNumbers(
                { ...parentNode, childNodeList: newChildren }, 
                nodesWithNewChild
            );
            
            newMindMap = { ...mindMap, nodes: finalNodes };
        }

        const laidOutMap = performLayout(newMindMap);
        
        const finalNewNode = laidOutMap.nodes[newUuid];
        if (onDataChange) {
            const chain = getNodeChainByUuid(laidOutMap, newUuid);
            const info = {
                operationType: OperationType.ADD_NODE,
                timestamp: Date.now(),
                description: `Added node '${finalNewNode.name || 'Untitled'}' as a child of '${parentNode.name}'`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: [newUuid],
                addedNodes: [finalNewNode],
                currentNode: finalNewNode,
                parentNode: laidOutMap.nodes[parentUuid],
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });

        return newUuid;

    }, [mindMap, dispatch, performLayout, strictMode, onDataChange, validationConfig, onError]);

    const addSiblingNode = useCallback((nodeUuid: string): string | undefined => {
        const parentUuid = mindMap.nodes[nodeUuid]?.parentUuid;
        if (!parentUuid) {
            console.warn('Cannot add sibling to the root node.');
            return;
        }
        
        if (strictMode) {
             const node = mindMap.nodes[nodeUuid];
             const parentNode = mindMap.nodes[parentUuid];
             if (node?.nodeType === 'EXPECTED_RESULT') {
                 console.warn(`Cannot add sibling to ${node.nodeType} in strict mode.`);
                 return;
             }
             if (parentNode?.nodeType === 'USE_CASE' && node?.nodeType !== 'PRECONDITION') {
                 // Sibling of a STEP is a STEP, Sibling of PRECONDITION is a STEP
                 return addChildNode(parentUuid);
             }
        }
        
        return addChildNode(parentUuid);
    }, [mindMap.nodes, addChildNode, strictMode]);

    const deleteNode = useCallback((nodeUuid: string) => {
        if (nodeUuid === mindMap.rootUuid) return;

        const nodeToDelete = mindMap.nodes[nodeUuid];
        if (!nodeToDelete) return;

        const parentNode = nodeToDelete.parentUuid ? mindMap.nodes[nodeToDelete.parentUuid] : undefined;

        const nodesToDeleteUuids = findAllDescendantUuids(mindMap, nodeUuid);
        const deletedNodesData = Array.from(nodesToDeleteUuids)
            .map(uuid => mindMap.nodes[uuid])
            .filter((n): n is MindMapNodeData => !!n);

        // Create a new nodes object without the deleted nodes
        let remainingNodes: Record<string, MindMapNodeData> = { ...mindMap.nodes };
        nodesToDeleteUuids.forEach(uuid => {
            delete remainingNodes[uuid];
        });

        // If a parent exists, update its child list and the sortNumbers of remaining children
        if (parentNode && remainingNodes[parentNode.uuid]) {
            const newChildList = (parentNode.childNodeList ?? []).filter(uuid => uuid !== nodeUuid);
            remainingNodes[parentNode.uuid] = {
                ...parentNode,
                childNodeList: newChildList,
            };
            
            // Recalculate sort numbers using the shared utility
            remainingNodes = updateChildSortNumbers(
                { ...parentNode, childNodeList: newChildList }, 
                remainingNodes
            );
        }
        
        const newMindMap = {
            ...mindMap,
            nodes: remainingNodes,
        };

        const laidOutMap = performLayout(newMindMap);

        if (onDataChange && nodeToDelete) {
            const parentChain = parentNode ? getNodeChainByUuid(mindMap, parentNode.uuid) : { uuids: [], nodes: [] };
            const info = {
                operationType: OperationType.DELETE_NODE,
                timestamp: Date.now(),
                description: `Deleted node '${nodeToDelete.name}' and ${deletedNodesData.length - 1} descendant(s)`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: Array.from(nodesToDeleteUuids),
                deletedNodes: deletedNodesData,
                currentNode: nodeToDelete,
                parentNode: parentNode,
                parentUuidChain: parentChain.uuids,
                parentUuidChainNodes: parentChain.nodes,
            };
            onDataChange(convertDataChangeInfo(info));
        }
        
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });

    }, [mindMap, dispatch, performLayout, onDataChange]);

    const updateNodePosition = useCallback((nodeUuid: string, position: { x: number, y: number }) => {
        const action: MindMapAction = { type: 'UPDATE_NODE_POSITION', payload: { nodeUuid, position } };
        const nextState = mindMapReducer(mindMap, action);
        if (nextState === mindMap) return;

        if (onDataChange) {
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nextState.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(nextState, nodeUuid);
            const info = {
                operationType: OperationType.MOVE_NODE,
                timestamp: Date.now(),
                description: `Moved node '${nodeAfter.name}'`,
                previousData: mindMap,
                currentData: nextState,
                affectedNodeUuids: [nodeUuid],
                updatedNodes: [nodeAfter],
                currentNode: nodeAfter,
                parentNode: parentNode,
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch(action);
    }, [mindMap, dispatch, onDataChange]);

    const reparentNode = useCallback((nodeUuid: string, newParentUuid: string) => {
        const originalNode = mindMap.nodes[nodeUuid];
        if (!originalNode || !originalNode.parentUuid || originalNode.parentUuid === newParentUuid) {
            return;
        }

        const action: MindMapAction = {
            type: 'REPARENT_NODE',
            payload: { nodeUuid, newParentUuid, oldParentUuid: originalNode.parentUuid }
        };

        const stateWithReparent = mindMapReducer(mindMap, action);
        
        // mindMapReducer now handles updateChildSortNumbers internally for REPARENT_NODE, 
        // so stateWithReparent already has correct sort numbers.
        
        const laidOutMap = performLayout(stateWithReparent);

        if (onDataChange) {
            const nodeAfter = laidOutMap.nodes[nodeUuid];
            const parentAfter = laidOutMap.nodes[newParentUuid];
            const chain = getNodeChainByUuid(laidOutMap, nodeUuid);
            const info = {
                operationType: OperationType.MOVE_NODE,
                timestamp: Date.now(),
                description: `Moved node '${nodeAfter.name}' to new parent '${parentAfter.name}'`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: [nodeUuid],
                updatedNodes: [nodeAfter],
                currentNode: nodeAfter,
                parentNode: parentAfter,
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChange(convertDataChangeInfo(info));
        }

        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, performLayout, onDataChange]);

    return {
        addChildNode,
        addSiblingNode,
        deleteNode,
        updateNodePosition,
        reparentNode,
    };
};
