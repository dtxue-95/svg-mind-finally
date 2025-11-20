import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import type { MindMapNodeData } from '../types';
import { NODE_TYPE_PROPS, PRIORITY_PROPS, MIN_NODE_HEIGHT, MAX_NODE_WIDTH, MIN_NODE_WIDTH } from '../constants';
import { FiClock, FiCheckCircle, FiXCircle, FiMessageSquare, FiStar } from 'react-icons/fi';

interface MindMapNodeProps {
    node: MindMapNodeData;
    isSelected: boolean;
    isBeingDragged: boolean;
    onSelect: (nodeUuid: string) => void;
    onFinishEditing: (nodeUuid: string, name: string, size: { width: number, height: number }, initialSize: { width: number, height: number }, isInitialEdit?: boolean) => void;
    onDragStart: (nodeUuid: string, event: React.MouseEvent) => void;
    onReadOnlyPanStart: (event: React.MouseEvent) => void;
    onUpdateSize: (nodeUuid: string, size: { width: number, height: number }, options?: { layout: boolean }) => void;
    onToggleCollapse: (nodeUuid: string) => void;
    descendantCount: number;
    showAITag: boolean;
    isReadOnly: boolean;
    isDraggable: boolean;
    isSearchMatch: boolean;
    isCurrentSearchMatch: boolean;
    searchQuery: string;
    showNodeType?: boolean;
    showPriority?: boolean;
    onContextMenu: (nodeUuid: string, event: React.MouseEvent) => void;
    isPossibleDropTarget?: boolean;
    isValidDropTarget?: boolean;
    isInvalidDropTarget?: boolean;
    getNodeBackgroundColor?: (node: MindMapNodeData) => string | null | undefined;
    showReviewStatus: boolean;
    showRemarkIcon: boolean;
    showScoreInfo: boolean;
    onOpenReviewContextMenu: (nodeUuid: string, event: React.MouseEvent) => void;
    onOpenRemarkModal: (nodeUuid: string, event: React.MouseEvent) => void;
    onOpenScoreModal: (nodeUuid: string, event: React.MouseEvent) => void;
    isNewlyAdded: boolean;
    onNodeFocused: () => void;
}

const STATUS_COLOR_PROPS: Record<string, { color: string; backgroundColor: string; }> = {
    // 综合通过状态、功能用例执行状态
    pending_execution: { color: '#007aff', backgroundColor: '#e6f0ff' }, // blue 待执行
    passed: { color: '#34c759', backgroundColor: '#eafaf1' }, // green 通过
    not_passed: { color: '#ff3b30', backgroundColor: '#fff0ef' }, // red 未通过
    blocked: { color: '#ff9500', backgroundColor: '#fff7e6' }, // orange 阻塞
    // 接口用例、UI用例执行状态
    not_run: { color: '#8e8e93', backgroundColor: '#f4f4f7' }, // 未运行
    running: { color: '#007aff', backgroundColor: '#e6f0ff' }, // 执行中
    run_successful: { color: '#34c759', backgroundColor: '#eafaf1' }, // 运行成功
    run_exception: { color: '#ff9500', backgroundColor: '#fff7e6' }, // 执行异常
    run_interrupt: { color: '#ff3b30', backgroundColor: '#fff0ef' }, // 执行中断
    run_failed: { color: '#ff3b30', backgroundColor: '#fff0ef' }, // 执行失败
    default: { color: '#8e8e93', backgroundColor: '#f4f4f7' }, // default gray
};

const MindMapNodeComponent: React.FC<MindMapNodeProps> = ({
    node, isSelected, isBeingDragged, onSelect, onFinishEditing, onDragStart, onUpdateSize, showAITag, isReadOnly, isDraggable, isSearchMatch, isCurrentSearchMatch, searchQuery, showNodeType = true, showPriority = true, onReadOnlyPanStart, onToggleCollapse, descendantCount, onContextMenu, isPossibleDropTarget, isValidDropTarget, isInvalidDropTarget, getNodeBackgroundColor, showReviewStatus, showRemarkIcon, showScoreInfo, onOpenReviewContextMenu, onOpenRemarkModal, onOpenScoreModal, isNewlyAdded, onNodeFocused
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name ?? '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);
    const editingStartState = useRef<{name: string, width: number, height: number} | null>(null);
    const isInitialEditRef = useRef(false);

    useEffect(() => {
        setName(node.name ?? '');
    }, [node.name]);
    
    // Unified layout effect for sizing logic
    useLayoutEffect(() => {
        if (!node.uuid || !contentRef.current) return;

        const measureNodeSize = (textToMeasure: string, isLiveEdit: boolean) => {
            const content = contentRef.current!;
            const clone = content.cloneNode(true) as HTMLElement;
            
            // If cloning from an editing state, the DOM has a textarea.
            // We must replace it with a measurable span to get the correct dimensions.
            if (isLiveEdit) {
                const textareaInClone = clone.querySelector('textarea');
                if (textareaInClone) {
                    const textDisplay = document.createElement('div');
                    textDisplay.className = 'mind-map-node__text-wrapper';
                    textDisplay.innerHTML = `<span class="mind-map-node__text"></span>`;
                    (textDisplay.firstChild as HTMLElement).textContent = textToMeasure;
                    textareaInClone.replaceWith(textDisplay);
                }
            } else {
                // When not editing, just update the text of the existing span
                const textElement = clone.querySelector('.mind-map-node__text');
                if (textElement) {
                    textElement.textContent = textToMeasure;
                }
            }

            const textElementInClone = clone.querySelector('.mind-map-node__text');
            if (!textElementInClone) return { width: node.width ?? MIN_NODE_WIDTH, height: node.height ?? MIN_NODE_HEIGHT };
    
            clone.style.position = 'absolute';
            clone.style.visibility = 'hidden';
            clone.style.left = '-9999px';
            clone.style.top = '-9999px';
            clone.style.height = 'auto';
            clone.style.width = 'auto'; // Let it expand freely first
            (textElementInClone as HTMLElement).style.whiteSpace = 'nowrap';
            
            document.body.appendChild(clone);
            
            // Measure natural width and apply constraints
            const naturalWidth = Math.ceil(clone.getBoundingClientRect().width) + 2; // +2 buffer to prevent wrapping last character
            const finalWidth = Math.min(Math.max(naturalWidth, MIN_NODE_WIDTH), MAX_NODE_WIDTH);
            
            // Apply final width and measure height with wrapping
            clone.style.width = `${finalWidth}px`;
            (textElementInClone as HTMLElement).style.whiteSpace = 'normal';
            const finalHeight = Math.max(MIN_NODE_HEIGHT, clone.scrollHeight);
            
            document.body.removeChild(clone);
            return { width: finalWidth, height: finalHeight };
        };
        
        // On initial mount, measure but don't trigger a full layout.
        if (isInitialMount.current) {
            const { width: newWidth, height: newHeight } = measureNodeSize(node.name ?? '', false);
            if (newWidth !== node.width || newHeight !== node.height) {
                onUpdateSize(node.uuid, { width: newWidth, height: newHeight }, { layout: false });
            }
            isInitialMount.current = false;
        } else if (isEditing) {
            // During live editing, resize dynamically without a full layout.
            const { width: newWidth, height: newHeight } = measureNodeSize(name, true);
            if (newWidth !== node.width || newHeight !== node.height) {
                onUpdateSize(node.uuid, { width: newWidth, height: newHeight }, { layout: false });
            }
        } else {
            // This branch handles changes to content (name, tags) when not in edit mode.
            // This will trigger a full re-layout, which is correct for these kinds of changes.
            const { width: newWidth, height: newHeight } = measureNodeSize(node.name ?? '', false);
            if (newWidth !== node.width || newHeight !== node.height) {
                onUpdateSize(node.uuid, { width: newWidth, height: newHeight }, { layout: true });
            }
        }
    }, [node.uuid, node.name, node.width, node.height, node.nodeType, node.priorityLevel, JSON.stringify(node.caseTags), isEditing, name, onUpdateSize]);


    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            const textLength = textarea.value.length;
            textarea.selectionStart = textLength;
            textarea.selectionEnd = textLength;
        }
    }, [isEditing]);
    
    // Effect for auto-editing newly added nodes
    useEffect(() => {
        if (isNewlyAdded && !isReadOnly) {
            isInitialEditRef.current = true; // Mark as initial edit
            editingStartState.current = { name: node.name ?? '', width: node.width!, height: node.height! };
            setIsEditing(true);
            onNodeFocused(); // Notify parent that the node has been "focused"
        }
    }, [isNewlyAdded, isReadOnly, onNodeFocused, node.name, node.width, node.height]);

    // This effect resizes the textarea element itself to show all content.
    const autoResizeTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };
    useEffect(autoResizeTextarea, [isEditing, name]);

    const handleDoubleClick = () => {
        if (isReadOnly || !node.uuid) return;
        editingStartState.current = { name: node.name ?? '', width: node.width!, height: node.height! };
        setIsEditing(true);
        onSelect(node.uuid);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setName(e.target.value);
    };

    const handleBlur = useCallback(() => {
        if(isEditing && node.uuid) {
            setIsEditing(false);
            const newName = name.trim() || 'Central Idea';
            // The `node` prop contains the latest dimensions from the live-editing updates.
            // Using these values "bakes in" the size from the editing session.
            const finalSize = { width: node.width!, height: node.height! };
            
            const startState = editingStartState.current;
            if (!startState) return; // Should not happen

            const textChanged = startState.name !== newName;
            const sizeChanged = startState.width !== finalSize.width || startState.height !== finalSize.height;

            if (textChanged || sizeChanged) {
                 onFinishEditing(node.uuid, newName, finalSize, { width: startState.width, height: startState.height }, isInitialEditRef.current);
            }
            isInitialEditRef.current = false; // Reset initial edit flag
        }
    }, [isEditing, node, name, onFinishEditing]);


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setName(node.name ?? ''); // Revert changes
            setIsEditing(false);
            isInitialEditRef.current = false; // Cancelled edit, so no special handling needed next time
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.ai-ribbon-wrapper') || (e.target as HTMLElement).closest('.node-review-info')) {
          return;
        }
        if (isEditing || !node.uuid) return;
        
        onSelect(node.uuid); // Always allow selection
        
        // Only start pan/drag logic for LEFT clicks (e.button === 0).
        // Right-clicks (e.button === 2) should proceed to the onContextMenu handler.
        if (e.button !== 0) {
            return;
        }

        if (isReadOnly) {
            onReadOnlyPanStart(e);
            return;
        }

        if (!isDraggable) return; // But don't start dragging in non-draggable mode
        
        onDragStart(node.uuid, e);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (node.uuid) {
            onContextMenu(node.uuid, e);
        }
    };

    const handleToggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection, dragging, etc.
        if (node.uuid) {
            onToggleCollapse(node.uuid);
        }
    };

    const getHighlightedText = (text: string, query: string): React.ReactNode => {
        if (!query || !text) {
            return text;
        }
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={i} className="search-highlight">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };


    const typeProps = NODE_TYPE_PROPS[node.nodeType ?? 'GENERAL'];
    const priorityProps = node.priorityLevel ? PRIORITY_PROPS[node.priorityLevel] : null;
    const hasChildren = node.childNodeList && node.childNodeList.length > 0;
    // The root node cannot be collapsed
    const canBeCollapsed = hasChildren && node.parentUuid;


    const nodeClasses = [
        'mind-map-node',
        isSelected ? 'mind-map-node--selected' : '',
        isBeingDragged ? 'mind-map-node--dragging' : '',
        isSearchMatch ? 'mind-map-node--search-match' : '',
        isCurrentSearchMatch ? 'mind-map-node--current-search-match' : '',
        isPossibleDropTarget ? 'mind-map-node--possible-target' : '',
        isValidDropTarget ? 'mind-map-node--drop-target-valid' : '',
        isInvalidDropTarget ? 'mind-map-node--drop-target-invalid' : '',
    ].filter(Boolean).join(' ');

    const customBackgroundColor = getNodeBackgroundColor ? getNodeBackgroundColor(node) : null;
    const contentStyle: React.CSSProperties = {};
    if (customBackgroundColor) {
        contentStyle.backgroundColor = customBackgroundColor;
    }
    const case_props = STATUS_COLOR_PROPS[node.finalTestCaseStatusCode || 'default'] || STATUS_COLOR_PROPS.default;

    // --- Review Info Rendering ---
    const shouldRenderReviewIcons = !!node.id;

    const handleReviewIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection
        if (node.uuid) {
            onOpenReviewContextMenu(node.uuid, e);
        }
    };
    
    const handleRemarkIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection
        if (node.uuid) {
            onOpenRemarkModal(node.uuid, e);
        }
    };

    const handleScoreIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent node selection
        if (node.uuid) {
            onOpenScoreModal(node.uuid, e);
        }
    };

    const renderReviewStatusIcon = () => {
        if (!node.reviewStatusCode) return null;
        switch (node.reviewStatusCode) {
            case 'pending_review':
                return <FiClock className="review-icon review-icon--pending" title={node.reviewStatusName} />;
            case 'approved':
                return <FiCheckCircle className="review-icon review-icon--approved" title={node.reviewStatusName} />;
            case 'rejected':
                return <FiXCircle className="review-icon review-icon--rejected" title={node.reviewStatusName} />;
            default:
                return null;
        }
    };

    const renderRemarkIcon = () => {
        return (
            <div
                className="review-status-icon-wrapper review-status-icon-wrapper--clickable"
                onClick={handleRemarkIconClick}
                title={node.hasRemark ? "查看/添加备注" : "添加备注"}
            >
                <FiMessageSquare className={`review-icon review-icon--remark ${node.hasRemark ? 'active' : ''}`} />
            </div>
        );
    };

    const renderScoreInfo = () => {
        const hasScore = node.hasScore && node.scoreInfo;
        return (
            <div
                className="review-score-container review-status-icon-wrapper--clickable"
                onClick={handleScoreIconClick}
                title={hasScore ? "查看/修改评分" : "添加评分"}
            >
                <FiStar className={`review-icon review-icon--score ${hasScore ? 'active' : ''}`} />
                <span className="review-score-value" style={{ color: hasScore ? undefined : 'transparent' }} aria-hidden={!hasScore}>
                    {hasScore ? node.scoreInfo.scoreValue : '0'}
                </span>
            </div>
        );
    };


    return (
        <div
            className={nodeClasses}
            style={{ zIndex: isEditing ? 10 : 'auto' }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            data-node-uuid={node.uuid}
        >
            {node.generateModeName === 'AI' && showAITag && (
                <div className="ai-ribbon-wrapper">
                    <div className="ai-ribbon-main">AI</div>
                </div>
            )}
            {node.generateModeName === '人工' && showAITag && (
                <div className="manual-ribbon-wrapper">
                    <div className="manual-ribbon-main">人工</div>
                </div>
            )}
            <div className="mind-map-node__content" ref={contentRef} style={contentStyle}>
                {showNodeType && node.nodeType !== 'GENERAL' && node.nodeType !== 'USE_CASE' && (
                    <span 
                        className="node-type-tag" 
                        style={{ 
                            backgroundColor: typeProps.backgroundColor,
                            borderColor: typeProps.borderColor,
                            color: typeProps.color
                        }}
                    >
                        {typeProps.label}
                    </span>
                )}
                {showNodeType && node.nodeType === 'USE_CASE' && (
                    <span
                        key={'function'} 
                        className={`case-type-tag case-type-tag--function`}
                        style={{
                            color: case_props.color,
                            backgroundColor: case_props.backgroundColor,
                        }}
                    >
                        {typeProps.label}
                    </span>
                )}


                {showPriority && priorityProps && node.priorityLevel && (
                    <span
                        className="node-priorityLevel-tag"
                        style={{
                            backgroundColor: priorityProps.backgroundColor,
                            color: priorityProps.color
                        }}
                    >
                        {node.priorityLevel}
                    </span>
                )}

                {node.caseTags && node.caseTags.length > 0 && (
                    <div className="case-type-tag-container">
                        {node.caseTags.map(tag => {
                             let statusCode: string | null | undefined;
                             switch (tag) {
                                 case 'function':
                                     statusCode = node.functionTestCaseStatusCode;
                                     break;
                                 case 'api':
                                     statusCode = node.apiTestCaseStatusCode;
                                     break;
                                 case 'ui':
                                     statusCode = node.uiTestCaseStatusCode;
                                     break;
                                 default:
                                     statusCode = null;
                             }
                             
                             const props = STATUS_COLOR_PROPS[statusCode || 'default'] || STATUS_COLOR_PROPS.default;

                            return (
                                <span
                                    key={tag}
                                    className={`case-type-tag case-type-tag--${tag}`}
                                    style={{
                                        color: props.color,
                                        backgroundColor: props.backgroundColor,
                                    }}
                                >
                                    {tag === 'function' ? '功能' : tag === 'api' ? '接口' : 'UI'}
                                </span>
                            );
                        })}
                    </div>
                )}

                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={name}
                        onChange={handleTextChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="mind-map-node__textarea"
                        rows={1}
                    />
                ) : (
                    <div className="mind-map-node__text-wrapper">
                        <span className="mind-map-node__text">
                             {isSearchMatch ? getHighlightedText(node.name ?? '', searchQuery) : (node.name ?? '')}
                        </span>
                    </div>
                )}

                {shouldRenderReviewIcons && (
                    <div className="node-review-info">
                        {showReviewStatus && (
                            <div
                                className="review-status-icon-wrapper review-status-icon-wrapper--clickable"
                                onClick={handleReviewIconClick}
                                title="修改评审状态"
                            >
                                {renderReviewStatusIcon()}
                            </div>
                        )}
                        {showRemarkIcon && renderRemarkIcon()}
                        {showScoreInfo && renderScoreInfo()}
                    </div>
                )}
            </div>
             {canBeCollapsed && (
                <button
                    className={`node-collapse-toggle ${node.isCollapsed ? 'collapsed' : ''}`}
                    onClick={handleToggleCollapse}
                    title={node.isCollapsed ? '展开' : '收起'}
                >
                   {node.isCollapsed && descendantCount > 0 ? (
                       <>{descendantCount}</>
                   ) : (
                       <div className="node-collapse-toggle-icon" />
                   )}
                </button>
            )}
        </div>
    );
};

export const MindMapNode = React.memo(MindMapNodeComponent);