import PropTypes from 'prop-types';

const VARIANT_CLASSES = {
  default: 'bg-primary/10 text-primary dark:bg-primary/20',
  secondary:'bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-blue-300',
  success:  'bg-success-subtle text-green-700 dark:text-green-400',
  warning:  'bg-warning-subtle text-amber-700 dark:text-amber-400',
  danger:   'bg-danger-subtle text-danger dark:text-red-400',
  info:     'bg-info-subtle text-info dark:text-blue-400',
  neutral:  'bg-overlay-strong text-text-muted',
};

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-sm gap-1.5',
};

/**
 * Small status or category indicator pill.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'default'|'secondary'|'success'|'warning'|'danger'|'info'|'neutral'} [props.variant='default']
 * @param {'xs'|'sm'|'md'} [props.size='sm']
 * @param {React.ReactNode} [props.icon] - Optional leading icon
 * @param {boolean} [props.dot=false]    - Show a coloured dot instead of text
 */
export default function Badge({ children, variant = 'default', size = 'sm', icon, dot = false }) {
  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-full',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.sm,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            variant === 'success' ? 'bg-success' :
            variant === 'warning' ? 'bg-warning' :
            variant === 'danger'  ? 'bg-danger' :
            variant === 'info'    ? 'bg-info' :
            'bg-primary'
          }`}
        />
      )}
      {!dot && icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral']),
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
  icon: PropTypes.node,
  dot: PropTypes.bool,
};
