import React, { useCallback } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { ToolButton } from '../ToolButton';
import type { CanvasAction } from '../../state/canvasReducer';

interface DeleteNodeCommandProps {
    onDeleteNode: (nodeUuid: string) => void;
    dispatch: React.Dispatch<CanvasAction>;
    selectedNodeUuid: string | null;
    isRootSelected: boolean;
    isReadOnly: boolean;
}

export const DeleteNodeCommand: React.FC<DeleteNodeCommandProps> = ({ onDeleteNode, dispatch, selectedNodeUuid, isRootSelected, isReadOnly }) => {
    const handleDelete = useCallback(() => {
        if (selectedNodeUuid) {
            onDeleteNode(selectedNodeUuid);
            dispatch({ type: 'SELECT_NODE', payload: { nodeUuid: null } }); // Deselect after deletion
        }
    }, [onDeleteNode, dispatch, selectedNodeUuid]);

    const isDisabled = !selectedNodeUuid || isRootSelected || isReadOnly;

    return (
        <ToolButton onClick={handleDelete} disabled={isDisabled} title="删除节点" label="删除节点">
            <FiTrash2 />
        </ToolButton>
    );
};