
import React, { useCallback } from 'react';
import { FiLock, FiUnlock } from 'react-icons/fi';

interface ToggleReadOnlyCommandProps {
    onToggle: () => void;
    isReadOnly: boolean;
    isActive?: boolean;
}

export const ToggleReadOnlyCommand: React.FC<ToggleReadOnlyCommandProps> = ({ onToggle, isReadOnly, isActive }) => {
    const handleToggle = useCallback(() => {
        onToggle();
    }, [onToggle]);
    
    const buttonClasses = ['bottom-toolbar__button'];
    if (isActive) {
        buttonClasses.push('bottom-toolbar__button--active');
    }

    return (
        <button onClick={handleToggle} className={buttonClasses.join(' ')} title={isReadOnly ? 'Enable Editing' : 'Read-Only Mode'}>
            {isReadOnly ? <FiLock /> : <FiUnlock />}
        </button>
    );
};