import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import StarRating from '../common/StarRating';
import VerificationBadges from './VerificationBadges';
import { formatDate } from '../../utils/formatters';

/**
 * Profile header card: avatar, name, rating, location, bio, member-since, and verification badges.
 * Optionally shows an "Edit profile" link for the own-profile view.
 */
export default function ProfileHeader({ user, isOwnProfile, onSettingsClick }) {
  if (!user) return null;

  const location = [user.city, user.state, user.country].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col sm:flex-row items-start gap-5">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar src={user.profileImageUrl} name={user.fullName} size="xl" />
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text">{user.fullName}</h1>
          {isOwnProfile && onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className="text-xs text-primary hover:underline focus:outline-none"
            >
              Edit profile
            </button>
          )}
        </div>

        {/* Star rating */}
        {user.rating !== null && user.rating !== undefined && Number(user.rating) > 0 && (
          <div className="mt-1.5">
            <StarRating value={Number(user.rating)} readOnly size="sm" />
          </div>
        )}

        {/* Location */}
        {location && (
          <p className="text-sm text-text-muted mt-1">
            <span aria-label="Location">{location}</span>
          </p>
        )}

        {/* Member since */}
        {user.createdAt && (
          <p className="text-xs text-text-muted mt-0.5">
            Member since {formatDate(user.createdAt, 'MMM yyyy')}
          </p>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="text-sm text-text mt-2 leading-relaxed line-clamp-4">{user.bio}</p>
        )}

        {/* Verification badges */}
        <div className="mt-3">
          <VerificationBadges
            isEmailVerified={user.isEmailVerified}
            isPhoneVerified={user.isPhoneVerified}
            isIdentityVerified={user.isIdentityVerified}
          />
        </div>
      </div>
    </div>
  );
}

ProfileHeader.propTypes = {
  user: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    profileImageUrl: PropTypes.string,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    city: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
    bio: PropTypes.string,
    createdAt: PropTypes.string,
    isEmailVerified: PropTypes.bool,
    isPhoneVerified: PropTypes.bool,
    isIdentityVerified: PropTypes.bool,
  }),
  isOwnProfile: PropTypes.bool,
  onSettingsClick: PropTypes.func,
};
