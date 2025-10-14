import type { MindMapData, MindMapNodeData, RawNode, ReviewStatusCode } from '../types';
import { nodeTypeMapping, priorityMapping } from '../types';
import { MIN_NODE_HEIGHT } from '../constants';

/**
 * Transforms the hierarchical raw data into the flat structure required by the mind map application.
 * @param rawData The root node of the raw hierarchical data.
 * @returns A MindMapData object.
 */
export const createInitialMindMap = (rawData: RawNode): MindMapData => {
    // Handle case where an empty object or invalid node is passed, creating a default map
    if (!rawData || !rawData.uuid) {
        const rootUuid = crypto.randomUUID();
        return {
            rootUuid: rootUuid,
            nodes: {
                [rootUuid]: {
                    uuid: rootUuid,
                    name: '接口异常',
                    parentUuid: null,
                    childNodeList: [],
                    position: { x: 0, y: 0 },
                    height: MIN_NODE_HEIGHT,
                    nodeType: 'DEMAND', // 'rootNode' maps to 'DEMAND'
                    isCollapsed: false,
                },
            },
        };
    }
    
    const mindMap: MindMapData = {
        rootUuid: rawData.uuid!,
        nodes: {},
    };

    /**
     * A recursive helper function to traverse the raw data tree and populate the flat nodes map.
     * @param rawNode The current raw node to process.
     * @param parentUuid The UUID of the parent node, or null for the root.
     */
    const traverse = (rawNode: RawNode, parentUuid: string | null) => {
        // Process children to enforce sortNumber before recursion
        const childNodeListWithCorrectSort = (rawNode.childNodeList ?? []).map((child, index) => {
            const updatableNodeTypes = ['moduleNode', 'testPointNode', 'caseNode', 'stepNode'];
            if (child.nodeType && updatableNodeTypes.includes(child.nodeType)) {
                // Overwrite or add sortNumber to be index + 1
                return { ...child, sortNumber: index + 1 };
            }
            return child;
        });

        const childUuids = childNodeListWithCorrectSort.map(child => child.uuid!);

        const nodeData: MindMapNodeData = {
            uuid: rawNode.uuid!,
            name: rawNode.name,
            parentUuid,
            childNodeList: childUuids,
            position: { x: 0, y: 0 }, // Initial position, will be set by auto-layout.
            // width: MIN_NODE_WIDTH, // Removed. Width will be calculated on first render.
            height: MIN_NODE_HEIGHT, // Keep min-height for clickability.
            nodeType: nodeTypeMapping[rawNode.nodeType!] || 'GENERAL',
            priorityLevel: typeof rawNode.priorityLevel !== 'undefined' ? priorityMapping[rawNode.priorityLevel as keyof typeof priorityMapping] : null,
            generateModeName: rawNode.generateModeName,
            isCollapsed: false,
            // The sortNumber for the current node comes from the `rawNode` argument,
            // which was already processed by its parent in the previous call.
            sortNumber: rawNode.sortNumber,
            
            // Review fields
            hasRemark: rawNode.hasRemark,
            hasScore: rawNode.hasScore,
            scoreInfo: rawNode.scoreInfo,
            RemarkHistory: rawNode.RemarkHistory,
            reviewStatusCode: rawNode.reviewStatusCode as ReviewStatusCode,
            reviewStatusName: rawNode.reviewStatusName,

             // Keep original fields
            id: rawNode.id,
            parentId: rawNode.parentId,
        };
        
        if (rawNode.nodeType === 'caseNode') {
            const tags: ('function' | 'api' | 'ui')[] = [];
            if (rawNode.functionTestCaseDTO) {
                tags.push('function');
                nodeData.functionTestCaseStatusCode = (rawNode.functionTestCaseDTO as any)?.executionStatus;
                nodeData.finalTestCaseStatusCode = (rawNode.functionTestCaseDTO as any)?.finalStatus;

            }
            if (rawNode.apiTestCaseDTO) {
                tags.push('api');
                nodeData.apiTestCaseStatusCode = (rawNode.apiTestCaseDTO as any)?.executionStatus;
            }
            if (rawNode.uiTestCaseDTO) {
                tags.push('ui');
                nodeData.uiTestCaseStatusCode = (rawNode.uiTestCaseDTO as any)?.executionStatus;
            }
            
            if (tags.length > 0) {
                nodeData.caseTags = tags;
            }
        }
        
        mindMap.nodes[rawNode.uuid!] = nodeData;

        // Recurse using the children that have the corrected sortNumber
        childNodeListWithCorrectSort.forEach(child => traverse(child, rawNode.uuid!));
    };

    traverse(rawData, null);

    return mindMap;
};