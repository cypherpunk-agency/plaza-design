import { ReactNode, useEffect } from 'react';
import { Window } from './Window';

export interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

/**
 * Modal dialog component with backdrop.
 * Uses Window component for the modal content.
 */
export function Modal({
  children,
  isOpen,
  onClose,
  title,
  footer,
  className = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const header = title ? (
    <>
      <span className="text-primary-500">{title}</span>
      <button
        onClick={onClose}
        className="text-primary-600 hover:text-primary-400 transition-colors cursor-pointer"
        style={{ background: 'none', border: 'none' }}
        aria-label="Close modal"
      >
        [X]
      </button>
    </>
  ) : undefined;

  return (
    <div
      className="plaza-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <Window
        className={`plaza-modal ${className}`.trim()}
        header={header}
        footer={footer}
      >
        <div className="plaza-modal__content">
          {children}
        </div>
      </Window>
    </div>
  );
}
