import { ReactNode } from 'react';

export interface WindowProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Window component with corner brackets and optional header/footer.
 * Uses plaza-window CSS class for styling.
 */
export function Window({ children, className = '', header, footer }: WindowProps) {
  return (
    <div className={`plaza-window ${className}`.trim()}>
      {/* Corner Brackets */}
      <div className="plaza-corner-bracket plaza-corner-bracket--tl" />
      <div className="plaza-corner-bracket plaza-corner-bracket--tr" />
      <div className="plaza-corner-bracket plaza-corner-bracket--bl" />
      <div className="plaza-corner-bracket plaza-corner-bracket--br" />

      {/* Header Bar */}
      {header && <div className="plaza-window-header">{header}</div>}

      {/* Main Content Area */}
      {children}

      {/* Footer Bar */}
      {footer && <div className="plaza-window-footer">{footer}</div>}
    </div>
  );
}
