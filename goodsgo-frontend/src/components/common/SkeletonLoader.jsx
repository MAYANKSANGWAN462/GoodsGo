import PropTypes from 'prop-types';

/**
 * Shimmer skeleton placeholder — drop in wherever content is loading.
 *
 * @param {object}  props
 * @param {string}  [props.className=''] - Controls width, height, and border-radius
 * @param {'rect'|'circle'|'text'} [props.variant='rect']
 * @param {number}  [props.lines=1]  - Number of text lines (only used when variant='text')
 */
export default function SkeletonLoader({ className = '', variant = 'rect', lines = 1 }) {
  if (variant === 'circle') {
    return (
      <span className={`skeleton block rounded-full ${className || 'w-10 h-10'}`} aria-hidden="true" />
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className="skeleton block h-3.5"
            style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  return (
    <span className={`skeleton block ${className || 'w-full h-4'}`} aria-hidden="true" />
  );
}

SkeletonLoader.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['rect', 'circle', 'text']),
  lines: PropTypes.number,
};

/* ── Compound skeleton patterns ────────────────────────────── */

/**
 * Card-shaped content placeholder with avatar, text lines, and bottom row.
 *
 * @param {object}  [props]
 * @param {string}  [props.className='']
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl p-5 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-start gap-3 mb-4">
        <SkeletonLoader variant="circle" className="w-10 h-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <SkeletonLoader className="w-1/2 h-3.5 mb-2" />
          <SkeletonLoader className="w-3/4 h-3" />
        </div>
      </div>
      <SkeletonLoader variant="text" lines={3} className="mb-4" />
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <SkeletonLoader className="w-20 h-6 rounded-full" />
        <SkeletonLoader className="w-16 h-8 rounded-lg" />
      </div>
    </div>
  );
}

SkeletonCard.propTypes = {
  className: PropTypes.string,
};

/**
 * List-row skeleton for table-like layouts.
 *
 * @param {object} [props]
 * @param {string} [props.className='']
 */
export function SkeletonRow({ className = '' }) {
  return (
    <div
      className={`flex items-center gap-4 py-3.5 px-4 border-b border-border last:border-0 ${className}`}
      aria-hidden="true"
    >
      <SkeletonLoader variant="circle" className="w-9 h-9 shrink-0" />
      <div className="flex-1 min-w-0">
        <SkeletonLoader className="w-1/3 h-3.5 mb-1.5" />
        <SkeletonLoader className="w-1/2 h-3" />
      </div>
      <SkeletonLoader className="w-16 h-5 rounded-full" />
    </div>
  );
}

SkeletonRow.propTypes = {
  className: PropTypes.string,
};
