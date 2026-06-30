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

/**
 * A single row in the incoming-requests panel.
 * Isolated into its own component so accept/reject mutation hooks are correctly
 * scoped to each booking's ID rather than re-created on every parent render.
 */
function RequestRow({ booking, postPriceEstimate }) {
  const navigate = useNavigate();
  const acceptMutation = useAcceptBooking(booking.id);
  const rejectMutation = useRejectBooking(booking.id);

  return (
    <li className="border border-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            src={booking.requester?.profileImageUrl}
            name={booking.requester?.fullName}
            size="xs"
          />
          <span className="text-sm font-medium text-text truncate">
            {booking.requester?.fullName ?? 'Unknown'}
          </span>
        </div>
        <BookingStatusBadge status={booking.status} size="sm" />
      </div>

      {booking.goodsDescription && (
        <p className="text-xs text-text-muted line-clamp-2">{booking.goodsDescription}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-text-muted">{timeAgo(booking.createdAt)}</span>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => navigate(buildRoute(ROUTES.BOOKING_DETAIL, { id: booking.id }))}
            className="text-xs text-primary hover:underline"
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

export default function PostDetailPage() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: post, isLoading, isError } = usePost(postId);
  const toggleSaveMutation = useToggleSave(postId);
  const reportMutation = useReportPost();

  // Owner-only: incoming requests panel.
  // enabled only after isOwner is determined (post must be loaded first).
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
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-semibold text-text mb-2">Post not found</p>
        <p className="text-text-muted text-sm mb-6">
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-text-muted text-sm mb-4 hover:text-primary transition-colors"
      >
        ← Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: gallery + details ─────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <PostImageGallery images={post.images ?? []} />

          {/* Type + price + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <PostTypeBadge type={post.postType} size="md" />
            {post.priceEstimate != null && (
              <span className="text-lg font-bold text-primary">
                {formatCurrency(post.priceEstimate)}
              </span>
            )}
            <span
              className={[
                'text-xs px-2 py-0.5 rounded-full font-medium',
                post.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
              ].join(' ')}
            >
              {post.status}
            </span>
          </div>

          {/* Route */}
          <div>
            <p className="text-xl font-semibold text-text">
              {post.originCity ?? '—'}
              {post.destinationCity && (
                <>
                  <span className="mx-2 text-text-muted">→</span>
                  {post.destinationCity}
                </>
              )}
            </p>
            {post.scheduledDate && (
              <p className="text-text-muted text-sm mt-1">
                Scheduled: {formatDate(post.scheduledDate)}
              </p>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <div>
              <h3 className="font-medium text-text mb-1">Description</h3>
              <p className="text-text-muted text-sm whitespace-pre-wrap leading-relaxed">
                {post.description}
              </p>
            </div>
          )}

          {/* Type-specific details */}
          <div className="grid grid-cols-2 gap-3">
            {post.vehicleType && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Vehicle Type</p>
                <p className="text-sm font-medium text-text">
                  {post.vehicleType?.name ?? post.vehicleType}
                </p>
              </div>
            )}
            {post.goodsCategory && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Goods Category</p>
                <p className="text-sm font-medium text-text">
                  {post.goodsCategory?.name ?? post.goodsCategory}
                </p>
              </div>
            )}
            {post.weightKg != null && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Weight</p>
                <p className="text-sm font-medium text-text">{post.weightKg} kg</p>
              </div>
            )}
            {post.availableWeightKg != null && (
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs text-text-muted mb-0.5">Available Capacity</p>
                <p className="text-sm font-medium text-text">{post.availableWeightKg} kg</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: owner card + action buttons ──────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Owner info */}
          {post.owner && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text mb-3 text-sm">Posted by</h3>

              {/* Avatar + name row */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  src={post.owner.profileImageUrl}
                  name={post.owner.fullName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text text-sm truncate">
                    {post.owner.fullName}
                  </p>
                  {post.owner.isIdentityVerified && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Key stats */}
              <dl className="flex flex-col gap-1.5 text-xs mb-3">
                {post.owner.rating > 0 && (
                  <div className="flex items-center justify-between">
                    <dt className="text-text-muted">Rating</dt>
                    <dd className="font-medium text-text">
                      ⭐ {Number(post.owner.rating).toFixed(1)}
                      {post.owner.totalReviews > 0 && (
                        <span className="text-text-muted font-normal">
                          {' '}({post.owner.totalReviews} {post.owner.totalReviews === 1 ? 'review' : 'reviews'})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {post.owner.memberSince && (
                  <div className="flex items-center justify-between">
                    <dt className="text-text-muted">Member since</dt>
                    <dd className="text-text">{formatDate(post.owner.memberSince, 'MMM yyyy')}</dd>
                  </div>
                )}
              </dl>

              {/* View full profile — only shown to non-owners */}
              {!isOwner && (
                <button
                  onClick={() =>
                    navigate(buildRoute(ROUTES.PUBLIC_PROFILE, { userId: post.owner.id }))
                  }
                  className="text-xs text-primary hover:underline focus:outline-none"
                >
                  View profile →
                </button>
              )}
            </div>
          )}

          {/* Non-owner authenticated actions */}
          {!isOwner && isAuthenticated && (
            <div className="flex flex-col gap-2">
              {post.status === 'active' && (
                <Button
                  fullWidth
                  onClick={() => setBookingModalOpen(true)}
                >
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
                💬 Messages
              </Button>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => toggleSaveMutation.mutate()}
                isLoading={toggleSaveMutation.isPending}
              >
                {post.isSaved ? '★ Saved' : '☆ Save Post'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setReportOpen(true)}
              >
                Report Post
              </Button>
            </div>
          )}

          {/* Prompt for unauthenticated visitors */}
          {!isAuthenticated && (
            <div className="bg-surface rounded-xl border border-border p-4 text-center">
              <p className="text-sm text-text-muted mb-3">
                Log in to save or request a booking.
              </p>
              <Button fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                Log In
              </Button>
            </div>
          )}

          {/* Owner: post management actions */}
          {isOwner && (
            <div className="bg-surface rounded-xl border border-border p-4">
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
                  <p className="text-xs text-text-muted">
                    This post has an active booking. Cancel the booking first to delete the post.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Owner: incoming booking requests panel */}
          {isOwner && (
            <div className="bg-surface rounded-xl border border-border p-4">
              <h3 className="font-semibold text-text text-sm mb-3">Incoming Requests</h3>
              {bookingsLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : postBookings.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-3">
                  No booking requests yet.
                </p>
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
          )}
        </div>
      </div>

      {/* ── Delete post confirmation ─────────────────────────────────── */}
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

      {/* ── Booking request modal ────────────────────────────────────── */}
      <BookingRequestModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        post={post}
      />

      {/* ── Report modal ─────────────────────────────────────────────── */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setReportOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="relative bg-surface rounded-xl border border-border p-6 w-full max-w-md z-10 shadow-xl"
          >
            <h3 id="report-title" className="font-semibold text-text mb-4">
              Report Post
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1" htmlFor="report-reason">
                  Reason *
                </label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a reason</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1" htmlFor="report-desc">
                  Additional details (optional)
                </label>
                <textarea
                  id="report-desc"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
