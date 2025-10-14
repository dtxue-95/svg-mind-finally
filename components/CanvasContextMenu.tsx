import React from 'react';
import { FiMaximize, FiMinimize, FiCrosshair, FiBox, FiChevronsDown, FiChevronsUp } from 'react-icons/fi';
import { ContextMenuItem } from './ContextMenuItem';
import type { MindMapNodeData, NodeType } from '../types';

interface CanvasContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onExpandAllNodes: () => void;
    onCollapseAllNodes: () => void;
    onExpandToLevel: (nodeTypes: NodeType[]) => void;
    onCollapseToLevel: (nodeTypes: NodeType[]) => void;
    enableExpandCollapseByLevel: boolean;
    onFitView: () => void;
    onCenterView: () => void;
    isExpandAllDisabled: boolean;
    isCollapseAllDisabled: boolean;
    selectedNode: MindMapNodeData | null;
    onToggleCollapse: (nodeUuid: string) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
    x, y, onClose, onExpandAllNodes, onCollapseAllNodes, onFitView, onCenterView, isExpandAllDisabled, isCollapseAllDisabled, selectedNode, onToggleCollapse, onExpandToLevel, onCollapseToLevel, enableExpandCollapseByLevel,
}) => {

    const handleExpandAll = () => { onExpandAllNodes(); onClose(); };
    const handleCollapseAll = () => { onCollapseAllNodes(); onClose(); };
    const handleFitView = () => { onFitView(); onClose(); };
    const handleCenterView = () => { onCenterView(); onClose(); };
    const handleToggleCollapse = () => {
        if (selectedNode?.uuid) {
            onToggleCollapse(selectedNode.uuid);
        }
        onClose();
    };
    const handleExpandToTestPoint = () => { onExpandToLevel(['TEST_POINT']); onClose(); };
    const handleCollapseToModule = () => { onCollapseToLevel(['MODULE']); onClose(); };
    const handleCollapseToTestPoint = () => { onCollapseToLevel(['TEST_POINT']); onClose(); };
    const handleExpandToUseCase = () => { onExpandToLevel(['USE_CASE']); onClose(); };
    const handleCollapseToUseCase = () => { onCollapseToLevel(['USE_CASE']); onClose(); };
    const handleExpandToStep = () => { onExpandToLevel(['STEP']); onClose(); };
    const handleExpandToResult = () => { onExpandAllNodes(); onClose(); };
    const handleCollapseToStepResult = () => { onCollapseToLevel(['STEP']); onClose(); };


    const canToggleCollapse = selectedNode && selectedNode.childNodeList && selectedNode.childNodeList.length > 0;

    const expandSubmenu = (
        <div className="context-menu context-menu--submenu">
            <ul>
                <ContextMenuItem onClick={handleExpandToTestPoint}>
                    展开到测试点
                </ContextMenuItem>
                <ContextMenuItem onClick={handleExpandToUseCase}>
                    展开到用例
                </ContextMenuItem>
                <ContextMenuItem onClick={handleExpandToStep}>
                    展开到步骤
                </ContextMenuItem>
                <ContextMenuItem onClick={handleExpandToResult}>
                    展开到结果
                </ContextMenuItem>
            </ul>
        </div>
    );

    const collapseSubmenu = (
        <div className="context-menu context-menu--submenu">
            <ul>
                <ContextMenuItem onClick={handleCollapseToModule}>
                    按模块收起
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCollapseToTestPoint}>
                    按测试点收起
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCollapseToUseCase}>
                    按用例收起
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCollapseToStepResult}>
                    按步骤/结果收起
                </ContextMenuItem>
            </ul>
        </div>
    );


    return (
        <div className="context-menu" style={{ top: y, left: x }} onContextMenu={(e) => e.preventDefault()}>
            <ul>
                {selectedNode && (
                    <>
                        <ContextMenuItem onClick={handleToggleCollapse} disabled={!canToggleCollapse}>
                            {selectedNode.isCollapsed ? <FiMaximize /> : <FiMinimize />}
                            {selectedNode.isCollapsed ? '展开当前节点' : '收起当前节点'}
                        </ContextMenuItem>
                        <ContextMenuItem isSeparator />
                    </>
                )}
                <ContextMenuItem onClick={handleExpandAll} disabled={isExpandAllDisabled}>
                    <FiMaximize /> 展开所有节点
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCollapseAll} disabled={isCollapseAllDisabled}>
                    <FiMinimize /> 收起所有节点
                </ContextMenuItem>

                {enableExpandCollapseByLevel && !selectedNode && (
                    <>
                        <ContextMenuItem isSeparator />
                        <ContextMenuItem hasSubmenu submenu={expandSubmenu}>
                            <FiChevronsDown /> 按节点类型展开
                        </ContextMenuItem>
                        <ContextMenuItem hasSubmenu submenu={collapseSubmenu}>
                            <FiChevronsUp /> 按节点类型收起
                        </ContextMenuItem>
                    </>
                )}

                <ContextMenuItem isSeparator />
                <ContextMenuItem onClick={handleCenterView}>
                    <FiCrosshair /> 居中
                </ContextMenuItem>
                <ContextMenuItem onClick={handleFitView}>
                    <FiBox /> 适应视图
                </ContextMenuItem>
            </ul>
        </div>
    );
};