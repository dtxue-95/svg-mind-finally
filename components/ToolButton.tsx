import React from 'react';

export const ToolButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    title: string;
    label: string;
    children: React.ReactNode;
}> = ({ onClick, disabled, title, label, children }) => (
    <button onClick={onClick} disabled={disabled} title={title} className="toolbar__button">
        {children}
        <span>{label}</span>
    </button>
);
