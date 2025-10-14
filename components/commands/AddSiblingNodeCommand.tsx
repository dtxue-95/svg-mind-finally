import React, { useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import { ToolButton } from '../ToolButton';
import type { MindMapNodeData } from '../../types';

interface AddSiblingNodeCommandProps {
    onAddSiblingNode: (nodeUuid: string) => void;
    selectedNodeUuid: string | null;
    isRootSelected: boolean;
    isReadOnly: boolean;
    strictMode: boolean;
    selectedNode: MindMapNodeData | null;
}

export const AddSiblingNodeCommand: React.FC<AddSiblingNodeCommandProps> = ({ onAddSiblingNode, selectedNodeUuid, isRootSelected, isReadOnly, strictMode, selectedNode }) => {
    const handleAdd = useCallback(() => {
        if (selectedNodeUuid) {
            onAddSiblingNode(selectedNodeUuid);
        }
    }, [onAddSiblingNode, selectedNodeUuid]);

    let strictModeDisabled = false;
    if (strictMode && selectedNode) {
        // In strict mode, EXPECTED_RESULT nodes cannot have siblings added from them.
        if (selectedNode.nodeType === 'EXPECTED_RESULT') {
            strictModeDisabled = true;
        }
    }

    const isDisabled = !selectedNodeUuid || isRootSelected || isReadOnly || strictModeDisabled;

    return (
        <ToolButton onClick={handleAdd} disabled={isDisabled} title="添加同级节点" label="添加同级节点">
            <FiPlus />
        </ToolButton>
    );
};