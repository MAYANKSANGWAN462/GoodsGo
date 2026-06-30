import PropTypes from 'prop-types';

const PADDING_CLASSES = {
  none: '',
  xs:   'p-3',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
  xl:   'p-8',
};

const ELEVATION_CLASSES = {
  flat:   'shadow-none',
  sm:     'shadow-sm',
  md:     'shadow-md',
  raised: 'shadow-lg',
};

/**
 * General-purpose surface container.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'none'|'xs'|'sm'|'md'|'lg'|'xl'} [props.padding='md']
 * @param {'flat'|'sm'|'md'|'raised'} [props.elevation='sm']
 * @param {string} [props.className='']
 * @param {function} [props.onClick]   - Makes the card interactive (cursor-pointer + hover lift)
 * @param {boolean} [props.hoverable]  - Enable hover lift even without an onClick handler
 * @param {boolean} [props.noBorder]   - Remove the border
 */
export default function Card({
  children,
  padding = 'md',
  elevation = 'sm',
  className = '',
  onClick,
  hoverable = false,
  noBorder = false,
}) {
  const interactive = Boolean(onClick) || hoverable;

  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface rounded-xl transition-all duration-150',
        noBorder ? '' : 'border border-border',
        ELEVATION_CLASSES[elevation] ?? ELEVATION_CLASSES.sm,
        PADDING_CLASSES[padding] ?? PADDING_CLASSES.md,
        interactive
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
          : '',
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
  padding: PropTypes.oneOf(['none', 'xs', 'sm', 'md', 'lg', 'xl']),
  elevation: PropTypes.oneOf(['flat', 'sm', 'md', 'raised']),
  className: PropTypes.string,
  onClick: PropTypes.func,
  hoverable: PropTypes.bool,
  noBorder: PropTypes.bool,
};
