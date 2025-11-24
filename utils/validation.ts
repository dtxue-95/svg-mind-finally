

import type { MindMapData, MindMapNodeData, ValidationConfig } from '../types';

interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export const validateMindMap = (mindMap: MindMapData, config: ValidationConfig): ValidationResult => {
    const { requirePriority = true, requirePrecondition = true, requireStep = true } = config;
    const nodes = Object.values(mindMap.nodes);

    for (const node of nodes) {
        if (node.nodeType === 'USE_CASE') {
            // Rule 1: Check Priority
            if (requirePriority && !node.priorityLevel) {
                return {
                    isValid: false,
                    message: `校验失败：用例节点 "${node.name}" 未填写优先级。`,
                };
            }

            const children = (node.childNodeList ?? []).map(childUuid => mindMap.nodes[childUuid]);

            // Rule 2: Check Precondition
            if (requirePrecondition) {
                const hasPrecondition = children.some(child => child?.nodeType === 'PRECONDITION');
                
                if (!hasPrecondition) {
                    return {
                        isValid: false,
                        message: `校验失败：用例节点 "${node.name}" 缺少前置条件。`,
                    };
                }
            }

            // Rule 3: Check Step if Precondition exists
            if (requireStep) {
                const hasPrecondition = children.some(child => child?.nodeType === 'PRECONDITION');
                const hasStep = children.some(child => child?.nodeType === 'STEP');

                if (hasPrecondition && !hasStep) {
                    return {
                        isValid: false,
                        message: `校验失败：用例节点 "${node.name}" 缺少步骤。`,
                    };
                }
            }
        }
    }

    return { isValid: true };
};
