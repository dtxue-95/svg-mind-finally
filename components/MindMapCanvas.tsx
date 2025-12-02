import React, { useCallback, useRef, useEffect, useReducer, useMemo, useState } from 'react';
import type { MindMapData, CommandId, MindMapNodeData, NodeType, NodePriority, DataChangeCallback, CanvasTransform, ReviewStatusCode, ScoreInfo, ConnectorStyle, InteractionMode } from '../types';
import { MindMapNode } from './MindMapNode';
import { Toolbar } from './Toolbar';
import { BottomToolbar } from './BottomToolbar';
import { Searchbar } from './Searchbar';
import { ToolbarHandle } from './ToolbarHandle';
import { ContextMenu } from './ContextMenu';
import { CanvasContextMenu } from './CanvasContextMenu';
import { Minimap } from './Minimap';
import { ShortcutsModal as ShortcutsPanel } from './ShortcutsModal';
import { ReviewMenu } from './ReviewStatusModal';
import { RemarkModal } from './RemarkModal';
import { ScoreModal } from './ScoreModal';
import { generateElbowPath } from '../utils/generateElbowPath';
import { generateCurvePath } from '../utils/generateCurvePath';
import { canvasReducer } from '../state/canvasReducer';
import { getInitialCanvasState } from '../state/canvasState';
import { countAllDescendants, findAllDescendantUuids, findAllAncestorUuids, hasUseCaseDescendant, isDemandNodeReadyForReview } from '../utils/findAllDescendantIds';
import * as viewCommands from './commands/viewCommands';
import { OperationType } from '../types';
import { getNodeChainByUuid } from '../utils/dataChangeUtils';
import { convertDataChangeInfo } from '../utils/callbackDataConverter';
import { HORIZONTAL_SPACING, VERTICAL_SPACING } from '../constants';
import { FiEye, FiEdit2, FiCommand } from 'react-icons/fi';
import { Toast } from './Toast';
import { filterSelectedNodesForCopy } from '../utils/treeUtils';


interface ReadOnlyToggleProps {
    isReadOnly: boolean;
    onToggleReadOnly: () => void;
}

const ReadOnlyToggle: React.FC<ReadOnlyToggleProps> = ({ isReadOnly, onToggleReadOnly }) => {
    const handleSetReadOnly = () => {
        if (!isReadOnly) {
            onToggleReadOnly();
        }
    };

    const handleSetEditable = () => {
        if (isReadOnly) {
            onToggleReadOnly();
        }
    };

    return (
        <div className="readonly-toggle">
            <button
                className={`readonly-toggle__button ${isReadOnly ? 'readonly-toggle__button--active' : ''}`}
                onClick={handleSetReadOnly}
                title="只读模式"
            >
                <FiEye />
                只读模式
            </button>
            <button
                className={`readonly-toggle__button ${!isReadOnly ? 'readonly-toggle__button--active' : ''}`}
                onClick={handleSetEditable}
                title="编辑模式"
            >
                <FiEdit2 />
                编辑模式
            </button>
        </div>
    );
};

type PopupType = 'review' | 'remark' | 'score';

interface PopupState {
  type: PopupType | null;
  nodeUuid: string | null;
  x: number;
  y: number;
  context?: {
      hasUseCases?: boolean;
      nodeType?: NodeType | null;
  };
}


interface MindMapCanvasProps {
    mindMapData: MindMapData;
    onAddChildNode: (parentUuid: string) => void;
    onAddSiblingNode: (nodeUuid: string) => void;
    onDeleteNode: (nodeUuid: string) => void;
    onFinishEditing: (nodeUuid: string, name: string, size: { width: number; height: number; }, initialSize: { width: number; height: number; }, isInitialEdit?: boolean) => void;
    onUpdateNodePosition: (nodeUuid: string, position: {x: number, y: number}) => void;
    onReparentNode: (nodeUuid: string, newParentUuid: string) => void;
    onReorderNode: (draggedNodeUuid: string, targetSiblingUuid: string, position: 'before' | 'after') => void;
    onLayout: () => void;
    onUpdateNodeSize: (nodeUuid: string, size: { width: number; height: number; }, options?: { layout: boolean; }) => void;
    onToggleCollapse: (nodeUuid: string) => void;
    onExpandNodes: (nodeUuids: string[]) => void;
    onExpandAllNodes: () => void;
    onCollapseAllNodes: () => void;
    onExpandToLevel: (nodeTypes: NodeType[]) => void;
    onCollapseToLevel: (nodeTypes: NodeType[]) => void;
    onUpdateNodeType: (nodeUuid: string, nodeType: NodeType) => void;
    onUpdateNodePriority: (nodeUuid: string, priorityLevel: NodePriority) => void;
    onConfirmReviewStatus: (nodeUuid: string, newStatus: ReviewStatusCode) => void;
    onConfirmRemark: (nodeUuid: string, content: string) => void;
    onConfirmScore: (nodeUuid: string, scoreInfo: ScoreInfo) => void;
    onSubmitDefect: (nodeUuid: string) => void;
    onSave: () => void;
    showAITag: boolean;
    isDraggable?: boolean;
    enableStrictDrag?: boolean;
    enableNodeReorder?: boolean;
    reorderableNodeTypes?: NodeType[];
    showNodeType?: boolean;
    showPriority?: boolean;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    showTopToolbar: boolean;
    showBottomToolbar: boolean;
    topToolbarCommands: CommandId[];
    bottomToolbarCommands: CommandId[];
    strictMode?: boolean;
    showContextMenu?: boolean;
    showCanvasContextMenu?: boolean;
    priorityEditableNodeTypes: NodeType[];
    onDataChange?: DataChangeCallback;
    onExecuteUseCase?: (nodeUuid: string) => void;
    enableUseCaseExecution?: boolean;
    enableDefectSubmission: boolean;
    canvasBackgroundColor?: string;
    showBackgroundDots?: boolean;
    showMinimap?: boolean;
    getNodeBackgroundColor?: (node: MindMapNodeData) => string | null | undefined;
    enableReadOnlyUseCaseExecution?: boolean;
    enableExpandCollapseByLevel: boolean;
    isReadOnly: boolean;
    onToggleReadOnly: () => void;
    onSetReadOnly: (isReadOnly: boolean) => void;
    isDirty: boolean;
    children?: React.ReactNode;
    newlyAddedNodeUuid: string | null;
    onNodeFocused: () => void;
    showReadOnlyToggleButtons: boolean;
    showShortcutsButton: boolean;
    enableReviewStatus: boolean;
    enableNodeRemarks: boolean;
    enableNodeScoring: boolean;
    reviewStatusNodeTypes: NodeType[];
    nodeRemarksNodeTypes: NodeType[];
    nodeScoringNodeTypes: NodeType[];
    enableBulkReviewContextMenu: boolean;
    enableSingleReviewContextMenu: boolean;
    connectorStyle: ConnectorStyle;
    toast?: { visible: boolean; message: string; type: 'error' | 'success' };
    onCloseToast?: () => void;
    enableRangeSelection?: boolean;
    onPasteNodes?: (targetParentUuid: string, sourceNodeUuids: string[]) => string[] | undefined;
    enableNodeCopy?: boolean;
    interactionMode: InteractionMode;
    onSetInteractionMode: (mode: InteractionMode) => void;
    enableInteractionModeSwitch: boolean;
}

const SvgPath = React.memo(({ d, className }: { d: string, className: string }) => {
    return (
        <path
            d={d}
            fill="none"
            className={className}
        />
    );
});

const PAN_AMOUNT = 50;
const AUTO_PAN_SPEED = 10;

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({
    mindMapData, onAddChildNode, onAddSiblingNode, onDeleteNode, onFinishEditing, onUpdateNodePosition, onReparentNode, onReorderNode, onLayout, onUpdateNodeSize, onSave, showAITag, isDraggable = false, enableStrictDrag = false, enableNodeReorder = true, reorderableNodeTypes, showNodeType, showPriority, onToggleCollapse, onExpandNodes, onExpandAllNodes, onCollapseAllNodes, onExpandToLevel, onCollapseToLevel, onUpdateNodeType, onUpdateNodePriority, onConfirmReviewStatus, onConfirmRemark, onConfirmScore, onSubmitDefect,
    onUndo, onRedo, canUndo, canRedo, showTopToolbar, showBottomToolbar, topToolbarCommands, bottomToolbarCommands, strictMode = false, showContextMenu = true, showCanvasContextMenu = true, priorityEditableNodeTypes, onDataChange, onExecuteUseCase, enableUseCaseExecution, enableDefectSubmission, canvasBackgroundColor, showBackgroundDots, showMinimap, getNodeBackgroundColor, enableReadOnlyUseCaseExecution, enableExpandCollapseByLevel, isReadOnly, onToggleReadOnly, onSetReadOnly, isDirty, children, newlyAddedNodeUuid, onNodeFocused, showReadOnlyToggleButtons, showShortcutsButton, enableReviewStatus, enableNodeRemarks, enableNodeScoring, reviewStatusNodeTypes, nodeRemarksNodeTypes, nodeScoringNodeTypes, enableBulkReviewContextMenu, enableSingleReviewContextMenu, connectorStyle, toast, onCloseToast, enableRangeSelection, onPasteNodes, enableNodeCopy = true, interactionMode, onSetInteractionMode, enableInteractionModeSwitch
}) => {
    const [canvasState, dispatch] = useReducer(canvasReducer, {
        rootUuid: mindMapData.rootUuid,
        showTopToolbar,
        showBottomToolbar
    }, (args) => getInitialCanvasState(args.rootUuid, {
        showTopToolbar: args.showTopToolbar,
        showBottomToolbar: args.showBottomToolbar
    }));
    const canvasStateRef = useRef(canvasState);
    canvasStateRef.current = canvasState;
    
    const { transform, selectedNodeUuid, multiSelectedNodeUuids, selectionBox, dragState, isBottomToolbarVisible, isTopToolbarVisible, isSearchActive, searchQuery, searchMatches, currentMatchIndex, contextMenu, canvasContextMenu } = canvasState;
    
    const canvasRef = useRef<HTMLDivElement>(null);
    const panStartPos = useRef({ x: 0, y: 0 });
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const shortcutsButtonRef = useRef<HTMLButtonElement>(null);
    
    // Internal clipboard to store UUIDs of nodes to copy
    const clipboardRef = useRef<string[]>([]);
    const [clipboardSize, setClipboardSize] = useState(0);
    const [pastedNodeUuids, setPastedNodeUuids] = useState<string[] | null>(null);

    const [isShortcutsPanelVisible, setIsShortcutsPanelVisible] = useState(false);
    const [shortcutsPanelPosition, setShortcutsPanelPosition] = useState<{top: number; right: number}>({ top: 0, right: 0 });
    const [activePopup, setActivePopup] = useState<PopupState>({ type: null, nodeUuid: null, x: 0, y: 0 });


    // Refs for smooth dragging with requestAnimationFrame
    const animationFrameId = useRef<number | null>(null);
    const lastMouseEvent = useRef<MouseEvent | null>(null);
    const isDraggingRef = useRef(false);

    // Refs for edge auto-panning
    const autoPanRequestRef = useRef<number | null>(null);
    const autoPanDirectionRef = useRef({ x: 0, y: 0 });

    const visibleNodeUuids = useMemo(() => {
        const visible = new Set<string>();
        if (!mindMapData.rootUuid) return visible;

        const queue: string[] = [mindMapData.rootUuid];
        visible.add(mindMapData.rootUuid);
        
        const nodes = mindMapData.nodes;

        while (queue.length > 0) {
            const nodeUuid = queue.shift()!;
            const node = nodes[nodeUuid];

            if (node && !node.isCollapsed && node.childNodeList) {
                for (const childUuid of node.childNodeList) {
                    if (nodes[childUuid]) {
                        visible.add(childUuid);
                        queue.push(childUuid);
                    }
                }
            }
        }
        return visible;
    }, [mindMapData]);

    const draggedSubtreeUuids = useMemo(() => {
        if (!dragState) {
            return new Set<string>();
        }
        return findAllDescendantUuids(mindMapData, dragState.nodeUuid);
    }, [mindMapData, dragState]);


    const searchbarContainerStyle = useMemo(() => {
        const toolbarVisibleTop = 20 + 54 + 10;
        const toolbarHiddenTop = 24 + 10;
        const top = isTopToolbarVisible ? `${toolbarVisibleTop}px` : `${toolbarHiddenTop}px`;
        return { top };
    }, [isTopToolbarVisible]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { width, height } = canvas.getBoundingClientRect();
        dispatch({ type: 'SET_TRANSFORM', payload: { translateX: width / 8, translateY: height / 2 }});
    }, []);

    const prevSelectedNodeUuidRef = useRef<string | null>(null);
    const prevIsReadOnlyRef = useRef<boolean>(isReadOnly);

    useEffect(() => {
        if (!onDataChange) return;

        const selectionChanged = prevSelectedNodeUuidRef.current !== selectedNodeUuid;
        const switchedToEditMode = prevIsReadOnlyRef.current && !isReadOnly;

        const hasJustBeenSelected = !isReadOnly && selectedNodeUuid && (selectionChanged || switchedToEditMode);
        const hasJustBeenDeselected = !isReadOnly && !selectedNodeUuid && selectionChanged;

        if (hasJustBeenSelected) {
            const selectedNode = mindMapData.nodes[selectedNodeUuid!];
            if (selectedNode) {
                const parentNode = selectedNode.parentUuid ? mindMapData.nodes[selectedNode.parentUuid] : undefined;
                const chain = getNodeChainByUuid(mindMapData, selectedNodeUuid!);
                const info = {
                    operationType: OperationType.SELECT_NODE,
                    timestamp: Date.now(),
                    description: `Selected node '${selectedNode.name}'`,
                    previousData: mindMapData,
                    currentData: mindMapData,
                    affectedNodeUuids: [selectedNodeUuid!],
                    currentNode: selectedNode,
                    parentNode: parentNode,
                    uuidChain: chain.uuids,
                    uuidChainNodes: chain.nodes,
                    parentUuidChain: chain.uuids.slice(0, -1),
                    parentUuidChainNodes: chain.nodes.slice(0, -1),
                };
                onDataChange(convertDataChangeInfo(info));
            }
        } else if (hasJustBeenDeselected) {
            const deselectedNode = mindMapData.nodes[prevSelectedNodeUuidRef.current!];
            const info = {
                operationType: OperationType.SELECT_NODE,
                timestamp: Date.now(),
                description: `Deselected node '${deselectedNode?.name}'`,
                previousData: mindMapData,
                currentData: mindMapData,
                affectedNodeUuids: [],
                currentNode: undefined,
                parentNode: undefined,
                uuidChain: [],
                uuidChainNodes: [],
                parentUuidChain: [],
                parentUuidChainNodes: [],
            };
            onDataChange(convertDataChangeInfo(info));
        }

        prevSelectedNodeUuidRef.current = selectedNodeUuid;
        prevIsReadOnlyRef.current = isReadOnly;
    }, [selectedNodeUuid, isReadOnly, onDataChange, mindMapData]);


    // Effect to center view on the current search match
    useEffect(() => {
        if (isSearchActive && currentMatchIndex !== null && canvasRef.current) {
            const currentNodeUuid = searchMatches[currentMatchIndex];
            if (currentNodeUuid) {
                const newTransform = viewCommands.centerView(
                    mindMapData.nodes,
                    currentNodeUuid,
                    canvasRef.current.getBoundingClientRect(),
                    transform.scale
                );
                dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
            }
        }
    }, [currentMatchIndex, isSearchActive, searchMatches, mindMapData.nodes, transform.scale]);

    // Effect for auto-selecting and centering newly added node
    useEffect(() => {
        // Check if there's a node to focus on, if it exists in the current data, and if the canvas is ready.
        if (newlyAddedNodeUuid && mindMapData.nodes[newlyAddedNodeUuid] && canvasRef.current) {
            const node = mindMapData.nodes[newlyAddedNodeUuid];
            
            // Wait for node measurement to complete (width/height are defined) before centering.
            if (typeof node.width !== 'number' || typeof node.height !== 'number') {
                return;
            }

            // Expand ancestors if they are collapsed to make the new node visible
            const ancestors = findAllAncestorUuids(mindMapData, newlyAddedNodeUuid);
            // FIX: Add explicit type for `node` to resolve 'property does not exist on type 'unknown'' error.
            const ancestorsToExpand = ancestors.filter(ancestorUuid => {
                const node: MindMapNodeData | undefined = mindMapData.nodes[ancestorUuid];
                return node && node.isCollapsed;
            });

            if (ancestorsToExpand.length > 0) {
                onExpandNodes(ancestorsToExpand);
                // The effect will re-run after the expansion and layout are complete.
                // We return here to wait for the re-render before centering.
                return;
            }

            // 1. Select the new node
            dispatch({ type: 'SELECT_NODE', payload: { nodeUuid: newlyAddedNodeUuid } });

            // 2. Calculate the transform to center the view on the new node
            const newTransform = viewCommands.centerView(
                mindMapData.nodes,
                newlyAddedNodeUuid,
                canvasRef.current.getBoundingClientRect(),
                transform.scale
            );
            
            // 3. Apply the new transform. The existing CSS transition on the <g> element will animate this.
            dispatch({ type: 'SET_TRANSFORM', payload: newTransform });

            // 4. Notify the parent component that focusing is complete to reset the trigger state.
            // This is now handled inside MindMapNode to trigger auto-edit.
        }
    }, [newlyAddedNodeUuid, mindMapData, onNodeFocused, transform.scale, dispatch, onExpandNodes]);

    // Effect to focus and center on newly pasted nodes
    useEffect(() => {
        if (pastedNodeUuids && pastedNodeUuids.length > 0 && canvasRef.current) {
            // Check if all pasted nodes are present in the mind map data
            const allNodesExist = pastedNodeUuids.every(uuid => mindMapData.nodes[uuid]);
            
            if (allNodesExist) {
                // 1. Multi-select all pasted nodes
                dispatch({ type: 'SET_MULTI_SELECTION', payload: { nodeUuids: new Set(pastedNodeUuids) } });
                // Optionally set the first one as the primary selection
                dispatch({ type: 'SELECT_NODE', payload: { nodeUuid: pastedNodeUuids[0] } });

                // 2. Calculate the bounding box of all pasted nodes to center the view
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                pastedNodeUuids.forEach(uuid => {
                    const node = mindMapData.nodes[uuid];
                    if (node && node.position && node.width && node.height) {
                        minX = Math.min(minX, node.position.x);
                        minY = Math.min(minY, node.position.y);
                        maxX = Math.max(maxX, node.position.x + node.width);
                        maxY = Math.max(maxY, node.position.y + node.height);
                    }
                });

                if (minX !== Infinity) {
                    const centerX = minX + (maxX - minX) / 2;
                    const centerY = minY + (maxY - minY) / 2;
                    
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    
                    // Calculate new translation to center the bounding box
                    const newTranslateX = canvasRect.width / 2 - centerX * transform.scale;
                    const newTranslateY = canvasRect.height / 2 - centerY * transform.scale;

                    dispatch({ type: 'SET_TRANSFORM', payload: { translateX: newTranslateX, translateY: newTranslateY } });
                }

                // Reset the pasted nodes state to avoid re-running
                setPastedNodeUuids(null);
            }
        }
    }, [pastedNodeUuids, mindMapData, transform.scale]);


    // Effect to expand ancestors when search results change
    useEffect(() => {
        if (isSearchActive && searchMatches.length > 0) {
            const ancestorsToExpand = new Set<string>();
            searchMatches.forEach(matchUuid => {
                const ancestors = findAllAncestorUuids(mindMapData, matchUuid);
                ancestors.forEach(ancestorUuid => {
                    const node = mindMapData.nodes[ancestorUuid];
                    if (node && node.isCollapsed) {
                        ancestorsToExpand.add(ancestorUuid);
                    }
                });
            });

            if (ancestorsToExpand.size > 0) {
                onExpandNodes(Array.from(ancestorsToExpand));
            }
        }
    }, [isSearchActive, searchMatches, mindMapData, onExpandNodes]);
    
    const handleFitView = useCallback(() => {
        if (!canvasRef.current) return;
        const visibleNodes: Record<string, MindMapNodeData> = {};
        visibleNodeUuids.forEach(uuid => {
            if (mindMapData.nodes[uuid]) {
                visibleNodes[uuid] = mindMapData.nodes[uuid];
            }
        });

        const newTransform = viewCommands.fitView(
            visibleNodes,
            canvasRef.current.getBoundingClientRect()
        );
        dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
    }, [dispatch, canvasRef, mindMapData.nodes, visibleNodeUuids]);

    const handleCenterView = useCallback(() => {
        if (!canvasRef.current) return;
        const nodeUuidToCenter = selectedNodeUuid || mindMapData.rootUuid;
        const newTransform = viewCommands.centerView(
            mindMapData.nodes,
            nodeUuidToCenter,
            canvasRef.current.getBoundingClientRect(),
            transform.scale
        );
        dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
    }, [dispatch, canvasRef, mindMapData, selectedNodeUuid, transform.scale]);

    const updateDrag = useCallback(() => {
        animationFrameId.current = null;
        if (!isDraggingRef.current || !lastMouseEvent.current) {
            return;
        }
    
        const moveEvent = lastMouseEvent.current;
        const { dragState: currentDragState, transform: currentTransform } = canvasStateRef.current;
        if (!currentDragState || !canvasRef.current) return;
    
        const dx = (moveEvent.clientX - dragStartPosRef.current.x) / currentTransform.scale;
        const dy = (moveEvent.clientY - dragStartPosRef.current.y) / currentTransform.scale;
    
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const canvasX = moveEvent.clientX - canvasRect.left;
        const canvasY = moveEvent.clientY - canvasRect.top;
    
        dispatch({
            type: 'DRAG_MOVE',
            payload: {
                offset: { dx, dy },
                canvasPosition: { x: canvasX, y: canvasY },
                allNodes: mindMapData.nodes,
                visibleNodeUuids,
            },
        });
    }, [dispatch, mindMapData.nodes, visibleNodeUuids]);

    const handleCopyNodes = useCallback(() => {
        if (!enableNodeCopy) return;
        
        if (selectedNodeUuid || multiSelectedNodeUuids.size > 0) {
            const nodesToCopy = new Set(multiSelectedNodeUuids);
            if (selectedNodeUuid) nodesToCopy.add(selectedNodeUuid);
            
            // Filter out descendants if their ancestor is also selected to avoid duplication
            const filteredUuids = filterSelectedNodesForCopy(nodesToCopy, mindMapData);
            clipboardRef.current = Array.from(filteredUuids);
            setClipboardSize(clipboardRef.current.length);
        }
    }, [enableNodeCopy, selectedNodeUuid, multiSelectedNodeUuids, mindMapData]);

    const performPaste = useCallback((targetNodeUuid: string) => {
        if (!isReadOnly && clipboardRef.current.length > 0 && onPasteNodes) {
            const newUuids = onPasteNodes(targetNodeUuid, clipboardRef.current);
            // If paste was successful and returned new node UUIDs, store them to trigger the centering effect
            if (newUuids && newUuids.length > 0) {
                setPastedNodeUuids(newUuids);
            }
            // We do not clear the clipboard here anymore.
            // This allows users to retry pasting if the first attempt failed due to validation constraints,
            // and supports the standard behavior of multiple pastes from a single copy.
        }
    }, [isReadOnly, onPasteNodes]);

    const handlePasteToNode = useCallback((nodeUuid: string) => {
        performPaste(nodeUuid);
    }, [performPaste]);

    // Effect for keyboard shortcuts (including Copy/Paste)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea' || target.isContentEditable;
            
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Copy/Paste Logic
            if (!isInput && metaOrCtrl && e.key.toLowerCase() === 'c') {
                if (enableNodeCopy) {
                    e.preventDefault();
                    handleCopyNodes();
                }
                return;
            }

            if (!isInput && metaOrCtrl && e.key.toLowerCase() === 'v') {
                if (selectedNodeUuid) {
                    e.preventDefault();
                    performPaste(selectedNodeUuid);
                }
                return;
            }

            // Standard shortcuts
            if (isInput) return;
            
            if (metaOrCtrl && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!isReadOnly) {
                    onSave();
                }
                return;
            }

            // Shortcuts for read-only/edit mode, fit view, and center view
            if (e.shiftKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                onSetReadOnly(true); // Set to read-only mode
                return;
            }
            if (e.shiftKey && e.key.toLowerCase() === 'w') {
                e.preventDefault();
                onSetReadOnly(false); // Set to edit mode
                return;
            }
            if (e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                handleFitView();
                return;
            }
            if (e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleCenterView();
                return;
            }

            if (metaOrCtrl && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                dispatch({ type: isSearchActive ? 'STOP_SEARCH' : 'START_SEARCH' });
                return;
            }
            
            if (metaOrCtrl && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                if (!canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                dispatch({ type: 'ZOOM', payload: { scaleAmount: 1.2, centerX, centerY } });
                return;
            }

            if (metaOrCtrl && e.key === '-') {
                e.preventDefault();
                if (!canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                dispatch({ type: 'ZOOM', payload: { scaleAmount: 1 / 1.2, centerX, centerY } });
                return;
            }

            // Expand/collapse should work in read-only mode
            if ((e.key === ' ' || e.code === 'Space') && selectedNodeUuid) {
                e.preventDefault();
                const node = mindMapData.nodes[selectedNodeUuid];
                // Only toggle if the node has children. The callback itself handles checks for root node etc.
                if (node && node.childNodeList && node.childNodeList.length > 0) {
                    onToggleCollapse(selectedNodeUuid);
                }
                return;
            }

            // Canvas panning with arrow keys
            let panDx = 0;
            let panDy = 0;
            let panHandled = false;
            switch (e.key) {
                case 'ArrowUp':
                    panDy = PAN_AMOUNT;
                    panHandled = true;
                    break;
                case 'ArrowDown':
                    panDy = -PAN_AMOUNT;
                    panHandled = true;
                    break;
                case 'ArrowLeft':
                    panDx = PAN_AMOUNT;
                    panHandled = true;
                    break;
                case 'ArrowRight':
                    panDx = -PAN_AMOUNT;
                    panHandled = true;
                    break;
            }

            if (panHandled) {
                e.preventDefault();

                if (isDraggingRef.current) {
                    // When panning via keyboard while dragging, we adjust the drag start
                    // reference point. This makes the dragged node stay visually fixed
                    // on the screen, while the canvas moves underneath.
                    dragStartPosRef.current.x += panDx;
                    dragStartPosRef.current.y += panDy;
                }
                
                dispatch({ type: 'PAN', payload: { dx: panDx, dy: panDy } });

                if (isDraggingRef.current) {
                    // After panning, we must immediately recalculate and apply the new
                    // drag offset to prevent the node from visually jumping with the canvas
                    // before the next mouse move.
                    updateDrag();
                }
                
                return;
            }

            if (isReadOnly) {
                return;
            }

            if (metaOrCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    onRedo();
                } else {
                    onUndo();
                }
                return;
            }

            if (metaOrCtrl && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                onRedo();
                return;
            }
            
            if (!selectedNodeUuid) {
                return;
            }

            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                if (selectedNodeUuid !== mindMapData.rootUuid) {
                    onDeleteNode(selectedNodeUuid);
                    dispatch({ type: 'SELECT_NODE', payload: { nodeUuid: null } });
                }
                return;
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                onAddChildNode(selectedNodeUuid);
                return;
            }
            
            if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedNodeUuid !== mindMapData.rootUuid) {
                    onAddSiblingNode(selectedNodeUuid);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        dispatch,
        canvasRef,
        isReadOnly,
        isSearchActive,
        selectedNodeUuid,
        multiSelectedNodeUuids,
        mindMapData,
        onUndo,
        onRedo,
        onAddChildNode,
        onAddSiblingNode,
        onDeleteNode,
        onSetReadOnly,
        onSave,
        handleFitView,
        handleCenterView,
        onToggleCollapse,
        updateDrag,
        enableNodeCopy,
        handleCopyNodes,
        performPaste
    ]);

     const handleCloseContextMenu = useCallback(() => {
        dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }, [dispatch]);
    
     const handleCloseCanvasContextMenu = useCallback(() => {
        dispatch({ type: 'HIDE_CANVAS_CONTEXT_MENU' });
    }, [dispatch]);
    
    const handleToggleShortcutsPanel = useCallback(() => {
        if (shortcutsButtonRef.current && canvasRef.current) {
            const buttonRect = shortcutsButtonRef.current.getBoundingClientRect();
            const canvasRect = canvasRef.current.getBoundingClientRect();
    
            setShortcutsPanelPosition({
                top: buttonRect.bottom - canvasRect.top + 8,
                right: canvasRect.right - buttonRect.right,
            });
        }
        setIsShortcutsPanelVisible(prev => !prev);
    }, []);

    const handleCloseShortcutsPanel = useCallback(() => {
        setIsShortcutsPanelVisible(false);
    }, []);

    const handleClosePopup = useCallback(() => {
        setActivePopup({ type: null, nodeUuid: null, x: 0, y: 0 });
    }, []);

    const handleOpenReviewContextMenu = useCallback((nodeUuid: string, event: React.MouseEvent) => {
        const node = mindMapData.nodes[nodeUuid];
        if (!node || !node.nodeType) return;
        
        let isReadyForReview = false;
        if (node.nodeType === 'DEMAND') {
            isReadyForReview = isDemandNodeReadyForReview(mindMapData, nodeUuid);
        } else {
            isReadyForReview = node.nodeType === 'USE_CASE' ? true : hasUseCaseDescendant(mindMapData, nodeUuid);
        }

        setActivePopup({
            type: 'review',
            nodeUuid,
            x: event.clientX,
            y: event.clientY,
            context: {
                hasUseCases: isReadyForReview,
                nodeType: node.nodeType,
            },
        });
    }, [mindMapData]);

    const handleOpenRemarkModal = useCallback((nodeUuid: string, event: React.MouseEvent) => {
        setActivePopup({
            type: 'remark',
            nodeUuid,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    const handleOpenScoreModal = useCallback((nodeUuid: string, event: React.MouseEvent) => {
        setActivePopup({
            type: 'score',
            nodeUuid,
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    const handleConfirmReviewStatus = useCallback((newStatus: ReviewStatusCode) => {
        if (activePopup.nodeUuid) {
            onConfirmReviewStatus(activePopup.nodeUuid, newStatus);
        }
        handleClosePopup();
    }, [activePopup.nodeUuid, onConfirmReviewStatus, handleClosePopup]);

    const handleConfirmRemark = useCallback((content: string) => {
        if (activePopup.nodeUuid) {
            onConfirmRemark(activePopup.nodeUuid, content);
        }
    }, [activePopup.nodeUuid, onConfirmRemark]);

    const handleConfirmScore = useCallback((scoreInfo: ScoreInfo) => {
        if (activePopup.nodeUuid) {
            onConfirmScore(activePopup.nodeUuid, scoreInfo);
        }
        handleClosePopup();
    }, [activePopup.nodeUuid, onConfirmScore, handleClosePopup]);


    useEffect(() => {
        if (!contextMenu.isVisible && !canvasContextMenu.isVisible && !activePopup.type) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            if (contextMenu.isVisible || canvasContextMenu.isVisible) {
                 if (!target.closest('.context-menu')) {
                    handleCloseContextMenu();
                    handleCloseCanvasContextMenu();
                }
            }
            if (activePopup.type) {
                const popupClasses: Record<string, string> = {
                    review: '.bulk-review-menu',
                    remark: '.remark-modal',
                    score: '.score-modal'
                };
                if (!target.closest(popupClasses[activePopup.type])) {
                    handleClosePopup();
                }
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenu.isVisible, canvasContextMenu.isVisible, activePopup.type, handleCloseContextMenu, handleCloseCanvasContextMenu, handleClosePopup]);


    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        handleCloseContextMenu();
        handleCloseCanvasContextMenu();
        if (!canvasRef.current) return;

        if (interactionMode === 'scroll') {
            // Scroll Mode: Wheel moves the canvas (Pan)
            // Use negative delta to create natural scrolling direction (scroll down -> move view down -> content moves up)
            // Or standard paper-drag direction. 
            // Standard scroll: Wheel Down (positive deltaY) moves viewport down.
            // If viewport moves down, canvas contents (transform Y) move up (negative).
            // So dy should be -deltaY.
            const panDx = -e.deltaX;
            const panDy = -e.deltaY;

            if (dragState) {
                // If dragging a node, update the drag start pos reference so the node stays under cursor visually
                dragStartPosRef.current.x += panDx;
                dragStartPosRef.current.y += panDy;
            }

            dispatch({ type: 'PAN', payload: { dx: panDx, dy: panDy }});
            
            if (dragState) {
                 // Immediate update for drag visual
                 updateDrag();
            }

        } else {
            // Zoom Mode (Default): Wheel zooms
            if (dragState) {
                // Allow panning while dragging even in zoom mode if needed, 
                // but usually wheel zooms. 
                // To keep consistent with existing behavior, dragging + wheel = pan logic from before?
                // The previous code had `if (dragState) { ... PAN ... } else { ... ZOOM ... }`.
                // We preserve that priority: if dragging, wheel always pans to help move nodes offscreen.
                const panDx = -e.deltaX;
                const panDy = -e.deltaY;

                dragStartPosRef.current.x += panDx;
                dragStartPosRef.current.y += panDy;

                dispatch({ type: 'PAN', payload: { dx: panDx, dy: panDy }});
            } else {
                const sensitivity = 0.0025;
                const scaleAmount = Math.pow(2, -e.deltaY * sensitivity);

                const rect = canvasRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                dispatch({ type: 'ZOOM', payload: { scaleAmount, centerX: mouseX, centerY: mouseY } });
            }
        }
    };

    const startPanning = useCallback((e: React.MouseEvent) => {
        document.body.classList.add('canvas-interaction-no-select');
        dispatch({ type: 'SET_PANNING', payload: { isPanning: true } });
        panStartPos.current = { x: e.clientX, y: e.clientY };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - panStartPos.current.x;
            const dy = moveEvent.clientY - panStartPos.current.y;
            panStartPos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
            dispatch({ type: 'PAN', payload: { dx, dy }});
        };

        const handleMouseUp = () => {
            document.body.classList.remove('canvas-interaction-no-select');
            dispatch({ type: 'SET_PANNING', payload: { isPanning: false } });
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [dispatch]);

    const startBoxSelection = useCallback((e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        document.body.classList.add('canvas-interaction-no-select');
        
        // Convert client coordinates to canvas coordinates relative to the viewport
        // The SelectionBox overlay uses absolute positioning on top of the canvas div
        const rect = canvasRef.current.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        
        dispatch({ type: 'START_SELECTION', payload: { x: startX, y: startY } });

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const currX = moveEvent.clientX - rect.left;
            const currY = moveEvent.clientY - rect.top;
            dispatch({ type: 'UPDATE_SELECTION', payload: { x: currX, y: currY } });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            const finalX = upEvent.clientX - rect.left;
            const finalY = upEvent.clientY - rect.top;
            
            // Calculate selection logic
            const boxLeft = Math.min(startX, finalX);
            const boxTop = Math.min(startY, finalY);
            const boxRight = Math.max(startX, finalX);
            const boxBottom = Math.max(startY, finalY);
            const boxWidth = boxRight - boxLeft;
            const boxHeight = boxBottom - boxTop;

            // Only process if box has significant size (avoid accidental clicks)
            if (boxWidth > 5 || boxHeight > 5) {
                const selectedUuids = new Set<string>();
                
                // Calculate intersection in Canvas Space (transforming box coordinates to world coordinates)
                const { scale, translateX, translateY } = canvasStateRef.current.transform;
                
                // World coordinates of selection box
                const worldLeft = (boxLeft - translateX) / scale;
                const worldTop = (boxTop - translateY) / scale;
                const worldRight = (boxRight - translateX) / scale;
                const worldBottom = (boxBottom - translateY) / scale;

                Object.values(mindMapData.nodes).forEach(node => {
                    if (!node.position || !node.width || !node.height) return;
                    
                    const nodeLeft = node.position.x;
                    const nodeTop = node.position.y;
                    const nodeRight = node.position.x + node.width;
                    const nodeBottom = node.position.y + node.height;

                    // AABB Intersection check
                    if (
                        worldLeft < nodeRight &&
                        worldRight > nodeLeft &&
                        worldTop < nodeBottom &&
                        worldBottom > nodeTop
                    ) {
                        selectedUuids.add(node.uuid!);
                    }
                });
                
                dispatch({ type: 'SET_MULTI_SELECTION', payload: { nodeUuids: selectedUuids } });
            }

            document.body.classList.remove('canvas-interaction-no-select');
            dispatch({ type: 'END_SELECTION' });
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [mindMapData.nodes]);

    const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;

        e.preventDefault();
        e.stopPropagation();

        if (showCanvasContextMenu) {
            dispatch({ type: 'SHOW_CANVAS_CONTEXT_MENU', payload: { x: e.clientX, y: e.clientY } });
        }
    };
    
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;

        if (e.button !== 0) return;

        handleCloseContextMenu();
        handleCloseCanvasContextMenu();

        window.getSelection()?.removeAllRanges();

        // Determine action: Selection or Pan
        if (enableRangeSelection && !isReadOnly && e.shiftKey) {
            startBoxSelection(e);
        } else {
            if (selectedNodeUuid) {
                handleSelectNode(null);
            }
            startPanning(e);
        }
    };
    
    const autoPanLoop = useCallback(() => {
        if (!isDraggingRef.current || (autoPanDirectionRef.current.x === 0 && autoPanDirectionRef.current.y === 0)) {
            autoPanRequestRef.current = null;
            return;
        }
    
        const panDx = -autoPanDirectionRef.current.x * AUTO_PAN_SPEED;
        const panDy = -autoPanDirectionRef.current.y * AUTO_PAN_SPEED;
    
        dragStartPosRef.current.x += panDx;
        dragStartPosRef.current.y += panDy;
    
        dispatch({ type: 'PAN', payload: { dx: panDx, dy: panDy } });
    
        updateDrag();
    
        autoPanRequestRef.current = requestAnimationFrame(autoPanLoop);
    }, [dispatch, updateDrag]);

    
    const handleNodeDragStart = useCallback((nodeUuid: string, e: React.MouseEvent) => {
        if (isReadOnly) return;
    
        document.body.classList.add('canvas-interaction-no-select');
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        let dragHasStarted = false;
        const DRAG_THRESHOLD = 5;
    
        const handleMouseMove = (moveEvent: MouseEvent) => {
            lastMouseEvent.current = moveEvent;
    
            if (!dragHasStarted) {
                const dx = moveEvent.clientX - dragStartPosRef.current.x;
                const dy = moveEvent.clientY - dragStartPosRef.current.y;
                if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
                    return;
                }
                dragHasStarted = true;
                isDraggingRef.current = true;
                dispatch({ type: 'START_DRAG', payload: { 
                    nodeUuid,
                    mindMapData,
                    config: { enableStrictDrag, enableNodeReorder, isDraggable, reorderableNodeTypes }
                }});
            }
    
            if (dragHasStarted && canvasRef.current) {
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const newPanDirection = { x: 0, y: 0 };
    
                const threshold = 100;

                if (moveEvent.clientX < canvasRect.left + threshold) {
                    newPanDirection.x = -1; // Mouse on left, pan canvas right
                } else if (moveEvent.clientX > canvasRect.right - threshold) {
                    newPanDirection.x = 1; // Mouse on right, pan canvas left
                }
    
                if (moveEvent.clientY < canvasRect.top + threshold) {
                    newPanDirection.y = -1; // Mouse on top, pan canvas down
                } else if (moveEvent.clientY > canvasRect.bottom - threshold) {
                    newPanDirection.y = 1; // Mouse on bottom, pan canvas up
                }
    
                autoPanDirectionRef.current = newPanDirection;
    
                if ((newPanDirection.x !== 0 || newPanDirection.y !== 0) && !autoPanRequestRef.current) {
                    autoPanRequestRef.current = requestAnimationFrame(autoPanLoop);
                }
            }

            if (isDraggingRef.current && !animationFrameId.current) {
                animationFrameId.current = requestAnimationFrame(updateDrag);
            }
        };
    
        const handleMouseUp = (upEvent: MouseEvent) => {
            document.body.classList.remove('canvas-interaction-no-select');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
    
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            isDraggingRef.current = false;
    
            if (autoPanRequestRef.current) {
                cancelAnimationFrame(autoPanRequestRef.current);
                autoPanRequestRef.current = null;
            }
            autoPanDirectionRef.current = { x: 0, y: 0 };

            if (dragHasStarted) {
                const { dragState, transform } = canvasStateRef.current;
    
                if (dragState?.dropTarget) {
                    const { nodeUuid: targetUuid, type } = dragState.dropTarget;
                    if (type === 'reparent') {
                        onReparentNode(dragState.nodeUuid, targetUuid);
                    } else if (type === 'reorder-before' || type === 'reorder-after') {
                        onReorderNode(dragState.nodeUuid, targetUuid, type.replace('reorder-', '') as 'before' | 'after');
                    }
                } else if (dragState?.isFreeDrag) {
                    const startNode = mindMapData.nodes[nodeUuid];
                    if (startNode?.position) {
                        const finalDx = (upEvent.clientX - dragStartPosRef.current.x) / transform.scale;
                        const finalDy = (upEvent.clientY - dragStartPosRef.current.y) / transform.scale;
                        const newPosition = {
                            x: startNode.position.x + finalDx,
                            y: startNode.position.y + finalDy
                        };
                        onUpdateNodePosition(nodeUuid, newPosition);
                    }
                }
    
                dispatch({ type: 'END_DRAG' });
            }
        };
    
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    
    }, [isReadOnly, isDraggable, enableStrictDrag, enableNodeReorder, reorderableNodeTypes, mindMapData, onUpdateNodePosition, onReparentNode, onReorderNode, updateDrag, dispatch, autoPanLoop]);

    const handleSelectNode = useCallback((nodeUuid: string | null) => {
        if (!isSearchActive) {
            // Use normal selection logic. If multi-selection is active via Shift/Ctrl logic elsewhere,
            // this might need adjustment, but for simple click:
            dispatch({ type: 'SELECT_NODE', payload: { nodeUuid } });
        }
    }, [isSearchActive]);

    const handleShowTopToolbar = useCallback(() => {
        dispatch({ type: 'SET_TOP_TOOLBAR_VISIBILITY', payload: { isVisible: true } });
    }, [dispatch]);

    const handleShowBottomToolbar = useCallback(() => {
        dispatch({ type: 'SET_TOOLBAR_VISIBILITY', payload: { isVisible: true } });
    }, [dispatch]);
    
    const handleNodeContextMenu = useCallback((nodeUuid: string, e: React.MouseEvent) => {
        if (!showContextMenu) return;
        // FIX: Add explicit type for `node` to resolve property access errors.
        const node: MindMapNodeData | undefined = mindMapData.nodes[nodeUuid];
        if (!node) return;
    
        if (isReadOnly) {
            const isUseCase = node.nodeType === 'USE_CASE';
            const isParentForReview = ['DEMAND', 'MODULE', 'TEST_POINT'].includes(node.nodeType!);
    
            const canExecute = enableReadOnlyUseCaseExecution && isUseCase;
            const canBulkReview = enableBulkReviewContextMenu && isParentForReview;
            const canSingleReview = enableSingleReviewContextMenu && isUseCase;
            
            // If any read-only action is possible, show the context menu.
            if (canExecute || canBulkReview || canSingleReview || enableDefectSubmission) {
                dispatch({ type: 'SELECT_NODE', payload: { nodeUuid } });
                dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { nodeUuid, x: e.clientX, y: e.clientY, isReadOnlyContext: true } });
            }
            return;
        }
    
        // Edit mode logic
        dispatch({ type: 'SELECT_NODE', payload: { nodeUuid } });
        dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { nodeUuid, x: e.clientX, y: e.clientY, isReadOnlyContext: false } });
    }, [showContextMenu, isReadOnly, mindMapData.nodes, enableReadOnlyUseCaseExecution, enableBulkReviewContextMenu, enableSingleReviewContextMenu, enableDefectSubmission, dispatch]);

    const selectedNode: MindMapNodeData | null = selectedNodeUuid ? mindMapData.nodes[selectedNodeUuid] : null;
    const contextMenuNode = contextMenu.nodeUuid ? mindMapData.nodes[contextMenu.nodeUuid] : null;
    
    const isExpandAllDisabled = useMemo(() => {
        // FIX: Add explicit type for `n` to resolve 'unknown' type error.
        return !Object.values(mindMapData.nodes).some((n: MindMapNodeData) => n.isCollapsed);
    }, [mindMapData.nodes]);

    const isCollapseAllDisabled = useMemo(() => {
        // FIX: Add explicit type for `n` to resolve 'unknown' type error.
        return !Object.values(mindMapData.nodes).some((n: MindMapNodeData) => n.parentUuid && !n.isCollapsed);
    }, [mindMapData.nodes]);

    const handleMinimapTransformChange = useCallback((newTransform: Partial<CanvasTransform>) => {
        dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
    }, [dispatch]);

    const activePopupNode = useMemo(() => {
        if (!activePopup.nodeUuid) return null;
        return mindMapData.nodes[activePopup.nodeUuid] ?? null;
    }, [activePopup.nodeUuid, mindMapData.nodes]);

    const pathGenerator = connectorStyle === 'curve' ? generateCurvePath : generateElbowPath;


    return (
        <div 
            className={`mind-map-canvas ${showBackgroundDots ? 'mind-map-canvas--with-dots' : ''}`}
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={handleCanvasContextMenu}
            style={{ 
                cursor: canvasState.isPanning ? 'grabbing' : 'grab',
                backgroundColor: canvasBackgroundColor
            }}
        >
            <div className="top-right-controls">
                {showShortcutsButton && (
                    <button ref={shortcutsButtonRef} className="shortcuts-toggle-button" onClick={handleToggleShortcutsPanel} title="快捷键">
                        <FiCommand /> 快捷键
                    </button>
                )}
                {showReadOnlyToggleButtons && (
                    <ReadOnlyToggle isReadOnly={isReadOnly} onToggleReadOnly={onToggleReadOnly} />
                )}
            </div>

            {showTopToolbar && (
                isTopToolbarVisible ? (
                    <Toolbar
                        canvasState={canvasState}
                        mindMapData={mindMapData}
                        dispatch={dispatch}
                        onUndo={onUndo}
                        onRedo={onRedo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onAddChildNode={onAddChildNode}
                        onAddSiblingNode={onAddSiblingNode}
                        onDeleteNode={onDeleteNode}
                        onSave={onSave}
                        commands={topToolbarCommands}
                        strictMode={strictMode}
                        selectedNode={selectedNode}
                        isReadOnly={isReadOnly}
                        isDirty={isDirty}
                    />
                ) : (
                    <ToolbarHandle position="top" onClick={handleShowTopToolbar} />
                )
            )}

            {toast && onCloseToast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    visible={toast.visible}
                    onClose={onCloseToast}
                />
            )}

            {isSearchActive && (
                <div className="searchbar-container" style={searchbarContainerStyle}>
                    <Searchbar 
                        dispatch={dispatch}
                        searchQuery={searchQuery}
                        searchMatches={searchMatches}
                        currentMatchIndex={currentMatchIndex}
                        mindMapData={mindMapData}
                    />
                </div>
            )}

            {/* Selection Box */}
            {selectionBox && (
                <div
                    className="selection-box"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.currentX),
                        top: Math.min(selectionBox.startY, selectionBox.currentY),
                        width: selectionBox.width,
                        height: selectionBox.height,
                    }}
                />
            )}

            <svg className="mind-map-canvas__svg-layer">
                <g style={{
                    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
                    transition: (canvasState.isPanning || !!dragState) ? 'none' : 'transform 0.3s ease'
                }}>
                    {Array.from(visibleNodeUuids).map(nodeUuid => {
                        const node = mindMapData.nodes[nodeUuid];
                        if (!node || !node.parentUuid || !mindMapData.nodes[node.parentUuid] || node.uuid === dragState?.nodeUuid) {
                            return null;
                        }
                        
                        const isDragged = draggedSubtreeUuids.has(node.uuid!);
                        const d = pathGenerator(mindMapData.nodes[node.parentUuid!], node);
                        const className = `mind-map-canvas__connector ${isDragged ? 'mind-map-canvas__connector--dragging' : ''}`;
                        const dragTransform = isDragged && dragState?.offset ? `translate(${dragState.offset.dx}, ${dragState.offset.dy})` : undefined;

                        if (isDragged) {
                            return (
                                <g key={`${node.parentUuid}-${node.uuid}`} transform={dragTransform}>
                                    <SvgPath d={d} className={className} />
                                </g>
                            );
                        }
                        return (
                            <SvgPath key={`${node.parentUuid}-${node.uuid}`} d={d} className={className} />
                        );
                    })}
                    
                    {(() => {
                        if (!(dragState?.dropTarget?.type === 'reparent' && dragState.offset)) {
                            return null;
                        }
                        const sourceNodeForPreview = mindMapData.nodes[dragState.dropTarget.nodeUuid];
                        const draggedNode = mindMapData.nodes[dragState.nodeUuid];
                        if (!sourceNodeForPreview || !draggedNode) return null;

                        const targetNodeForPreview = {
                            ...draggedNode,
                            position: {
                                x: (draggedNode.position?.x ?? 0) + dragState.offset.dx,
                                y: (draggedNode.position?.y ?? 0) + dragState.offset.dy,
                            },
                        };

                        return (
                            <SvgPath
                                d={pathGenerator(sourceNodeForPreview, targetNodeForPreview as MindMapNodeData)}
                                className="mind-map-canvas__connector mind-map-canvas__connector--preview"
                            />
                        );
                    })()}
                    
                    {dragState?.dropTarget?.type.startsWith('reorder') && (() => {
                        const targetNode = mindMapData.nodes[dragState.dropTarget!.nodeUuid];
                        if (!targetNode || !targetNode.position || typeof targetNode.width === 'undefined' || typeof targetNode.height === 'undefined') return null;

                        const y = dragState.dropTarget!.type === 'reorder-before'
                            ? targetNode.position.y - VERTICAL_SPACING / 4
                            : targetNode.position.y + targetNode.height + VERTICAL_SPACING / 4;
                        
                        const x1 = targetNode.position.x - HORIZONTAL_SPACING / 2;
                        const x2 = targetNode.position.x + targetNode.width + HORIZONTAL_SPACING / 2;
                        
                        return <path d={`M ${x1} ${y} L ${x2} ${y}`} className="mind-map-canvas__reorder-preview-line" />;
                    })()}
                    
                    {Object.values(mindMapData.nodes)
                        // FIX: Add explicit type for `node` to resolve property access on `unknown`.
                        .filter((node: MindMapNodeData) => visibleNodeUuids.has(node.uuid!))
                        // FIX: Add explicit type for `node` to fix multiple 'property does not exist on type 'unknown'' errors.
                        .map((node: MindMapNodeData) => {
                        const isSearchMatch = isSearchActive && searchMatches.includes(node.uuid!);
                        const isCurrentMatch = isSearchMatch && currentMatchIndex !== null && searchMatches[currentMatchIndex] === node.uuid;
                        const descendantCount = node.isCollapsed ? countAllDescendants(mindMapData, node.uuid!) : 0;
                        
                        const dropTarget = dragState?.dropTarget;
                        const isNodeDraggable = isDraggable || enableStrictDrag || enableNodeReorder;
                        const isPossibleReparentTarget = dragState?.reparentTargets?.has(node.uuid!) ?? false;
                        const isValidDropTarget = dropTarget?.nodeUuid === node.uuid && dropTarget.type === 'reparent';
                        
                        const isDragged = draggedSubtreeUuids.has(node.uuid!);
                        const dragTransform = isDragged && dragState?.offset ? `translate(${dragState.offset.dx}, ${dragState.offset.dy})` : undefined;
                        
                        const showReviewStatus = enableReviewStatus && !!node.nodeType && reviewStatusNodeTypes.includes(node.nodeType);
                        const showRemarkIcon = enableNodeRemarks && !!node.nodeType && nodeRemarksNodeTypes.includes(node.nodeType);
                        const showScoreInfo = enableNodeScoring && !!node.nodeType && nodeScoringNodeTypes.includes(node.nodeType);

                        const isMultiSelected = multiSelectedNodeUuids.has(node.uuid!);
                        const isPrimarySelected = selectedNodeUuid === node.uuid;

                        return (
                         <foreignObject
                            key={node.uuid}
                            x={node.position?.x ?? 0}
                            y={node.position?.y ?? 0}
                            width={node.width ?? 1}
                            height={node.height ?? 1}
                            style={{ pointerEvents: 'none', overflow: 'visible' }}
                            transform={dragTransform}
                            data-dragging={isDragged ? 'true' : 'false'}
                         >
                             <div
                                style={{
                                    width: node.width ?? 1,
                                    height: node.height ?? 1,
                                    pointerEvents: 'all',
                                }}
                                data-dragging={isDragged ? 'true' : 'false'}
                            >
                                <MindMapNode
                                    node={node}
                                    isSelected={isPrimarySelected || isMultiSelected}
                                    isBeingDragged={isDragged && !!dragState?.offset}
                                    onSelect={handleSelectNode}
                                    onFinishEditing={onFinishEditing}
                                    onDragStart={handleNodeDragStart}
                                    onReadOnlyPanStart={startPanning}
                                    onUpdateSize={onUpdateNodeSize}
                                    onToggleCollapse={onToggleCollapse}
                                    descendantCount={descendantCount}
                                    showAITag={showAITag}
                                    isReadOnly={isReadOnly}
                                    isDraggable={isNodeDraggable}
                                    isSearchMatch={isSearchMatch}
                                    isCurrentSearchMatch={isCurrentMatch}
                                    searchQuery={searchQuery}
                                    showNodeType={showNodeType}
                                    showPriority={showPriority}
                                    onContextMenu={handleNodeContextMenu}
                                    isPossibleDropTarget={isPossibleReparentTarget}
                                    isValidDropTarget={isValidDropTarget}
                                    isInvalidDropTarget={false}
                                    getNodeBackgroundColor={getNodeBackgroundColor}
                                    showReviewStatus={showReviewStatus}
                                    showRemarkIcon={showRemarkIcon}
                                    showScoreInfo={showScoreInfo}
                                    onOpenReviewContextMenu={handleOpenReviewContextMenu}
                                    onOpenRemarkModal={handleOpenRemarkModal}
                                    onOpenScoreModal={handleOpenScoreModal}
                                    isNewlyAdded={node.uuid === newlyAddedNodeUuid}
                                    onNodeFocused={onNodeFocused}
                                />
                            </div>
                         </foreignObject>
                        );
                    })}
                </g>
            </svg>

            {children}

            {showMinimap && canvasRef.current && (
                <Minimap 
                    nodes={mindMapData.nodes}
                    canvasTransform={transform}
                    canvasRef={canvasRef}
                    isBottomToolbarVisible={isBottomToolbarVisible}
                    onSetTransform={handleMinimapTransformChange}
                />
            )}
            
            {showBottomToolbar && (
                isBottomToolbarVisible ? (
                    <BottomToolbar
                        dispatch={dispatch}
                        canvasState={canvasState}
                        canvasRef={canvasRef}
                        mindMapData={mindMapData}
                        onLayout={onLayout}
                        commands={bottomToolbarCommands}
                        visibleNodeUuids={visibleNodeUuids}
                        isReadOnly={isReadOnly}
                        onToggleReadOnly={onToggleReadOnly}
                        interactionMode={interactionMode}
                        onToggleInteractionMode={() => onSetInteractionMode(interactionMode === 'zoom' ? 'scroll' : 'zoom')}
                        enableInteractionModeSwitch={enableInteractionModeSwitch}
                    />
                ) : (
                    <ToolbarHandle position="bottom" onClick={handleShowBottomToolbar} />
                )
            )}

            {contextMenu.isVisible && contextMenuNode && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    node={contextMenuNode}
                    onClose={handleCloseContextMenu}
                    onAddChildNode={onAddChildNode}
                    onAddSiblingNode={onAddSiblingNode}
                    onDeleteNode={onDeleteNode}
                    onToggleCollapse={onToggleCollapse}
                    onUpdateNodeType={onUpdateNodeType}
                    onUpdateNodePriority={onUpdateNodePriority}
                    isRoot={contextMenuNode.uuid === mindMapData.rootUuid}
                    isReadOnly={isReadOnly}
                    strictMode={strictMode}
                    priorityEditableNodeTypes={priorityEditableNodeTypes}
                    onExecuteUseCase={onExecuteUseCase}
                    onSubmitDefect={onSubmitDefect}
                    enableUseCaseExecution={enableUseCaseExecution}
                    enableDefectSubmission={enableDefectSubmission}
                    isReadOnlyContext={contextMenu.isReadOnlyContext}
                    onOpenReviewContextMenu={handleOpenReviewContextMenu}
                    enableBulkReviewContextMenu={enableBulkReviewContextMenu}
                    enableSingleReviewContextMenu={enableSingleReviewContextMenu}
                    enableNodeCopy={enableNodeCopy}
                    onCopy={handleCopyNodes}
                    canPaste={clipboardSize > 0}
                    onPaste={() => handlePasteToNode(contextMenuNode.uuid!)}
                />
            )}

            {canvasContextMenu.isVisible && (
                <CanvasContextMenu 
                    x={canvasContextMenu.x}
                    y={canvasContextMenu.y}
                    onClose={handleCloseCanvasContextMenu}
                    onExpandAllNodes={onExpandAllNodes}
                    onCollapseAllNodes={onCollapseAllNodes}
                    onExpandToLevel={onExpandToLevel}
                    onCollapseToLevel={onCollapseToLevel}
                    enableExpandCollapseByLevel={enableExpandCollapseByLevel}
                    onFitView={handleFitView}
                    onCenterView={handleCenterView}
                    isExpandAllDisabled={isExpandAllDisabled}
                    isCollapseAllDisabled={isCollapseAllDisabled}
                    selectedNode={selectedNode}
                    onToggleCollapse={onToggleCollapse}
                />
            )}
            
            {isShortcutsPanelVisible && <ShortcutsPanel position={shortcutsPanelPosition} onClose={handleCloseShortcutsPanel} />}

            {activePopup.type === 'review' && activePopupNode && (
                <ReviewMenu
                    x={activePopup.x}
                    y={activePopup.y}
                    node={activePopupNode}
                    onClose={handleClosePopup}
                    onConfirm={handleConfirmReviewStatus}
                    hasUseCases={activePopup.context?.hasUseCases ?? false}
                    nodeType={activePopup.context?.nodeType ?? null}
                />
            )}

            {activePopup.type === 'remark' && activePopupNode && (
                <RemarkModal
                    x={activePopup.x}
                    y={activePopup.y}
                    node={activePopupNode}
                    onClose={handleClosePopup}
                    onConfirm={handleConfirmRemark}
                />
            )}

            {activePopup.type === 'score' && activePopupNode && (
                <ScoreModal
                    x={activePopup.x}
                    y={activePopup.y}
                    node={activePopupNode}
                    onClose={handleClosePopup}
                    onConfirm={handleConfirmScore}
                />
            )}
        </div>
    );
};