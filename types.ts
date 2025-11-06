export type NodeType = 'DEMAND' | 'MODULE' | 'TEST_POINT' | 'USE_CASE' | 'STEP' | 'PRECONDITION' | 'EXPECTED_RESULT' | 'GENERAL';
export type NodePriority = 'P0' | 'P1' | 'P2' | 'P3' | null;
export type ConnectorStyle = 'elbow' | 'curve';

export interface CanvasTransform {
    scale: number;
    translateX: number;
    translateY: number;
}

export interface ScoreInfo {
  scoreName?: "优秀" | "良好" | "一般" | "较差" | "极差";
  scoreCode?: "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR" | "VERY_POOR";
  scoreValue?: 5 | 4 | 3 | 2 | 1;
  remark?: string;
  id?: number;
}

export interface Remarker {
    empId?: number | string;
    realName?: string;
    showName?: string;
}

export interface Remark {
    id?: number | string;
    remarker?: Remarker;
    createTime?: string;
    content?: string;
}

export type ReviewStatusCode = 'pending_review' | 'approved' | 'rejected';


export interface MindMapNodeData {
  uuid?: string; // The primary key
  name?: string;
  position?: { x: number; y: number };
  parentUuid?: string | null;
  childNodeList?: string[];
  width?: number;
  height?: number;
  nodeType?: NodeType;
  priorityLevel?: NodePriority;
  generateModeName?: 'AI' | '人工';
  isCollapsed?: boolean;
  caseTags?: ('function' | 'api' | 'ui')[];
  functionTestCaseStatusCode?: string | null;
  apiTestCaseStatusCode?: string | null;
  uiTestCaseStatusCode?: string | null;
  finalTestCaseStatusCode?: string | null;
  sortNumber?: number;

  // Review fields
  hasRemark?: boolean;
  hasScore?: boolean;
  scoreInfo?: ScoreInfo | null;
  RemarkHistory?: Remark[];
  reviewStatusCode?: ReviewStatusCode | null;
  reviewStatusName?: string;


  // Store original data fields as well
  id?: number | string;
  parentId?: number | string;
}

export interface MindMapData {
  nodes: Record<string, MindMapNodeData>; // Keyed by UUID
  rootUuid: string;
}

// Define the shape of the raw hierarchical node for initial data and export
export interface RawNode {
    id?: number | string;
    uuid?: string;
    name?: string;
    nodeType?: string;
    priorityLevel?: string;
    childNodeList?: RawNode[];
    generateModeName?: 'AI' | '人工';
    parentId?: number | string;
    functionTestCaseDTO?: object;
    apiTestCaseDTO?: object;
    uiTestCaseDTO?: object;
    sortNumber?: number;

    // Review fields
    hasRemark?: boolean;
    hasScore?: boolean;
    scoreInfo?: ScoreInfo | null;
    RemarkHistory?: Remark[];
    reviewStatusCode?: string;
    reviewStatusName?: string;
}


// Mappings from the raw data format to the application's internal format.
export const nodeTypeMapping: Record<string, NodeType> = {
    rootNode: 'DEMAND',
    moduleNode: 'MODULE',
    testPointNode: 'TEST_POINT',
    caseNode: 'USE_CASE',
    preconditionNode: 'PRECONDITION',
    stepNode: 'STEP',
    resultNode: 'EXPECTED_RESULT',
};

export const priorityMapping: Record<string, NodePriority> = {
    "0": 'P0',
    "1": 'P1',
    "2": 'P2',
    "3": 'P3',
};

// Reverse mappings to convert internal format back to raw format for callbacks
export const reverseNodeTypeMapping: Record<string, string> = Object.fromEntries(
    Object.entries(nodeTypeMapping).map(([key, value]) => [value, key])
);
reverseNodeTypeMapping['GENERAL'] = 'generalNode'; // Handle the internal-only type

export const reversePriorityMapping: Record<string, number> = Object.fromEntries(
    Object.entries(priorityMapping).map(([key, value]) => [value, Number(key)])
);


export type CommandId =
  // Top Toolbar
  | 'undo'
  | 'redo'
  | 'separator'
  | 'addSibling'
  | 'addChild'
  | 'delete'
  | 'save'
  | 'closeTop'
  // Bottom Toolbar
  | 'zoomOut'
  | 'zoomIn'
  | 'zoomDisplay'
  | 'toggleReadOnly'
  | 'fitView'
  | 'centerView'
  | 'layout'
  | 'fullscreen'
  | 'search'
  | 'closeBottom';

// New types for data change callback
export enum OperationType {
  ADD_NODE = 'ADD_NODE',
  DELETE_NODE = 'DELETE_NODE',
  UPDATE_NODE_TEXT = 'UPDATE_NODE_TEXT',
  UPDATE_NODE_TYPE = 'UPDATE_NODE_TYPE',
  UPDATE_NODE_PRIORITY = 'UPDATE_NODE_PRIORITY',
  MOVE_NODE = 'MOVE_NODE',
  REORDER_NODE = 'REORDER_NODE',
  TOGGLE_NODE_COLLAPSE = 'TOGGLE_NODE_COLLAPSE',
  LAYOUT = 'LAYOUT',
  UNDO = 'UNDO',
  REDO = 'REDO',
  LOAD_DATA = 'LOAD_DATA',
  SELECT_NODE = 'SELECT_NODE',
  SAVE = 'SAVE',
  EXECUTE_USE_CASE = 'EXECUTE_USE_CASE',
  SUBMIT_DEFECT = 'SUBMIT_DEFECT',
  BULK_UPDATE_REVIEW_STATUS = 'BULK_UPDATE_REVIEW_STATUS',
  UPDATE_SINGLE_NODE_REVIEW_STATUS = 'UPDATE_SINGLE_NODE_REVIEW_STATUS',
  ADD_REMARK = 'ADD_REMARK',
  UPDATE_SCORE_INFO = 'UPDATE_SCORE_INFO',
  PARTIAL_UPDATE_NODE = 'PARTIAL_UPDATE_NODE',
  SYNC_DATA = 'SYNC_DATA',
}

// New types for the data sent in the callback, using raw keys
export interface RawCallbackNodeData {
  uuid?: string;
  name?: string;
  position?: { x: number; y: number };
  parentUuid?: string | null;
  childNodeList?: string[];
  width?: number;
  height?: number;
  nodeType?: string;
  priorityLevel?: string | null;
  generateModeName?: 'AI' | '人工';
  isCollapsed?: boolean;
  sortNumber?: number;
  
  // Review fields
  hasRemark?: boolean;
  hasScore?: boolean;
  scoreInfo?: ScoreInfo | null;
  RemarkHistory?: Remark[];
  reviewStatusCode?: string;
  reviewStatusName?: string;


  id?: number | string;
  parentId?: number | string;
}

export interface RawCallbackMindMapData {
  nodes: Record<string, RawCallbackNodeData>;
  rootUuid: string;
}

export interface DataChangeInfo {
  operationType: OperationType;
  timestamp: number;
  description: string;
  // Flat data representation
  previousData: RawCallbackMindMapData;
  currentData: RawCallbackMindMapData;
  // Hierarchical data representation
  previousRawData: RawNode;
  currentRawData: RawNode;
  
  affectedNodeUuids?: string[];

  // These now represent sub-trees in the hierarchical format
  addedNodes?: RawNode[];
  deletedNodes?: RawNode[];
  updatedNodes?: RawNode[];
  
  // Context nodes, also in hierarchical format
  currentNode?: RawNode; // The full subtree of the node being acted upon
  parentNode?: RawNode; // Just the parent node itself (no recursive children)
  
  uuidChain?: string[];
  uuidChainNodes?: RawNode[]; // Chain from root, each as a single node
  
  parentUuidChain?: string[];
  parentUuidChainNodes?: RawNode[]; // Chain for the parent, each as a single node
  
  // Fields for onExecuteUseCase callback
  executeTags?: ('function' | 'api' | 'ui')[];
  executeId?: number | string;

  // Fields for onBulkUpdateReviewStatus callback
  useCaseIds?: (string | number)[];
}

export type DataChangeCallback = (changeInfo: DataChangeInfo) => void;