import React from 'react';
import { FiMousePointer, FiMove } from 'react-icons/fi';
import type { InteractionMode } from '../../types';

interface SwitchInteractionModeCommandProps {
    mode: InteractionMode;
    onToggle: () => void;
}

export const SwitchInteractionModeCommand: React.FC<SwitchInteractionModeCommandProps> = ({ mode, onToggle }) => {
    const isZoom = mode === 'zoom';
    return (
        <button
            onClick={onToggle}
            className={`bottom-toolbar__button ${!isZoom ? 'bottom-toolbar__button--active' : ''}`}
            title={isZoom ? "当前：缩放模式 (点击切换为滚动)" : "当前：滚动模式 (点击切换为缩放)"}
        >
            {isZoom ? <FiMousePointer /> : <FiMove />}
        </button>
    );
};