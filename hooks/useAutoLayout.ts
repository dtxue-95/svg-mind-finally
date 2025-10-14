

import { useCallback } from 'react';
import type { MindMapData, DataChangeCallback } from '../types';
import { autoLayout } from '../utils/autoLayout';
import type { MindMapAction } from '../state/mindMapReducer';
import { OperationType } from '../types';
import { convertDataChangeInfo } from '../utils/callbackDataConverter';

export const useAutoLayout = (
    mindMap: MindMapData,
    dispatch: React.Dispatch<MindMapAction>,
    onDataChange?: DataChangeCallback
) => {
    const triggerAutoLayout = useCallback(() => {
        const laidOutMap = autoLayout(mindMap);
        
        if (onDataChange) {
            const info = {
                operationType: OperationType.LAYOUT,
                timestamp: Date.now(),
                description: 'Auto-layout applied',
                previousData: mindMap,
                currentData: laidOutMap,
            };
            onDataChange(convertDataChangeInfo(info));
        }

        dispatch({ type: 'SET_MIND_MAP', payload: laidOutMap });
    }, [mindMap, dispatch, onDataChange]);

    return { triggerAutoLayout };
};