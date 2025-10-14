import React, { useCallback } from 'react';
import { FiBox } from 'react-icons/fi';
import type { CanvasAction } from '../../state/canvasReducer';
import type { MindMapData, MindMapNodeData } from '../../types';
import * as viewCommands from './viewCommands';

interface FitViewCommandProps {
    dispatch: React.Dispatch<CanvasAction>;
    canvasRef: React.RefObject<HTMLDivElement>;
    mindMapData: MindMapData;
    visibleNodeUuids: Set<string>;
}

export const FitViewCommand: React.FC<FitViewCommandProps> = ({ dispatch, canvasRef, mindMapData, visibleNodeUuids }) => {
    const handleFitView = useCallback(() => {
        if (!canvasRef.current) return;

        // Filter nodes based on visibility
        const visibleNodes: Record<string, MindMapNodeData> = {};
        visibleNodeUuids.forEach(uuid => {
            if (mindMapData.nodes[uuid]) {
                visibleNodes[uuid] = mindMapData.nodes[uuid];
            }
        });

        const newTransform = viewCommands.fitView(
            visibleNodes,
            canvasRef.current.getBoundingClientRect()
        );
        dispatch({ type: 'SET_TRANSFORM', payload: newTransform });
    }, [dispatch, canvasRef, mindMapData.nodes, visibleNodeUuids]);

    return (
        <button onClick={handleFitView} className="bottom-toolbar__button" title="Fit View">
            <FiBox />
        </button>
    );
};