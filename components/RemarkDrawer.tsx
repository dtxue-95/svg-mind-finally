
import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import type { RawNode } from '../types';

interface RemarkDrawerProps {
    visible: boolean;
    node: RawNode | null; // Use RawNode for easier consumption in top-level app
    onClose: () => void;
    onSave: (content: string) => void;
}

export const RemarkDrawer: React.FC<RemarkDrawerProps> = ({ visible, node, onClose, onSave }) => {
    const [content, setContent] = useState('');

    // When the node changes or drawer opens, load the LATEST remark content
    useEffect(() => {
        if (visible && node) {
            // Logic: get the most recent remark content if exists
            const latestRemark = node.RemarkHistory && node.RemarkHistory.length > 0 
                ? node.RemarkHistory[0].content 
                : '';
            setContent(latestRemark || '');
        }
    }, [visible, node]);

    const handleSave = () => {
        onSave(content);
    };

    if (!node) return null;

    return (
        <>
            <div 
                className={`remark-drawer-overlay ${visible ? 'visible' : ''}`} 
                onClick={onClose}
            />
            <div className={`remark-drawer ${visible ? 'visible' : ''}`}>
                <div className="remark-drawer__header">
                    <h3>节点备注</h3>
                    <button className="remark-drawer__close-btn" onClick={onClose}>
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="remark-drawer__content">
                    {/* Basic Info Section */}
                    <div className="remark-drawer__info-section">
                        <div className="remark-drawer__info-item">
                            <span className="remark-drawer__info-label">节点名称</span>
                            <span className="remark-drawer__info-value">{node.name}</span>
                        </div>
                        {node.id && (
                             <div className="remark-drawer__info-item">
                                <span className="remark-drawer__info-label">节点 ID</span>
                                <span className="remark-drawer__info-value">{node.id}</span>
                            </div>
                        )}
                         <div className="remark-drawer__info-item">
                            <span className="remark-drawer__info-label">评审状态</span>
                            <span className="remark-drawer__info-value">
                                {node.reviewStatusName || '无'}
                            </span>
                        </div>
                    </div>

                    {/* Editor Section */}
                    <div className="remark-drawer__editor-section">
                        <span className="remark-drawer__editor-label">备注内容</span>
                        <textarea 
                            className="remark-drawer__textarea"
                            placeholder="在此输入富文本备注..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>

                <div className="remark-drawer__footer">
                    <button className="remark-drawer__btn remark-drawer__btn--cancel" onClick={onClose}>
                        取消
                    </button>
                    <button className="remark-drawer__btn remark-drawer__btn--save" onClick={handleSave}>
                        保存
                    </button>
                </div>
            </div>
        </>
    );
};
