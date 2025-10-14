import React from 'react';
import { FiRotateCw } from 'react-icons/fi';
import { ToolButton } from '../ToolButton';

interface RedoCommandProps {
    onRedo: () => void;
    canRedo: boolean;
    isReadOnly: boolean;
}

export const RedoCommand: React.FC<RedoCommandProps> = ({ onRedo, canRedo, isReadOnly }) => {
    return (
        <ToolButton onClick={onRedo} disabled={!canRedo || isReadOnly} title="重做" label="重做">
            <FiRotateCw />
        </ToolButton>
    );
};
