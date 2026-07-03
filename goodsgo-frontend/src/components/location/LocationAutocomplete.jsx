import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodeAddress } from '../../services/location.service';
import Spinner from '../common/Spinner';

/**
 * Controlled address input with debounced geocoding suggestion.
 * Visually matches `Input.jsx` — uses design-system tokens so it adapts to
 * light and dark mode. Calls `geocodeAddress` 400ms after the user stops
 * typing (min 3 chars) and shows one suggestion row below the field.
 *
 * @param {string}   id            - Input element id (for label association)
 * @param {string}   value         - Current controlled text value
 * @param {function} onChange      - Called on every keystroke (updates text only)
 * @param {function} onSelect      - Called when user picks a suggestion:
 *                                   (displayName, { lat, lng })
 * @param {string}   label         - Field label text
 * @param {string}   [placeholder]
 * @param {string}   [error]       - Validation error message
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
  const [isFetching, setIsFetching] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedValue = useDebounce(value, 400);

  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 3) {
      setSuggestion(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);

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
        if (!cancelled) setIsFetching(false);
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

  const hasError = Boolean(error);

  const ringClass = hasError
    ? 'border-danger focus:ring-danger/40 focus:border-danger'
    : 'border-border focus:ring-primary/30 focus:border-primary hover:border-border-strong';

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
      )}

      {/* Input wrapper — `relative` so spinner and dropdown anchor to it */}
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
            // Delay so onMouseDown on the suggestion fires before blur closes the dropdown
            setTimeout(() => setOpen(false), 160);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          className={[
            'w-full rounded-lg border bg-surface text-text placeholder-text-subtle text-sm',
            'px-3.5 py-2.5 pr-9',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:bg-surface-alt disabled:text-text-muted disabled:cursor-not-allowed disabled:opacity-75',
            ringClass,
          ].join(' ')}
        />

        {/* Loading spinner — right edge of input */}
        {isFetching && (
          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <Spinner size="sm" className="text-text-muted" />
          </span>
        )}

        {/* Suggestion dropdown */}
        {open && suggestion && (
          <div
            className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-border bg-surface shadow-lg animate-fade-in-down overflow-hidden"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent the input's onBlur from firing before the click registers
                e.preventDefault();
                handleSelect();
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-overlay focus:outline-none focus:bg-overlay"
            >
              {/* Pin icon */}
              <span className="mt-0.5 flex-shrink-0 text-primary">
                <svg
                  className="h-4 w-4"
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
              </span>

              {/* Place name */}
              <span className="text-sm text-text leading-snug line-clamp-2">
                {suggestion.displayName}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Error / helper text — matches Input.jsx pattern */}
      {hasError && (
        <p className="text-xs text-danger flex items-center gap-1">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
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
