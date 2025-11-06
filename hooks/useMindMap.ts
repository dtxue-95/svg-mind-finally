import { useReducer, useCallback, useEffect, useRef } from 'react';
import { useAutoLayout } from './useAutoLayout';
import { useNodeActions } from './useNodeActions';
import { autoLayout } from '../utils/autoLayout';
import { mindMapReducer, MindMapAction } from '../state/mindMapReducer';
import { createHistoryReducer, HistoryAction } from './useMindMapState';
import type { MindMapData, NodeType, NodePriority, DataChangeCallback, ReviewStatusCode, DataChangeInfo, MindMapNodeData, Remark, ScoreInfo } from '../types';
import { OperationType } from '../types';
import { getNodeChainByUuid } from '../utils/dataChangeUtils';
import { convertDataChangeInfo } from '../utils/callbackDataConverter';
import { hasUseCaseDescendant, findAllDescendantUuids, findAllDescendantUseCaseUuidsAndIds } from '../utils/findAllDescendantIds';

const historicMindMapReducer = createHistoryReducer(mindMapReducer, {
    ignoreActions: [
        'UPDATE_NODE_SIZE',
        'BULK_UPDATE_REVIEW_STATUS',
        'UPDATE_SINGLE_NODE_REVIEW_STATUS',
        'ADD_REMARK',
        'UPDATE_SCORE_INFO',
        'PARTIAL_UPDATE_NODE',
    ],
});
const emptyMindMap: MindMapData = { rootUuid: '', nodes: {} };

export const useMindMap = (
    initialMindMap: MindMapData, 
    strictMode: boolean = false,
    onDataChange?: DataChangeCallback,
    onConfirmReviewStatus?: (info: DataChangeInfo) => void,
    onConfirmRemark?: (info: DataChangeInfo) => void,
    onConfirmScore?: (info: DataChangeInfo) => void
) => {
    const [history, dispatch] = useReducer(historicMindMapReducer, {
        past: [],
        present: initialMindMap,
        future: [],
    });

    const { present: mindMap, past, future } = history;
    const canUndo = past.length > 0;
    const canRedo = future.length > 0;
    const isDirty = past.length > 0;
    
    const mindMapRef = useRef(mindMap);
    mindMapRef.current = mindMap;

    const onDataChangeRef = useRef(onDataChange);
    onDataChangeRef.current = onDataChange;
    
    const onConfirmReviewStatusRef = useRef(onConfirmReviewStatus);
    onConfirmReviewStatusRef.current = onConfirmReviewStatus;

    const onConfirmRemarkRef = useRef(onConfirmRemark);
    onConfirmRemarkRef.current = onConfirmRemark;

    const onConfirmScoreRef = useRef(onConfirmScore);
    onConfirmScoreRef.current = onConfirmScore;

    const initialLoadFired = useRef(false);
    const initialLayoutDone = useRef(false);
    const isInitialMountRef = useRef(true);

    // This effect listens for changes in the initialMindMap prop (e.g., from an API call)
    // and resets the mind map state accordingly.
    useEffect(() => {
        // Don't reset on the very first render, as useReducer already initializes with this state.
        if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            return;
        }

        // When new initial data is provided, reset the entire history.
        dispatch({ type: 'RESET_HISTORY', payload: initialMindMap });

        // Reset flags to allow re-triggering of initial layout and load events.
        initialLayoutDone.current = false;
        initialLoadFired.current = false;
    
    }, [initialMindMap]);

    const { triggerAutoLayout } = useAutoLayout(mindMap, dispatch, onDataChange);
    
    const { 
        addChildNode,
        addSiblingNode,
        deleteNode, 
        updateNodePosition,
        reparentNode,
    } = useNodeActions(mindMap, dispatch, autoLayout, strictMode, onDataChange);
    
    useEffect(() => {
        if (onDataChange && !initialLoadFired.current) {
            const info = {
                operationType: OperationType.LOAD_DATA,
                timestamp: Date.now(),
                description: 'Initial data loaded',
                previousData: emptyMindMap,
                currentData: initialMindMap,
            };
            onDataChange(convertDataChangeInfo(info));
            initialLoadFired.current = true;
        }
    }, [onDataChange, initialMindMap]);

    // This effect handles the initial auto-layout after all nodes have been measured.
    useEffect(() => {
        // We only want this to run once after the initial data load.
        if (initialLayoutDone.current || !mindMap.rootUuid) return;
        
        const nodes = Object.values(mindMap.nodes);
        if (nodes.length === 0) return;

        // Check if all nodes have a width defined. This signifies the end of the initial measurement pass.
        // FIX: Add explicit type for `n` to resolve error 'Property 'width' does not exist on type 'unknown''.
        const allNodesMeasured = !nodes.some((n: MindMapNodeData) => typeof n.width === 'undefined');

        if (allNodesMeasured) {
            const laidOutMap = autoLayout(mindMap);

            if (onDataChangeRef.current) {
                const info = {
                    operationType: OperationType.LAYOUT,
                    timestamp: Date.now(),
                    description: 'Initial auto-layout applied',
                    previousData: mindMap,
                    currentData: laidOutMap,
                };
                onDataChangeRef.current(convertDataChangeInfo(info));
            }
            
            // Set the initial state without creating an undo history entry.
            dispatch({ type: 'RESET_HISTORY', payload: laidOutMap });
            initialLayoutDone.current = true;
        }
    }, [mindMap, dispatch]);

    const updateNodeSizeAndLayout = useCallback((nodeUuid: string, size: { width: number; height: number; }, options: { layout: boolean } = { layout: true }) => {
        const currentMindMap = mindMapRef.current;
        const node = currentMindMap.nodes[nodeUuid];
        if (!node || (node.width === size.width && node.height === size.height)) {
            return;
        }

        if (options.layout) {
            const stateWithUpdatedSize = {
                ...currentMindMap,
                nodes: {
                    ...currentMindMap.nodes,
                    [nodeUuid]: { ...node, width: size.width, height: size.height },
                },
            };
            // This is a "final" size update that requires a full layout.
            const laidOutMap = autoLayout(stateWithUpdatedSize);
            if (onDataChangeRef.current) {
                const info = {
                    operationType: OperationType.LAYOUT,
                    timestamp: Date.now(),
                    description: `Updated size for node '${node.name}' and re-laid out`,
                    previousData: currentMindMap,
                    currentData: laidOutMap,
                    affectedNodeUuids: [nodeUuid],
                    updatedNodes: [laidOutMap.nodes[nodeUuid]],
                };
                onDataChangeRef.current(convertDataChangeInfo(info));
            }
            dispatch({ type: 'UPDATE_PRESENT_STATE', payload: laidOutMap });
        } else {
            // This is a "temporary" size update (e.g., initial measure, live textarea resize).
            // Just update the node size in the state without re-laying out the whole tree.
            dispatch({ type: 'UPDATE_NODE_SIZE', payload: { nodeUuid, width: size.width, height: size.height } });
        }
    }, [dispatch]);
    
    const finishNodeEditing = useCallback((
        nodeUuid: string, 
        name: string, 
        size: { width: number; height: number; },
        initialSize: { width: number; height: number; }
    ) => {
        const currentMindMap = mindMapRef.current;
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return;

        // This is the state we want to archive for undo.
        // It has the old text (from currentMindMap) and the old size (passed in).
        const stateBeforeEdit = {
            ...currentMindMap,
            nodes: {
                ...currentMindMap.nodes,
                [nodeUuid]: {
                    ...node,
                    width: initialSize.width,
                    height: initialSize.height,
                },
            },
        };

        // This is the state with final text and size, before layout.
        const stateWithUpdates = {
            ...currentMindMap,
            nodes: {
                ...currentMindMap.nodes,
                [nodeUuid]: { ...node, name, width: size.width, height: size.height },
            },
        };
        // This is the final state after layout.
        const laidOutMap = autoLayout(stateWithUpdates);

        if (onDataChangeRef.current) {
            const nodeAfter = laidOutMap.nodes[nodeUuid];
            const parentNode = laidOutMap.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(laidOutMap, nodeUuid);
            const info = {
                operationType: OperationType.UPDATE_NODE_TEXT,
                timestamp: Date.now(),
                description: `Updated node '${node.name}'`,
                previousData: stateBeforeEdit, // Use the corrected "before" state
                currentData: laidOutMap,
                affectedNodeUuids: [nodeUuid],
                updatedNodes: [nodeAfter],
                currentNode: nodeAfter,
                parentNode: parentNode,
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        
        // This special action manually sets the 'past' and 'present' states.
        dispatch({ type: 'COMMIT_EDIT', payload: { stateToArchive: stateBeforeEdit, newPresentState: laidOutMap } });
    }, [dispatch]);


    const undo = useCallback(() => {
        if (!canUndo) return;
        
        if (onDataChange) {
            const nextState = past[past.length - 1];
            const info = {
                operationType: OperationType.UNDO,
                timestamp: Date.now(),
                description: 'Undo last action',
                previousData: mindMap,
                currentData: nextState,
                affectedNodeUuids: Object.keys(nextState.nodes),
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch({ type: 'UNDO' });
    }, [canUndo, mindMap, past, dispatch, onDataChange]);

    const redo = useCallback(() => {
        if (!canRedo) return;
        
        if (onDataChange) {
            const nextState = future[0];
            const info = {
                operationType: OperationType.REDO,
                timestamp: Date.now(),
                description: 'Redo last action',
                previousData: mindMap,
                currentData: nextState,
                affectedNodeUuids: Object.keys(nextState.nodes),
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch({ type: 'REDO' });
    }, [canRedo, mindMap, future, dispatch, onDataChange]);


    const toggleNodeCollapse = useCallback((nodeUuid: string) => {
        const node = mindMap.nodes[nodeUuid];
        if (!node || !node.parentUuid) return;

        const nextState = mindMapReducer(mindMap, { type: 'TOGGLE_NODE_COLLAPSE', payload: { nodeUuid } });
        const laidOutMap = autoLayout(nextState);
        
        if (onDataChange) {
            const chain = getNodeChainByUuid(laidOutMap, nodeUuid);
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: `Node '${node.name}' ${node.isCollapsed ? 'expanded' : 'collapsed'}'`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: [nodeUuid],
                updatedNodes: [laidOutMap.nodes[nodeUuid]],
                currentNode: laidOutMap.nodes[nodeUuid],
                parentNode: laidOutMap.nodes[node.parentUuid],
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChange(convertDataChangeInfo(info));
        }

        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);

    const expandNodes = useCallback((nodeUuids: string[]) => {
        if (nodeUuids.length === 0) return;

        const nextState = mindMapReducer(mindMap, { type: 'EXPAND_NODES', payload: { nodeUuids } });
        if (nextState === mindMap) return;
        const laidOutMap = autoLayout(nextState);

        if (onDataChange) {
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: `Expanded ${nodeUuids.length} node(s)`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: nodeUuids,
                updatedNodes: nodeUuids.map(uuid => laidOutMap.nodes[uuid]),
            };
            onDataChange(convertDataChangeInfo(info));
        }

        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);

    const expandAllNodes = useCallback(() => {
        const nextState = mindMapReducer(mindMap, { type: 'EXPAND_ALL_NODES' });
        if (nextState === mindMap) return;
        const laidOutMap = autoLayout(nextState);

        if (onDataChange) {
             const changedNodes = Object.values(laidOutMap.nodes).filter(
                // FIX: Add explicit type for `node` and cast for `Object.values(...)[i]` to resolve 'unknown' type error.
                (node: MindMapNodeData, i) => node.isCollapsed !== (Object.values(mindMap.nodes)[i] as MindMapNodeData).isCollapsed
            );
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: 'Expanded all nodes',
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: changedNodes.map(n => n.uuid!),
                updatedNodes: changedNodes,
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);

    const collapseAllNodes = useCallback(() => {
        const nextState = mindMapReducer(mindMap, { type: 'COLLAPSE_ALL_NODES' });
        if (nextState === mindMap) return;
        const laidOutMap = autoLayout(nextState);

        if (onDataChange) {
            const changedNodes = Object.values(laidOutMap.nodes).filter(
                // FIX: Add explicit type for `node` and cast for `Object.values(...)[i]` to resolve 'unknown' type error.
                (node: MindMapNodeData, i) => node.isCollapsed !== (Object.values(mindMap.nodes)[i] as MindMapNodeData).isCollapsed
            );
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: 'Collapsed all nodes',
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: changedNodes.map(n => n.uuid!),
                updatedNodes: changedNodes,
            };
            onDataChange(convertDataChangeInfo(info));
        }
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);

    const expandToLevel = useCallback((targetTypes: NodeType[]) => {
        const nextState = mindMapReducer(mindMap, { type: 'EXPAND_TO_LEVEL', payload: { targetTypes } });
        if (nextState === mindMap) return;
        const laidOutMap = autoLayout(nextState);

        if (onDataChangeRef.current) {
            const changedNodes = Object.values(laidOutMap.nodes).filter(
                (node) => {
                    const oldNode = mindMap.nodes[node.uuid!];
                    return oldNode && oldNode.isCollapsed !== node.isCollapsed;
                }
            );
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: `Expanded to level: ${targetTypes.join(', ')}`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: changedNodes.map(n => n.uuid!),
                updatedNodes: changedNodes,
            };
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch]);

    const collapseToLevel = useCallback((targetTypes: NodeType[]) => {
        const nextState = mindMapReducer(mindMap, { type: 'COLLAPSE_TO_LEVEL', payload: { targetTypes } });
        if (nextState === mindMap) return;
        const laidOutMap = autoLayout(nextState);

        if (onDataChangeRef.current) {
            const changedNodes = Object.values(laidOutMap.nodes).filter(
                (node) => {
                    const oldNode = mindMap.nodes[node.uuid!];
                    return oldNode && oldNode.isCollapsed !== node.isCollapsed;
                }
            );
            const info = {
                operationType: OperationType.TOGGLE_NODE_COLLAPSE,
                timestamp: Date.now(),
                description: `Collapsed to level: ${targetTypes.join(', ')}`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: changedNodes.map(n => n.uuid!),
                updatedNodes: changedNodes,
            };
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch]);

    const updateNodeType = useCallback((nodeUuid: string, nodeType: NodeType) => {
        const currentMindMap = mindMapRef.current;
        const action: MindMapAction = { type: 'UPDATE_NODE_TYPE', payload: { nodeUuid, nodeType } };
        const nextState = mindMapReducer(currentMindMap, action);
        if (nextState === currentMindMap) return;

        if (onDataChangeRef.current) {
            const nodeBefore = currentMindMap.nodes[nodeUuid];
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nextState.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(nextState, nodeUuid);
            const info = {
                operationType: OperationType.UPDATE_NODE_TYPE,
                timestamp: Date.now(),
                description: `Changed node '${nodeBefore.name}' type to ${nodeType}`,
                previousData: currentMindMap,
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
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        dispatch(action);
    }, [dispatch]);

    const updateNodePriority = useCallback((nodeUuid: string, priorityLevel: NodePriority) => {
        const currentMindMap = mindMapRef.current;
        const action: MindMapAction = { type: 'UPDATE_NODE_PRIORITY', payload: { nodeUuid, priorityLevel } };
        const nextState = mindMapReducer(currentMindMap, action);
        if (nextState === currentMindMap) return;

        if (onDataChangeRef.current) {
            const nodeBefore = currentMindMap.nodes[nodeUuid];
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nextState.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(nextState, nodeUuid);
            const info = {
                operationType: OperationType.UPDATE_NODE_PRIORITY,
                timestamp: Date.now(),
                description: `Updated priorityLevel for node '${nodeAfter.name}' to ${priorityLevel}`,
                previousData: currentMindMap,
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
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        dispatch(action);
    }, [dispatch]);
    
    const reorderNode = useCallback((draggedNodeUuid: string, targetSiblingUuid: string, position: 'before' | 'after') => {
        const action: MindMapAction = { type: 'REORDER_NODE', payload: { draggedNodeUuid, targetSiblingUuid, position } };
        const nextState = mindMapReducer(mindMap, action);
        if (nextState === mindMap) return; // No change, probably blocked by constraint

        // After reordering, update the sortNumber for all siblings
        const parentUuid = nextState.nodes[draggedNodeUuid]?.parentUuid;
        let stateWithSortedChildren = nextState;

        if (parentUuid) {
            const parentNode = nextState.nodes[parentUuid];
            const updatedNodes = { ...nextState.nodes };
            if (parentNode?.childNodeList) {
                parentNode.childNodeList.forEach((childUuid, index) => {
                    if (updatedNodes[childUuid]) {
                        updatedNodes[childUuid] = { ...updatedNodes[childUuid], sortNumber: index + 1 };
                    }
                });
                stateWithSortedChildren = { ...nextState, nodes: updatedNodes };
            }
        }

        const laidOutMap = autoLayout(stateWithSortedChildren);

        if (onDataChangeRef.current) {
            const nodeAfter = laidOutMap.nodes[draggedNodeUuid];
            const parentNode = laidOutMap.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(laidOutMap, draggedNodeUuid);
            const info = {
                operationType: OperationType.REORDER_NODE,
                timestamp: Date.now(),
                description: `Reordered node '${nodeAfter.name}'`,
                previousData: mindMap,
                currentData: laidOutMap,
                affectedNodeUuids: [draggedNodeUuid],
                updatedNodes: [nodeAfter],
                currentNode: nodeAfter,
                parentNode: parentNode,
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };
            onDataChangeRef.current(convertDataChangeInfo(info));
        }

        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);
    
// FIX: Changed the return type signature for _prepareReviewStatusUpdate to correctly handle internal MindMapNodeData types before conversion.
    const _prepareReviewStatusUpdate = useCallback((
        nodeUuid: string, 
        newStatus: ReviewStatusCode,
        currentMindMap: MindMapData
    ): {
        action: MindMapAction;
        info: Omit<DataChangeInfo, 
            'previousData' | 'currentData' | 'previousRawData' | 'currentRawData' | 
            'addedNodes' | 'deletedNodes' | 'updatedNodes' | 'currentNode' | 
            'parentNode' | 'uuidChainNodes' | 'parentUuidChainNodes'
        > & {
            updatedNodes?: (MindMapNodeData | undefined)[];
            currentNode?: MindMapNodeData;
            parentNode?: MindMapNodeData;
            uuidChainNodes?: MindMapNodeData[];
            parentUuidChainNodes?: MindMapNodeData[];
        };
    } | null => {
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return null;

        // Logic for 'pending_review' OR for a single USE_CASE node (single update, propagates up)
        if (newStatus === 'pending_review' || node.nodeType === 'USE_CASE') {
            const action: MindMapAction = {
                type: 'UPDATE_SINGLE_NODE_REVIEW_STATUS',
                payload: { nodeUuid, newStatus },
            };
            
            // For the callback, we need to know all affected ancestors
            const stateAfter = mindMapReducer(currentMindMap, action);
            const nodeAfter = stateAfter.nodes[nodeUuid];
            const ancestorUuids = [];
            let currentParentUuid = nodeAfter.parentUuid;
            while (currentParentUuid) {
                const parent = stateAfter.nodes[currentParentUuid];
                if (parent && parent.reviewStatusCode !== currentMindMap.nodes[currentParentUuid]?.reviewStatusCode) {
                    ancestorUuids.push(currentParentUuid);
                    currentParentUuid = parent.parentUuid;
                } else {
                    break;
                }
            }
            const affectedNodeUuids = [nodeUuid, ...ancestorUuids];
            const parentNode = stateAfter.nodes[nodeAfter.parentUuid!];
            const chain = getNodeChainByUuid(stateAfter, nodeUuid);

            const info = {
                operationType: OperationType.UPDATE_SINGLE_NODE_REVIEW_STATUS,
                timestamp: Date.now(),
                description: `Updated review status for node '${nodeAfter.name}' to '${newStatus}'.`,
                affectedNodeUuids,
                updatedNodes: affectedNodeUuids.map(uuid => stateAfter.nodes[uuid]).filter(Boolean),
                currentNode: nodeAfter,
                parentNode,
                uuidChain: chain.uuids,
                uuidChainNodes: chain.nodes,
                parentUuidChain: chain.uuids.slice(0, -1),
                parentUuidChainNodes: chain.nodes.slice(0, -1),
            };

            return { action, info };
        }
        // Logic for 'approved'/'rejected' on a parent node (cascades down)
        else {
            if (!hasUseCaseDescendant(currentMindMap, nodeUuid)) {
                alert('该节点下缺少测试用例。');
                return null;
            }

            const action: MindMapAction = {
                type: 'BULK_UPDATE_REVIEW_STATUS',
                payload: { startNodeUuid: nodeUuid, newStatus },
            };

            const affectedNodeUuids = Array.from(findAllDescendantUuids(currentMindMap, nodeUuid));
            const stateAfter = mindMapReducer(currentMindMap, action);
            const { ids: useCaseIds } = findAllDescendantUseCaseUuidsAndIds(currentMindMap, nodeUuid);

            const info = {
                operationType: OperationType.BULK_UPDATE_REVIEW_STATUS,
                timestamp: Date.now(),
                description: `Bulk updated review status to '${newStatus}' for node '${node.name}' and its descendants.`,
                affectedNodeUuids,
                updatedNodes: affectedNodeUuids.map(uuid => stateAfter.nodes[uuid]).filter(Boolean),
                currentNode: stateAfter.nodes[nodeUuid],
                useCaseIds,
            };

            return { action, info };
        }
    }, []);

    const confirmReviewStatus = useCallback((nodeUuid: string, newStatus: ReviewStatusCode) => {
        const currentMindMap = mindMapRef.current;
        
        const update = _prepareReviewStatusUpdate(nodeUuid, newStatus, currentMindMap);
        if (!update) return;

        const { action, info: infoPartial } = update;

        const stateAfter = mindMapReducer(currentMindMap, action);
        if (stateAfter === currentMindMap) return;

        if (onConfirmReviewStatusRef.current) {
            const fullInfo = {
                ...infoPartial,
                previousData: currentMindMap,
                currentData: stateAfter,
            };
            onConfirmReviewStatusRef.current(convertDataChangeInfo(fullInfo));
        }

        dispatch(action);
    }, [_prepareReviewStatusUpdate, dispatch]);

    const getReviewStatusUpdateInfo = useCallback((nodeUuid: string, newStatus: ReviewStatusCode): DataChangeInfo | null => {
        const currentMindMap = mindMapRef.current;

        const update = _prepareReviewStatusUpdate(nodeUuid, newStatus, currentMindMap);
        if (!update) return null;

        const { action, info: infoPartial } = update;
        const stateAfter = mindMapReducer(currentMindMap, action);
        
        const fullInfo = {
            ...infoPartial,
            previousData: currentMindMap,
            currentData: stateAfter,
        };
        
        return convertDataChangeInfo(fullInfo);
    }, [_prepareReviewStatusUpdate]);

    const confirmRemark = useCallback((nodeUuid: string, content: string) => {
        const currentMindMap = mindMapRef.current;
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return;

        const newRemark: Remark = {
            // Using timestamp as a temporary unique ID for React key, should be replaced by backend ID on save.
            id: `temp-${Date.now()}`,
            remarker: { realName: '当前用户', showName: '当前用户' }, // Placeholder for actual user info
            createTime: new Date().toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:mm:ss format
            content: content,
        };

        const action: MindMapAction = { type: 'ADD_REMARK', payload: { nodeUuid, remark: newRemark } };
        const nextState = mindMapReducer(currentMindMap, action);

        if (onConfirmRemarkRef.current) {
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nodeAfter.parentUuid ? nextState.nodes[nodeAfter.parentUuid] : undefined;
            const chain = getNodeChainByUuid(nextState, nodeUuid);

            const info = {
                operationType: OperationType.ADD_REMARK,
                timestamp: Date.now(),
                description: `Added remark to node '${nodeAfter.name}'`,
                previousData: currentMindMap,
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
            onConfirmRemarkRef.current(convertDataChangeInfo(info));
        }

        dispatch(action);
    }, [dispatch]);

    const confirmScore = useCallback((nodeUuid: string, scoreInfo: ScoreInfo) => {
        const currentMindMap = mindMapRef.current;
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return;

        const action: MindMapAction = { type: 'UPDATE_SCORE_INFO', payload: { nodeUuid, scoreInfo } };
        const nextState = mindMapReducer(currentMindMap, action);

        if (onConfirmScoreRef.current) {
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nodeAfter.parentUuid ? nextState.nodes[nodeAfter.parentUuid] : undefined;
            const chain = getNodeChainByUuid(nextState, nodeUuid);

            const info = {
                operationType: OperationType.UPDATE_SCORE_INFO,
                timestamp: Date.now(),
                description: `Updated score for node '${nodeAfter.name}'`,
                previousData: currentMindMap,
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
            onConfirmScoreRef.current(convertDataChangeInfo(info));
        }
        
        dispatch(action);
    }, [dispatch]);

    const partialUpdateNode = useCallback((nodeUuid: string, partialData: Partial<MindMapNodeData>) => {
        const currentMindMap = mindMapRef.current;
        const node = currentMindMap.nodes[nodeUuid];
        if (!node) return;

        const action: MindMapAction = { type: 'PARTIAL_UPDATE_NODE', payload: { nodeUuid, partialData } };
        const nextState = mindMapReducer(currentMindMap, action);

        if (onDataChangeRef.current) {
            const nodeAfter = nextState.nodes[nodeUuid];
            const parentNode = nodeAfter.parentUuid ? nextState.nodes[nodeAfter.parentUuid] : undefined;
            const chain = getNodeChainByUuid(nextState, nodeUuid);

            const info = {
                operationType: OperationType.PARTIAL_UPDATE_NODE,
                timestamp: Date.now(),
                description: `Partially updated data for node '${nodeAfter.name}'`,
                previousData: currentMindMap,
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
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        
        dispatch(action);
    }, [dispatch]);
    
    const syncData = useCallback((newMindMapData: MindMapData) => {
        const currentMindMap = mindMapRef.current;
        
        // The reducer merges the new data with existing layout information
        const intermediateState = mindMapReducer(currentMindMap, { type: 'SYNC_DATA', payload: newMindMapData });
        
        // The layout function calculates positions for new nodes while respecting old ones
        const laidOutMap = autoLayout(intermediateState);
        
        if (onDataChangeRef.current) {
            const info = {
                operationType: OperationType.SYNC_DATA,
                timestamp: Date.now(),
                description: 'Data synchronized with external source, preserving view state.',
                previousData: currentMindMap,
                currentData: laidOutMap,
            };
            onDataChangeRef.current(convertDataChangeInfo(info));
        }
        
        // Reset history with the new, synchronized, and laid-out state
        dispatch({ type: 'RESET_HISTORY', payload: laidOutMap });
    }, [dispatch]);


    const resetHistory = useCallback(() => {
        dispatch({ type: 'CLEAR_HISTORY' });
    }, [dispatch]);


    return {
        mindMap,
        addChildNode,
        addSiblingNode,
        deleteNode,
        updateNodePosition,
        reparentNode,
        reorderNode,
        triggerAutoLayout,
        updateNodeSizeAndLayout,
        finishNodeEditing,
        toggleNodeCollapse,
        expandNodes,
        expandAllNodes,
        collapseAllNodes,
        expandToLevel,
        collapseToLevel,
        updateNodeType,
        updateNodePriority,
        confirmReviewStatus,
        getReviewStatusUpdateInfo,
        confirmRemark,
        confirmScore,
        partialUpdateNode,
        syncData,
        undo,
        redo,
        canUndo,
        canRedo,
        isDirty,
        resetHistory,
    };
};
