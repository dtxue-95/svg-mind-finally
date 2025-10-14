import React from 'react';
import { UndoCommand } from './commands/UndoCommand';
import { RedoCommand } from './commands/RedoCommand';
import { AddChildNodeCommand } from './commands/AddChildNodeCommand';
import { AddSiblingNodeCommand } from './commands/AddSiblingNodeCommand';
import { DeleteNodeCommand } from './commands/DeleteNodeCommand';
import { CloseTopToolbarCommand } from './commands/CloseTopToolbarCommand';
import { SaveCommand } from './commands/SaveCommand';
import type { MindMapData, CommandId, MindMapNodeData } from '../types';
import type { CanvasState } from '../state/canvasState';
import type { CanvasAction } from '../state/canvasReducer';

interface ToolbarProps {
    canvasState: CanvasState;
    mindMapData: MindMapData;
    dispatch: React.Dispatch<CanvasAction>;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onAddChildNode: (parentUuid: string) => void;
    onAddSiblingNode: (nodeUuid: string) => void;
    onDeleteNode: (nodeUuid: string) => void;
    onSave: () => void;
    commands: CommandId[];
    strictMode: boolean;
    selectedNode: MindMapNodeData | null;
    isReadOnly: boolean;
    isDirty: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    canvasState,
    mindMapData,
    dispatch,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onAddChildNode,
    onAddSiblingNode,
    onDeleteNode,
    onSave,
    commands,
    strictMode,
    selectedNode,
    isReadOnly,
    isDirty,
}) => {
    const { selectedNodeUuid } = canvasState;
    const isRootSelected = selectedNodeUuid === mindMapData.rootUuid;

    const hasCloseButton = commands.includes('closeTop');
    const mainCommands = commands.filter(c => c !== 'closeTop');

    const renderCommand = (commandId: CommandId, index: number) => {
        switch (commandId) {
            case 'undo':
                return <UndoCommand key={`${commandId}-${index}`} onUndo={onUndo} canUndo={canUndo} isReadOnly={isReadOnly} />;
            case 'redo':
                return <RedoCommand key={`${commandId}-${index}`} onRedo={onRedo} canRedo={canRedo} isReadOnly={isReadOnly} />;
            case 'separator':
                return <div key={`${commandId}-${index}`} className="toolbar__separator" />;
            case 'addSibling':
                return <AddSiblingNodeCommand key={`${commandId}-${index}`} onAddSiblingNode={onAddSiblingNode} selectedNodeUuid={selectedNodeUuid} isRootSelected={isRootSelected} isReadOnly={isReadOnly} strictMode={strictMode} selectedNode={selectedNode} />;
            case 'addChild':
                return <AddChildNodeCommand key={`${commandId}-${index}`} onAddChildNode={onAddChildNode} selectedNodeUuid={selectedNodeUuid} isReadOnly={isReadOnly} strictMode={strictMode} selectedNode={selectedNode} />;
            case 'delete':
                return <DeleteNodeCommand key={`${commandId}-${index}`} onDeleteNode={onDeleteNode} dispatch={dispatch} selectedNodeUuid={selectedNodeUuid} isRootSelected={isRootSelected} isReadOnly={isReadOnly} />;
            case 'save':
                return <SaveCommand key={`${commandId}-${index}`} onSave={onSave} isReadOnly={isReadOnly} isDirty={isDirty} />;
            default:
                return null;
        }
    };

    return (
        <div className="toolbar">
            {mainCommands.map(renderCommand)}
            {hasCloseButton && <CloseTopToolbarCommand dispatch={dispatch} />}
        </div>
    );
};