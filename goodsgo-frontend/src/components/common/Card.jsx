import PropTypes from 'prop-types';

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({ children, padding = 'md', className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface rounded-xl border border-border shadow-sm',
        PADDING_CLASSES[padding] ?? PADDING_CLASSES.md,
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-150' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg']),
  className: PropTypes.string,
  onClick: PropTypes.func,
};
