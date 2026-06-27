import { useState } from 'react';
import PropTypes from 'prop-types';

const SIZE_CLASSES = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };

function StarIcon({ filled, half, size, interactive, onHover, onLeave, onClick, label }) {
  const cls = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <button
      type="button"
      className={`relative ${cls} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
      onMouseEnter={interactive ? onHover : undefined}
      onMouseLeave={interactive ? onLeave : undefined}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
    >
      {/* Empty (background) star */}
      <svg viewBox="0 0 24 24" className="w-full h-full text-gray-300" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>

      {/* Filled overlay — full or half */}
      {(filled || half) && (
        <span
          className="absolute inset-0 overflow-hidden text-warning"
          style={{ width: half ? '50%' : '100%' }}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      )}
    </button>
  );
}

StarIcon.propTypes = {
  filled: PropTypes.bool,
  half: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  interactive: PropTypes.bool,
  onHover: PropTypes.func,
  onLeave: PropTypes.func,
  onClick: PropTypes.func,
  label: PropTypes.string,
};

/**
 * Star rating display and interactive input component.
 * Read-only when `readOnly` is true or `onChange` is absent.
 * Interactive when `onChange` is provided and `readOnly` is false.
 *
 * @param {{ value?: number, onChange?: function, size?: 'sm'|'md'|'lg', readOnly?: boolean }} props
 */
export default function StarRating({ value = 0, onChange, size = 'md', readOnly = false }) {
  const [hovered, setHovered] = useState(null);
  const interactive = !readOnly && Boolean(onChange);
  const display = interactive && hovered !== null ? hovered : value;

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? 'group' : 'img'}
      aria-label={`Rating: ${Number(value).toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half = !filled && display >= star - 0.5;
        return (
          <StarIcon
            key={star}
            filled={filled}
            half={half}
            size={size}
            interactive={interactive}
            label={`${star} star${star !== 1 ? 's' : ''}`}
            onHover={() => setHovered(star)}
            onLeave={() => setHovered(null)}
            onClick={() => onChange && onChange(star)}
          />
        );
      })}

      {/* Numeric display in read-only mode */}
      {!interactive && value > 0 && (
        <span className="ml-1 text-sm text-text-muted">{Number(value).toFixed(1)}</span>
      )}
    </div>
  );
}

StarRating.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  readOnly: PropTypes.bool,
};
