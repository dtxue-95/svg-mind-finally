
import React, { useRef, useEffect, useState } from 'react';
import { FaWindows, FaApple } from 'react-icons/fa6';
import { FiX } from 'react-icons/fi';

interface ShortcutsPanelProps {
    visible: boolean;
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

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ visible, onClose }) => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(400); // Default width

    // Isolate native wheel events to prevent canvas zooming/panning
    useEffect(() => {
        const drawer = drawerRef.current;
        if (!drawer) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.stopPropagation();
        };

        // Attach native listener to stop propagation to the parent canvas
        drawer.addEventListener('wheel', handleNativeWheel, { passive: false });

        return () => {
            drawer.removeEventListener('wheel', handleNativeWheel);
        };
    }, []);

    // Stop propagation for React synthetic events to prevent canvas interaction (drag/select)
    const stopPropagation = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    // Resizing Logic (Closure-based)
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startWidth = width;
        
        document.body.style.cursor = 'ew-resize';
        document.body.classList.add('canvas-interaction-no-select');

        const handleMouseMove = (moveEvent: MouseEvent) => {
            // Failsafe: If mouse button is not pressed, stop dragging
            if (moveEvent.buttons === 0) {
                cleanup();
                return;
            }

            moveEvent.preventDefault();
            const deltaX = startX - moveEvent.clientX; // Dragging left increases width
            const newWidth = Math.max(300, Math.min(window.innerWidth - 100, startWidth + deltaX));
            setWidth(newWidth);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            upEvent.preventDefault();
            cleanup();
        };

        const cleanup = () => {
            document.body.style.cursor = '';
            document.body.classList.remove('canvas-interaction-no-select');
            window.removeEventListener('mousemove', handleMouseMove, { capture: true });
            window.removeEventListener('mouseup', handleMouseUp, { capture: true });
        };

        window.addEventListener('mousemove', handleMouseMove, { capture: true });
        window.addEventListener('mouseup', handleMouseUp, { capture: true });
    };

    return (
        <div 
            ref={drawerRef}
            className={`remark-drawer ${visible ? 'visible' : ''}`}
            style={{ 
                width: `${width}px`,
                boxShadow: visible ? '-5px 0 25px rgba(0, 0, 0, 0.15)' : 'none',
                pointerEvents: visible ? 'all' : 'none',
                zIndex: 3002 // Slightly higher than outline/remark drawers if needed
            }}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
        >
             {/* Resize Handle */}
             <div className="drawer-resize-handle" onMouseDown={handleMouseDown} />

             <div className="remark-drawer__header">
                <h3>快捷键</h3>
                <button className="remark-drawer__close-btn" onClick={onClose} title="关闭">
                    <FiX size={20} />
                </button>
            </div>
            <div className="remark-drawer__content">
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

export { ShortcutsPanel as ShortcutsModal };
