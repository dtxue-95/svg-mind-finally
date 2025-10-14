
import React, { useState, useRef, useLayoutEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { MindMapNodeData, Remark } from '../types';

interface RemarkModalProps {
    x: number;
    y: number;
    node: MindMapNodeData;
    onClose: () => void;
    onConfirm: (content: string) => void;
}

const RemarkItem: React.FC<{ remark: Remark }> = ({ remark }) => (
    <div className="remark-modal__item">
        <div className="remark-modal__item-header">
            <div className="remark-modal__item-avatar">
                {remark.remarker?.showName?.charAt(0) || 'U'}
            </div>
            <span className="remark-modal__item-name">{remark.remarker?.showName || '未知用户'}</span>
            <span className="remark-modal__item-time">{remark.createTime}</span>
        </div>
        <p className="remark-modal__item-content">{remark.content}</p>
    </div>
);


export const RemarkModal: React.FC<RemarkModalProps> = ({ x, y, node, onClose, onConfirm }) => {
    const [content, setContent] = useState('');
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

    const handleConfirm = () => {
        if (content.trim()) {
            onConfirm(content.trim());
            setContent('');
        }
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
    };

    return (
        <div 
            ref={modalRef}
            className="remark-modal" 
            style={{ top: position.top, left: position.left, opacity: position.opacity, transition: 'opacity 0.1s' }} 
            onClick={e => e.stopPropagation()} 
            onContextMenu={(e) => e.preventDefault()}
            onWheel={handleWheel}
        >
            <div className="remark-modal__header">
                <h3>备注历史</h3>
                <button onClick={onClose} className="remark-modal__close-btn"><FiX /></button>
            </div>
            <div className="remark-modal__content">
                <div className="remark-modal__input-area">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="请输入备注内容..."
                        rows={3}
                    />
                    <button onClick={handleConfirm} disabled={!content.trim()}>确认</button>
                </div>
                {node.RemarkHistory && node.RemarkHistory.length > 0 && (
                    <div className="remark-modal__history">
                        {node.RemarkHistory?.map((remark) => (
                            <RemarkItem key={remark.id || remark.createTime} remark={remark} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};