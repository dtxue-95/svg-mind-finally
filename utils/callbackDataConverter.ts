import {
  MindMapData,
  MindMapNodeData,
  RawCallbackMindMapData,
  RawCallbackNodeData,
  DataChangeInfo,
  RawNode,
  reverseNodeTypeMapping,
  reversePriorityMapping,
  OperationType,
} from '../types';
import { 
    convertMindMapDataToRawNode, 
    convertNodeToRawTree,
    convertSingleMindMapNodeToRawNode
} from './hierarchicalConverter';


/**
 * Converts a single internal node to its flat, raw-key representation.
 */
function convertNodeToFlat(node: MindMapNodeData): RawCallbackNodeData {
  if (!node) return node as unknown as RawCallbackNodeData;

  const { nodeType, priorityLevel, name, ...rest } = node;
  
  const rawNodeType = nodeType ? reverseNodeTypeMapping[nodeType] : undefined;
  const rawPriority = priorityLevel ? String(reversePriorityMapping[priorityLevel]) : null;

  return {
    ...rest,
    name: name,
    nodeType: rawNodeType,
    priorityLevel: rawPriority,
  };
}

/**
 * Converts the entire internal mind map data to its flat, raw-key representation.
 */
function convertMindMapDataToFlat(mindMapData: MindMapData): RawCallbackMindMapData {
  if (!mindMapData || !mindMapData.nodes) return mindMapData as unknown as RawCallbackMindMapData;
  
  const newNodes: Record<string, RawCallbackNodeData> = {};
  for (const nodeUuid in mindMapData.nodes) {
    newNodes[nodeUuid] = convertNodeToFlat(mindMapData.nodes[nodeUuid]);
  }
  return {
    rootUuid: mindMapData.rootUuid,
    nodes: newNodes,
  };
}


// A generic type for the internal version of the data change info object.
type InternalDataChangeInfo = any;

/**
 * Takes the internal data change object and converts it into the full DataChangeInfo payload,
 * containing both flat and hierarchical representations of the data.
 * @param info The internal data change object from a hook.
 * @returns The final DataChangeInfo object for the onDataChange callback.
 */
export function convertDataChangeInfo(info: InternalDataChangeInfo): DataChangeInfo {
    const convertedInfo: Partial<DataChangeInfo> = { ...info };

    // --- 1. Convert to Flat Representation ---
    if (info.previousData) {
        convertedInfo.previousData = convertMindMapDataToFlat(info.previousData);
    }
    if (info.currentData) {
        convertedInfo.currentData = convertMindMapDataToFlat(info.currentData);
    }
    
    // --- 2. Convert to Hierarchical Representation ---
    if (info.previousData) {
        convertedInfo.previousRawData = convertMindMapDataToRawNode(info.previousData);
    }
    if (info.currentData) {
        convertedInfo.currentRawData = convertMindMapDataToRawNode(info.currentData);
    }

    // Determine which state to use as the source for converting node subtrees
    const sourceMapForCurrent = info.operationType === OperationType.DELETE_NODE ? info.previousData : info.currentData;
    
    // --- 3. Convert Node Lists to Hierarchical Subtrees ---
    if (info.addedNodes) {
        convertedInfo.addedNodes = info.addedNodes.map((n: MindMapNodeData) => convertNodeToRawTree(n.uuid!, info.currentData));
    }
    if (info.deletedNodes) {
        convertedInfo.deletedNodes = info.deletedNodes.map((n: MindMapNodeData) => convertNodeToRawTree(n.uuid!, info.previousData));
    }
    if (info.updatedNodes) {
        convertedInfo.updatedNodes = info.updatedNodes.map((n: MindMapNodeData) => convertNodeToRawTree(n.uuid!, info.currentData));
    }
    
    // --- 4. Convert Context Nodes ---
    if (info.currentNode) {
        // `currentNode` is represented by its full subtree
        convertedInfo.currentNode = convertNodeToRawTree(info.currentNode.uuid, sourceMapForCurrent);
    }
    if (info.parentNode) {
        // `parentNode` is just the node itself, no children recursion
        convertedInfo.parentNode = convertSingleMindMapNodeToRawNode(info.parentNode);
    }
    if (info.uuidChainNodes) {
        // `uuidChainNodes` is an array of single nodes
        convertedInfo.uuidChainNodes = info.uuidChainNodes.map((n: MindMapNodeData) => convertSingleMindMapNodeToRawNode(n)).filter((n): n is RawNode => !!n);
    }
    if (info.parentUuidChainNodes) {
        // `parentUuidChainNodes` is an array of single nodes
        convertedInfo.parentUuidChainNodes = info.parentUuidChainNodes.map((n: MindMapNodeData) => convertSingleMindMapNodeToRawNode(n)).filter((n): n is RawNode => !!n);
    }

    return convertedInfo as DataChangeInfo;
}