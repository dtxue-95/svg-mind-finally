
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiX, FiSearch, FiChevronRight, FiChevronDown, FiCircle, FiFilter, FiArrowDown, FiCheckCircle, FiClock, FiXCircle, FiAlignLeft } from 'react-icons/fi';
import type { MindMapData, MindMapNodeData, NodeType, NodePriority } from '../types';
import { NODE_TYPE_PROPS, PRIORITY_PROPS } from '../constants';
import { findAllAncestorUuids } from '../utils/findAllDescendantIds';

interface OutlineDrawerProps {
    visible: boolean;
    mindMapData: MindMapData;
    onClose: () => void;
    onNodeClick: (nodeUuid: string) => void;
    currentSelectedNodeUuid: string | null;
}

type SortType = 'default' | 'priority' | 'name';

// Helper for highlighting matched text
const getHighlightedText = (text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;
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

const OutlineTreeNode: React.FC<{
    node: MindMapNodeData;
    allNodes: Record<string, MindMapNodeData>;
    onNodeClick: (nodeUuid: string) => void;
    depth: number;
    searchQuery: string;
    selectedUuid: string | null;
    ancestors: Set<string>;
    typeFilters: Set<NodeType>;
    priorityFilters: Set<NodePriority>;
    sortType: SortType;
}> = ({ node, allNodes, onNodeClick, depth, searchQuery, selectedUuid, ancestors, typeFilters, priorityFilters, sortType }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const itemRef = useRef<HTMLDivElement>(null);
    
    const childrenUuids = node.childNodeList || [];
    const hasChildren = childrenUuids.length > 0;
    const typeProps = NODE_TYPE_PROPS[node.nodeType || 'GENERAL'];
    const priorityProps = node.priorityLevel ? PRIORITY_PROPS[node.priorityLevel] : null;

    // Processed list for sorting
    const sortedChildren = useMemo(() => {
        const list = childrenUuids.map(uuid => allNodes[uuid]).filter(Boolean);
        if (sortType === 'priority') {
            const pMap: Record<string, number> = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
            list.sort((a, b) => {
                const pa = a.priorityLevel ? pMap[a.priorityLevel] ?? 99 : 99;
                const pb = b.priorityLevel ? pMap[b.priorityLevel] ?? 99 : 99;
                return pa - pb;
            });
        } else if (sortType === 'name') {
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return list;
    }, [childrenUuids, allNodes, sortType]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNodeClick(node.uuid!);
    };

    useEffect(() => {
        if (node.uuid && ancestors.has(node.uuid)) {
            setIsExpanded(true);
        }
    }, [ancestors, node.uuid]);

    const isSelected = node.uuid === selectedUuid;

    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isSelected]);

    // Visibility Check (Recursive Path Preservation)
    const visibilityInfo = useMemo(() => {
        const checkMatch = (n: MindMapNodeData): boolean => {
            const matchesQuery = !searchQuery || n.name?.toLowerCase().includes(searchQuery);
            const matchesType = typeFilters.size === 0 || (n.nodeType && typeFilters.has(n.nodeType));
            const matchesPriority = priorityFilters.size === 0 || (priorityFilters.has(n.priorityLevel ?? null));
            
            return !!(matchesQuery && matchesType && matchesPriority);
        };

        const checkHasVisibleDescendant = (n: MindMapNodeData): boolean => {
            return (n.childNodeList || []).some(uuid => {
                const child = allNodes[uuid];
                if (!child) return false;
                return checkMatch(child) || checkHasVisibleDescendant(child);
            });
        };

        const isSelfMatch = checkMatch(node);
        const hasVisibleDescendant = checkHasVisibleDescendant(node);

        return { isVisible: isSelfMatch || hasVisibleDescendant, isSelfMatch };
    }, [node, searchQuery, typeFilters, priorityFilters, allNodes]);

    if (!visibilityInfo.isVisible) return null;

    const renderStatusIcon = () => {
        if (!node.reviewStatusCode) return null;
        switch(node.reviewStatusCode) {
            case 'approved': return <FiCheckCircle className="outline-status-icon approved" title="通过" />;
            case 'rejected': return <FiXCircle className="outline-status-icon rejected" title="未通过" />;
            case 'pending_review': return <FiClock className="outline-status-icon pending" title="待评审" />;
            default: return null;
        }
    };

    return (
        <div className="outline-tree-node">
            <div 
                ref={itemRef}
                className={`outline-tree-node__content ${isSelected ? 'outline-tree-node__content--selected' : ''}`}
                style={{ paddingLeft: `${depth * 14 + 12}px` }}
                onClick={handleClick}
            >
                <div className={`outline-tree-node__toggle ${hasChildren ? '' : 'hidden'}`} onClick={handleToggle}>
                    {hasChildren && (isExpanded ? <FiChevronDown /> : <FiChevronRight />)}
                </div>
                
                <div className="outline-tree-node__icon" style={{ color: typeProps?.color || '#555' }}>
                    <FiCircle fill={typeProps?.backgroundColor || '#eee'} size={6} />
                </div>

                <span className="outline-tree-node__text">
                    {getHighlightedText(node.name || 'Untitled', searchQuery)}
                </span>

                <div className="outline-tree-node__badges">
                    {renderStatusIcon()}
                    {priorityProps && (
                        <span className="outline-priority-badge" style={{ backgroundColor: priorityProps.backgroundColor }}>
                            {node.priorityLevel}
                        </span>
                    )}
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="outline-tree-node__children">
                    {sortedChildren.map(child => (
                        <OutlineTreeNode
                            key={child.uuid}
                            node={child}
                            allNodes={allNodes}
                            onNodeClick={onNodeClick}
                            depth={depth + 1}
                            searchQuery={searchQuery}
                            selectedUuid={selectedUuid}
                            ancestors={ancestors}
                            typeFilters={typeFilters}
                            priorityFilters={priorityFilters}
                            sortType={sortType}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const OutlineDrawer: React.FC<OutlineDrawerProps> = ({ visible, mindMapData, onClose, onNodeClick, currentSelectedNodeUuid }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortType, setSortType] = useState<SortType>('default');
    const [typeFilters, setTypeFilters] = useState<Set<NodeType>>(new Set());
    const [priorityFilters, setPriorityFilters] = useState<Set<NodePriority>>(new Set());
    
    const [width, setWidth] = useState(380);
    const rootNode = mindMapData.nodes[mindMapData.rootUuid];
    const ancestors = useMemo(() => new Set(findAllAncestorUuids(mindMapData, currentSelectedNodeUuid || '')), [currentSelectedNodeUuid, mindMapData]);

    const toggleTypeFilter = (type: NodeType) => {
        const next = new Set(typeFilters);
        next.has(type) ? next.delete(type) : next.add(type);
        setTypeFilters(next);
    };

    const togglePriorityFilter = (p: NodePriority) => {
        const next = new Set(priorityFilters);
        next.has(p) ? next.delete(p) : next.add(p);
        setPriorityFilters(next);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = width;
        const handleMouseMove = (me: MouseEvent) => {
            const newWidth = Math.max(300, Math.min(800, startWidth + (startX - me.clientX)));
            setWidth(newWidth);
        };
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const isFilterActive = typeFilters.size > 0 || priorityFilters.size > 0;

    return (
        <div className={`remark-drawer outline-drawer ${visible ? 'visible' : ''}`} style={{ width: `${width}px`, zIndex: 3005 }}>
            <div className="drawer-resize-handle" onMouseDown={handleMouseDown} />
            
            <div className="remark-drawer__header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiAlignLeft />
                    <h3>大纲视图</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        className={`outline-header-icon ${sortType !== 'default' ? 'active' : ''}`} 
                        title={`当前排序: ${sortType === 'priority' ? '按优先级' : sortType === 'name' ? '按名称' : '默认'}`}
                        onClick={() => setSortType(prev => prev === 'default' ? 'priority' : prev === 'priority' ? 'name' : 'default')}
                    >
                        <FiArrowDown style={{ transform: sortType === 'name' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    <button className="remark-drawer__close-btn" onClick={onClose}><FiX size={20} /></button>
                </div>
            </div>

            <div className="outline-drawer__search-wrapper">
                <div className="outline-drawer__search-bar">
                    <FiSearch className="outline-drawer__search-icon" size={16} />
                    <input 
                        type="text" 
                        placeholder="在树中搜索内容..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                    />
                    <button 
                        className={`outline-filter-toggle ${isFilterOpen || isFilterActive ? 'active' : ''}`} 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                        <FiFilter size={16} />
                    </button>
                </div>

                {isFilterOpen && (
                    <div className="outline-filter-panel">
                        <div className="filter-section">
                            <label>按节点类型过滤</label>
                            <div className="filter-chips">
                                {(['MODULE', 'TEST_POINT', 'USE_CASE'] as NodeType[]).map(t => (
                                    <span key={t} className={`filter-chip ${typeFilters.has(t) ? 'active' : ''}`} onClick={() => toggleTypeFilter(t)}>
                                        {NODE_TYPE_PROPS[t].label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="filter-section">
                            <label>按优先级过滤</label>
                            <div className="filter-chips">
                                {(['P0', 'P1', 'P2', 'P3'] as NodePriority[]).map(p => (
                                    <span key={p || 'none'} className={`filter-chip ${priorityFilters.has(p) ? 'active' : ''}`} onClick={() => togglePriorityFilter(p)}>
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="remark-drawer__content outline-drawer__content" onWheel={e => e.stopPropagation()}>
                {rootNode ? (
                    <OutlineTreeNode 
                        node={rootNode}
                        allNodes={mindMapData.nodes}
                        onNodeClick={onNodeClick}
                        depth={0}
                        searchQuery={searchQuery}
                        selectedUuid={currentSelectedNodeUuid}
                        ancestors={ancestors}
                        typeFilters={typeFilters}
                        priorityFilters={priorityFilters}
                        sortType={sortType}
                    />
                ) : (
                    <div className="outline-drawer__empty">暂无脑图数据</div>
                )}
            </div>
        </div>
    );
};
