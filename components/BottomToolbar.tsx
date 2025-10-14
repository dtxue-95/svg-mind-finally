import React from 'react';
import { FiSearch, FiLayout } from 'react-icons/fi';
import type { CanvasAction } from '../state/canvasReducer';
import type { CanvasState } from '../state/canvasState';
import type { MindMapData, CommandId } from '../types';
import { ZoomInCommand } from './commands/ZoomInCommand';
import { ZoomOutCommand } from './commands/ZoomOutCommand';
import { FitViewCommand } from './commands/FitViewCommand';
import { CenterViewCommand } from './commands/CenterViewCommand';
import { ToggleReadOnlyCommand } from './commands/ToggleReadOnlyCommand';
import { CloseToolbarCommand } from './commands/CloseToolbarCommand';
import { FullscreenCommand } from './commands/FullscreenCommand';

interface BottomToolbarProps {
    dispatch: React.Dispatch<CanvasAction>;
    canvasState: CanvasState;
    canvasRef: React.RefObject<HTMLDivElement>;
    mindMapData: MindMapData;
    onLayout: () => void;
    commands: CommandId[];
    visibleNodeUuids: Set<string>;
    isReadOnly: boolean;
    onToggleReadOnly: () => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
    dispatch,
    canvasState,
    canvasRef,
    mindMapData,
    onLayout,
    commands,
    visibleNodeUuids,
    isReadOnly,
    onToggleReadOnly,
}) => {
    const { transform, selectedNodeUuid, isSearchActive } = canvasState;

    const handleToggleSearch = () => {
        dispatch({ type: isSearchActive ? 'STOP_SEARCH' : 'START_SEARCH' });
    };

    const hasCloseButton = commands.includes('closeBottom');
    const mainCommands = commands.filter(c => c !== 'closeBottom');

    const renderCommand = (commandId: CommandId, index: number) => {
        switch (commandId) {
            case 'zoomOut':
                return <ZoomOutCommand key={`${commandId}-${index}`} dispatch={dispatch} canvasRef={canvasRef} currentScale={transform.scale} />;
            case 'zoomDisplay':
                return (
                    <div key={`${commandId}-${index}`} className="bottom-toolbar__zoom-display">
                        {Math.round(transform.scale * 100)}%
                    </div>
                );
            case 'zoomIn':
                return <ZoomInCommand key={`${commandId}-${index}`} dispatch={dispatch} canvasRef={canvasRef} currentScale={transform.scale} />;
            case 'separator':
                return <div key={`${commandId}-${index}`} className="bottom-toolbar__separator" />;
            case 'toggleReadOnly':
                return <ToggleReadOnlyCommand key={`${commandId}-${index}`} onToggle={onToggleReadOnly} isReadOnly={isReadOnly} isActive={!isReadOnly} />;
            case 'fitView':
                return <FitViewCommand key={`${commandId}-${index}`} dispatch={dispatch} canvasRef={canvasRef} mindMapData={mindMapData} visibleNodeUuids={visibleNodeUuids} />;
            case 'centerView':
                return <CenterViewCommand key={`${commandId}-${index}`} dispatch={dispatch} canvasRef={canvasRef} mindMapData={mindMapData} selectedNodeUuid={selectedNodeUuid} currentScale={transform.scale} />;
            case 'layout':
                return <button key={`${commandId}-${index}`} onClick={onLayout} className="bottom-toolbar__button" title="Auto-Layout"><FiLayout /></button>;
            case 'fullscreen':
                return <FullscreenCommand key={`${commandId}-${index}`} canvasElementRef={canvasRef} />;
            case 'search':
                return (
                    <button key={`${commandId}-${index}`} onClick={handleToggleSearch} className={`bottom-toolbar__button ${isSearchActive ? 'bottom-toolbar__button--active' : ''}`} title={isSearchActive ? 'Close Search' : 'Search Nodes'}>
                        <FiSearch />
                    </button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bottom-toolbar">
            {mainCommands.map(renderCommand)}
            {hasCloseButton && <CloseToolbarCommand dispatch={dispatch} />}
        </div>
    );
};