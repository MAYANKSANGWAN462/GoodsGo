import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import PostTypeBadge from './PostTypeBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';
import { buildRoute, ROUTES } from '../../constants/routes';
import useAuthStore from '../../stores/useAuthStore';

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

BookmarkIcon.propTypes = { filled: PropTypes.bool };

function TruckPlaceholderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6m9 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

export default function PostCard({ post, onToggleSave, isSaved }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  function handleClick() {
    navigate(buildRoute(ROUTES.POST_DETAIL, { id: post.id }));
  }

  function handleChatClick(e) {
    e.stopPropagation();
    navigate(ROUTES.CHAT);
  }

  function handleSaveClick(e) {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(post.id);
  }

  const hasImage = post.images?.length > 0;
  const categoryName = typeof post.goodsCategory === 'object'
    ? post.goodsCategory?.name
    : post.goodsCategory;

  return (
    <Card
      onClick={handleClick}
      padding="none"
      elevation="sm"
      hoverable
      className="overflow-hidden flex flex-col animate-fade-in cursor-pointer group"
    >
      {/* ── Image area ──────────────────────────────────────────────── */}
      <div className="relative w-full h-40 flex-shrink-0 overflow-hidden bg-surface-alt">
        {hasImage ? (
          <>
            <img
              src={cloudinaryUrl(post.images[0], { width: 600 })}
              alt="Post"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Gradient overlay at bottom of image */}
            <div
              className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.42), transparent)' }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TruckPlaceholderIcon />
          </div>
        )}

        {/* Type badge — overlay on image top-left */}
        <div className="absolute top-2.5 left-2.5">
          <PostTypeBadge type={post.postType} />
        </div>

        {/* Save/bookmark button — top-right */}
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleSaveClick}
            aria-label={isSaved ? 'Remove from saved' : 'Save post'}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-primary text-white shadow-md'
                : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        )}

        {/* Price overlay at bottom-right of image */}
        {post.priceEstimate != null && (
          <div className="absolute bottom-2 right-2.5">
            <span className="text-sm font-bold text-white drop-shadow-sm">
              {formatCurrency(post.priceEstimate)}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ─────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Route */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-sm font-semibold text-text truncate max-w-[40%]">
            {post.originCity ?? '—'}
          </span>
          {post.destinationCity && (
            <>
              <span className="text-text-subtle flex-shrink-0">
                <ArrowRightIcon />
              </span>
              <span className="text-sm font-semibold text-text truncate max-w-[40%]">
                {post.destinationCity}
              </span>
            </>
          )}
        </div>

        {/* Goods category chip */}
        {categoryName && (
          <span className="self-start inline-flex text-xs bg-surface-alt border border-border text-text-muted rounded-full px-2 py-0.5">
            {categoryName}
          </span>
        )}

        {/* Scheduled date */}
        {post.scheduledDate && (
          <p className="text-xs text-text-muted">
            📅 {formatDate(post.scheduledDate)}
          </p>
        )}
      </div>

      {/* ── Owner footer ──────────────────────────────────────────── */}
      {post.owner && (
        <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border mt-auto">
          <Avatar
            src={post.owner.profileImageUrl}
            name={post.owner.fullName}
            size="xs"
          />
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span className="text-xs text-text-muted truncate">
              {post.owner.fullName}
            </span>
            {post.owner.isIdentityVerified && <VerifiedBadge />}
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleChatClick}
              title="Open Messages"
              className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
              aria-label="Open Messages"
            >
              <ChatIcon />
            </button>
          )}
        </div>
      )}
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
    goodsCategory: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({ name: PropTypes.string }),
    ]),
    owner: PropTypes.shape({
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
      isIdentityVerified: PropTypes.bool,
    }),
  }).isRequired,
  onToggleSave: PropTypes.func,
  isSaved: PropTypes.bool,
};
