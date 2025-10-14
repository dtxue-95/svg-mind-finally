import React from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import { ToolButton } from '../ToolButton';

interface UndoCommandProps {
    onUndo: () => void;
    canUndo: boolean;
    isReadOnly: boolean;
}

export const UndoCommand: React.FC<UndoCommandProps> = ({ onUndo, canUndo, isReadOnly }) => {
    return (
        <ToolButton onClick={onUndo} disabled={!canUndo || isReadOnly} title="撤销" label="撤销">
            <FiRotateCcw />
        </ToolButton>
    );
};
