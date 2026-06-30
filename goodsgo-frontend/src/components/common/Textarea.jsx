import PropTypes from 'prop-types';

/**
 * Multi-line text input with label, error/helper text, and dark-mode support.
 *
 * @param {object}  props
 * @param {string}  [props.label]
 * @param {string}  [props.id]
 * @param {string}  [props.error]
 * @param {string}  [props.helperText]
 * @param {number}  [props.rows=4]
 * @param {boolean} [props.disabled=false]
 * @param {string}  [props.className='']
 */
export default function Textarea({
  label,
  id,
  error,
  helperText,
  rows = 4,
  disabled = false,
  className = '',
  ...rest
}) {
  const hasError = Boolean(error);
  const ringClass = hasError
    ? 'border-danger focus:ring-danger/40 focus:border-danger'
    : 'border-border focus:ring-primary/30 focus:border-primary hover:border-border-strong';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}

      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        className={[
          'w-full rounded-lg border bg-surface text-text placeholder-text-subtle text-sm',
          'px-3.5 py-2.5',
          'transition-all duration-150 resize-y',
          'focus:outline-none focus:ring-2',
          'disabled:bg-surface-alt disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-75',
          ringClass,
        ].join(' ')}
        {...rest}
      />

      {hasError ? (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  );
}

Textarea.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  rows: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
