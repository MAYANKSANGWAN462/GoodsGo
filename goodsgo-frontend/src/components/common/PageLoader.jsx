import PropTypes from 'prop-types';
import Spinner from './Spinner';

/**
 * Full-area loading overlay — centred spinner with optional label.
 * Use inside a relatively-positioned container for section-scoped loading,
 * or as a direct child of a page for full-page loading.
 *
 * @param {object}  props
 * @param {string}  [props.label='Loading…']
 * @param {'page'|'section'|'inline'} [props.variant='section']
 *   - 'page':    fills the full viewport (position fixed)
 *   - 'section': fills its nearest positioned ancestor (position absolute)
 *   - 'inline':  a simple centred row, no overlay
 */
export default function PageLoader({ label = 'Loading…', variant = 'section' }) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-text-muted">
        <Spinner size="md" className="text-primary" />
        {label && <span className="text-sm font-medium">{label}</span>}
      </div>
    );
  }

  const posClass = variant === 'page' ? 'fixed' : 'absolute';

  return (
    <div
      className={`${posClass} inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-surface/80 backdrop-blur-sm`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" className="text-primary" />
        {label && (
          <p className="text-sm font-medium text-text-muted">{label}</p>
        )}
      </div>
    </div>
  );
}

PageLoader.propTypes = {
  label: PropTypes.string,
  variant: PropTypes.oneOf(['page', 'section', 'inline']),
};
