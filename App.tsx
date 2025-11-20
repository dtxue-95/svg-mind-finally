import React, { useImperativeHandle, forwardRef, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useMindMap } from './hooks/useMindMap';
import { MindMapCanvas } from './components/MindMapCanvas';
import type { RawNode, CommandId, NodeType, DataChangeCallback, DataChangeInfo, MindMapData, MindMapNodeData, ReviewStatusCode, ScoreInfo, ConnectorStyle, ValidationConfig } from './types';
import { OperationType } from './types';
import { createInitialMindMap } from './utils/createInitialMindMap';
import { convertDataChangeInfo } from './utils/callbackDataConverter';
import { getNodeChainByUuid } from './utils/dataChangeUtils';
import { validateMindMap } from './utils/validation';

// Export Panel component and types for external use
export { Panel } from './components/Panel';
export type { PanelPosition } from './components/Panel';
export type { RawNode, CommandId, NodeType, DataChangeCallback, DataChangeInfo, MindMapNodeData, ConnectorStyle };
export { OperationType };


const defaultTopCommands: CommandId[] = ['undo', 'redo', 'separator', 'addSibling', 'addChild', 'delete', 'save', 'closeTop'];
const defaultBottomCommands: CommandId[] = ['zoomOut', 'zoomDisplay', 'zoomIn', 'separator', 'toggleReadOnly', 'fitView', 'centerView', 'layout', 'fullscreen', 'search', 'closeBottom'];
const defaultPriorityEditableNodeTypes: NodeType[] = ['MODULE', 'TEST_POINT', 'USE_CASE', 'GENERAL'];
const defaultReorderableNodeTypes: NodeType[] = ['MODULE', 'TEST_POINT', 'USE_CASE', 'STEP'];
const defaultReviewableNodeTypes: NodeType[] = ['DEMAND', 'MODULE', 'TEST_POINT', 'USE_CASE'];
const defaultNodeRemarksNodeTypes: NodeType[] = ['MODULE', 'TEST_POINT', 'USE_CASE'];
const defaultNodeScoringNodeTypes: NodeType[] = ['MODULE', 'TEST_POINT', 'USE_CASE'];


export interface AppRef {
  save: () => DataChangeInfo;
  executeUseCase: (nodeUuid: string) => void;
  submitDefect: (nodeUuid: string) => void;
  setData: (newData: RawNode) => void;
  syncData: (newData: RawNode, preserveHistory?: boolean) => void;
  resetHistory: () => void;
  setReadOnly: (isReadOnly: boolean) => void;
  confirmReviewStatus: (nodeUuid: string, newStatus: ReviewStatusCode) => void;
  getReviewStatusUpdateInfo: (nodeUuid: string, newStatus: ReviewStatusCode) => DataChangeInfo | null;
  confirmRemark: (nodeUuid: string, content: string) => void;
  confirmScore: (nodeUuid: string, scoreInfo: ScoreInfo) => void;
  partialUpdateNodeData: (nodeUuid: string, partialData: Partial<MindMapNodeData>) => void;
}

interface AppProps {
    initialData?: RawNode;
    showAITag?: boolean;
    isDraggable?: boolean;
    enableStrictDrag?: boolean;
    enableNodeReorder?: boolean;
    reorderableNodeTypes?: NodeType[];
    showNodeType?: boolean;
    showPriority?: boolean;
    showTopToolbar?: boolean;
    showBottomToolbar?: boolean;
    topToolbarCommands?: CommandId[];
    bottomToolbarCommands?: CommandId[];
    strictMode?: boolean;
    showContextMenu?: boolean;
    showCanvasContextMenu?: boolean;
    priorityEditableNodeTypes?: NodeType[];
    onDataChange?: DataChangeCallback;
    onSave?: (info: DataChangeInfo) => void;
    enableUseCaseExecution?: boolean;
    enableDefectSubmission?: boolean;
    onExecuteUseCase?: (info: DataChangeInfo) => void;
    onSubmitDefect?: (info: DataChangeInfo) => void;
    onConfirmReviewStatus?: (info: DataChangeInfo) => void;
    onConfirmRemark?: (info: DataChangeInfo) => void;
    onConfirmScore?: (info: DataChangeInfo) => void;
    onReadOnlyChange?: (isReadOnly: boolean) => void;
    canvasBackgroundColor?: string;
    showBackgroundDots?: boolean;
    showMinimap?: boolean;
    getNodeBackgroundColor?: (node: MindMapNodeData) => string | null | undefined;
    enableReadOnlyUseCaseExecution?: boolean;
    enableExpandCollapseByLevel?: boolean;
    showReadOnlyToggleButtons?: boolean;
    showShortcutsButton?: boolean;
    enableReviewStatus?: boolean;
    enableNodeRemarks?: boolean;
    enableNodeScoring?: boolean;
    reviewStatusNodeTypes?: NodeType[];
    nodeRemarksNodeTypes?: NodeType[];
    nodeScoringNodeTypes?: NodeType[];
    enableBulkReviewContextMenu?: boolean;
    enableSingleReviewContextMenu?: boolean;
    connectorStyle?: ConnectorStyle;
    enableAutoSave?: boolean;
    autoSaveDelay?: number;
    enableSaveValidation?: boolean;
    validationConfig?: ValidationConfig;
    children?: React.ReactNode;
}

const App = forwardRef<AppRef, AppProps>(({
    initialData = {} as RawNode,
    showAITag = true,
    isDraggable = false,
    enableStrictDrag = true,
    enableNodeReorder = true,
    reorderableNodeTypes = defaultReorderableNodeTypes,
    showNodeType = true,
    showPriority = true,
    showTopToolbar = true,
    showBottomToolbar = true,
    topToolbarCommands = defaultTopCommands,
    bottomToolbarCommands = defaultBottomCommands,
    strictMode = true,
    showContextMenu = true,
    showCanvasContextMenu = true,
    priorityEditableNodeTypes = defaultPriorityEditableNodeTypes,
    onDataChange = (info) => { console.log('Mind Map Data Changed:', info); },
    onSave = (info) => { console.log('Mind Map Data Save:', info); },
    enableUseCaseExecution = true,
    enableDefectSubmission = true,
    onExecuteUseCase = (info) => { console.log('Use Case Executed:', info); },
    onSubmitDefect = (info) => { console.log('Defect Submitted:', info); },
    onConfirmReviewStatus = (info) => { console.log('Review status confirmed:', info); },
    onConfirmRemark = (info) => { console.log('Remark confirmed:', info); },
    onConfirmScore = (info) => { console.log('Score confirmed:', info); },
    onReadOnlyChange,
    canvasBackgroundColor = '#f7f7f7',
    showBackgroundDots = true,
    showMinimap = false,
    getNodeBackgroundColor,
    enableReadOnlyUseCaseExecution = true,
    enableExpandCollapseByLevel = true,
    showReadOnlyToggleButtons = true,
    showShortcutsButton = true,
    enableReviewStatus = true,
    enableNodeRemarks = true,
    enableNodeScoring = true,
    reviewStatusNodeTypes = defaultReviewableNodeTypes,
    nodeRemarksNodeTypes = defaultNodeRemarksNodeTypes,
    nodeScoringNodeTypes = defaultNodeScoringNodeTypes,
    enableBulkReviewContextMenu = true,
    enableSingleReviewContextMenu = true,
    connectorStyle = 'elbow',
    enableAutoSave = false,
    autoSaveDelay = 1000,
    enableSaveValidation = true,
    validationConfig = { requirePriority: true, requirePrecondition: true },
    children,
}, ref) => {
    // State to hold the data for the mind map. Initialized from props.
    const [currentData, setCurrentData] = useState<RawNode>(initialData);
    const [isReadOnly, setIsReadOnly] = useState(true);
    const [newlyAddedNodeUuid, setNewlyAddedNodeUuid] = useState<string | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'error' | 'success' }>({ visible: false, message: '', type: 'error' });

    // Effect to update the internal state when the initialData prop changes.
    // This allows the mind map to update when data is loaded asynchronously.
    useEffect(() => {
        // We compare UUIDs to prevent unnecessary re-renders if the parent passes a new object with the same data.
        if (initialData?.uuid && initialData.uuid !== currentData?.uuid) {
            setCurrentData(initialData);
        }
    }, [initialData, currentData?.uuid]);
    
    // Notify parent component when ReadOnly state changes
    useEffect(() => {
        if (onReadOnlyChange) {
            onReadOnlyChange(isReadOnly);
        }
    }, [isReadOnly, onReadOnlyChange]);

    // Create the mind map structure from the current data state.
    // useMemo ensures this expensive operation only runs when data changes.
    const initialMindMap = useMemo(() => createInitialMindMap(currentData), [currentData]);

    // Ref to access the latest mindMap state inside async callbacks (like auto-save timeout)
    const mindMapRef = useRef<any>(null);

    // Auto-save timer ref
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performValidation = useCallback((mindMap: MindMapData): boolean => {
        if (!enableSaveValidation) return true;
        
        const result = validateMindMap(mindMap, validationConfig);
        if (!result.isValid) {
            setToast({ visible: true, message: result.message || '校验失败', type: 'error' });
            return false;
        }
        return true;
    }, [enableSaveValidation, validationConfig]);

    // Wrapper for onDataChange to inject auto-save logic
    const handleDataChangeWrapper = useCallback((info: DataChangeInfo) => {
        // 1. Always call the consumer's onDataChange first
        if (onDataChange) {
            onDataChange(info);
        }

        // 2. Handle Auto-Save Logic
        if (enableAutoSave && onSave) {
            // Operations that should NOT trigger an auto-save
            const ignoredOperations = [
                OperationType.SELECT_NODE,
                OperationType.LOAD_DATA,
                OperationType.SYNC_DATA,
                OperationType.LAYOUT,
                OperationType.EXPAND_NODES,
                OperationType.TOGGLE_NODE_COLLAPSE,
                OperationType.SAVE // Avoid recursion if saving triggers a change event
            ];

            if (!ignoredOperations.includes(info.operationType)) {
                // Clear existing timer
                if (autoSaveTimerRef.current) {
                    clearTimeout(autoSaveTimerRef.current);
                }

                // Set new timer
                autoSaveTimerRef.current = setTimeout(() => {
                    // Access the latest mindMap state from the ref
                    const currentMap = mindMapRef.current;
                    if (currentMap) {
                        // Check Validation
                        if (!performValidation(currentMap)) {
                            console.warn('Auto-save blocked by validation.');
                            return;
                        }

                        // Construct a simplified DataChangeInfo for the save event
                        // For a full save, previousData is essentially the same snapshot as currentData
                        const saveData: DataChangeInfo = convertDataChangeInfo({
                            operationType: OperationType.SAVE,
                            timestamp: Date.now(),
                            description: 'Auto-save triggered',
                            previousData: currentMap,
                            currentData: currentMap,
                            affectedNodeUuids: Object.keys(currentMap.nodes),
                        });
                        onSave(saveData);
                    }
                }, autoSaveDelay);
            }
        }
    }, [enableAutoSave, autoSaveDelay, onDataChange, onSave, performValidation]);

    // Clean up timer on unmount or when auto-save is disabled
    useEffect(() => {
        if (!enableAutoSave && autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, [enableAutoSave]);

    const {
        mindMap,
        addChildNode,
        addSiblingNode,
        deleteNode,
        updateNodePosition,
        reparentNode,
        reorderNode,
        triggerAutoLayout,
        updateNodeSizeAndLayout,
        finishNodeEditing,
        toggleNodeCollapse,
        expandNodes,
        expandAllNodes,
        collapseAllNodes,
        expandToLevel,
        collapseToLevel,
        updateNodeType,
        updateNodePriority,
        confirmReviewStatus,
        getReviewStatusUpdateInfo,
        confirmRemark,
        confirmScore,
        partialUpdateNode,
        syncData,
        undo,
        redo,
        canUndo,
        canRedo,
        isDirty,
        resetHistory,
    } = useMindMap(initialMindMap, strictMode, handleDataChangeWrapper, onConfirmReviewStatus, onConfirmRemark, onConfirmScore);

    // Update the ref whenever mindMap changes so auto-save uses the freshest data
    useEffect(() => {
        mindMapRef.current = mindMap;
    }, [mindMap]);

    const handleAddChildNode = useCallback((parentUuid: string) => {
        const newUuid = addChildNode(parentUuid);
        if (newUuid) {
            setNewlyAddedNodeUuid(newUuid);
        }
    }, [addChildNode]);

    const handleAddSiblingNode = useCallback((nodeUuid: string) => {
        const newUuid = addSiblingNode(nodeUuid);
        if (newUuid) {
            setNewlyAddedNodeUuid(newUuid);
        }
    }, [addSiblingNode]);

    const constructSavePayload = useCallback((): DataChangeInfo => {
        const info = {
            operationType: OperationType.SAVE,
            timestamp: Date.now(),
            description: 'Data saved via trigger.',
            // For a save event, previous and current data are the same snapshot.
            previousData: mindMap,
            currentData: mindMap,
            affectedNodeUuids: Object.keys(mindMap.nodes),
        };
        // Use the existing converter to create the full payload
        return convertDataChangeInfo(info);
    }, [mindMap]);

    const handleExecuteUseCase = useCallback((nodeUuid: string) => {
        if (!onExecuteUseCase) return;

        const node = mindMap.nodes[nodeUuid];
        if (!node) return;
        
        const parentNode = node.parentUuid ? mindMap.nodes[node.parentUuid] : undefined;
        const chain = getNodeChainByUuid(mindMap, nodeUuid);

        const info: any = {
            operationType: OperationType.EXECUTE_USE_CASE,
            timestamp: Date.now(),
            description: `Triggered execution for use case '${node.name}'`,
            previousData: mindMap,
            currentData: mindMap,
            affectedNodeUuids: [nodeUuid],
            currentNode: node,
            parentNode,
            uuidChain: chain.uuids,
            uuidChainNodes: chain.nodes,
            parentUuidChain: chain.uuids.slice(0, -1),
            parentUuidChainNodes: chain.nodes.slice(0, -1),
            executeTags:node.caseTags,
            executeId:node.id
        };

        onExecuteUseCase(convertDataChangeInfo(info));
    }, [mindMap, onExecuteUseCase]);

    const handleSubmitDefect = useCallback((nodeUuid: string) => {
        if (!onSubmitDefect) return;

        const node = mindMap.nodes[nodeUuid];
        if (!node) return;
        
        const parentNode = node.parentUuid ? mindMap.nodes[node.parentUuid] : undefined;
        const chain = getNodeChainByUuid(mindMap, nodeUuid);

        const info: any = {
            operationType: OperationType.SUBMIT_DEFECT,
            timestamp: Date.now(),
            description: `Triggered defect submission for node '${node.name}'`,
            previousData: mindMap,
            currentData: mindMap,
            affectedNodeUuids: [nodeUuid],
            currentNode: node,
            parentNode,
            uuidChain: chain.uuids,
            uuidChainNodes: chain.nodes,
            parentUuidChain: chain.uuids.slice(0, -1),
            parentUuidChainNodes: chain.nodes.slice(0, -1),
        };

        onSubmitDefect(convertDataChangeInfo(info));
    }, [mindMap, onSubmitDefect]);

    useImperativeHandle(ref, () => ({
        save: () => {
            const saveData = constructSavePayload();
            return saveData;
        },
        executeUseCase: (nodeUuid: string) => {
            if (enableUseCaseExecution) {
                handleExecuteUseCase(nodeUuid);
            } else {
                console.warn('Use case execution is disabled via API props.');
            }
        },
        submitDefect: (nodeUuid: string) => {
            if (enableDefectSubmission) {
                handleSubmitDefect(nodeUuid);
            } else {
                console.warn('Defect submission is disabled via API props.');
            }
        },
        setData: (newData: RawNode) => {
            setCurrentData(newData);
            // After setting completely new data, we treat it as a new baseline.
            resetHistory();
            setIsReadOnly(true);
        },
        syncData: (newData: RawNode, preserveHistory = false) => {
            const newMindMap = createInitialMindMap(newData);
            syncData(newMindMap, preserveHistory);
        },
        resetHistory: () => {
            resetHistory();
        },
        setReadOnly: (readOnly: boolean) => {
            setIsReadOnly(readOnly);
        },
        confirmReviewStatus: (nodeUuid: string, newStatus: ReviewStatusCode) => {
            confirmReviewStatus(nodeUuid, newStatus);
        },
        getReviewStatusUpdateInfo: (nodeUuid: string, newStatus: ReviewStatusCode) => {
            return getReviewStatusUpdateInfo(nodeUuid, newStatus);
        },
        confirmRemark: (nodeUuid: string, content: string) => {
            confirmRemark(nodeUuid, content);
        },
        confirmScore: (nodeUuid: string, scoreInfo: ScoreInfo) => {
            confirmScore(nodeUuid, scoreInfo);
        },
        partialUpdateNodeData: (nodeUuid: string, partialData: Partial<MindMapNodeData>) => {
            partialUpdateNode(nodeUuid, partialData);
        },
    }), [constructSavePayload, enableUseCaseExecution, handleExecuteUseCase, handleSubmitDefect, enableDefectSubmission, resetHistory, confirmReviewStatus, getReviewStatusUpdateInfo, confirmRemark, confirmScore, partialUpdateNode, syncData]);

    const handleSaveRequest = () => {
        if (!performValidation(mindMap)) {
            return;
        }
        
        if (onSave) {
            const saveData = constructSavePayload();
            onSave(saveData);
        }
    };

    const handleToggleReadOnly = useCallback(() => {
        setIsReadOnly(prev => !prev);
    }, []);
    
    const handleCloseToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <main>
            <MindMapCanvas
                mindMapData={mindMap}
                onAddChildNode={handleAddChildNode}
                onAddSiblingNode={handleAddSiblingNode}
                onDeleteNode={deleteNode}
                onFinishEditing={finishNodeEditing}
                onUpdateNodePosition={updateNodePosition}
                onReparentNode={reparentNode}
                onReorderNode={reorderNode}
                onLayout={triggerAutoLayout}
                onUpdateNodeSize={updateNodeSizeAndLayout}
                onToggleCollapse={toggleNodeCollapse}
                onExpandNodes={expandNodes}
                onSave={handleSaveRequest}
                showAITag={showAITag}
                isDraggable={isDraggable}
                enableStrictDrag={enableStrictDrag}
                enableNodeReorder={enableNodeReorder}
                reorderableNodeTypes={reorderableNodeTypes}
                showNodeType={showNodeType}
                showPriority={showPriority}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                showTopToolbar={showTopToolbar}
                showBottomToolbar={showBottomToolbar}
                topToolbarCommands={topToolbarCommands}
                bottomToolbarCommands={bottomToolbarCommands}
                strictMode={strictMode}
                showContextMenu={showContextMenu}
                showCanvasContextMenu={showCanvasContextMenu}
                onExpandAllNodes={expandAllNodes}
                onCollapseAllNodes={collapseAllNodes}
                onExpandToLevel={expandToLevel}
                onCollapseToLevel={collapseToLevel}
                enableExpandCollapseByLevel={enableExpandCollapseByLevel}
                onUpdateNodeType={updateNodeType}
                onUpdateNodePriority={updateNodePriority}
                onConfirmReviewStatus={confirmReviewStatus}
                onConfirmRemark={confirmRemark}
                onConfirmScore={confirmScore}
                priorityEditableNodeTypes={priorityEditableNodeTypes}
                onDataChange={onDataChange}
                onExecuteUseCase={handleExecuteUseCase}
                onSubmitDefect={handleSubmitDefect}
                enableUseCaseExecution={enableUseCaseExecution}
                enableDefectSubmission={enableDefectSubmission}
                canvasBackgroundColor={canvasBackgroundColor}
                showBackgroundDots={showBackgroundDots}
                showMinimap={showMinimap}
                getNodeBackgroundColor={getNodeBackgroundColor}
                enableReadOnlyUseCaseExecution={enableReadOnlyUseCaseExecution}
                isReadOnly={isReadOnly}
                onToggleReadOnly={handleToggleReadOnly}
                onSetReadOnly={setIsReadOnly}
                isDirty={isDirty}
                newlyAddedNodeUuid={newlyAddedNodeUuid}
                onNodeFocused={() => setNewlyAddedNodeUuid(null)}
                showReadOnlyToggleButtons={showReadOnlyToggleButtons}
                showShortcutsButton={showShortcutsButton}
                enableReviewStatus={enableReviewStatus}
                enableNodeRemarks={enableNodeRemarks}
                enableNodeScoring={enableNodeScoring}
                reviewStatusNodeTypes={reviewStatusNodeTypes}
                nodeRemarksNodeTypes={nodeRemarksNodeTypes}
                nodeScoringNodeTypes={nodeScoringNodeTypes}
                enableBulkReviewContextMenu={enableBulkReviewContextMenu}
                enableSingleReviewContextMenu={enableSingleReviewContextMenu}
                connectorStyle={connectorStyle}
                toast={toast}
                onCloseToast={handleCloseToast}
            >
                {children}
            </MindMapCanvas>
        </main>
    );
});

export default App;
