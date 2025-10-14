import React from 'react';
import { FaWindows, FaApple } from 'react-icons/fa6';
import { FiX } from 'react-icons/fi';

interface ShortcutsPanelProps {
    position: { top: number; right: number };
    onClose: () => void;
}

const shortcuts = [
    { func: '添加子节点', win: 'Tab', mac: 'Tab' },
    { func: '添加同级节点', win: 'Enter', mac: 'Enter' },
    { func: '删除节点', win: 'Delete / Backspace', mac: 'Delete / Backspace' },
    { func: '展开/收起节点', win: 'Space', mac: 'Space' },
    { func: '移动画布', win: '← ↑ → ↓', mac: '← ↑ → ↓' },
    { func: '撤销', win: 'Ctrl + Z', mac: '⌘ + Z' },
    { func: '重做', win: 'Ctrl + Y / Ctrl + Shift + Z', mac: '⌘ + Y / ⌘ + Shift + Z' },
    { func: '缩放', win: 'Ctrl + +/-', mac: '⌘ + +/-' },
    { func: '搜索', win: 'Ctrl + F', mac: '⌘ + F' },
    { func: '保存', win: 'Ctrl + S', mac: '⌘ + S' },
    { func: '适应视图', win: 'Shift + F', mac: 'Shift + F' },
    { func: '视图居中', win: 'Shift + C', mac: 'Shift + C' },
    { func: '只读模式', win: 'Shift + R', mac: 'Shift + R' },
    { func: '编辑模式', win: 'Shift + W', mac: 'Shift + W' },
];

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ position, onClose }) => {
    const handleWheel = (e: React.WheelEvent) => {
        // Stop the wheel event from bubbling up to the canvas,
        // which would otherwise cause the canvas to zoom.
        e.stopPropagation();
    };

    return (
        <div className="shortcuts-panel" style={{ top: position.top, right: position.right }} onWheel={handleWheel}>
             <div className="shortcuts-panel__header">
                <h3>快捷键</h3>
                <button className="shortcuts-panel__close-button" onClick={onClose} title="关闭">
                    <FiX size={18} />
                </button>
            </div>
            <div className="shortcuts-panel__content">
                <div className="shortcuts-panel__row shortcuts-panel__table-header">
                    <div className="shortcuts-panel__col-func">功能</div>
                    <div className="shortcuts-panel__col-key"><FaWindows /> Windows</div>
                    <div className="shortcuts-panel__col-key"><FaApple /> macOS</div>
                </div>
                {shortcuts.map(({ func, win, mac }, index) => (
                    <div className="shortcuts-panel__row" key={index}>
                        <div className="shortcuts-panel__col-func">{func}</div>
                        <div className="shortcuts-panel__col-key">
                            {win.split(' / ').map(k => <kbd key={k}>{k}</kbd>)}
                        </div>
                        <div className="shortcuts-panel__col-key">
                            {mac.split(' / ').map(k => <kbd key={k}>{k}</kbd>)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// The component was renamed internally, but the file keeps its name for the change.
export { ShortcutsPanel as ShortcutsModal };