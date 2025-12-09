
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiX, FiSearch, FiChevronRight, FiChevronDown, FiCircle } from 'react-icons/fi';
import type { MindMapData, MindMapNodeData } from '../types';
import { NODE_TYPE_PROPS } from '../constants';
import { findAllAncestorUuids } from '../utils/findAllDescendantIds';

interface OutlineDrawerProps {
    visible: boolean;
    mindMapData: MindMapData;
    onClose: () => void;
    onNodeClick: (nodeUuid: string) => void;
    currentSelectedNodeUuid: string | null;
}

interface TreeNodeProps {
    node: MindMapNodeData;
    allNodes: Record<string, MindMapNodeData>;
    onNodeClick: (nodeUuid: string) => void;
    depth: number;
    searchQuery: string;
    selectedUuid: string | null;
    ancestors: Set<string>;
}

// Helper to check if a node or its descendants match the query
const hasMatchingDescendant = (nodeUuid: string, allNodes: Record<string, MindMapNodeData>, query: string): boolean => {
    const node = allNodes[nodeUuid];
    if (!node) return false;
    
    // Check self
    if (node.name?.toLowerCase().includes(query)) return true;
    
    // Check children
    if (node.childNodeList) {
        return node.childNodeList.some(childUuid => hasMatchingDescendant(childUuid, allNodes, query));
    }
    
    return false;
};

// Helper for highlighting matched text
const getHighlightedText = (text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;
    
    // Escape special regex characters in query if needed, but simple split usually works for basic text
    // A simple case-insensitive split
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    
    return (
        <>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="outline-search-match">{part}</span>
                ) : (
                    part
                )
            )}
        </>
    );
};

const OutlineTreeNode: React.FC<TreeNodeProps> = ({ node, allNodes, onNodeClick, depth, searchQuery, selectedUuid, ancestors }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const itemRef = useRef<HTMLDivElement>(null);
    
    const hasChildren = node.childNodeList && node.childNodeList.length > 0;
    const typeProps = NODE_TYPE_PROPS[node.nodeType || 'GENERAL'];
    
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNodeClick(node.uuid!);
    };

    // Auto-expand if in ancestor path of selected node
    useEffect(() => {
        if (node.uuid && ancestors.has(node.uuid)) {
            setIsExpanded(true);
        }
    }, [ancestors, node.uuid]);

    const isSelected = node.uuid === selectedUuid;

    // Auto-scroll if selected, BUT only if not currently visible
    useEffect(() => {
        if (isSelected && itemRef.current) {
            const el = itemRef.current;
            const container = el.closest('.outline-drawer__content');

            if (container) {
                const elRect = el.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();

                // Check if element is fully vertically visible within the container
                // We compare relative to the viewport
                const isVisible = (
                    elRect.top >= containerRect.top &&
                    elRect.bottom <= containerRect.bottom
                );

                if (!isVisible) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                // Fallback if container logic fails
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [isSelected]);

    // Filter Logic:
    // If search query exists, only render if:
    // 1. Self matches
    // 2. OR a descendant matches (so we can see the path to the match)
    const matchesSelf = node.name?.toLowerCase().includes(searchQuery);
    const matchesDescendant = hasChildren && node.childNodeList!.some(childUuid => hasMatchingDescendant(childUuid, allNodes, searchQuery));

    if (searchQuery && !matchesSelf && !matchesDescendant) {
        return null;
    }

    return (
        <div className="outline-tree-node">
            <div 
                ref={itemRef}
                className={`outline-tree-node__content ${isSelected ? 'outline-tree-node__content--selected' : ''}`}
                // Compact indentation: Reduced base padding and step size (12px instead of 16px)
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={handleClick}
            >
                <div 
                    className={`outline-tree-node__toggle ${hasChildren ? '' : 'hidden'}`}
                    onClick={hasChildren ? handleToggle : undefined}
                >
                    {hasChildren && (isExpanded || searchQuery ? <FiChevronDown /> : <FiChevronRight />)}
                </div>
                
                <div className="outline-tree-node__icon" style={{ color: typeProps?.color || '#555' }}>
                    <FiCircle fill={typeProps?.backgroundColor || '#eee'} size={8} />
                </div>

                <span className="outline-tree-node__text">
                    {getHighlightedText(node.name || 'Untitled', searchQuery)}
                </span>
            </div>

            {hasChildren && (isExpanded || searchQuery) && (
                <div className="outline-tree-node__children">
                    {node.childNodeList!.map(childUuid => {
                        const childNode = allNodes[childUuid];
                        if (!childNode) return null;
                        return (
                            <OutlineTreeNode
                                key={childUuid}
                                node={childNode}
                                allNodes={allNodes}
                                onNodeClick={onNodeClick}
                                depth={depth + 1}
                                searchQuery={searchQuery}
                                selectedUuid={selectedUuid}
                                ancestors={ancestors}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const OutlineDrawer: React.FC<OutlineDrawerProps> = ({ visible, mindMapData, onClose, onNodeClick, currentSelectedNodeUuid }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const drawerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(320); // Reduced default width

    const rootNode = mindMapData.nodes[mindMapData.rootUuid];

    // Calculate ancestors for auto-expansion
    const ancestors = useMemo(() => {
        if (!currentSelectedNodeUuid) return new Set<string>();
        return new Set(findAllAncestorUuids(mindMapData, currentSelectedNodeUuid));
    }, [currentSelectedNodeUuid, mindMapData]);

    // Isolate native wheel events to prevent canvas zooming/panning
    useEffect(() => {
        const drawer = drawerRef.current;
        if (!drawer) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.stopPropagation();
        };

        // Attach native listener to stop propagation to the parent canvas
        drawer.addEventListener('wheel', handleNativeWheel, { passive: false });

        return () => {
            drawer.removeEventListener('wheel', handleNativeWheel);
        };
    }, []);

    // Stop propagation for React synthetic events to prevent canvas interaction (drag/select)
    const stopPropagation = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    // Resizing Logic (Closure-based to prevent stale references)
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        
        const startX = e.clientX;
        const startWidth = width;
        
        document.body.style.cursor = 'ew-resize';
        document.body.classList.add('canvas-interaction-no-select');

        // Check button state to prevent sticky drag
        const checkButtons = (e: MouseEvent) => {
             if (e.buttons === 0) {
                 cleanup();
                 return false;
             }
             return true;
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!checkButtons(moveEvent)) return;

            moveEvent.preventDefault();
            const deltaX = startX - moveEvent.clientX; // Dragging left increases width (right-anchored drawer)
            const newWidth = Math.max(250, Math.min(window.innerWidth - 50, startWidth + deltaX));
            setWidth(newWidth);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            cleanup();
        };

        const cleanup = () => {
            document.body.style.cursor = '';
            document.body.classList.remove('canvas-interaction-no-select');
            
            window.removeEventListener('mousemove', handleMouseMove, { capture: true });
            window.removeEventListener('mouseup', handleMouseUp, { capture: true });
        };

        // Use capture phase to ensure we get the event before any stopPropagation in children could block it
        window.addEventListener('mousemove', handleMouseMove, { capture: true });
        window.addEventListener('mouseup', handleMouseUp, { capture: true });
    };

    return (
        <div 
            ref={drawerRef}
            className={`remark-drawer outline-drawer ${visible ? 'visible' : ''}`}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
            style={{ 
                width: `${width}px`,
                boxShadow: visible ? '-5px 0 25px rgba(0, 0, 0, 0.15)' : 'none',
                pointerEvents: visible ? 'all' : 'none' 
            }}
        >
            {/* Resize Handle */}
            <div className="drawer-resize-handle" onMouseDown={handleMouseDown} />

            <div className="remark-drawer__header">
                <h3>大纲</h3>
                <button className="remark-drawer__close-btn" onClick={onClose}>
                    <FiX size={18} />
                </button>
            </div>
            
            <div className="outline-drawer__search">
                <FiSearch className="outline-drawer__search-icon" size={14} />
                <input 
                    type="text" 
                    placeholder="搜索大纲..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                />
                {searchQuery && (
                    <button className="outline-drawer__clear-search" onClick={() => setSearchQuery('')}>
                        <FiX size={12} />
                    </button>
                )}
            </div>

            <div className="remark-drawer__content outline-drawer__content">
                {rootNode ? (
                    <OutlineTreeNode 
                        node={rootNode}
                        allNodes={mindMapData.nodes}
                        onNodeClick={onNodeClick}
                        depth={0}
                        searchQuery={searchQuery}
                        selectedUuid={currentSelectedNodeUuid}
                        ancestors={ancestors}
                    />
                ) : (
                    <div className="outline-drawer__empty">暂无数据</div>
                )}
            </div>
        </div>
    );
};
