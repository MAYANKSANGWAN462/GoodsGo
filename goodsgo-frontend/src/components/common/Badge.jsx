import PropTypes from 'prop-types';

const VARIANT_CLASSES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({ children, variant = 'default', size = 'sm' }) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.sm,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'danger', 'info', 'neutral']),
  size: PropTypes.oneOf(['sm', 'md']),
};
