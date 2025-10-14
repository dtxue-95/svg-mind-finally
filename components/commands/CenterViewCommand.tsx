
import React, { useCallback } from 'react';
import { FiCrosshair } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';
import type { MindMapData } from '../../types';
import * as viewCommands from './viewCommands';

interface CenterViewCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
    canvasRef: React.RefObject<HTMLDivElement>;
    mindMapData: MindMapData;
    selectedNodeUuid: string | null;
    currentScale: number;
}

export const CenterViewCommand: React.FC<CenterViewCommandProps> = ({ dispatch, canvasRef, mindMapData, selectedNodeUuid, currentScale }) => {
    const handleCenterView = useCallback(() => {
        if (!canvasRef.current) return;
        
        const nodeUuidToCenter = selectedNodeUuid || mindMapData.rootUuid;

        const newTransform = viewCommands.centerView(
            mindMapData.nodes,
            nodeUuidToCenter,
            canvasRef.current.getBoundingClientRect(),
            currentScale
        );
        dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
    }, [dispatch, canvasRef, mindMapData.nodes, mindMapData.rootUuid, selectedNodeUuid, currentScale]);
    
    return (
        <button onClick={handleCenterView} className="bottom-toolbar__button" title="Center View">
            <FiCrosshair />
        </button>
    );
};