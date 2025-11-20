import React, { useEffect, useState, useRef } from 'react';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    visible: boolean;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'error', visible, onClose, duration = 6000 }) => {
    const [show, setShow] = useState(visible);
    const [isHovered, setIsHovered] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setShow(visible);
    }, [visible]);

    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (show && !isHovered && duration > 0) {
            timerRef.current = setTimeout(() => {
                setShow(false);
                onClose();
            }, duration);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [show, isHovered, duration, onClose]);

    if (!show) return null;

    return (
        <div 
            className={`toast-message toast-message--${type}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
            <span>{message}</span>
        </div>
    );
};
