import { useState } from 'react';
import PropTypes from 'prop-types';
import { generateInitials } from '../../utils/generateInitials';

const SIZE_CLASSES = {
  xs:  'w-6  h-6  text-[10px]',
  sm:  'w-8  h-8  text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-2xl',
};

const RING_CLASSES = {
  none:    '',
  sm:      'ring-2 ring-surface ring-offset-1 ring-offset-surface',
  primary: 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
};

/**
 * Circular user avatar — shows the profile image if available, otherwise
 * renders initials on a brand-coloured background.
 *
 * @param {object}  props
 * @param {string}  [props.src]
 * @param {string}  [props.name]
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md']
 * @param {'none'|'sm'|'primary'} [props.ring='none']
 * @param {string}  [props.className='']
 */
export default function Avatar({ src, name, size = 'md', ring = 'none', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const ringClass = RING_CLASSES[ring] ?? RING_CLASSES.none;
  const initials = generateInitials(name);

  const base = `rounded-full object-cover flex-shrink-0 ${sizeClass} ${ringClass} ${className}`;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name ?? 'User avatar'}
        className={base}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span
      className={`${base} bg-primary text-white flex items-center justify-center font-semibold select-none`}
      aria-label={name ?? 'User avatar'}
    >
      {initials}
    </span>
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  ring: PropTypes.oneOf(['none', 'sm', 'primary']),
  className: PropTypes.string,
};
