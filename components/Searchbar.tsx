
import React, { useEffect, useRef } from 'react';
import { FiChevronUp, FiChevronDown, FiX } from 'react-icons/fi';
import type { CanvasAction } from '../state/canvasReducer';
import type { MindMapData } from '../types';

interface SearchbarProps {
    dispatch: React.Dispatch<CanvasAction>;
    searchQuery: string;
    searchMatches: string[];
    currentMatchIndex: number | null;
    mindMapData: MindMapData;
}

export const Searchbar: React.FC<SearchbarProps> = ({
    dispatch,
    searchQuery,
    searchMatches,
    currentMatchIndex,
    mindMapData
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({ type: 'SET_SEARCH_QUERY', payload: { query: e.target.value, nodes: mindMapData.nodes } });
    };

    const handlePrev = () => dispatch({ type: 'GO_TO_PREVIOUS_MATCH' });
    const handleNext = () => dispatch({ type: 'GO_TO_NEXT_MATCH' });
    const handleClose = () => dispatch({ type: 'STOP_SEARCH' });
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            handleClose();
            return;
        }

        if (searchMatches.length > 0) {
            if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'ArrowDown') {
                e.preventDefault();
                handleNext();
            } else if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowUp') {
                e.preventDefault();
                handlePrev();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if it was in a form
        }
    };

    const totalMatches = searchMatches.length;
    const currentIndexDisplay = totalMatches > 0 && currentMatchIndex !== null ? currentMatchIndex + 1 : 0;
    
    return (
        <div className="searchbar">
            <input
                ref={inputRef}
                type="text"
                placeholder="搜索节点..."
                value={searchQuery}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                className="searchbar__input"
            />
            <span className="searchbar__count">
                {currentIndexDisplay} / {totalMatches}
            </span>
            <div className="searchbar__nav">
                <button onClick={handlePrev} disabled={totalMatches === 0} title="Previous Match (Shift+Enter / Arrow Up)">
                    <FiChevronUp />
                </button>
                <button onClick={handleNext} disabled={totalMatches === 0} title="Next Match (Enter / Arrow Down)">
                    <FiChevronDown />
                </button>
            </div>
            <button onClick={handleClose} className="searchbar__close" title="Close Search (Esc)">
                <FiX />
            </button>
        </div>
    );
};