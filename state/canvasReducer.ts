

import type { CanvasState, DragState } from './canvasState';
import type { CanvasTransform, MindMapData, MindMapNodeData, NodeType } from '../types';

export type CanvasAction =
    | { type: 'SET_TRANSFORM'; payload: Partial<CanvasTransform> }
    | { type: 'ZOOM'; payload: { scaleAmount: number; centerX: number; centerY: number } }
    | { type: 'PAN'; payload: { dx: number; dy: number } }
    | { type: 'SELECT_NODE'; payload: { nodeUuid: string | null } }
    | { type: 'SET_PANNING'; payload: { isPanning: boolean } }
    | { type: 'SET_TOOLBAR_VISIBILITY'; payload: { isVisible: boolean } }
    | { type: 'SET_TOP_TOOLBAR_VISIBILITY'; payload: { isVisible: boolean } }
    | { type: 'START_SEARCH' }
    | { type: 'STOP_SEARCH' }
    | { type: 'SET_SEARCH_QUERY'; payload: { query: string; nodes: Record<string, MindMapNodeData> } }
    | { type: 'GO_TO_NEXT_MATCH' }
    | { type: 'GO_TO_PREVIOUS_MATCH' }
    | { type: 'SHOW_CONTEXT_MENU'; payload: { nodeUuid: string; x: number; y: number; isReadOnlyContext?: boolean } }
    | { type: 'HIDE_CONTEXT_MENU' }
    | { type: 'SHOW_CANVAS_CONTEXT_MENU'; payload: { x: number; y: number } }
    | { type: 'HIDE_CANVAS_CONTEXT_MENU' }
    // Drag & Drop Actions
    | { type: 'START_DRAG'; payload: { nodeUuid: string, mindMapData: MindMapData, config: { enableStrictDrag: boolean, enableNodeReorder: boolean, isDraggable: boolean, reorderableNodeTypes?: NodeType[] } } }
    | { type: 'DRAG_MOVE'; payload: { offset: { dx: number; dy: number }, canvasPosition: { x: number, y: number }, allNodes: Record<string, MindMapNodeData>, visibleNodeUuids: Set<string> } }
    | { type: 'END_DRAG' };


export const canvasReducer = (state: CanvasState, action: CanvasAction): CanvasState => {
    switch (action.type) {
        case 'SET_TRANSFORM':
            return {
                ...state,
                transform: { ...state.transform, ...action.payload },
            };
        case 'ZOOM': {
            const { scaleAmount, centerX, centerY } = action.payload;

            const prospectiveScale = state.transform.scale * scaleAmount;
            // Clamp the scale between 10% (0.1) and 400% (4.0)
            const newScale = Math.max(0.1, Math.min(prospectiveScale, 4.0));

            // If scale is at the limit and we're trying to go further, do nothing.
            if (newScale === state.transform.scale) {
                return state;
            }

            // Calculate the actual scale change to adjust translation correctly
            const effectiveScaleAmount = newScale / state.transform.scale;

            const newTranslateX = centerX - (centerX - state.transform.translateX) * effectiveScaleAmount;
            const newTranslateY = centerY - (centerY - state.transform.translateY) * effectiveScaleAmount;
            
            return {
                ...state,
                transform: {
                    ...state.transform,
                    scale: newScale,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                },
            };
        }
        case 'PAN': {
            const { dx, dy } = action.payload;
            return {
                ...state,
                transform: {
                    ...state.transform,
                    translateX: state.transform.translateX + dx,
                    translateY: state.transform.translateY + dy,
                },
            };
        }
        case 'SELECT_NODE':
            return { ...state, selectedNodeUuid: action.payload.nodeUuid };
        case 'SET_PANNING':
            return { ...state, isPanning: action.payload.isPanning };
        case 'SET_TOOLBAR_VISIBILITY':
            return { ...state, isBottomToolbarVisible: action.payload.isVisible };
        case 'SET_TOP_TOOLBAR_VISIBILITY':
            return { ...state, isTopToolbarVisible: action.payload.isVisible };
        case 'START_SEARCH':
            return { ...state, isSearchActive: true, selectedNodeUuid: null };
        case 'STOP_SEARCH':
            return { ...state, isSearchActive: false, searchQuery: '', searchMatches: [], currentMatchIndex: null };
        case 'SET_SEARCH_QUERY': {
            const { query, nodes } = action.payload;
            const lowerCaseQuery = query.toLowerCase();
            
            if (!lowerCaseQuery) {
                return { ...state, searchQuery: query, searchMatches: [], currentMatchIndex: null };
            }

            const matches = Object.values(nodes)
                .filter(node => node.name?.toLowerCase().includes(lowerCaseQuery))
                .map(node => node.uuid!);
            
            return { 
                ...state, 
                searchQuery: query, 
                searchMatches: matches, 
                currentMatchIndex: matches.length > 0 ? 0 : null 
            };
        }
        case 'GO_TO_NEXT_MATCH': {
            if (state.searchMatches.length === 0 || state.currentMatchIndex === null) return state;
            const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
            return { ...state, currentMatchIndex: nextIndex };
        }
        case 'GO_TO_PREVIOUS_MATCH': {
            if (state.searchMatches.length === 0 || state.currentMatchIndex === null) return state;
            const prevIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
            return { ...state, currentMatchIndex: prevIndex };
        }
        case 'SHOW_CONTEXT_MENU':
            return { 
                ...state,
                contextMenu: { isVisible: true, ...action.payload },
                canvasContextMenu: { ...state.canvasContextMenu, isVisible: false },
            };
        case 'HIDE_CONTEXT_MENU':
            return { ...state, contextMenu: { ...state.contextMenu, isVisible: false } };
        case 'SHOW_CANVAS_CONTEXT_MENU':
            return {
                ...state,
                canvasContextMenu: { isVisible: true, ...action.payload },
                contextMenu: { ...state.contextMenu, isVisible: false },
            };
        case 'HIDE_CANVAS_CONTEXT_MENU':
            return { ...state, canvasContextMenu: { ...state.canvasContextMenu, isVisible: false } };
        
        // Drag & Drop
        case 'START_DRAG': {
            const { nodeUuid, mindMapData, config } = action.payload;
            const draggedNode = mindMapData.nodes[nodeUuid];
            if (!draggedNode) return state;
            
            const reorderableTypes = config.reorderableNodeTypes ?? [];
            
            let reparentTargets: Set<string> | null = null;
            if (config.enableStrictDrag && reorderableTypes.includes(draggedNode.nodeType!)) {
                let validTargetTypes: NodeType[] = [];
                if (draggedNode.nodeType === 'TEST_POINT') validTargetTypes.push('MODULE');
                else if (draggedNode.nodeType === 'USE_CASE') validTargetTypes.push('TEST_POINT');
                else if (draggedNode.nodeType === 'STEP') validTargetTypes.push('USE_CASE');

                if (validTargetTypes.length > 0) {
                    reparentTargets = new Set(Object.values(mindMapData.nodes)
                        .filter(n => validTargetTypes.includes(n.nodeType!) && n.uuid !== nodeUuid)
                        .map(n => n.uuid!));
                }
            }
            
            let reorderSiblings: Set<string> | null = null;
            if (config.enableNodeReorder) {
                if (draggedNode.parentUuid && reorderableTypes.includes(draggedNode.nodeType!)) {
                    const parent = mindMapData.nodes[draggedNode.parentUuid];
                    if (parent && parent.childNodeList) {
                        reorderSiblings = new Set(parent.childNodeList.filter(uuid => uuid !== nodeUuid));
                    }
                }
            }

            const isFreeDrag = config.isDraggable && !reparentTargets && !reorderSiblings;
            
            // If the node cannot be dragged in any way, abort the drag start.
            if (!isFreeDrag && !reparentTargets && !reorderSiblings) {
                return state;
            }
            
            const newDragState: DragState = {
                nodeUuid,
                isFreeDrag,
                reparentTargets,
                reorderSiblings,
                offset: { dx: 0, dy: 0 },
                dropTarget: null,
            };

            return { ...state, dragState: newDragState };
        }

        case 'DRAG_MOVE': {
            if (!state.dragState) return state;
            const { offset, canvasPosition, allNodes, visibleNodeUuids } = action.payload;

            const { nodeUuid: draggedNodeUuid, reparentTargets, reorderSiblings } = state.dragState;
            const draggedNode = allNodes[draggedNodeUuid];
            if (!draggedNode?.position || typeof draggedNode.width !== 'number' || typeof draggedNode.height !== 'number') {
                return state;
            }
            
            let bestTarget: DragState['dropTarget'] = null;
            
            // 1. Check for reorder targets first (mouse hover is more specific)
            if (reorderSiblings) {
                for (const targetUuid of reorderSiblings) {
                    if (!visibleNodeUuids.has(targetUuid)) continue;
                    const targetNode = allNodes[targetUuid];
                    if (!targetNode?.position || typeof targetNode.width !== 'number' || typeof targetNode.height !== 'number') {
                        continue;
                    }

                    // Convert target node's bounds to screen coordinates to check against mouse position
                    const transformedX = (targetNode.position.x * state.transform.scale) + state.transform.translateX;
                    const transformedY = (targetNode.position.y * state.transform.scale) + state.transform.translateY;
                    const transformedWidth = targetNode.width * state.transform.scale;
                    const transformedHeight = targetNode.height * state.transform.scale;

                    // Check if mouse is over the target sibling
                    if (canvasPosition.x >= transformedX && canvasPosition.x <= transformedX + transformedWidth &&
                        canvasPosition.y >= transformedY && canvasPosition.y <= transformedY + transformedHeight) {
                        
                        const targetCenterY = transformedY + transformedHeight / 2;
                        const position: 'before' | 'after' = canvasPosition.y < targetCenterY ? 'before' : 'after';
                        
                        bestTarget = { nodeUuid: targetUuid, type: `reorder-${position}` };
                        break; // Found a reorder target, stop checking
                    }
                }
            }

            // 2. If no reorder target, check for reparent targets using collision
            if (!bestTarget && reparentTargets) {
                // Dragged node's current bounding box in world coordinates
                const draggedRect = {
                    x: draggedNode.position.x + offset.dx,
                    y: draggedNode.position.y + offset.dy,
                    width: draggedNode.width,
                    height: draggedNode.height,
                };
                
                for (const targetUuid of reparentTargets) {
                    if (!visibleNodeUuids.has(targetUuid)) continue;
                    
                    const targetNode = allNodes[targetUuid];
                    if (!targetNode?.position || typeof targetNode.width !== 'number' || typeof targetNode.height !== 'number') {
                        continue;
                    }

                    const targetRect = {
                        x: targetNode.position.x,
                        y: targetNode.position.y,
                        width: targetNode.width,
                        height: targetNode.height,
                    };

                    // AABB collision check
                    const isColliding =
                        draggedRect.x < targetRect.x + targetRect.width &&
                        draggedRect.x + draggedRect.width > targetRect.x &&
                        draggedRect.y < targetRect.y + targetRect.height &&
                        draggedRect.y + draggedRect.height > targetRect.y;
                    
                    if (isColliding) {
                        bestTarget = { nodeUuid: targetUuid, type: 'reparent' };
                        break; // Found a colliding reparent target, stop checking
                    }
                }
            }

            return { ...state, dragState: { ...state.dragState, offset, dropTarget: bestTarget } };
        }

        case 'END_DRAG':
            return { ...state, dragState: null };

        default:
            return state;
    }
};