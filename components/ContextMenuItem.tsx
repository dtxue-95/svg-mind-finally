import React, { useState, useRef, useEffect } from 'react';

type RegularItemProps = {
    onClick?: (e: React.MouseEvent) => void;
    children?: React.ReactNode;
    disabled?: boolean;
    hasSubmenu?: boolean;
    submenu?: React.ReactNode;
    centerContent?: boolean;
};

type SeparatorItemProps = {
    isSeparator: true;
};

type ContextMenuItemProps = RegularItemProps | SeparatorItemProps;

export const ContextMenuItem: React.FC<ContextMenuItemProps> = (props) => {
    const [showSubmenu, setShowSubmenu] = useState(false);
    const hideTimeoutRef = useRef<number | null>(null);

    // Effect to clear timeout on unmount
    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    if ('isSeparator' in props && props.isSeparator) {
        return <li className="context-menu__separator" />;
    }

    // After the guard clause, `props` is narrowed to `RegularItemProps`.
    const { onClick, disabled = false, children, hasSubmenu = false, submenu, centerContent = false } = props as RegularItemProps;

    const handleMouseEnter = () => {
        if (hasSubmenu && !disabled) {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
            setShowSubmenu(true);
        }
    };

    const handleMouseLeave = () => {
        if (hasSubmenu) {
            hideTimeoutRef.current = window.setTimeout(() => {
                setShowSubmenu(false);
            }, 200); // 200ms delay to allow moving to the submenu
        }
    };
    
    const handleClick = (e: React.MouseEvent) => {
        // If the item is a submenu trigger, don't execute the primary click action.
        if (hasSubmenu) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        // Safely call onClick as it is optional
        onClick?.(e);
    };

    return (
        <li
            className="context-menu__item"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button 
                onClick={handleClick} 
                disabled={disabled}
                style={{ justifyContent: centerContent ? 'center' : undefined }}
            >
                {children}
                {hasSubmenu && <span className="submenu-arrow">▶</span>}
            </button>
            {showSubmenu && submenu}
        </li>
    );
};