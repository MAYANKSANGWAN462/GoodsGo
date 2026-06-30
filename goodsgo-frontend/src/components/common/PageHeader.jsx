import PropTypes from 'prop-types';

/**
 * Consistent page title bar with optional description, back button, and actions.
 * Place it at the top of every page for uniform visual hierarchy.
 *
 * @param {object}          props
 * @param {string}          props.title
 * @param {string}          [props.description]
 * @param {React.ReactNode} [props.actions]   - Buttons / controls rendered on the right
 * @param {function}        [props.onBack]    - Renders a back chevron when provided
 * @param {string}          [props.backLabel='Back']
 * @param {React.ReactNode} [props.badge]     - Small badge/chip rendered beside the title
 * @param {string}          [props.className='']
 */
export default function PageHeader({
  title,
  description,
  actions,
  onBack,
  backLabel = 'Back',
  badge,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* Back link */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-3 group transition-colors"
        >
          <svg
            className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          {backLabel}
        </button>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-text leading-tight">{title}</h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="mt-1 text-sm text-text-muted leading-relaxed">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  onBack: PropTypes.func,
  backLabel: PropTypes.string,
  badge: PropTypes.node,
  className: PropTypes.string,
};
