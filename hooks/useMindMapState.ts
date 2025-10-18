import type { MindMapAction } from '../state/mindMapReducer';
import type { MindMapData } from '../types';

export interface HistoryState {
    past: MindMapData[];
    present: MindMapData;
    future: MindMapData[];
}

export type HistoryAction = 
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'RESET_HISTORY'; payload: MindMapData }
    | { type: 'CLEAR_HISTORY' }
    | { type: 'COMMIT_EDIT'; payload: { stateToArchive: MindMapData; newPresentState: MindMapData } }
    | { type: 'UPDATE_PRESENT_STATE'; payload: MindMapData }
    | MindMapAction;

export const createHistoryReducer = (
    reducer: (state: MindMapData, action: MindMapAction) => MindMapData,
    options: { ignoreActions?: string[] } = {}
) => {
    const ignoreActions = new Set(options.ignoreActions ?? []);

    return (state: HistoryState, action: HistoryAction): HistoryState => {
        const { past, present, future } = state;

        switch (action.type) {
            case 'UNDO':
                if (past.length === 0) return state;
                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);
                return {
                    past: newPast,
                    present: previous,
                    future: [present, ...future],
                };
            case 'REDO':
                if (future.length === 0) return state;
                const next = future[0];
                const newFuture = future.slice(1);
                return {
                    past: [...past, present],
                    present: next,
                    future: newFuture,
                };
            case 'RESET_HISTORY':
                return {
                    past: [],
                    present: action.payload,
                    future: [],
                };
            case 'CLEAR_HISTORY':
                return {
                    past: [],
                    present: present,
                    future: [],
                };
            case 'COMMIT_EDIT':
                return {
                    past: [...past, action.payload.stateToArchive],
                    present: action.payload.newPresentState,
                    future: [],
                };
            case 'UPDATE_PRESENT_STATE':
                if (state.present === action.payload) {
                    return state;
                }
                return {
                    ...state,
                    present: action.payload,
                };
            default: {
                const mindMapAction = action as MindMapAction;
                const newPresent = reducer(present, mindMapAction);

                if (present === newPresent) {
                    return state;
                }

                if (ignoreActions.has(mindMapAction.type)) {
                    // This is a non-historic action. Apply it to all states
                    // so the change persists across undo/redo operations.
                    const newPast = past.map(p => reducer(p, mindMapAction));
                    const newFuture = future.map(f => reducer(f, mindMapAction));
                    
                    return {
                        past: newPast,
                        present: newPresent,
                        future: newFuture,
                    };
                }

                // This is a standard action, so update history
                return {
                    past: [...past, present],
                    present: newPresent,
                    future: [], // Clear future on new action
                };
            }
        }
    };
};