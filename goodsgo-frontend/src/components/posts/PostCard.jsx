import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import PostTypeBadge from './PostTypeBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { buildRoute, ROUTES } from '../../constants/routes';
import useAuthStore from '../../stores/useAuthStore';

function TruckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6m9 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

export default function PostCard({ post }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  function handleClick() {
    navigate(buildRoute(ROUTES.POST_DETAIL, { id: post.id }));
  }

  function handleChatClick(e) {
    e.stopPropagation();
    navigate(ROUTES.CHAT);
  }

  return (
    <Card onClick={handleClick} padding="none" className="overflow-hidden flex flex-col">
      {/* Image thumbnail */}
      {post.images?.length > 0 ? (
        <img
          src={post.images[0]}
          alt="Post"
          className="w-full h-40 object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
          <TruckIcon />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Type badge + price */}
        <div className="flex items-start justify-between gap-2">
          <PostTypeBadge type={post.postType} />
          {post.priceEstimate != null && (
            <span className="text-sm font-semibold text-primary whitespace-nowrap">
              {formatCurrency(post.priceEstimate)}
            </span>
          )}
        </div>

        {/* Route */}
        <p className="text-sm font-medium text-text line-clamp-1">
          {post.originCity ?? '—'}
          {post.destinationCity && (
            <>
              <span className="mx-1 text-text-muted">→</span>
              {post.destinationCity}
            </>
          )}
        </p>

        {/* Scheduled date */}
        {post.scheduledDate && (
          <p className="text-xs text-text-muted">
            {formatDate(post.scheduledDate)}
          </p>
        )}

        {/* Owner footer + chat shortcut */}
        {post.owner && (
          <div className="flex items-center gap-2 pt-2 mt-auto border-t border-border">
            <Avatar
              src={post.owner.profileImageUrl}
              name={post.owner.fullName}
              size="xs"
            />
            <span className="text-xs text-text-muted truncate flex-1">{post.owner.fullName}</span>
            {isAuthenticated && (
              <button
                onClick={handleChatClick}
                title="Open Messages"
                className="text-text-muted hover:text-primary transition-colors p-0.5 rounded flex-shrink-0"
                aria-label="Open Messages"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    postType: PropTypes.string.isRequired,
    originCity: PropTypes.string,
    destinationCity: PropTypes.string,
    scheduledDate: PropTypes.string,
    priceEstimate: PropTypes.number,
    images: PropTypes.arrayOf(PropTypes.string),
    owner: PropTypes.shape({
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
  }).isRequired,
};
