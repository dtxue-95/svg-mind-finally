import React from 'react';
import { FiSave } from 'react-icons/fi';
import { ToolButton } from '../ToolButton';

interface SaveCommandProps {
    onSave: () => void;
    isReadOnly: boolean;
    isDirty: boolean;
}

export const SaveCommand: React.FC<SaveCommandProps> = ({ onSave, isReadOnly, isDirty }) => {
    return (
        <ToolButton onClick={onSave} disabled={isReadOnly || !isDirty} title="保存" label="保存">
            <FiSave />
        </ToolButton>
    );
};