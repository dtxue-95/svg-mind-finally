

import React from 'react';
import { FiZoomIn } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';

interface ZoomInCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
    canvasRef: React.RefObject<HTMLDivElement>;
    currentScale: number;
}

export const ZoomInCommand: React.FC<ZoomInCommandProps> = ({ dispatch, canvasRef, currentScale }) => {
    const handleZoomIn = () => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        dispatch({ type: 'ZOOM', payload: { scaleAmount: 1.2, centerX, centerY } });
    };

    const isZoomInDisabled = currentScale >= 4.0;

    return (
        <button
            onClick={handleZoomIn}
            className="bottom-toolbar__button"
            title="Zoom In"
            disabled={isZoomInDisabled}
        >
            <FiZoomIn />
        </button>
    );
};
