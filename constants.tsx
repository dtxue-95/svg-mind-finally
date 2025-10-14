import type { NodeType, NodePriority } from './types';

export const HORIZONTAL_SPACING = 40;
export const VERTICAL_SPACING = 20;
export const MIN_NODE_WIDTH = 150;
export const MAX_NODE_WIDTH = 600;
export const MIN_NODE_HEIGHT = 50;


export const NODE_TYPE_PROPS: {
    [key in NodeType]: {
        label: string;
        backgroundColor: string;
        borderColor: string;
        color: string;
    }
} = {
    DEMAND: { label: '需求', backgroundColor: '#f4f4f7', borderColor: '#8e8e93', color: '#8e8e93' },
    MODULE: { label: '模块', backgroundColor: '#eafaf1', borderColor: '#34c759', color: '#34c759' },
    TEST_POINT: { label: '测试点', backgroundColor: '#fff7e6', borderColor: '#ff9500', color: '#ff9500' },
    USE_CASE: { label: '用例', backgroundColor: '#e6f0ff', borderColor: '#007aff', color: '#007aff' },
    STEP: { label: '步骤', backgroundColor: '#e6faff', borderColor: '#32ade6', color: '#32ade6' },
    PRECONDITION: { label: '前置条件', backgroundColor: '#f6eaff', borderColor: '#af52de', color: '#af52de' },
    EXPECTED_RESULT: { label: '预期结果', backgroundColor: '#fff0ef', borderColor: '#ff3b30', color: '#ff3b30' },
    GENERAL: { label: '新分支主题', backgroundColor: '#e6f7ff', borderColor: '#91d5ff', color: '#1890ff' },
};

export const PRIORITY_PROPS: {
    [key in Exclude<NodePriority, null>]: {
        backgroundColor: string;
        color: string;
    }
} = {
    P0: { backgroundColor: '#ff4d4f', color: 'white' },
    P1: { backgroundColor: '#faad14', color: 'white' },
    P2: { backgroundColor: '#1890ff', color: 'white' },
    P3: { backgroundColor: '#52c41a', color: 'white' },
};