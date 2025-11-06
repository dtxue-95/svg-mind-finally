import React, { useRef } from 'react';
import {
    FiPlus, FiTrash2, FiMaximize, FiMinimize, FiChevronsRight, FiEdit, FiPlay, FiCheckCircle, FiCheckSquare, FiAlertCircle,
} from 'react-icons/fi';
import { FaSitemap } from 'react-icons/fa6';
import type { MindMapNodeData, NodeType, NodePriority } from '../types';
import { NODE_TYPE_PROPS, PRIORITY_PROPS } from '../constants';
import { ContextMenuItem } from './ContextMenuItem';
import { usePopoverPositioning } from '../hooks/usePopoverPositioning';

interface ContextMenuProps {
    x: number;
    y: number;
    node: MindMapNodeData;
    onClose: () => void;
    onAddChildNode: (parentUuid: string) => void;
    onAddSiblingNode: (nodeUuid: string) => void;
    onDeleteNode: (nodeUuid: string) => void;
    onToggleCollapse: (nodeUuid: string) => void;
    onUpdateNodeType: (nodeUuid: string, nodeType: NodeType) => void;
    onUpdateNodePriority: (nodeUuid: string, priorityLevel: NodePriority) => void;
    isRoot: boolean;
    isReadOnly: boolean;
    strictMode: boolean;
    priorityEditableNodeTypes: NodeType[];
    onExecuteUseCase?: (nodeUuid: string) => void;
    onSubmitDefect: (nodeUuid: string) => void;
    enableUseCaseExecution?: boolean;
    enableDefectSubmission: boolean;
    isReadOnlyContext?: boolean;
    onOpenReviewContextMenu: (nodeUuid: string, event: React.MouseEvent) => void;
    enableBulkReviewContextMenu: boolean;
    enableSingleReviewContextMenu: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, node, onClose, onAddChildNode, onAddSiblingNode, onDeleteNode, onToggleCollapse, onUpdateNodeType, onUpdateNodePriority, isRoot, isReadOnly, strictMode, priorityEditableNodeTypes, onExecuteUseCase, onSubmitDefect, enableUseCaseExecution, enableDefectSubmission, isReadOnlyContext, onOpenReviewContextMenu, enableBulkReviewContextMenu, enableSingleReviewContextMenu
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const style = usePopoverPositioning(menuRef, x, y);

    if (!node.uuid) return null;

    // --- Command Handlers ---
    const handleAddChild = () => { onAddChildNode(node.uuid!); onClose(); };
    const handleAddSibling = () => { onAddSiblingNode(node.uuid!); onClose(); };
    const handleDelete = () => { onDeleteNode(node.uuid!); onClose(); };
    const handleToggleCollapse = () => { onToggleCollapse(node.uuid!); onClose(); };
    const handleUpdateNodeType = (type: NodeType) => { onUpdateNodeType(node.uuid!, type); onClose(); };
    const handleUpdatePriority = (priorityLevel: NodePriority) => { onUpdateNodePriority(node.uuid!, priorityLevel); onClose(); };
    const handleExecute = () => { if(onExecuteUseCase) { onExecuteUseCase(node.uuid!); onClose(); } };
    const handleSubmitDefect = () => { onSubmitDefect(node.uuid!); onClose(); };
    const handleOpenReview = (e: React.MouseEvent) => {
        if (node.uuid) {
            onOpenReviewContextMenu(node.uuid, e);
        }
        onClose();
    };

    // --- Special render for read-only context ---
    if (isReadOnlyContext) {
        const isUseCase = node.nodeType === 'USE_CASE';
        const isParentForReview = ['DEMAND', 'MODULE', 'TEST_POINT'].includes(node.nodeType!);
        const canExecute = enableUseCaseExecution && isUseCase;
        const canBulkReview = enableBulkReviewContextMenu && isParentForReview;
        const canSingleReview = enableSingleReviewContextMenu && isUseCase;

        const showSubmitDefect = enableDefectSubmission;
        const submitDefectDisabled = isRoot;

        const hasAnyPreviousActions = canExecute || canBulkReview || canSingleReview;

        return (
            <div ref={menuRef} className="context-menu" style={style} onContextMenu={(e) => e.preventDefault()}>
                <ul>
                    {canBulkReview && <ContextMenuItem onClick={handleOpenReview}><FiCheckCircle /> 一键评审用例</ContextMenuItem>}
                    {canSingleReview && <ContextMenuItem onClick={handleOpenReview}><FiCheckSquare /> 评审用例</ContextMenuItem>}
                    {canExecute && (canBulkReview || canSingleReview) && <ContextMenuItem isSeparator />}
                    {canExecute && <ContextMenuItem onClick={handleExecute}><FiPlay /> 执行用例</ContextMenuItem>}
                    {showSubmitDefect && hasAnyPreviousActions && <ContextMenuItem isSeparator />}
                    {showSubmitDefect && (
                        <ContextMenuItem onClick={handleSubmitDefect} disabled={submitDefectDisabled}>
                            <FiAlertCircle /> 提交缺陷
                        </ContextMenuItem>
                    )}
                </ul>
            </div>
        );
    }

    // --- Disable Logic for full edit-mode menu ---
    const addSiblingDisabled = isRoot || isReadOnly || (strictMode && node.nodeType === 'EXPECTED_RESULT');
    const deleteDisabled = isRoot || isReadOnly;
    const toggleCollapseDisabled = !node.childNodeList || node.childNodeList.length === 0;
    const executeUseCaseDisabled = isReadOnly || !enableUseCaseExecution || !node.id;
    const submitDefectDisabled = isReadOnly || isRoot;

    let addChildDisabled = isReadOnly;
    if (strictMode) {
        const type = node.nodeType;
        if (type === 'EXPECTED_RESULT' || type === 'PRECONDITION' || (type === 'STEP' && (node.childNodeList?.length ?? 0) > 0)) {
            addChildDisabled = true;
        }
    }
    
    // --- Visibility logic for review items ---
    const isParentNode = ['DEMAND', 'MODULE', 'TEST_POINT'].includes(node.nodeType!);
    const isUseCaseNode = node.nodeType === 'USE_CASE';
    const showBulkReview = enableBulkReviewContextMenu && isParentNode;
    const showSingleReview = enableSingleReviewContextMenu && isUseCaseNode;
    const showExecuteUseCase = enableUseCaseExecution && isUseCaseNode;
    const showSubmitDefect = enableDefectSubmission;

    const hasActionBlock = showBulkReview || showSingleReview || showExecuteUseCase || showSubmitDefect;

    // --- Submenu Logic ---
    const isGeneralNode = node.nodeType === 'GENERAL';
    const canEditPriority = !isReadOnly && priorityEditableNodeTypes.includes(node.nodeType!);

    const nodeTypeSubmenu = isGeneralNode && !isReadOnly ? (
        <div className="context-menu context-menu--submenu">
            <ul>
                {Object.entries(NODE_TYPE_PROPS)
                    .filter(([key]) => key !== 'GENERAL' && key !== 'DEMAND')
                    .map(([key, props]) => (
                    <ContextMenuItem key={key} onClick={() => handleUpdateNodeType(key as NodeType)} centerContent={true}>
                        <span className="node-type-tag" style={{ backgroundColor: props.backgroundColor, borderColor: props.borderColor, color: props.color }}>
                            {props.label}
                        </span>
                    </ContextMenuItem>
                ))}
            </ul>
        </div>
    ) : null;

    const prioritySubmenu = canEditPriority ? (
      <div className="context-menu context-menu--submenu">
        <ul>
          {Object.entries(PRIORITY_PROPS).map(([key, props]) => (
            <ContextMenuItem key={key} onClick={() => handleUpdatePriority(key as NodePriority)} centerContent={true}>
                <span 
                    className="node-priorityLevel-tag" 
                    style={{ backgroundColor: props.backgroundColor, color: props.color }}
                >
                    {key}
                </span>
            </ContextMenuItem>
          ))}
          <ContextMenuItem isSeparator />
          <ContextMenuItem onClick={() => handleUpdatePriority(null)}>
            移除
          </ContextMenuItem>
        </ul>
      </div>
    ) : null;


    return (
        <div ref={menuRef} className="context-menu" style={style} onContextMenu={(e) => e.preventDefault()}>
            <ul>
                <ContextMenuItem onClick={handleAddSibling} disabled={addSiblingDisabled}>
                    <FiPlus /> 添加同级节点
                </ContextMenuItem>
                <ContextMenuItem onClick={handleAddChild} disabled={addChildDisabled}>
                    <FaSitemap /> 添加子节点
                </ContextMenuItem>
                
                {isGeneralNode && (
                    <ContextMenuItem onClick={() => {}} hasSubmenu={true} submenu={nodeTypeSubmenu} disabled={isReadOnly}>
                        <FiEdit /> 修改节点类型
                    </ContextMenuItem>
                )}
                
                {canEditPriority && (
                    <ContextMenuItem onClick={() => {}} hasSubmenu={true} submenu={prioritySubmenu} disabled={isReadOnly}>
                        <FiChevronsRight /> {node.priorityLevel ? '修改优先级' : '添加优先级'}
                    </ContextMenuItem>
                )}

                <ContextMenuItem onClick={handleDelete} disabled={deleteDisabled}>
                    <FiTrash2 /> 删除节点
                </ContextMenuItem>
                
                {hasActionBlock && <ContextMenuItem isSeparator />}
                
                {showBulkReview && (
                    <ContextMenuItem onClick={handleOpenReview} disabled={isReadOnly}>
                        <FiCheckCircle /> 一键评审用例
                    </ContextMenuItem>
                )}
                
                {showSingleReview && (
                    <ContextMenuItem onClick={handleOpenReview} disabled={isReadOnly}>
                        <FiCheckSquare /> 评审用例
                    </ContextMenuItem>
                )}

                {showExecuteUseCase && (
                    <ContextMenuItem onClick={handleExecute} disabled={executeUseCaseDisabled}>
                        <FiPlay /> 执行用例
                    </ContextMenuItem>
                )}
                
                {showSubmitDefect && (
                    <ContextMenuItem onClick={handleSubmitDefect} disabled={submitDefectDisabled}>
                        <FiAlertCircle /> 提交缺陷
                    </ContextMenuItem>
                )}
                
                <li className="context-menu__separator" />
                
                <ContextMenuItem onClick={handleToggleCollapse} disabled={toggleCollapseDisabled}>
                    {node.isCollapsed ? <FiMaximize /> : <FiMinimize />}
                    {node.isCollapsed ? '展开当前节点' : '收起当前节点'}
                </ContextMenuItem>
            </ul>
        </div>
    );
};