import PropTypes from 'prop-types';

/**
 * Labelled select/dropdown with error state and dark-mode support.
 * Renders a native <select> with a custom chevron overlay.
 *
 * @param {object}  props
 * @param {string}  [props.label]
 * @param {string}  [props.id]
 * @param {Array<{value: string, label: string}>} [props.options=[]]
 * @param {string}  [props.error]
 * @param {string}  [props.placeholder]
 * @param {boolean} [props.disabled=false]
 * @param {string}  [props.className='']
 */
export default function Select({
  label,
  id,
  options = [],
  error,
  placeholder,
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

      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          className={[
            'w-full appearance-none rounded-lg border bg-surface text-text text-sm',
            'px-3.5 py-2.5 pr-9',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:bg-surface-alt disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-75',
            ringClass,
          ].join(' ')}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom chevron */}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </div>

      {hasError && (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })
  ),
  error: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
