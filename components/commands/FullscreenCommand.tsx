import React, { useState, useEffect, useCallback } from 'react';
import { FiMaximize, FiMinimize } from 'react-icons/fi';

interface FullscreenCommandProps {
    canvasElementRef: React.RefObject<HTMLElement>;
}

export const FullscreenCommand: React.FC<FullscreenCommandProps> = ({ canvasElementRef }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenChange = useCallback(() => {
        // State is now based on whether our specific element is the one in fullscreen.
        const isElementFullscreen = document.fullscreenElement === canvasElementRef.current;
        setIsFullscreen(isElementFullscreen);
    }, [canvasElementRef]);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [handleFullscreenChange]);

    const toggleFullscreen = useCallback(async () => {
        const element = canvasElementRef.current;
        if (!element) return;

        // If no element is currently in fullscreen mode, request it for our canvas.
        if (!document.fullscreenElement) {
            try {
                await element.requestFullscreen();
            } catch (err) {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            }
        } else {
            // If any element is in fullscreen, exit.
            try {
                await document.exitFullscreen();
            } catch (err) {
                console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
            }
        }
    }, [canvasElementRef]);

    return (
        <button 
            onClick={toggleFullscreen} 
            className="bottom-toolbar__button" 
            title={isFullscreen ? "退出全屏" : "全屏"}
        >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
        </button>
    );
};