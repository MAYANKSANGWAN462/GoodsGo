import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { usePost, useToggleSave, useReportPost, useDeletePost } from '../../hooks/usePosts';
import { usePostBookings, useAcceptBooking, useRejectBooking } from '../../hooks/useBookings';
import useAuthStore from '../../stores/useAuthStore';
import PostImageGallery from '../../components/posts/PostImageGallery';
import PostTypeBadge from '../../components/posts/PostTypeBadge';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BookingStatusBadge from '../../components/bookings/BookingStatusBadge';
import BookingRequestModal from '../../components/bookings/BookingRequestModal';
import { formatDate, formatCurrency, timeAgo } from '../../utils/formatters';
import { ROUTES, buildRoute } from '../../constants/routes';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraudulent', label: 'Fraudulent / Misleading' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'wrong_category', label: 'Wrong Category' },
  { value: 'other', label: 'Other' },
];

// ── Icon components ─────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightSmIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6m9 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

function StarFilledIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  );
}

StarFilledIcon.propTypes = { className: PropTypes.string };

function VerifiedBadgeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-success" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

BookmarkIcon.propTypes = { filled: PropTypes.bool };

function FlagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18m0-13.5l6-3 6 3 6-3v13.5l-6 3-6-3-6 3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

// ── Status badge helper (semantic tokens) ────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    active:    'bg-success-subtle text-success',
    booked:    'bg-info-subtle text-info',
    expired:   'bg-surface-alt text-text-muted',
    deleted:   'bg-danger-subtle text-danger',
  };
  const cls = map[status] ?? 'bg-surface-alt text-text-muted';
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

StatusChip.propTypes = { status: PropTypes.string.isRequired };

// ── Spec tile (icon + label + value) ────────────────────────────────────────

function SpecTile({ icon, label, value }) {
  return (
    <div className="bg-surface-alt rounded-xl p-3.5 flex items-start gap-2.5 border border-border">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-semibold text-text mt-0.5">{value}</p>
      </div>
    </div>
  );
}

SpecTile.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

// ── Sidebar owner card with accent bar ──────────────────────────────────────

function OwnerSidebarCard({ post, isOwner, onViewProfile }) {
  const owner = post.owner;
  if (!owner) return null;

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="h-0.5 w-full bg-primary/25" />
      <div className="p-4">
        <h3 className="font-semibold text-text text-sm mb-3">Posted by</h3>

        <div className="flex items-center gap-3 mb-3">
          <Avatar src={owner.profileImageUrl} name={owner.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text text-sm truncate">{owner.fullName}</p>
            {owner.isIdentityVerified && (
              <span className="flex items-center gap-1 mt-0.5">
                <VerifiedBadgeIcon />
                <span className="text-xs text-success font-medium">Verified</span>
              </span>
            )}
          </div>
        </div>

        <dl className="flex flex-col gap-1.5 text-xs mb-3">
          {owner.rating > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">Rating</dt>
              <dd className="flex items-center gap-1 font-semibold text-text">
                <span className="text-warning"><StarFilledIcon className="w-3 h-3" /></span>
                {Number(owner.rating).toFixed(1)}
                {owner.totalReviews > 0 && (
                  <span className="text-text-muted font-normal">
                    ({owner.totalReviews} {owner.totalReviews === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </dd>
            </div>
          )}
          {owner.memberSince && (
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">Member since</dt>
              <dd className="text-text">{formatDate(owner.memberSince, 'MMM yyyy')}</dd>
            </div>
          )}
        </dl>

        {!isOwner && (
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none transition-colors"
          >
            View profile
            <ExternalLinkIcon />
          </button>
        )}
      </div>
    </div>
  );
}

OwnerSidebarCard.propTypes = {
  post: PropTypes.object.isRequired,
  isOwner: PropTypes.bool.isRequired,
  onViewProfile: PropTypes.func.isRequired,
};

// ── Incoming request row ─────────────────────────────────────────────────────

function RequestRow({ booking, postPriceEstimate }) {
  const navigate = useNavigate();
  const acceptMutation = useAcceptBooking(booking.id);
  const rejectMutation = useRejectBooking(booking.id);

  return (
    <li className="border border-border rounded-xl p-3 flex flex-col gap-2 bg-surface hover:bg-surface-alt transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={booking.requester?.profileImageUrl}
            name={booking.requester?.fullName}
            size="xs"
          />
          <span className="text-sm font-semibold text-text truncate">
            {booking.requester?.fullName ?? 'Unknown'}
          </span>
        </div>
        <BookingStatusBadge status={booking.status} size="sm" />
      </div>

      {booking.goodsDescription && (
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
          {booking.goodsDescription}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border">
        <span className="text-xs text-text-muted">{timeAgo(booking.createdAt)}</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate(buildRoute(ROUTES.BOOKING_DETAIL, { id: booking.id }))}
            className="text-xs text-primary hover:underline font-medium"
          >
            View →
          </button>
          {booking.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                isLoading={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({})}
              >
                Reject
              </Button>
              <Button
                size="sm"
                isLoading={acceptMutation.isPending}
                onClick={() =>
                  acceptMutation.mutate({ agreed_price: postPriceEstimate ?? 0 })
                }
              >
                Accept
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

RequestRow.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    goodsDescription: PropTypes.string,
    requester: PropTypes.shape({
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
  }).isRequired,
  postPriceEstimate: PropTypes.number,
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: post, isLoading, isError } = usePost(postId);
  const toggleSaveMutation = useToggleSave(postId);
  const reportMutation = useReportPost();

  const isOwner = isAuthenticated && user?.id === post?.owner?.id;
  const { data: postBookingsData, isLoading: bookingsLoading } = usePostBookings(
    isOwner ? postId : undefined
  );
  const postBookings = postBookingsData?.data ?? [];

  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {/* Back + breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-5">
          <div className="skeleton h-8 w-24 rounded-lg" />
          <div className="skeleton h-3 w-48 rounded-full" />
        </div>
        {/* Main content grid skeleton */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-5">
            {/* Image gallery skeleton */}
            <div className="skeleton w-full h-72 rounded-xl" />
            {/* Content card skeleton */}
            <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-5 w-2/3 rounded-full" />
              <div className="skeleton h-4 w-1/2 rounded-full" />
              <div className="border-t border-border pt-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="skeleton w-4 h-4 rounded flex-shrink-0 mt-0.5" />
                    <div className="skeleton h-4 w-3/4 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Sidebar skeleton */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <div className="skeleton h-4 w-28 rounded-full" />
                  <div className="skeleton h-3 w-20 rounded-full" />
                </div>
              </div>
              <div className="skeleton h-10 w-full rounded-lg" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text mb-2">Post not found</h2>
        <p className="text-text-muted text-sm mb-6 max-w-xs">
          This post may have been removed or is no longer available.
        </p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.MARKETPLACE)}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  function handleReport() {
    if (!reportReason) {
      toast.error('Please select a reason.');
      return;
    }
    reportMutation.mutate(
      { postId, body: { reason: reportReason, description: reportDesc || undefined } },
      {
        onSuccess: () => {
          setReportOpen(false);
          setReportReason('');
          setReportDesc('');
        },
      }
    );
  }

  const originCity = post.originCity ?? '—';
  const destCity = post.destinationCity;

  const inputClass =
    'w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-5" aria-label="breadcrumb">
        <button
          type="button"
          onClick={() => navigate(ROUTES.MARKETPLACE)}
          className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
        >
          <ChevronLeftIcon />
          Marketplace
        </button>
        <ChevronRightSmIcon />
        <span className="text-text-muted truncate max-w-[180px]">
          {originCity}{destCity ? ` → ${destCity}` : ''}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: gallery + details ──────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <PostImageGallery images={post.images ?? []} />

          {/* Type + price + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <PostTypeBadge type={post.postType} size="md" />
            {post.priceEstimate != null && (
              <span className="text-xl font-bold text-primary">
                {formatCurrency(post.priceEstimate)}
              </span>
            )}
            <StatusChip status={post.status} />
          </div>

          {/* Route display */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-text">{originCity}</span>
            {destCity && (
              <>
                <ArrowRightIcon />
                <span className="text-2xl font-bold text-text">{destCity}</span>
              </>
            )}
          </div>

          {/* Scheduled date */}
          {post.scheduledDate && (
            <div className="flex items-center gap-2 text-sm text-text-muted -mt-3">
              <CalendarIcon />
              <span>Scheduled: {formatDate(post.scheduledDate)}</span>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-text mb-2">Description</h3>
              <p className="text-text-muted text-sm whitespace-pre-wrap leading-relaxed">
                {post.description}
              </p>
            </div>
          )}

          {/* Type-specific specs grid */}
          {(post.vehicleType || post.goodsCategory || post.weightKg != null || post.availableWeightKg != null) && (
            <div className="grid grid-cols-2 gap-3">
              {post.vehicleType && (
                <SpecTile
                  icon={<TruckIcon />}
                  label="Vehicle Type"
                  value={post.vehicleType?.name ?? post.vehicleType}
                />
              )}
              {post.goodsCategory && (
                <SpecTile
                  icon={<PackageIcon />}
                  label="Goods Category"
                  value={post.goodsCategory?.name ?? post.goodsCategory}
                />
              )}
              {post.weightKg != null && (
                <SpecTile
                  icon={<ScaleIcon />}
                  label="Weight"
                  value={`${post.weightKg} kg`}
                />
              )}
              {post.availableWeightKg != null && (
                <SpecTile
                  icon={<ScaleIcon />}
                  label="Available Capacity"
                  value={`${post.availableWeightKg} kg`}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Right: owner + actions ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <OwnerSidebarCard
            post={post}
            isOwner={isOwner}
            onViewProfile={() =>
              navigate(buildRoute(ROUTES.PUBLIC_PROFILE, { userId: post.owner.id }))
            }
          />

          {/* Non-owner authenticated actions */}
          {!isOwner && isAuthenticated && (
            <div className="flex flex-col gap-2">
              {post.status === 'active' && (
                <Button fullWidth onClick={() => setBookingModalOpen(true)}>
                  {post.postType === 'need_transport'
                    ? 'Submit Transport Offer'
                    : 'Request Cargo Space'}
                </Button>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate(ROUTES.CHAT)}
              >
                <span className="flex items-center justify-center gap-2">
                  <ChatBubbleIcon />
                  Messages
                </span>
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => toggleSaveMutation.mutate()}
                isLoading={toggleSaveMutation.isPending}
              >
                <span className="flex items-center justify-center gap-2">
                  <BookmarkIcon filled={Boolean(post.isSaved)} />
                  {post.isSaved ? 'Saved' : 'Save Post'}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setReportOpen(true)}
              >
                <span className="flex items-center justify-center gap-1.5 text-text-muted">
                  <FlagIcon />
                  Report Post
                </span>
              </Button>
            </div>
          )}

          {/* Unauthenticated visitors */}
          {!isAuthenticated && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="h-0.5 w-full bg-primary/20" />
              <div className="p-4 text-center">
                <p className="text-sm text-text-muted mb-3">
                  Log in to save or request a booking.
                </p>
                <Button fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                  Log In
                </Button>
              </div>
            </div>
          )}

          {/* Owner: post management */}
          {isOwner && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="h-0.5 w-full bg-primary/25" />
              <div className="p-4">
                <h3 className="font-semibold text-text text-sm mb-3">Manage Post</h3>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(buildRoute(ROUTES.EDIT_POST, { id: postId }))}
                  >
                    Edit Post
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={isDeleting || post.status === 'booked'}
                  >
                    Delete Post
                  </Button>
                  {post.status === 'booked' && (
                    <p className="text-xs text-text-muted leading-relaxed">
                      This post has an active booking. Cancel the booking first to delete the post.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Owner: incoming booking requests */}
          {isOwner && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="h-0.5 w-full bg-primary/25" />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text text-sm">Incoming Requests</h3>
                  {!bookingsLoading && postBookings.length > 0 && (
                    <span className="text-xs font-bold bg-primary text-white rounded-full px-2 py-0.5">
                      {postBookings.length}
                    </span>
                  )}
                </div>
                {bookingsLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : postBookings.length === 0 ? (
                  <div className="py-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-xs text-text-muted">No booking requests yet.</p>
                  </div>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {postBookings.map((b) => (
                      <RequestRow
                        key={b.id}
                        booking={b}
                        postPriceEstimate={post.priceEstimate}
                      />
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          deletePost(postId);
          setConfirmDeleteOpen(false);
        }}
        title="Delete this post?"
        message="This will permanently remove the post from the marketplace. Any pending booking requests will be automatically cancelled and those requesters will be notified."
        confirmLabel="Delete Post"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

      {/* ── Booking request modal ────────────────────────────────────────── */}
      <BookingRequestModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        post={post}
      />

      {/* ── Report modal (uses shared Modal component) ──────────────────── */}
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report Post"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReport}
              isLoading={reportMutation.isPending}
            >
              Submit Report
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5" htmlFor="report-reason">
              Reason <span className="text-danger">*</span>
            </label>
            <select
              id="report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a reason</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5" htmlFor="report-desc">
              Additional details{' '}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="report-desc"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              rows={3}
              placeholder="Describe the issue..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
