import PropTypes from 'prop-types';

const BASE_CLASSES =
  'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-400 ' +
  'disabled:cursor-not-allowed bg-white appearance-none';

export default function Select({
  label,
  id,
  options = [],
  error,
  placeholder,
  disabled = false,
  ...rest
}) {
  const borderClass = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-primary';

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id}
        disabled={disabled}
        className={`${BASE_CLASSES} ${borderClass}`}
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
      {error && <p className="text-xs text-red-600">{error}</p>}
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
};
