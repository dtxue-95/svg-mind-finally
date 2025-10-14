import React, { useCallback } from 'react';
import { FaSitemap } from 'react-icons/fa6';
import { ToolButton } from '../ToolButton';
import type { MindMapNodeData } from '../../types';

interface AddChildNodeCommandProps {
    onAddChildNode: (parentUuid: string) => void;
    selectedNodeUuid: string | null;
    isReadOnly: boolean;
    strictMode: boolean;
    selectedNode: MindMapNodeData | null;
}

export const AddChildNodeCommand: React.FC<AddChildNodeCommandProps> = ({ onAddChildNode, selectedNodeUuid, isReadOnly, strictMode, selectedNode }) => {
    const handleAdd = useCallback(() => {
        if (selectedNodeUuid) {
            onAddChildNode(selectedNodeUuid);
        }
    }, [onAddChildNode, selectedNodeUuid]);

    let strictModeDisabled = false;
    if (strictMode && selectedNode) {
        const type = selectedNode.nodeType;
        // In strict mode, these types cannot have children.
        if (type === 'EXPECTED_RESULT' || type === 'PRECONDITION') {
            strictModeDisabled = true;
        }
        // A STEP node can only have one child in strict mode.
        if (type === 'STEP') {
            if (selectedNode.childNodeList && selectedNode.childNodeList.length > 0) {
                strictModeDisabled = true;
            }
        }
    }

    const isDisabled = !selectedNodeUuid || isReadOnly || strictModeDisabled;

    return (
        <ToolButton onClick={handleAdd} disabled={isDisabled} title="添加子节点" label="添加子节点">
            <FaSitemap />
        </ToolButton>
    );
};
