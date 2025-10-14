
import React, { useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';

interface CloseToolbarCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
}

export const CloseToolbarCommand: React.FC<CloseToolbarCommandProps> = ({ dispatch }) => {
    const handleClose = useCallback(() => {
        dispatch({ type: 'SET_TOOLBAR_VISIBILITY', payload: { isVisible: false } });
    }, [dispatch]);

    return (
        <button onClick={handleClose} className="bottom-toolbar__close-button" title="关闭工具栏">
            <FiX />
        </button>
    );
};
