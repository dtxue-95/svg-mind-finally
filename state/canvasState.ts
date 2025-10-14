import type { CanvasTransform, MindMapNodeData, NodeType } from '../types';

export interface CanvasContextMenu {
    isVisible: boolean;
    x: number;
    y: number;
    nodeUuid: string | null;
    isReadOnlyContext?: boolean;
}

export interface CanvasBackgroundContextMenuState {
    isVisible: boolean;
    x: number;
    y: number;
}

export interface DragState {
    nodeUuid: string;
    isFreeDrag: boolean;
    // For reparenting
    reparentTargets: Set<string> | null;
    // For reordering
    reorderSiblings: Set<string> | null;
    // Visual offset of the dragged node
    offset: { dx: number; dy: number; };
    // The final identified target
    dropTarget: {
        nodeUuid: string;
        type: 'reparent' | 'reorder-before' | 'reorder-after';
    } | null;
}

export interface CanvasState {
    transform: CanvasTransform;
    selectedNodeUuid: string | null;
    isPanning: boolean;
    isBottomToolbarVisible: boolean;
    isTopToolbarVisible: boolean;
    isSearchActive: boolean;
    searchQuery: string;
    searchMatches: string[];
    currentMatchIndex: number | null;
    contextMenu: CanvasContextMenu;
    canvasContextMenu: CanvasBackgroundContextMenuState;
    dragState: DragState | null;
}

export const getInitialCanvasState = (rootUuid: string, options: {
    showTopToolbar?: boolean;
    showBottomToolbar?: boolean;
} = {}): CanvasState => ({
    transform: {
        scale: 1,
        translateX: 0,
        translateY: 0,
    },
    selectedNodeUuid: rootUuid,
    isPanning: false,
    isBottomToolbarVisible: options.showBottomToolbar ?? true,
    isTopToolbarVisible: options.showTopToolbar ?? true,
    isSearchActive: false,
    searchQuery: '',
    searchMatches: [],
    currentMatchIndex: null,
    contextMenu: {
        isVisible: false,
        x: 0,
        y: 0,
        nodeUuid: null,
        isReadOnlyContext: false,
    },
    canvasContextMenu: {
        isVisible: false,
        x: 0,
        y: 0,
    },
    dragState: null,
});