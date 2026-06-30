import PropTypes from 'prop-types';

/**
 * Centred empty-state illustration with title, message, and optional CTA.
 *
 * @param {object}          props
 * @param {React.ReactNode} [props.icon]
 * @param {string}          props.title
 * @param {string}          [props.message]
 * @param {React.ReactNode} [props.action]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export default function EmptyState({ icon, title, message, action, size = 'md' }) {
  const iconSizeClass = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  const titleClass    = size === 'sm' ? 'text-base'  : size === 'lg' ? 'text-2xl'  : 'text-lg';
  const padClass      = size === 'sm' ? 'py-10'      : size === 'lg' ? 'py-24'     : 'py-16';

  return (
    <div className={`flex flex-col items-center justify-center ${padClass} px-4 text-center`}>
      {icon && (
        <div
          className={`mb-5 ${iconSizeClass} rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-text-muted shadow-sm`}
        >
          {icon}
        </div>
      )}

      <h3 className={`${titleClass} font-semibold text-text mb-2`}>{title}</h3>

      {message && (
        <p className="text-text-muted text-sm leading-relaxed max-w-sm mb-5">{message}</p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  action: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};
