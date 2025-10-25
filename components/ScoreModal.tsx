import React, { useState, useRef } from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import type { MindMapNodeData, ScoreInfo } from '../types';
import { usePopoverPositioning } from '../hooks/usePopoverPositioning';

interface ScoreModalProps {
    x: number;
    y: number;
    node: MindMapNodeData;
    onClose: () => void;
    onConfirm: (scoreInfo: ScoreInfo) => void;
}

const scoreMappings: Record<number, { scoreName: ScoreInfo['scoreName'], scoreCode: ScoreInfo['scoreCode'] }> = {
    1: { scoreName: '极差', scoreCode: 'VERY_POOR' },
    2: { scoreName: '较差', scoreCode: 'POOR' },
    3: { scoreName: '一般', scoreCode: 'AVERAGE' },
    4: { scoreName: '良好', scoreCode: 'GOOD' },
    5: { scoreName: '优秀', scoreCode: 'EXCELLENT' },
};
const MAX_REMARK_LENGTH = 200;

export const ScoreModal: React.FC<ScoreModalProps> = ({ x, y, node, onClose, onConfirm }) => {
    const [rating, setRating] = useState(node.scoreInfo?.scoreValue || 0);
    const [hoverRating, setHoverRating] = useState(0);
    const [remark, setRemark] = useState(node.scoreInfo?.remark || '');
    const modalRef = useRef<HTMLDivElement>(null);
    const position = usePopoverPositioning(modalRef, x, y);

    const ratingLabel = scoreMappings[hoverRating || rating]?.scoreName || '未选择';

    const handleConfirm = () => {
        if (rating === 0) return;

        const newScoreInfo: ScoreInfo = {
            ...scoreMappings[rating],
            scoreValue: rating as ScoreInfo['scoreValue'],
            remark: remark.trim(),
            id: node.scoreInfo?.id,
        };
        onConfirm(newScoreInfo);
        onClose();
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
    };
    
    return (
        <div 
            ref={modalRef}
            className="score-modal" 
            style={{ ...position, transition: 'opacity 0.1s' }} 
            onClick={e => e.stopPropagation()} 
            onContextMenu={(e) => e.preventDefault()}
            onWheel={handleWheel}
        >
            <div className="score-modal__header">
                <h3>请评分</h3>
                <button onClick={onClose} className="score-modal__close-btn" title="关闭">
                    <FiX size={18} />
                </button>
            </div>
            <div className="score-modal__content">
                <div className="score-modal__rating-area">
                    <div className="score-modal__stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                                key={star}
                                className={`score-modal__star ${ (hoverRating || rating) >= star ? 'filled' : '' }`}
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                            />
                        ))}
                    </div>
                    <span className="score-modal__label">{ratingLabel}</span>
                </div>

                <textarea
                    className="score-modal__textarea"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value.slice(0, MAX_REMARK_LENGTH))}
                    placeholder="请输入您的评分备注 (可选)"
                    maxLength={MAX_REMARK_LENGTH}
                />
                
                <div className="score-modal__meta">
                    <span>您的反馈对我们很重要</span>
                    <span className="score-modal__char-count">{remark.length}/{MAX_REMARK_LENGTH}</span>
                </div>
            </div>
            <div className="score-modal__footer">
                <button className="score-modal__button" onClick={onClose}>取消</button>
                <button 
                    className="score-modal__button score-modal__button--submit" 
                    onClick={handleConfirm}
                    disabled={rating === 0}
                >
                    提交
                </button>
            </div>
        </div>
    );
};
