import { useState } from 'react';
import PropTypes from 'prop-types';
import { generateInitials } from '../../utils/generateInitials';

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const initials = generateInitials(name);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name ?? 'User avatar'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} rounded-full bg-primary text-white flex items-center justify-center font-semibold select-none flex-shrink-0 ${className}`}
      aria-label={name ?? 'User avatar'}
    >
      {initials}
    </span>
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};
