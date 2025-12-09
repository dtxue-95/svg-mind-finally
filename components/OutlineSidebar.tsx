
import React, { useState, useMemo } from 'react';
import { FiSearch, FiX, FiChevronRight, FiChevronDown, FiDisc } from 'react-icons/fi';
import type { MindMapData, MindMapNodeData } from '../types';
import { NODE_TYPE_PROPS } from '../constants';

interface OutlineSidebarProps {
    visible: boolean;
    mindMapData: MindMapData;
    onClose: () => void;
    onNodeClick: (nodeUuid: string) => void;
}

interface TreeNodeProps {
    node: MindMapNodeData;
    allNodes: Record<string, MindMapNodeData>;
    depth: number;
    onNodeClick: (nodeUuid: string) => void;
    searchQuery: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, allNodes, depth, onNodeClick, searchQuery }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const children = (node.childNodeList || [])
        .map(uuid => allNodes[uuid])
        .filter(Boolean);

    const hasChildren = children.length > 0;

    // Check if this node or any descendant matches the search query
    const matchesSearch = useMemo(() => {
        if (!searchQuery) return true;
        const lowerQuery = searchQuery.toLowerCase();
        
        const selfMatch = (node.name || '').toLowerCase().includes(lowerQuery);
        if (selfMatch) return true;

        // Recursive check for descendants
        const checkDescendants = (n: MindMapNodeData): boolean => {
            if ((n.name || '').toLowerCase().includes(lowerQuery)) return true;
            return (n.childNodeList || []).some(childId => {
                const child = allNodes[childId];
                return child && checkDescendants(child);
            });
        };

        return checkDescendants(node);
    }, [node, allNodes, searchQuery]);

    if (!matchesSearch) return null;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClick = () => {
        if (node.uuid) {
            onNodeClick(node.uuid);
        }
    };

    // Highlight search text
    const renderLabel = () => {
        if (!searchQuery || !(node.name || '').toLowerCase().includes(searchQuery.toLowerCase())) {
            return node.name || 'Untitled';
        }
        
        const parts = (node.name || '').split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => 
                    part.toLowerCase() === searchQuery.toLowerCase() 
                        ? <mark key={i} className="outline-highlight">{part}</mark> 
                        : part
                )}
            </>
        );
    };

    const typeColor = node.nodeType ? NODE_TYPE_PROPS[node.nodeType]?.color : '#666';

    return (
        <div className="outline-node">
            <div 
                className="outline-node__content" 
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={handleClick}
            >
                <div 
                    className={`outline-node__toggle ${!hasChildren ? 'hidden' : ''}`}
                    onClick={hasChildren ? handleToggle : undefined}
                >
                    {hasChildren && (isExpanded ? <FiChevronDown /> : <FiChevronRight />)}
                </div>
                
                <div className="outline-node__icon">
                    <FiDisc style={{ color: typeColor, width: 12, height: 12 }} />
                </div>

                <div className="outline-node__label" title={node.name}>
                    {renderLabel()}
                </div>
            </div>
            
            {hasChildren && isExpanded && (
                <div className="outline-node__children">
                    {children.map(child => (
                        <TreeNode 
                            key={child.uuid} 
                            node={child} 
                            allNodes={allNodes} 
                            depth={depth + 1} 
                            onNodeClick={onNodeClick}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OutlineSidebar: React.FC<OutlineSidebarProps> = ({ visible, mindMapData, onClose, onNodeClick }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const rootNode = mindMapData.nodes[mindMapData.rootUuid];

    return (
        <>
            <div 
                className={`outline-sidebar-overlay ${visible ? 'visible' : ''}`} 
                onClick={onClose}
            />
            <div className={`outline-sidebar ${visible ? 'visible' : ''}`}>
                <div className="outline-sidebar__header">
                    <h3>大纲</h3>
                    <button className="outline-sidebar__close-btn" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="outline-sidebar__search">
                    <FiSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="搜索节点..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-icon" onClick={() => setSearchQuery('')}>
                            <FiX size={14} />
                        </button>
                    )}
                </div>

                <div className="outline-sidebar__content">
                    {rootNode ? (
                        <TreeNode 
                            node={rootNode} 
                            allNodes={mindMapData.nodes} 
                            depth={0} 
                            onNodeClick={onNodeClick}
                            searchQuery={searchQuery}
                        />
                    ) : (
                        <div className="outline-sidebar__empty">暂无数据</div>
                    )}
                </div>
            </div>
        </>
    );
};
