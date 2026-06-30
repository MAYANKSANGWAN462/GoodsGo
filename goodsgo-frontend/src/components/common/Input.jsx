import PropTypes from 'prop-types';

/**
 * Labelled text input with optional leading/trailing icon, error/helper text,
 * and full dark-mode support.
 *
 * @param {object}         props
 * @param {string}         [props.label]
 * @param {string}         [props.id]
 * @param {string}         [props.error]
 * @param {string}         [props.helperText]
 * @param {string}         [props.type='text']
 * @param {boolean}        [props.disabled=false]
 * @param {React.ReactNode} [props.leadingIcon]  - Rendered inside the left edge of the input
 * @param {React.ReactNode} [props.trailingIcon] - Rendered inside the right edge of the input
 * @param {string}         [props.className='']  - Applied to the outer wrapper
 */
export default function Input({
  label,
  id,
  error,
  helperText,
  type = 'text',
  disabled = false,
  leadingIcon,
  trailingIcon,
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

      <div className="relative">
        {leadingIcon && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            {leadingIcon}
          </span>
        )}

        <input
          id={id}
          type={type}
          disabled={disabled}
          className={[
            'w-full rounded-lg border bg-surface text-text placeholder-text-subtle text-sm',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:bg-surface-alt disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-75',
            leadingIcon  ? 'pl-9'  : 'px-3.5',
            trailingIcon ? 'pr-9'  : 'pr-3.5',
            'py-2.5',
            ringClass,
          ].join(' ')}
          {...rest}
        />

        {trailingIcon && (
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
            {trailingIcon}
          </span>
        )}
      </div>

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

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  type: PropTypes.string,
  disabled: PropTypes.bool,
  leadingIcon: PropTypes.node,
  trailingIcon: PropTypes.node,
  className: PropTypes.string,
};
