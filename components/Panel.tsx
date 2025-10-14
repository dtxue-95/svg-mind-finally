import React from 'react';

export type PanelPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center-left'
  | 'center'
  | 'center-right';

interface PanelProps {
  position: PanelPosition;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Panel: React.FC<PanelProps> = ({ position, children, className, style }) => {
  const panelClasses = `mind-map-panel mind-map-panel--${position} ${className || ''}`.trim();

  return (
    <div className={panelClasses} style={style}>
      {children}
    </div>
  );
};
