import PropTypes from 'prop-types';
import Spinner from './Spinner';

const VARIANT_CLASSES = {
  primary:
    'bg-primary hover:bg-primary-dark active:scale-[0.97] text-white border-transparent shadow-sm hover:shadow-md',
  secondary:
    'bg-surface hover:bg-overlay border-border text-text hover:border-border-strong shadow-sm hover:shadow',
  danger:
    'bg-danger hover:bg-red-600 active:scale-[0.97] text-white border-transparent shadow-sm hover:shadow-md',
  ghost:
    'bg-transparent hover:bg-overlay text-text-muted hover:text-text border-transparent',
  outline:
    'bg-transparent hover:bg-primary/8 text-primary border-primary hover:border-primary shadow-none',
};

const SIZE_CLASSES = {
  xs: 'px-2.5 py-1 text-xs gap-1.5 rounded-md',
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-base gap-2 rounded-xl',
  xl: 'px-7 py-3 text-base gap-2.5 rounded-xl',
};

/**
 * Primary interactive control. Supports five visual variants, five sizes,
 * loading state (with spinner), disabled state, and full-width layout.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'primary'|'secondary'|'danger'|'ghost'|'outline'} [props.variant='primary']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {function} [props.onClick]
 * @param {string} [props.className='']
 * @param {boolean} [props.fullWidth=false]
 * @param {React.ReactNode} [props.leftIcon] - Icon rendered before children
 * @param {React.ReactNode} [props.rightIcon] - Icon rendered after children
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  fullWidth = false,
  leftIcon,
  rightIcon,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center font-semibold border transition-all duration-150',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isLoading ? (
        <Spinner size="sm" className="text-current" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost', 'outline']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  leftIcon: PropTypes.node,
  rightIcon: PropTypes.node,
};
