import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import type { MindMapNodeData, CanvasTransform } from '../types';

// Increased padding for a more spacious look in the minimap.
const PADDING = 20;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;

interface MinimapProps {
    nodes: Record<string, MindMapNodeData>;
    canvasTransform: CanvasTransform;
    canvasRef: React.RefObject<HTMLDivElement>;
    isBottomToolbarVisible: boolean;
    onSetTransform: (transform: Partial<CanvasTransform>) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ nodes, canvasTransform, canvasRef, isBottomToolbarVisible, onSetTransform }) => {
    const minimapRef = useRef<SVGSVGElement>(null);
    // Refactored dragState to support smooth, delta-based dragging.
    const dragState = useRef<{ isDragging: boolean; lastX: number; lastY: number; } | null>(null);

    const { minimapViewBox } = useMemo(() => {
        const nodeList = Object.values(nodes);
        if (nodeList.length === 0) {
            return { minimapViewBox: '0 0 200 150' };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodeList.forEach(node => {
            if (node.position && typeof node.width !== 'undefined' && typeof node.height !== 'undefined') {
                minX = Math.min(minX, node.position.x);
                minY = Math.min(minY, node.position.y);
                maxX = Math.max(maxX, node.position.x + node.width);
                maxY = Math.max(maxY, node.position.y + node.height);
            }
        });

        if (minX === Infinity) { // No nodes with position/dimensions
            return { minimapViewBox: '0 0 200 150' };
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        if (contentWidth <= 0 || contentHeight <= 0) {
             return { minimapViewBox: `${minX - 100} ${minY - 75} 200 150` };
        }
        
        const scaleX = (MINIMAP_WIDTH - PADDING * 2) / contentWidth;
        const scaleY = (MINIMAP_HEIGHT - PADDING * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY);

        const viewBoxWidth = MINIMAP_WIDTH / scale;
        const viewBoxHeight = MINIMAP_HEIGHT / scale;
        const viewBoxX = minX - (viewBoxWidth - contentWidth) / 2;
        const viewBoxY = minY - (viewBoxHeight - contentHeight) / 2;

        return {
            minimapViewBox: `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
        };
    }, [nodes]);
    
    const viewportRect = useMemo(() => {
        if (!canvasRef.current) return null;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        return {
            x: -canvasTransform.translateX / canvasTransform.scale,
            y: -canvasTransform.translateY / canvasTransform.scale,
            width: canvasRect.width / canvasTransform.scale,
            height: canvasRect.height / canvasTransform.scale,
        };
    }, [canvasRef, canvasTransform]);

    const handleJumpTo = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!canvasRef.current || !minimapRef.current || dragState.current?.isDragging) return;
        
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const minimapRect = minimapRef.current.getBoundingClientRect();

        const clientX = e.clientX;
        const clientY = e.clientY;
        const svgX = clientX - minimapRect.left;
        const svgY = clientY - minimapRect.top;

        const [vbX, vbY, vbW, vbH] = minimapViewBox.split(' ').map(Number);
        const worldX = vbX + (svgX / MINIMAP_WIDTH) * vbW;
        const worldY = vbY + (svgY / MINIMAP_HEIGHT) * vbH;
        
        const newTranslateX = canvasRect.width / 2 - worldX * canvasTransform.scale;
        const newTranslateY = canvasRect.height / 2 - worldY * canvasTransform.scale;

        onSetTransform({ translateX: newTranslateX, translateY: newTranslateY });
    };

    const handlePanStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        dragState.current = {
            isDragging: true,
            lastX: e.clientX,
            lastY: e.clientY,
        };
        document.body.classList.add('canvas-interaction-no-select');
        window.addEventListener('mousemove', handlePanMove);
        window.addEventListener('mouseup', handlePanEnd);
    };

    // Implemented smooth dragging logic.
    const handlePanMove = useCallback((e: MouseEvent) => {
        if (!dragState.current?.isDragging || !minimapRef.current) return;

        // Calculate delta from the last mouse position for smooth movement.
        const dx_mouse = e.clientX - dragState.current.lastX;
        const dy_mouse = e.clientY - dragState.current.lastY;
        
        // Update the last position for the next move event.
        dragState.current.lastX = e.clientX;
        dragState.current.lastY = e.clientY;

        const [vbX, vbY, vbW, vbH] = minimapViewBox.split(' ').map(Number);
        if (isNaN(vbW) || isNaN(vbH) || vbW === 0 || vbH === 0) return;

        // Convert mouse delta to the minimap's world coordinate delta.
        const delta_world_x = dx_mouse * (vbW / MINIMAP_WIDTH);
        const delta_world_y = dy_mouse * (vbH / MINIMAP_HEIGHT);
        
        // The main canvas transform moves by the opposite of the world delta, scaled by the main canvas's zoom.
        const dx_transform = -delta_world_x * canvasTransform.scale;
        const dy_transform = -delta_world_y * canvasTransform.scale;
        
        const newTranslateX = canvasTransform.translateX + dx_transform;
        const newTranslateY = canvasTransform.translateY + dy_transform;

        onSetTransform({ translateX: newTranslateX, translateY: newTranslateY });

    }, [onSetTransform, canvasTransform, minimapViewBox]);

    const handlePanEnd = useCallback(() => {
        if (dragState.current) {
            dragState.current.isDragging = false;
        }
        document.body.classList.remove('canvas-interaction-no-select');
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
    }, [handlePanMove]);

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        };
    }, [handlePanMove, handlePanEnd]);


    const minimapStyle: React.CSSProperties = {
        bottom: isBottomToolbarVisible ? '86px' : '20px',
    };

    return (
        <div className="minimap" style={minimapStyle}>
            <svg
                ref={minimapRef}
                className="minimap-svg"
                width={MINIMAP_WIDTH}
                height={MINIMAP_HEIGHT}
                viewBox={minimapViewBox}
                onClick={handleJumpTo}
            >
                {Object.values(nodes).map(node => (
                    <rect
                        key={node.uuid}
                        className="minimap-node"
                        x={node.position?.x ?? 0}
                        y={node.position?.y ?? 0}
                        width={node.width ?? 0}
                        height={node.height ?? 0}
                    />
                ))}
                {viewportRect && (
                     <rect
                        className="minimap-viewport"
                        x={viewportRect.x}
                        y={viewportRect.y}
                        width={viewportRect.width}
                        height={viewportRect.height}
                        onMouseDown={handlePanStart}
                    />
                )}
            </svg>
        </div>
    );
};
