import React, { useState, useRef, useMemo } from 'react';
import { FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';
import type { ReviewStatusCode, MindMapNodeData, NodeType } from '../types';
import { usePopoverPositioning } from '../hooks/usePopoverPositioning';

interface ReviewMenuProps {
    x: number;
    y: number;
    node: MindMapNodeData;
    onClose: () => void;
    onConfirm: (status: ReviewStatusCode) => void;
    hasUseCases: boolean;
    nodeType: NodeType | null;
}

const allStatusOptions: { code: ReviewStatusCode; label: string; }[] = [
    { code: 'pending_review', label: '待评审' },
    { code: 'approved', label: '通过' },
    { code: 'rejected', label: '未通过' },
];

export const ReviewMenu: React.FC<ReviewMenuProps> = ({ x, y, node, onClose, onConfirm, hasUseCases, nodeType }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const position = usePopoverPositioning(modalRef, x, y);
    const [showWarning, setShowWarning] = useState(false);
    
    const isParentNode = useMemo(() => node.nodeType !== 'USE_CASE', [node.nodeType]);

    const getInitialStatus = (): ReviewStatusCode => {
        // If the node has a status, use it as the initial selection.
        if (node.reviewStatusCode) {
            return node.reviewStatusCode;
        }
        // If there's no status, default parent nodes to 'approved' for the initial selection,
        // as 'pending' is not a valid manual choice. Default use cases to 'pending_review'.
        return isParentNode ? 'approved' : 'pending_review';
    };

    const [selectedStatus, setSelectedStatus] = useState<ReviewStatusCode>(getInitialStatus());

    const handleStatusChange = (newStatus: ReviewStatusCode) => {
        setSelectedStatus(newStatus);
        const isChangingToPassOrFail = newStatus === 'approved' || newStatus === 'rejected';
        
        if (isParentNode && isChangingToPassOrFail && !hasUseCases) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedStatus);
        onClose();
    };

    const title = isParentNode ? '一键评审用例' : '评审用例';
    const infoText = isParentNode
        ? '批量更新当前节点下所有用例的评审状态'
        : '更新当前用例的评审状态';

    const warningText = nodeType === 'DEMAND'
        ? '存在模块下缺少用例，无法进行此操作。'
        : '该节点下缺少测试用例，无法进行此操作。';

    return (
        <div 
            ref={modalRef}
            className="bulk-review-menu" 
            style={{ ...position, transition: 'opacity 0.1s' }} 
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="bulk-review-menu__header">
                <h3>{title}</h3>
                <button onClick={onClose} className="bulk-review-menu__close-btn"><FiX /></button>
            </div>
            <div className="bulk-review-menu__content">
                <div className="bulk-review-menu__info">
                    <FiInfo />
                    <span>{infoText}</span>
                </div>

                {showWarning && (
                    <div className="bulk-review-menu__warning">
                        <FiAlertTriangle />
                        <span>{warningText}</span>
                    </div>
                )}

                <div className="bulk-review-menu__options">
                    {allStatusOptions.map(({ code, label }) => {
                        // The 'pending_review' option is disabled for parent nodes (demand, module, etc.).
                        // It can be displayed as the current state but cannot be manually selected.
                        const isDisabled = isParentNode && code === 'pending_review';
                        const selectedClass = selectedStatus === code 
                            ? `bulk-review-menu__option--selected bulk-review-menu__option--selected-${code}` 
                            : '';

                        return (
                            <div
                                key={code}
                                className={`bulk-review-menu__option ${selectedClass} ${isDisabled ? 'bulk-review-menu__option--disabled' : ''}`}
                                onClick={() => {
                                    if (!isDisabled) {
                                        handleStatusChange(code);
                                    }
                                }}
                            >
                                <div className="bulk-review-menu__radio">
                                    {selectedStatus === code && <div className="bulk-review-menu__radio-dot" />}
                                </div>
                                <span>{label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="bulk-review-menu__footer">
                <button className="bulk-review-menu__button bulk-review-menu__button--cancel" onClick={onClose}>取消</button>
                <button className="bulk-review-menu__button bulk-review-menu__button--confirm" onClick={handleConfirm} disabled={showWarning}>确定</button>
            </div>
        </div>
    );
};
