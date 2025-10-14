

import React, { useState, useLayoutEffect, useRef } from 'react';
import { FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';
import type { ReviewStatusCode, MindMapNodeData, NodeType } from '../types';

interface ReviewMenuProps {
    x: number;
    y: number;
    node: MindMapNodeData;
    onClose: () => void;
    onConfirm: (status: ReviewStatusCode) => void;
    hasUseCases: boolean;
    nodeType: NodeType | null;
}

const statusOptions: { code: ReviewStatusCode; label: string; }[] = [
    { code: 'pending_review', label: '待评审' },
    { code: 'approved', label: '通过' },
    { code: 'rejected', label: '未通过' },
];

export const ReviewMenu: React.FC<ReviewMenuProps> = ({ x, y, node, onClose, onConfirm, hasUseCases, nodeType }) => {
    const [selectedStatus, setSelectedStatus] = useState<ReviewStatusCode>(node.reviewStatusCode || 'pending_review');
    const [showWarning, setShowWarning] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y, left: x, opacity: 0 });

    useLayoutEffect(() => {
        if (modalRef.current) {
            const modalRect = modalRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let finalX = x;
            let finalY = y;

            if (finalX + modalRect.width > viewportWidth) {
                finalX = viewportWidth - modalRect.width - 10;
            }
            if (finalY + modalRect.height > viewportHeight) {
                finalY = viewportHeight - modalRect.height - 10;
            }

            finalX = Math.max(10, finalX);
            finalY = Math.max(10, finalY);

            setPosition({ top: finalY, left: finalX, opacity: 1 });
        }
    }, [x, y]);

    const handleStatusChange = (newStatus: ReviewStatusCode) => {
        setSelectedStatus(newStatus);
        const isChangingToPassOrFail = newStatus === 'approved' || newStatus === 'rejected';
        const isBulkUpdate = node.nodeType !== 'USE_CASE';

        if (isBulkUpdate && isChangingToPassOrFail && !hasUseCases) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
        }
    };

    const handleConfirm = () => {
        onConfirm(selectedStatus);
        onClose();
    };

    const isUseCase = node.nodeType === 'USE_CASE';
    const title = isUseCase ? '评审用例' : '一键评审用例';
    const infoText = isUseCase 
        ? '更新当前用例的评审状态' 
        : '批量更新当前节点下所有用例的评审状态';

    const warningText = nodeType === 'DEMAND'
        ? '存在模块下缺少用例，无法进行此操作。'
        : '该节点下缺少测试用例，无法进行此操作。';

    return (
        <div 
            ref={modalRef}
            className="bulk-review-menu" 
            style={{ top: position.top, left: position.left, opacity: position.opacity, transition: 'opacity 0.1s' }} 
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
                    {statusOptions.map(({ code, label }) => (
                        <div
                            key={code}
                            className={`bulk-review-menu__option ${selectedStatus === code ? 'bulk-review-menu__option--selected' : ''}`}
                            onClick={() => handleStatusChange(code)}
                        >
                            <div className="bulk-review-menu__radio">
                                {selectedStatus === code && <div className="bulk-review-menu__radio-dot" />}
                            </div>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bulk-review-menu__footer">
                <button className="bulk-review-menu__button bulk-review-menu__button--cancel" onClick={onClose}>取消</button>
                <button className="bulk-review-menu__button bulk-review-menu__button--confirm" onClick={handleConfirm} disabled={showWarning}>确定</button>
            </div>
        </div>
    );
};