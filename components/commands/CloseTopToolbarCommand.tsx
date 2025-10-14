import React, { useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';

interface CloseTopToolbarCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
}

export const CloseTopToolbarCommand: React.FC<CloseTopToolbarCommandProps> = ({ dispatch }) => {
    const handleClose = useCallback(() => {
        dispatch({ type: 'SET_TOP_TOOLBAR_VISIBILITY', payload: { isVisible: false } });
    }, [dispatch]);

    return (
        <button onClick={handleClose} className="toolbar__close-button" title="关闭工具栏">
            <FiX />
        </button>
    );
};
