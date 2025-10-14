import React from 'react';
import {
    FiPlus, FiTrash2, FiMaximize, FiMinimize, FiChevronsRight, FiEdit, FiPlay,
} from 'react-icons/fi';
import { FaSitemap } from 'react-icons/fa6';
import type { MindMapNodeData, NodeType, NodePriority } from '../types';
import { NODE_TYPE_PROPS, PRIORITY_PROPS } from '../constants';
import { ContextMenuItem } from './ContextMenuItem';


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
    enableUseCaseExecution?: boolean;
    isReadOnlyContext?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x, y, node, onClose, onAddChildNode, onAddSiblingNode, onDeleteNode, onToggleCollapse, onUpdateNodeType, onUpdateNodePriority, isRoot, isReadOnly, strictMode, priorityEditableNodeTypes, onExecuteUseCase, enableUseCaseExecution, isReadOnlyContext
}) => {
    if (!node.uuid) return null;

    // --- Command Handlers ---
    const handleAddChild = () => { onAddChildNode(node.uuid!); onClose(); };
    const handleAddSibling = () => { onAddSiblingNode(node.uuid!); onClose(); };
    const handleDelete = () => { onDeleteNode(node.uuid!); onClose(); };
    const handleToggleCollapse = () => { onToggleCollapse(node.uuid!); onClose(); };
    const handleUpdateNodeType = (type: NodeType) => { onUpdateNodeType(node.uuid!, type); onClose(); };
    const handleUpdatePriority = (priorityLevel: NodePriority) => { onUpdateNodePriority(node.uuid!, priorityLevel); onClose(); };
    const handleExecute = () => { if(onExecuteUseCase) { onExecuteUseCase(node.uuid!); onClose(); } };

    // --- Special render for read-only context ---
    if (isReadOnlyContext) {
        // This is the special read-only menu. We already know the node is a use case.
        // The menu item's disabled state depends only on whether execution is enabled via props.
        return (
            <div className="context-menu" style={{ top: y, left: x }} onContextMenu={(e) => e.preventDefault()}>
                <ul>
                    <ContextMenuItem onClick={handleExecute} disabled={!enableUseCaseExecution}>
                        <FiPlay /> 执行用例
                    </ContextMenuItem>
                </ul>
            </div>
        );
    }

    // --- Disable Logic for full edit-mode menu ---
    const addSiblingDisabled = isRoot || isReadOnly || (strictMode && node.nodeType === 'EXPECTED_RESULT');
    const deleteDisabled = isRoot || isReadOnly;
    const toggleCollapseDisabled = !node.childNodeList || node.childNodeList.length === 0;
    const executeUseCaseDisabled = isReadOnly || !enableUseCaseExecution || !node.id;

    let addChildDisabled = isReadOnly;
    if (strictMode) {
        const type = node.nodeType;
        if (type === 'EXPECTED_RESULT' || type === 'PRECONDITION' || (type === 'STEP' && (node.childNodeList?.length ?? 0) > 0)) {
            addChildDisabled = true;
        }
    }

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
        <div className="context-menu" style={{ top: y, left: x }} onContextMenu={(e) => e.preventDefault()}>
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
                
                {node.nodeType === 'USE_CASE' && (
                    <ContextMenuItem onClick={handleExecute} disabled={executeUseCaseDisabled}>
                        <FiPlay /> 执行用例
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
