import { useEffect } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Button from './Button';

/**
 * Confirmation modal for destructive or irreversible actions.
 * Self-contained portal — does not depend on Modal.jsx.
 *
 * @param {object}  props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {function} props.onConfirm
 * @param {string}  props.title
 * @param {string}  [props.message]
 * @param {string}  [props.confirmLabel='Confirm']
 * @param {'danger'|'primary'} [props.confirmVariant='danger']
 * @param {boolean} [props.isLoading=false]
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isLoading = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconColor = confirmVariant === 'danger'
    ? 'text-danger bg-danger-subtle'
    : 'text-primary bg-primary/10';

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-surface border border-border p-6 shadow-2xl animate-scale-in">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${iconColor}`}>
          {confirmVariant === 'danger' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h2 id="confirm-dialog-title" className="text-base font-semibold text-text mb-1.5">
          {title}
        </h2>
        {message && (
          <p className="text-sm text-text-muted leading-relaxed">{message}</p>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} size="md">
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            size="md"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  confirmLabel: PropTypes.string,
  confirmVariant: PropTypes.oneOf(['danger', 'primary']),
  isLoading: PropTypes.bool,
};
