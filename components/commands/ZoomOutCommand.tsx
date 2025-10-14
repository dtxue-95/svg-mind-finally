

import React from 'react';
import { FiZoomOut } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';

interface ZoomOutCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
    canvasRef: React.RefObject<HTMLDivElement>;
    currentScale: number;
}

export const ZoomOutCommand: React.FC<ZoomOutCommandProps> = ({ dispatch, canvasRef, currentScale }) => {
    const handleZoomOut = () => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        dispatch({ type: 'ZOOM', payload: { scaleAmount: 1 / 1.2, centerX, centerY } });
    };

    const isZoomOutDisabled = currentScale <= 0.1;

    return (
        <button
            onClick={handleZoomOut}
            className="bottom-toolbar__button"
            title="Zoom Out"
            disabled={isZoomOutDisabled}
        >
            <FiZoomOut />
        </button>
    );
};
