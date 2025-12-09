
import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiSearch, FiChevronRight, FiChevronDown, FiCircle } from 'react-icons/fi';
import type { MindMapData, MindMapNodeData } from '../types';
import { NODE_TYPE_PROPS } from '../constants';

interface OutlineDrawerProps {
    visible: boolean;
    mindMapData: MindMapData;
    onClose: () => void;
    onNodeClick: (nodeUuid: string) => void;
}

interface TreeNodeProps {
    node: MindMapNodeData;
    allNodes: Record<string, MindMapNodeData>;
    onNodeClick: (nodeUuid: string) => void;
    depth: number;
    searchQuery: string;
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

const OutlineTreeNode: React.FC<TreeNodeProps> = ({ node, allNodes, onNodeClick, depth, searchQuery }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
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
                className="outline-tree-node__content" 
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={handleClick}
            >
                <div 
                    className={`outline-tree-node__toggle ${hasChildren ? '' : 'hidden'}`}
                    onClick={hasChildren ? handleToggle : undefined}
                >
                    {hasChildren && (isExpanded || searchQuery ? <FiChevronDown /> : <FiChevronRight />)}
                </div>
                
                <div className="outline-tree-node__icon" style={{ color: typeProps?.color || '#555' }}>
                    <FiCircle fill={typeProps?.backgroundColor || '#eee'} size={10} />
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
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const OutlineDrawer: React.FC<OutlineDrawerProps> = ({ visible, mindMapData, onClose, onNodeClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const drawerRef = useRef<HTMLDivElement>(null);

    const rootNode = mindMapData.nodes[mindMapData.rootUuid];

    // Isolate native wheel events to prevent canvas zooming/panning
    // React's onWheel is not sufficient because the parent Canvas has a non-passive native listener.
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
                // Ensure the drawer has a shadow since we removed the overlay
                boxShadow: visible ? '-5px 0 25px rgba(0, 0, 0, 0.15)' : 'none',
                // Enable pointer events on the drawer itself
                pointerEvents: visible ? 'all' : 'none' 
            }}
        >
            <div className="remark-drawer__header">
                <h3>大纲</h3>
                <button className="remark-drawer__close-btn" onClick={onClose}>
                    <FiX size={20} />
                </button>
            </div>
            
            <div className="outline-drawer__search">
                <FiSearch className="outline-drawer__search-icon" />
                <input 
                    type="text" 
                    placeholder="搜索大纲..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                />
                {searchQuery && (
                    <button className="outline-drawer__clear-search" onClick={() => setSearchQuery('')}>
                        <FiX size={14} />
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
                    />
                ) : (
                    <div className="outline-drawer__empty">暂无数据</div>
                )}
            </div>
        </div>
    );
};
