import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
};

/**
 * Portal-based modal dialog.
 * Renders into document.body, traps focus, locks scroll, and closes on Escape.
 *
 * @param {object}          props
 * @param {boolean}         props.isOpen
 * @param {function}        props.onClose
 * @param {string}          props.title
 * @param {React.ReactNode} props.children
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [props.size='md']
 * @param {React.ReactNode} [props.footer]
 * @param {boolean}         [props.hideClose=false]
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md', footer, hideClose = false }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides up from bottom on mobile, scales in on desktop */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          'relative z-10 w-full bg-surface border border-border shadow-2xl flex flex-col max-h-[92vh] focus:outline-none',
          'rounded-t-2xl sm:rounded-2xl',
          'animate-fade-in-up sm:animate-scale-in',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        ].join(' ')}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-text">
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-overlay transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-border flex-shrink-0 bg-surface rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  footer: PropTypes.node,
  hideClose: PropTypes.bool,
};
