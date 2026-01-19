
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
    pending_execution: { color: '#007aff', backgroundColor: '#e6f0ff' },
    passed: { color: '#34c759', backgroundColor: '#eafaf1' },
    not_passed: { color: '#ff3b30', backgroundColor: '#fff0ef' },
    blocked: { color: '#ff9500', backgroundColor: '#fff7e6' },
    not_run: { color: '#8e8e93', backgroundColor: '#f4f4f7' },
    running: { color: '#007aff', backgroundColor: '#e6f0ff' },
    run_successful: { color: '#34c759', backgroundColor: '#eafaf1' },
    run_exception: { color: '#ff9500', backgroundColor: '#fff7e6' },
    run_interrupt: { color: '#ff3b30', backgroundColor: '#fff0ef' },
    run_failed: { color: '#ff3b30', backgroundColor: '#fff0ef' },
    default: { color: '#8e8e93', backgroundColor: '#f4f4f7' },
};

const GENERATE_MODE_CONFIG: Record<string, { color: string; textColor: string; }> = {
    'human_generated': { color: '#44c871ab', textColor: 'white' },
    'ai_generated': { color: '#a57bece1', textColor: 'white' },
    'modify_after_ai_generation': { color: '#007affab', textColor: 'white' },
};

const PLACEHOLDER_TEXT = '新分支主题';

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

    /**
     * Optimized Measurement Logic:
     * To prevent height "explosion" during paste, we MUST determine the ideal width first.
     */
    const performMeasurement = useCallback((textToMeasure: string) => {
        if (!contentRef.current) return { width: node.width ?? MIN_NODE_WIDTH, height: node.height ?? MIN_NODE_HEIGHT };

        const content = contentRef.current;
        const effectiveText = textToMeasure.trim() || PLACEHOLDER_TEXT;
        
        // Create a measurement container
        const clone = content.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        clone.style.left = '-9999px';
        clone.style.top = '-9999px';
        clone.style.height = 'auto';
        clone.style.width = 'max-content';
        clone.style.maxWidth = 'none';

        // Prepare the text element inside the clone
        let textElement: HTMLElement;
        const textareaInClone = clone.querySelector('textarea');
        if (textareaInClone) {
            const span = document.createElement('span');
            span.className = 'mind-map-node__text';
            span.textContent = effectiveText;
            textareaInClone.replaceWith(span);
            textElement = span;
        } else {
            textElement = clone.querySelector('.mind-map-node__text') as HTMLElement;
            if (textElement) textElement.textContent = effectiveText;
        }

        if (!textElement) return { width: node.width ?? MIN_NODE_WIDTH, height: node.height ?? MIN_NODE_HEIGHT };

        // Step 1: Measure width with no wrapping (pre-style)
        textElement.style.whiteSpace = 'pre';
        document.body.appendChild(clone);
        
        const naturalWidth = Math.ceil(clone.getBoundingClientRect().width) + 8; // Small buffer for tags
        const finalWidth = Math.min(Math.max(naturalWidth, MIN_NODE_WIDTH), MAX_NODE_WIDTH);
        
        // Step 2: Measure height at the determined width with wrapping
        clone.style.width = `${finalWidth}px`;
        textElement.style.whiteSpace = 'pre-wrap';
        textElement.style.wordBreak = 'break-word';

        const finalHeight = Math.max(MIN_NODE_HEIGHT, clone.scrollHeight);
        document.body.removeChild(clone);

        return { width: finalWidth, height: finalHeight };
    }, [node.uuid]);

    // Single source of truth for node sizing
    useLayoutEffect(() => {
        if (!node.uuid || !contentRef.current) return;

        const { width: newWidth, height: newHeight } = performMeasurement(isEditing ? name : (node.name ?? ''));
        
        const widthDiff = Math.abs(newWidth - (node.width || 0));
        const heightDiff = Math.abs(newHeight - (node.height || 0));

        if (widthDiff > 0.5 || heightDiff > 0.5) {
            // During active editing, update size SILENTLY (layout: false) to keep foreignObject in sync
            // without recalculating the whole tree until the user finishes typing.
            const shouldLayoutTree = !isInitialMount.current && !isEditing;
            onUpdateSize(node.uuid, { width: newWidth, height: newHeight }, { layout: shouldLayoutTree });
        }
        
        isInitialMount.current = false;
    }, [
        node.uuid, node.name, node.width, node.height, node.nodeType, node.priorityLevel,
        JSON.stringify(node.caseTags), isEditing, name, onUpdateSize, node.id,
        node.reviewStatusCode, node.hasRemark, node.hasScore, showReviewStatus,
        showRemarkIcon, showScoreInfo, showAITag, showNodeType, showPriority,
        node.generateModeCode, node.generateModeName, performMeasurement
    ]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            const textLength = textarea.value.length;
            textarea.selectionStart = textLength;
            textarea.selectionEnd = textLength;
        }
    }, [isEditing]);
    
    useEffect(() => {
        if (isNewlyAdded && !isReadOnly && typeof node.width === 'number' && typeof node.height === 'number') {
            isInitialEditRef.current = true;
            editingStartState.current = { name: node.name ?? '', width: node.width, height: node.height };
            setIsEditing(true);
            onNodeFocused(); 
        }
    }, [isNewlyAdded, isReadOnly, onNodeFocused, node.name, node.width, node.height]);

    const handleDoubleClick = () => {
        if (isReadOnly || !node.uuid) return;
        editingStartState.current = { name: node.name ?? '', width: node.width!, height: node.height! };
        setIsEditing(true);
        onSelect(node.uuid);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setName(e.target.value);
        // We let the useLayoutEffect above handle the height adjustment to ensure 
        // node.height and foreignObject height are updated in the same frame.
    };

    const handleBlur = useCallback(() => {
        if(isEditing && node.uuid) {
            setIsEditing(false);
            const newName = name.trim();
            const finalSize = { width: node.width!, height: node.height! };
            const startState = editingStartState.current;
            if (!startState) return; 

            const textChanged = startState.name !== newName;
            const sizeChanged = Math.abs(startState.width - finalSize.width) > 1 || Math.abs(startState.height - finalSize.height) > 1;

            if (textChanged || sizeChanged) {
                 onFinishEditing(node.uuid, newName, finalSize, { width: startState.width, height: startState.height }, isInitialEditRef.current);
            }
            isInitialEditRef.current = false; 
        }
    }, [isEditing, node.uuid, node.width, node.height, name, onFinishEditing]);


    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleBlur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setName(node.name ?? ''); 
            setIsEditing(false);
            isInitialEditRef.current = false; 
        }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.ai-ribbon-wrapper') || (e.target as HTMLElement).closest('.node-review-info')) {
          return;
        }
        if (isEditing || !node.uuid) return;
        
        onSelect(node.uuid); 
        if (e.button !== 0) return;
        if (isReadOnly) {
            onReadOnlyPanStart(e);
            return;
        }
        if (!isDraggable) return; 
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
        e.stopPropagation(); 
        if (node.uuid) {
            onToggleCollapse(node.uuid);
        }
    };

    const getHighlightedText = (text: string, query: string): React.ReactNode => {
        if (!query || !text) return text;
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

    const shouldRenderReviewIcons = !!node.id && (showReviewStatus || showRemarkIcon || showScoreInfo);

    const handleReviewIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.uuid) {
            onSelect(node.uuid); 
            onOpenReviewContextMenu(node.uuid, e);
        }
    };
    
    const handleRemarkIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.uuid) {
            onSelect(node.uuid); 
            onOpenRemarkModal(node.uuid, e);
        }
    };

    const handleScoreIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.uuid) {
            onSelect(node.uuid); 
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

    const generateModeConfig = node.generateModeCode ? GENERATE_MODE_CONFIG[node.generateModeCode] : null;

    return (
        <div
            className={nodeClasses}
            style={{ zIndex: isEditing ? 10 : 'auto' }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            data-node-uuid={node.uuid}
        >
            <div className="mind-map-node__content" ref={contentRef} style={contentStyle}>
                {showAITag && generateModeConfig && (
                    <div className="ai-ribbon-wrapper">
                        <div 
                            className="ai-ribbon-main" 
                            style={{ 
                                backgroundColor: generateModeConfig.color, 
                                color: generateModeConfig.textColor 
                            }}
                            title={node.generateModeName}
                        >
                            {node.generateModeName}
                        </div>
                    </div>
                )}

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
                        placeholder={PLACEHOLDER_TEXT}
                        rows={1}
                        style={{ height: '100%', minHeight: '22px' }}
                    />
                ) : (
                    <div className="mind-map-node__text-wrapper">
                        <span className={`mind-map-node__text ${!node.name ? 'mind-map-node__text--placeholder' : ''}`}>
                             {!node.name 
                                ? PLACEHOLDER_TEXT 
                                : (isSearchMatch ? getHighlightedText(node.name, searchQuery) : node.name)}
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
