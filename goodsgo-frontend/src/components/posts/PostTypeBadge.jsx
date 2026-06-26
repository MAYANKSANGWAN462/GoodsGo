import PropTypes from 'prop-types';
import Badge from '../common/Badge';
import { POST_TYPES } from '../../constants/postTypes';

/**
 * Thin wrapper that maps a post_type value to a colour-coded Badge.
 */
export default function PostTypeBadge({ type, size = 'sm' }) {
  const config = POST_TYPES[type];
  if (!config) return null;
  return (
    <Badge variant={config.badgeVariant} size={size}>
      {config.label}
    </Badge>
  );
}

PostTypeBadge.propTypes = {
  type: PropTypes.oneOf(['need_transport', 'vehicle_available', 'return_journey']).isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
};
