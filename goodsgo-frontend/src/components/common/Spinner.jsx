import PropTypes from 'prop-types';

const SIZE_CLASSES = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
};

/**
 * Circular loading indicator.
 *
 * @param {object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @param {string} [props.className='']  - Use to override colour (text-primary, text-white, etc.)
 */
export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-current border-t-transparent animate-spin flex-shrink-0 ${
        SIZE_CLASSES[size] ?? SIZE_CLASSES.md
      } ${className}`}
    />
  );
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};
