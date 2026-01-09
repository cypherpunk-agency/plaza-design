import { ReactNode } from 'react';

export interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'highlight';
}

/**
 * Panel component for content sections.
 * Uses plaza-panel CSS class for styling.
 */
export function Panel({ children, className = '', variant = 'default' }: PanelProps) {
  const variantClass = variant !== 'default' ? `plaza-panel--${variant}` : '';
  return (
    <div className={`plaza-panel ${variantClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

export interface PanelBlockProps {
  children: ReactNode;
  header?: string;
  className?: string;
}

/**
 * Panel block with optional header label.
 */
export function PanelBlock({ children, header, className = '' }: PanelBlockProps) {
  return (
    <div className={`plaza-side-panel__block ${className}`.trim()}>
      {header && <div className="plaza-side-panel__header">{header}</div>}
      {children}
    </div>
  );
}
