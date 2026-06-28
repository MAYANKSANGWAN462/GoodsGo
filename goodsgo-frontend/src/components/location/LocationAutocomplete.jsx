import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodeAddress } from '../../services/location.service';
import Spinner from '../common/Spinner';

/**
 * Controlled address input with debounced geocoding suggestion.
 * Calls `geocodeAddress` 400ms after the user stops typing (min 3 chars).
 * Shows one suggestion row; clicking it fills the display name and passes
 * coordinates up via `onSelect`.
 *
 * @param {string}   id          - Input element id (for label association)
 * @param {string}   value       - Current controlled text value
 * @param {function} onChange    - Called on every keystroke (updates the text only)
 * @param {function} onSelect    - Called when user picks a suggestion: (displayName, { lat, lng })
 * @param {string}   label       - Field label text
 * @param {string}   [placeholder]
 * @param {string}   [error]     - Validation error message
 */
export default function LocationAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  label,
  placeholder,
  error,
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedValue = useDebounce(value, 400);

  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 3) {
      setSuggestion(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    geocodeAddress(debouncedValue)
      .then((result) => {
        if (cancelled) return;
        setSuggestion(result ?? null);
        setOpen(Boolean(result));
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestion(null);
        setOpen(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  function handleSelect() {
    if (!suggestion) return;
    onChange(suggestion.displayName);
    onSelect(suggestion.displayName, { lat: suggestion.lat, lng: suggestion.lng });
    setOpen(false);
    setSuggestion(null);
  }

  const borderClass = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:ring-primary';

  return (
    <div className="relative flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(false);
          }}
          onBlur={() => {
            // Short delay so onMouseDown on the suggestion can fire first
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ${borderClass}`}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <Spinner size="sm" className="text-gray-400" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {open && suggestion && (
        <div className="absolute top-full z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              // Prevent input blur before the click registers
              e.preventDefault();
              handleSelect();
            }}
            className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="line-clamp-2">{suggestion.displayName}</span>
          </button>
        </div>
      )}
    </div>
  );
}

LocationAutocomplete.propTypes = {
  id: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
};
