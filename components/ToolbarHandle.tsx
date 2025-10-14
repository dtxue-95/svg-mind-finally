import React from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ToolbarHandleProps {
    position: 'top' | 'bottom';
    onClick: () => void;
}

export const ToolbarHandle: React.FC<ToolbarHandleProps> = ({ position, onClick }) => {
    const title = position === 'top' ? '显示顶部工具栏' : '显示底部工具栏';
    const Icon = position === 'top' ? FiChevronDown : FiChevronUp;

    return (
        <button
            className={`toolbar-handle toolbar-handle--${position}`}
            onClick={onClick}
            title={title}
        >
            <Icon />
        </button>
    );
};
